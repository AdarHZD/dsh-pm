/**
 * Host-half behavior tests without booting DSH.
 *
 * The production `index.js` imports `@deepseek-ai/schemastery` (resolved by the
 * DSH profile), so the test copies it next to a tiny stub of that import and
 * drives it with a fake cordis context. Everything else is the real file.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { Readable } from 'node:stream'

const SOURCE = new URL('../index.js', import.meta.url)

async function loadHost() {
  const source = await readFile(SOURCE, 'utf8')
  const stubbed = source.replace(
    "import z from '@deepseek-ai/schemastery'",
    `const field = () => { const chain = { default: () => chain, volatile: () => chain, role: () => chain }; return chain }
const z = { string: field, boolean: field, number: field, object: (shape) => shape }`,
  )
  const dir = await mkdtemp(join(tmpdir(), 'dsh-pm-test-'))
  const file = join(dir, 'index.mjs')
  await writeFile(file, stubbed, 'utf8')
  const module = await import(pathToFileURL(file).href)
  return { module, dir }
}

function fakeRequest(payload) {
  const body = Buffer.from(JSON.stringify(payload), 'utf8')
  const stream = Readable.from([body])
  stream.method = 'POST'
  stream.headers = {}
  return stream
}

function fakeResponse() {
  return {
    status: 0,
    headers: {},
    body: '',
    writeHead(status, headers) {
      this.status = status
      this.headers = headers ?? {}
      return this
    },
    end(chunk) {
      if (chunk !== undefined) this.body += String(chunk)
      return this
    },
  }
}

async function call(host, handler, payload) {
  const response = fakeResponse()
  await handler(fakeRequest(payload), response)
  return { status: response.status, value: JSON.parse(response.body) }
}

function fakeContext(dataRoot) {
  const handlerRef = { handler: undefined }
  const listeners = new Map()
  const sessions = new Map()
  const prompts = []
  const created = []
  const ctx = {
    logger: { info() {}, warn() {}, error() {} },
    effect(factory) {
      const dispose = factory()
      return typeof dispose === 'function' ? dispose : () => {}
    },
    on(name, listener) {
      listeners.set(name, listener)
      return () => listeners.delete(name)
    },
    inject(names, callback) {
      if (names.includes('tools')) {
        const tools = []
        callback({ tools: { register(definition) { tools.push(definition) } } })
        ctx.tools = tools
      }
      if (names.includes('sessionController')) {
        callback({ sessionController: ctx.sessionController })
      }
      if (names.includes('settings')) {
        callback({ settings: { configure() {} }, effect: (factory) => { const value = factory(); return typeof value === 'function' ? value : () => {} } })
      }
      if (names.includes('timer')) {
        callback({ interval: () => () => {}, timeout: () => () => {} })
      }
      return () => {}
    },
    interval() {
      return () => {}
    },
    get(name) {
      if (name === 'sessionQuery') {
        return {
          observeSession(sessionId) {
            const events = sessions.get(sessionId)?.events ?? []
            return { events, [Symbol.dispose]() {} }
          },
        }
      }
      if (name === 'sessions') {
        return {
          get(sessionId) {
            const entry = sessions.get(sessionId)
            if (entry === undefined) return undefined
            return { id: sessionId, header: { cwd: entry.cwd }, snapshotEvents: () => entry.events ?? [] }
          },
        }
      }
      return undefined
    },
    webServer: {
      register(options) {
        handlerRef.handler = options.handler
        return () => { handlerRef.handler = undefined }
      },
    },
    connection: { requestRejection: () => undefined },
    sessionController: {
      async create(request) {
        const sessionId = `session-${created.length + 1}`
        created.push({ sessionId, cwd: request.cwd })
        sessions.set(sessionId, { cwd: request.cwd, events: [] })
        return { sessionId }
      },
      async rename() { return { title: 'x' } },
      async prompt(request) {
        prompts.push(request)
        return { accepted: true }
      },
    },
    sessions: undefined,
    fiber: {},
    handler() { return handlerRef.handler },
    created,
    prompts,
  }
  return ctx
}

test('board CRUD, state machine, CAS conflicts and settings go through the HTTP route', async () => {
  const { module, dir } = await loadHost()
  const dataRoot = join(dir, 'data')
  const ctx = fakeContext(dataRoot)
  const config = {
    dataRoot: { get: () => dataRoot },
    planWithAgent: { get: () => false },
    autoRun: { get: () => false },
  }
  module.apply(ctx, config)
  const handler = ctx.handler()
  assert.equal(typeof handler, 'function', 'route registered')

  // Auth is delegated to the deployment connection.
  ctx.connection.requestRejection = () => 401
  const denied = await call(ctx, handler, { op: 'hello' })
  assert.equal(denied.status, 401)
  ctx.connection.requestRejection = () => undefined

  const hello = await call(ctx, handler, { op: 'hello' })
  assert.equal(hello.value.ok, true)
  assert.equal(hello.value.dataRoot, dataRoot)

  // Project discovery from the client-provided workspace list.
  const synced = await call(ctx, handler, {
    op: 'sync',
    workspaces: [{ path: 'C:\\work\\alpha', title: 'Alpha' }],
  })
  assert.equal(synced.value.ok, true)
  assert.equal(synced.value.projects.length, 1)
  const projectKey = synced.value.projects[0].key

  // Human create stays editing.
  const created = await call(ctx, handler, {
    op: 'task.create',
    project: projectKey,
    task: { title: '拆分账单模块', description: '把 billing 独立', acceptance: ['vitest 全绿'], humanPrereqs: ['填 PAYMENT_KEY'], dependsOn: [], maxRetries: 1 },
  })
  assert.equal(created.value.ok, true)
  const taskId = created.value.task.id
  assert.equal(created.value.task.status, 'editing')
  assert.equal(created.value.task.createdBy, 'adar')

  // Illegal transition editing -> done is rejected with the current state.
  const illegal = await call(ctx, handler, { op: 'task.status', project: projectKey, id: taskId, to: 'done' })
  assert.equal(illegal.value.ok, false)
  assert.equal(illegal.value.error, 'illegal-transition')
  assert.equal(illegal.value.from, 'editing')

  // editing -> ready is allowed.
  const ready = await call(ctx, handler, { op: 'task.status', project: projectKey, id: taskId, to: 'ready' })
  assert.equal(ready.value.ok, true)
  assert.equal(ready.value.task.status, 'ready')

  // CAS conflict: stale revision is refused instead of overwriting.
  const conflict = await call(ctx, handler, {
    op: 'task.update',
    project: projectKey,
    id: taskId,
    revision: 1,
    patch: { title: '改个名字' },
  })
  assert.equal(conflict.value.ok, false)
  assert.equal(conflict.value.error, 'conflict')
  const currentRevision = ready.value.task.revision
  const edited = await call(ctx, handler, {
    op: 'task.update',
    project: projectKey,
    id: taskId,
    revision: currentRevision,
    patch: { title: '拆分账单模块（改）' },
  })
  assert.equal(edited.value.ok, true)
  assert.equal(edited.value.task.title, '拆分账单模块（改）')
  assert.equal(edited.value.task.status, 'editing', 'editing a ready task sends it back to editing')

  // Settings save with version CAS + validation.
  const settings = await call(ctx, handler, {
    op: 'settings.update',
    project: projectKey,
    settings: { schedule: { mode: 'custom', start: '20:00', end: '07:00' }, maxConcurrent: 3, rotateAt: 0.5, maxRetries: 2 },
  })
  assert.equal(settings.value.ok, true)
  assert.equal(settings.value.settings.maxConcurrent, 3)
  assert.equal(settings.value.settings.rotateAt, 0.5)

  // Pause + snapshot subline text.
  await call(ctx, handler, { op: 'pause.set', project: projectKey, paused: true })
  let snapshot = await call(ctx, handler, { op: 'snapshot', project: projectKey })
  assert.equal(snapshot.value.ok, true)
  assert.equal(snapshot.value.board.paused, true)
  assert.match(snapshot.value.subline, /已暂停/)
  await call(ctx, handler, { op: 'pause.set', project: projectKey, paused: false })

  // Run refuses when nothing is ready, then reports busy/paused correctly.
  const noReady = await call(ctx, handler, { op: 'run.start', project: projectKey })
  assert.equal(noReady.value.ok, false)

  // Put it back to ready and run: the engine creates a visible session.
  await call(ctx, handler, { op: 'task.status', project: projectKey, id: taskId, to: 'ready' })
  const started = await call(ctx, handler, { op: 'run.start', project: projectKey })
  assert.equal(started.value.ok, true)
  await new Promise((resolve) => setTimeout(resolve, 80))
  assert.equal(ctx.created.length, 1, 'one visible session created')
  assert.equal(ctx.created[0].cwd, 'C:\\work\\alpha')
  assert.equal(ctx.prompts.length >= 1, true, 'brief delivered')
  assert.match(ctx.prompts[0].content[0].text, /【任务 T-001】/)

  snapshot = await call(ctx, handler, { op: 'snapshot', project: projectKey })
  const runningTask = snapshot.value.board.tasks.find((task) => task.id === taskId)
  assert.equal(runningTask.status, 'running')
  assert.equal(runningTask.sessions.length, 1)
  assert.equal(runningTask.sessions[0].sessionId, ctx.created[0].sessionId)

  // Board file lives under <dataRoot>/<project>/board.json and survives reload.
  const dirs = await readFile(join(dataRoot, 'index.json'), 'utf8')
  const index = JSON.parse(dirs)
  const registration = Object.values(index.projects)[0]
  const boardRaw = JSON.parse(await readFile(join(dataRoot, registration.dir, 'board.json'), 'utf8'))
  assert.equal(boardRaw.tasks.length, 1)
  assert.equal(boardRaw.project.key, projectKey)

  // Archive done only moves finished tasks.
  const archived = await call(ctx, handler, { op: 'board.archiveDone', project: projectKey })
  assert.equal(archived.value.ok, true)
  assert.equal(archived.value.count, 0, 'running task is not archived')

  // Reports list/get tolerate a missing file.
  const report = await call(ctx, handler, { op: 'report.get', project: projectKey, date: '2026-01-01' })
  assert.equal(report.value.ok, true)
  assert.equal(report.value.text, '')

  // PMO conversation + prompt with requestId idempotency passthrough.
  const conversation = await call(ctx, handler, { op: 'pmo.new', project: projectKey })
  assert.equal(conversation.value.ok, true)
  const sent = await call(ctx, handler, {
    op: 'pmo.send',
    project: projectKey,
    convId: conversation.value.conversation.id,
    text: '今晚跑哪几条？',
    requestId: 'req-1',
  })
  assert.equal(sent.value.ok, true)
  const lastPrompt = ctx.prompts[ctx.prompts.length - 1]
  assert.equal(lastPrompt.requestId, 'req-1')

  const pmoSnapshot = await call(ctx, handler, { op: 'snapshot', project: projectKey })
  assert.equal(pmoSnapshot.value.pmo.conversations.length >= 1, true)
  assert.equal(typeof pmoSnapshot.value.state.text, 'string')
  assert.match(pmoSnapshot.value.state.text, /项目状态/)

  await rm(dir, { recursive: true, force: true })
})

test('agent tools register with unique names and finish marks the bound task done', async () => {
  const { module, dir } = await loadHost()
  const dataRoot = join(dir, 'data')
  const ctx = fakeContext(dataRoot)
  const config = {
    dataRoot: { get: () => dataRoot },
    planWithAgent: { get: () => false },
    autoRun: { get: () => false },
  }
  module.apply(ctx, config)
  assert.equal(Array.isArray(ctx.tools), true)
  const names = ctx.tools.map((tool) => tool.name)
  for (const expected of ['pm_read_board', 'pm_create_task', 'pm_task_finish', 'pm_task_fail', 'pm_delete_task', 'pm_write_project_state']) {
    assert.equal(names.includes(expected), true, `tool ${expected} registered`)
  }
  assert.equal(new Set(names).size, names.length, 'tool names are unique')
  const handler = ctx.handler()
  await call(ctx, handler, { op: 'sync', workspaces: [{ path: 'C:\\work\\alpha', title: 'Alpha' }] })
  const key = (await call(ctx, handler, { op: 'sync', workspaces: [{ path: 'C:\\work\\alpha', title: 'Alpha' }] })).value.projects[0].key
  const created = await call(ctx, handler, { op: 'task.create', project: key, task: { title: 'T', acceptance: ['a'] } })
  const taskId = created.value.task.id
  await call(ctx, handler, { op: 'task.status', project: key, id: taskId, to: 'ready' })
  await call(ctx, handler, { op: 'run.start', project: key })
  await new Promise((resolve) => setTimeout(resolve, 80))
  const finish = ctx.tools.find((tool) => tool.name === 'pm_task_finish')
  const exec = { agent: { id: 'session-1', session: { id: 'session-1', header: { cwd: 'C:\\work\\alpha' } } } }
  const result = await finish.execute({ summary: '改了什么：x\n验证结果：通过\n需要你决定：y' }, exec)
  assert.equal(result.ok, true)
  const snapshot = await call(ctx, handler, { op: 'snapshot', project: key })
  const task = snapshot.value.board.tasks.find((item) => item.id === taskId)
  assert.equal(task.status, 'done')
  assert.equal(task.verified, true)
  assert.equal(typeof task.completedAt, 'string')
  await rm(dir, { recursive: true, force: true })
})
