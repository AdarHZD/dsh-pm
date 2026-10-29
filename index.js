/**
 * @local/dsh-pm — host half.
 *
 * Owns everything that must survive the browser tab:
 *  - board storage (one JSON file per project, atomic writes + CAS revisions),
 *  - the execution engine (create a visible session per task, deliver the brief,
 *    react to `turn/end`, rotate on context pressure, retry on failure),
 *  - the PMO conversation group (sessions created in `<project>/pmo/`),
 *  - `project-state.md` / daily report / change log,
 *  - agent tools so the PMO agent can read and edit the board,
 *  - one authenticated HTTP route (`/dsh-pm/api`) used by the client half.
 *
 * Nothing here touches the user's DSH configuration; all state lives under
 * `<dataRoot>/<project>/`.
 */
import { createHash, randomUUID } from 'node:crypto'
import { existsSync, mkdirSync } from 'node:fs'
import { mkdir, readFile, rename, unlink, writeFile } from 'node:fs/promises'
import { basename, join, resolve } from 'node:path'
import z from '@deepseek-ai/schemastery'

export const name = 'dsh-pm'
/** Required host services: HTTP carrier + its authentication. */
export const inject = ['webServer', 'connection']

/** Where boards live unless the settings page changes it. */
const DEFAULT_DATA_ROOT = 'C:\\Users\\huang\\项目总入口\\.dsh-kanban'
const MAX_BODY_BYTES = 512 * 1024
const LOG_KEEP_DAYS = 60
const REPORT_KEEP_DAYS = 60

/** The six states, in board order. */
const STATUS = {
  editing: { label: '编辑中' },
  ready: { label: '待执行' },
  running: { label: '执行中' },
  done: { label: '已完结' },
  failed: { label: '执行失败' },
  paused: { label: '暂停' },
}
const STATUS_KEYS = Object.keys(STATUS)

/** The only allowed status moves. Anything else is rejected with its current state. */
const TRANSITIONS = {
  editing: ['ready', 'paused'],
  ready: ['running', 'paused', 'editing'],
  running: ['done', 'failed', 'paused'],
  failed: ['ready', 'paused', 'editing'],
  paused: ['ready', 'editing'],
  done: ['editing'],
}

const DEFAULT_SETTINGS = {
  schedule: { mode: 'offpeak', start: '18:05', end: '08:55' },
  maxConcurrent: 2,
  rotateAt: 0.35,
  maxRetries: 1,
}

export const Config = z.object({
  /** Board storage root (one directory per project). */
  dataRoot: z.string().default(DEFAULT_DATA_ROOT).volatile(),
  /** Ask the PMO conversation for the execution order before dispatching. */
  planWithAgent: z.boolean().default(true).volatile(),
  /** Let the built-in timer start the nightly round inside the off-peak window. */
  autoRun: z.boolean().default(true).volatile(),
})

/** Read a possibly volatile Schemastery reference as its current value. */
function current(field, fallback) {
  if (field === undefined || field === null) return fallback
  if (typeof field.get === 'function') return field.get() ?? fallback
  return field ?? fallback
}

function nowIso() {
  return new Date().toISOString()
}

function pad2(value) {
  return String(value).padStart(2, '0')
}

/** Local calendar day key, e.g. `2026-10-29`. */
function dayKey(date = new Date()) {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`
}

function hhmm(date = new Date()) {
  return `${pad2(date.getHours())}:${pad2(date.getMinutes())}`
}

function parseHhmm(text) {
  const match = /^(\d{1,2}):(\d{2})$/.exec(String(text ?? '').trim())
  if (match === null) return undefined
  const hour = Number(match[1])
  const minute = Number(match[2])
  if (!Number.isInteger(hour) || !Number.isInteger(minute) || hour > 23 || minute > 59) return undefined
  return hour * 60 + minute
}

function minutesOf(date = new Date()) {
  return date.getHours() * 60 + date.getMinutes()
}

function isWeekend(date = new Date()) {
  const day = date.getDay()
  return day === 0 || day === 6
}

function clampInt(value, min, max, fallback) {
  const number = Math.round(Number(value))
  if (!Number.isFinite(number)) return fallback
  return Math.min(max, Math.max(min, number))
}

function normalizePath(input) {
  if (typeof input !== 'string') return ''
  return input.replace(/\\/g, '/').replace(/\/+$/, '').toLowerCase()
}

function projectKey(path) {
  return createHash('sha1').update(normalizePath(path)).digest('hex').slice(0, 12)
}

function safeDirName(name) {
  const cleaned = String(name ?? '')
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, '-')
    .replace(/[. ]+$/g, '')
    .trim()
  return cleaned.length === 0 ? 'project' : cleaned.slice(0, 60)
}

/** Human readable one-line reason from an unknown error. */
function errorText(error) {
  if (error === null || error === undefined) return '未知错误'
  if (typeof error === 'string') return error.slice(0, 300)
  const message = error instanceof Error ? error.message : String(error)
  return message.slice(0, 300)
}

function sendJson(res, status, value) {
  const body = JSON.stringify(value)
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    'content-length': Buffer.byteLength(body),
    'x-content-type-options': 'nosniff',
  })
  res.end(body)
}

async function readJsonBody(req) {
  const chunks = []
  let size = 0
  for await (const chunk of req) {
    size += chunk.length
    if (size > MAX_BODY_BYTES) throw new Error('body-too-large')
    chunks.push(chunk)
  }
  const text = Buffer.concat(chunks).toString('utf8')
  if (text.trim().length === 0) return {}
  const value = JSON.parse(text)
  if (value === null || typeof value !== 'object' || Array.isArray(value)) throw new Error('bad-body')
  return value
}

async function readJsonFile(filePath, fallback) {
  try {
    const text = await readFile(filePath, 'utf8')
    return JSON.parse(text)
  } catch {
    return fallback
  }
}

/** Write JSON through a temp file + rename so a crash cannot truncate the board. */
async function writeJsonFile(filePath, value) {
  await mkdir(join(filePath, '..'), { recursive: true }).catch(() => {})
  const tempPath = `${filePath}.${process.pid}.${Date.now()}.tmp`
  await writeFile(tempPath, `${JSON.stringify(value, null, 2)}\n`, 'utf8')
  try {
    await rename(tempPath, filePath)
  } catch {
    await unlink(filePath).catch(() => {})
    await rename(tempPath, filePath)
  }
}

async function writeTextFile(filePath, text) {
  await mkdir(join(filePath, '..'), { recursive: true }).catch(() => {})
  await writeFile(filePath, text, 'utf8')
}

function newTaskId(board) {
  board.seq = clampInt(board.seq ?? 0, 0, 999999, 0) + 1
  return `T-${String(board.seq).padStart(3, '0')}`
}

function statusCounts(tasks) {
  const counts = { all: tasks.length }
  for (const key of STATUS_KEYS) counts[key] = 0
  for (const task of tasks) if (counts[task.status] !== undefined) counts[task.status] += 1
  return counts
}

function sortedTasks(tasks) {
  return tasks.slice().sort((left, right) => String(right.createdAt).localeCompare(String(left.createdAt)))
}

function textBlocks(content) {
  if (!Array.isArray(content)) return ''
  const parts = []
  for (const block of content) {
    if (block === null || typeof block !== 'object') continue
    if (block.type === 'text' && typeof block.text === 'string') parts.push(block.text)
  }
  return parts.join('\n')
}

/** Normalized comparison of two workspace paths. */
function samePath(left, right) {
  return normalizePath(left) !== '' && normalizePath(left) === normalizePath(right)
}

class PmHost {
  constructor(ctx, config) {
    this.ctx = ctx
    this.config = config
    /** projectKey -> Promise chain serializing board mutations. */
    this.queues = new Map()
    /** projectKey -> cached board. */
    this.cache = new Map()
    /** projectKey -> {version, waiters:Set<(value:{version:number}|null)=>void>} */
    this.channels = new Map()
    /** sessionId -> binding {projectKey, taskId, continues, mode} */
    this.bindings = new Map()
    /** sessionId -> resolve callback for a pending turn wait (plan / handoff). */
    this.turnWaiters = new Map()
    /** projectKey -> PMO round bookkeeping. */
    this.rounds = new Map()
    /** projectKey -> scheduler conversation id used by the current round. */
    this.schedulerConversations = new Map()
    this.timer = undefined
    this.dataRoot = resolve(String(current(config?.dataRoot, DEFAULT_DATA_ROOT)))
    this.stopped = false
  }

  get dataRootPath() {
    return this.dataRoot
  }

  /** Session control arrives through a declared child context (cordis inject rule). */
  attachEngine(scope) {
    this.engineCtx = scope
  }

  get sessionController() {
    return this.engineCtx?.sessionController
  }

  /** Absolute directory holding one project's state. */
  projectDir(entry) {
    return join(this.dataRoot, entry.dir)
  }

  boardFile(entry) {
    return join(this.projectDir(entry), 'board.json')
  }

  indexFile() {
    return join(this.dataRoot, 'index.json')
  }

  sessionsFile(entry) {
    return join(this.projectDir(entry), 'sessions.json')
  }

  stateFile(entry) {
    return join(this.projectDir(entry), 'project-state.md')
  }

  pmoDir(entry) {
    return join(this.projectDir(entry), 'pmo')
  }

  logFile(entry, date = dayKey()) {
    return join(this.projectDir(entry), 'log', `${date}.jsonl`)
  }

  reportFile(entry, date = dayKey()) {
    return join(this.projectDir(entry), 'report', `${date}.md`)
  }

  // ---------------------------------------------------------------- registry

  async loadIndex() {
    const raw = await readJsonFile(this.indexFile(), undefined)
    const projects = raw !== null && typeof raw === 'object' && typeof raw.projects === 'object' && raw.projects !== null
      ? raw.projects
      : {}
    const index = { schemaVersion: 1, projects }
    if (raw === undefined) await writeJsonFile(this.indexFile(), index).catch(() => {})
    return index
  }

  async saveIndex(index) {
    await writeJsonFile(this.indexFile(), index)
  }

  /** Find or register the board directory for one workspace path. */
  async ensureProject(workspace) {
    const path = String(workspace?.path ?? '').trim()
    if (path.length === 0) return undefined
    const index = await this.loadIndex()
    const key = projectKey(path)
    const name = String(workspace?.title ?? '').trim() || basename(path) || '项目'
    const existing = index.projects[key]
    if (existing !== undefined) {
      if (existing.name !== name) {
        existing.name = name
        existing.updatedAt = nowIso()
        await this.saveIndex(index)
      }
      return existing
    }
    const used = new Set(Object.values(index.projects).map((entry) => entry.dir))
    let dir = safeDirName(name)
    if (used.has(dir)) dir = `${dir}-${key.slice(0, 4)}`
    const entry = { key, name, path, dir, createdAt: nowIso(), updatedAt: nowIso() }
    index.projects[key] = entry
    await this.saveIndex(index)
    await mkdir(this.projectDir(entry), { recursive: true }).catch(() => {})
    return entry
  }

  async listProjects() {
    const index = await this.loadIndex()
    return Object.values(index.projects)
  }

  /** Resolve a request's `project` field (key, dir or path) to a registration entry. */
  async resolveProject(input) {
    const value = String(input ?? '').trim()
    if (value.length === 0) return undefined
    const projects = await this.listProjects()
    return projects.find((entry) => entry.key === value)
      ?? projects.find((entry) => entry.path === value || samePath(entry.path, value))
      ?? projects.find((entry) => entry.dir === value)
      ?? projects.find((entry) => entry.name === value)
  }

  // ------------------------------------------------------------------- board

  defaultBoard(entry) {
    return {
      schemaVersion: 1,
      project: { key: entry.key, name: entry.name, path: entry.path, dir: entry.dir },
      settings: structuredClone(DEFAULT_SETTINGS),
      paused: false,
      seq: 0,
      version: 1,
      tasks: [],
      archived: [],
      lastRunAt: null,
      createdAt: nowIso(),
      updatedAt: nowIso(),
    }
  }

  normalizeBoard(entry, raw) {
    const fallback = this.defaultBoard(entry)
    if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) return fallback
    const board = { ...fallback, ...raw }
    board.schemaVersion = 1
    board.project = { ...fallback.project, ...(raw.project ?? {}), key: entry.key, path: entry.path, dir: entry.dir }
    board.settings = {
      ...DEFAULT_SETTINGS,
      ...(raw.settings ?? {}),
      schedule: { ...DEFAULT_SETTINGS.schedule, ...(raw.settings?.schedule ?? {}) },
    }
    board.settings.maxConcurrent = clampInt(board.settings.maxConcurrent, 1, 8, 2)
    board.settings.maxRetries = clampInt(board.settings.maxRetries, 0, 2, 1)
    board.settings.rotateAt = Math.min(0.95, Math.max(0.001, Number(board.settings.rotateAt) || 0.35))
    board.tasks = Array.isArray(raw.tasks) ? raw.tasks.filter((task) => task !== null && typeof task === 'object').map((task) => this.normalizeTask(task)) : []
    board.archived = Array.isArray(raw.archived) ? raw.archived.filter((task) => task !== null && typeof task === 'object') : []
    board.version = Number.isFinite(Number(raw.version)) ? Number(raw.version) : 1
    board.seq = Number.isFinite(Number(raw.seq)) ? Number(raw.seq) : 0
    board.paused = raw.paused === true
    return board
  }

  normalizeTask(raw) {
    const status = STATUS_KEYS.includes(raw.status) ? raw.status : 'editing'
    const task = {
      id: String(raw.id ?? 'T-000'),
      title: String(raw.title ?? ''),
      description: String(raw.description ?? ''),
      status,
      createdAt: raw.createdAt ?? nowIso(),
      createdBy: raw.createdBy === 'dsh' ? 'dsh' : 'adar',
      updatedAt: raw.updatedAt ?? raw.createdAt ?? nowIso(),
      updatedBy: raw.updatedBy === 'dsh' ? 'dsh' : 'adar',
      completedAt: raw.completedAt ?? null,
      acceptance: Array.isArray(raw.acceptance) ? raw.acceptance.map((line) => String(line)) : [],
      humanPrereqs: Array.isArray(raw.humanPrereqs) ? raw.humanPrereqs.map((line) => String(line)) : [],
      dependsOn: Array.isArray(raw.dependsOn) ? raw.dependsOn.map((line) => String(line)) : [],
      summary: String(raw.summary ?? ''),
      failure: raw.failure !== null && typeof raw.failure === 'object'
        ? { code: String(raw.failure.code ?? 'ERROR'), text: String(raw.failure.text ?? ''), at: raw.failure.at ?? nowIso() }
        : null,
      retryCount: clampInt(raw.retryCount, 0, 99, 0),
      maxRetries: clampInt(raw.maxRetries, 0, 2, 1),
      sessions: Array.isArray(raw.sessions) ? raw.sessions.map((session) => ({ ...session })) : [],
      verified: raw.verified === true,
      revision: clampInt(raw.revision, 1, 1e9, 1),
      archivedAt: raw.archivedAt ?? null,
    }
    if (task.status === 'done') task.completedAt = task.completedAt ?? task.updatedAt
    return task
  }

  channel(key) {
    let channel = this.channels.get(key)
    if (channel === undefined) {
      channel = { version: 0, waiters: new Set() }
      this.channels.set(key, channel)
    }
    return channel
  }

  notifyBoard(key, version) {
    const channel = this.channel(key)
    channel.version = version
    for (const waiter of [...channel.waiters]) waiter({ version })
    channel.waiters.clear()
  }

  /** Wake long-poll readers without changing the board version (e.g. PMO transcript). */
  pingChannel(key) {
    const channel = this.channel(key)
    for (const waiter of [...channel.waiters]) waiter({})
    channel.waiters.clear()
  }

  /** Reset storage root and caches after the settings page changed Config. */
  resetDataRoot() {
    this.dataRoot = resolve(String(current(this.config?.dataRoot, DEFAULT_DATA_ROOT)))
    this.cache.clear()
    this.channels.clear()
    this.queues.clear()
    this.bindings.clear()
    this.rounds.clear()
    this.schedulerConversations.clear()
  }

  /** Find the project whose directory (or PMO subdirectory) contains `cwd`. */
  async projectForCwd(cwd) {
    if (typeof cwd !== 'string' || cwd.length === 0) return undefined
    const normalized = normalizePath(cwd)
    const projects = await this.listProjects()
    let best
    let bestLength = -1
    for (const entry of projects) {
      for (const candidate of [entry.path, this.pmoDir(entry)]) {
        const prefix = normalizePath(candidate)
        if (prefix.length === 0) continue
        if (normalized === prefix || normalized.startsWith(`${prefix}/`)) {
          if (prefix.length > bestLength) {
            best = entry
            bestLength = prefix.length
          }
        }
      }
    }
    return best
  }

  /** Load (and cache) one board. */
  async loadBoard(entry) {
    const cached = this.cache.get(entry.key)
    if (cached !== undefined) return cached
    const raw = await readJsonFile(this.boardFile(entry), undefined)
    let board
    if (raw === undefined) {
      board = this.defaultBoard(entry)
      await writeJsonFile(this.boardFile(entry), board)
    } else {
      board = this.normalizeBoard(entry, raw)
    }
    this.cache.set(entry.key, board)
    this.channel(entry.key).version = board.version
    return board
  }

  /** Serialize every mutation for one project and persist it afterwards. */
  async mutateBoard(entry, mutator) {
    const previous = this.queues.get(entry.key) ?? Promise.resolve()
    const run = previous.then(async () => {
      const board = await this.loadBoard(entry)
      const result = await mutator(board)
      board.updatedAt = nowIso()
      board.version = (Number(board.version) || 1) + 1
      await writeJsonFile(this.boardFile(entry), board)
      this.cache.set(entry.key, board)
      this.notifyBoard(entry.key, board.version)
      return result
    })
    this.queues.set(entry.key, run.catch(() => {}))
    return run
  }

  // --------------------------------------------------------------------- log

  async appendLog(entry, event) {
    try {
      const line = JSON.stringify({ at: nowIso(), ...event })
      const file = this.logFile(entry)
      await mkdir(join(file, '..'), { recursive: true })
      await writeFile(file, `${line}\n`, { encoding: 'utf8', flag: 'a' })
    } catch {
      // Logging must never break a board write.
    }
  }

  // ------------------------------------------------------------------ engine

  settingsOf(board) {
    return board.settings ?? DEFAULT_SETTINGS
  }

  rotateThreshold(board) {
    return this.settingsOf(board).rotateAt ?? 0.35
  }

  /** Read context pressure as a 0..1 ratio, when the host can provide it. */
  pressureRatio(session) {
    try {
      const projections = this.ctx.get('sessionProjections')
      if (projections !== undefined) {
        const snapshot = projections.snapshot(session, ['contextPressure'])
        const pressure = snapshot?.values?.contextPressure
        if (pressure !== undefined && Number.isFinite(pressure.contextWindow) && pressure.contextWindow > 0) {
          const used = pressure.projectedTokens ?? pressure.pressureTokens
          if (Number.isFinite(used)) return Math.min(1, Math.max(0, used / pressure.contextWindow))
        }
      }
    } catch {
      // fall through to the meter
    }
    try {
      const meter = this.ctx.get('tokenMeter')
      const pressure = meter?.contextPressure?.(session)
      if (pressure !== undefined && Number.isFinite(pressure.contextWindow) && pressure.contextWindow > 0) {
        if (Number.isFinite(pressure.pressureTokens)) return Math.min(1, Math.max(0, pressure.pressureTokens / pressure.contextWindow))
      }
    } catch {
      // unavailable
    }
    return undefined
  }

  /** Local 60s tick: dispatch the night round when the off-peak window opens. */
  startTimer() {
    ctxInjectTimer(this.ctx, (scope) => {
      this.timer = scope.interval(() => {
        void this.tick().catch((error) => this.ctx.logger?.warn?.(`dsh-pm: tick failed: ${errorText(error)}`))
      }, 60_000)
      scope.timeout(() => {
        void this.recoverInterrupted().catch((error) => this.ctx.logger?.warn?.(`dsh-pm: recovery failed: ${errorText(error)}`))
      }, 5_000)
    })
  }

  /** After a restart no task can still be running: mark them failed with a reason. */
  async recoverInterrupted() {
    const projects = await this.listProjects()
    for (const entry of projects) {
      const board = await this.loadBoard(entry)
      const sessionsStore = this.ctx.get('sessions')
      const stuck = board.tasks.filter((task) => {
        if (task.status !== 'running') return false
        const sessionId = task.sessionId ?? task.sessions[task.sessions.length - 1]?.sessionId
        if (typeof sessionId !== 'string') return true
        return sessionsStore?.get?.(sessionId) === undefined
      })
      if (stuck.length === 0) continue
      await this.mutateBoard(entry, (value) => {
        for (const task of value.tasks) {
          if (task.status !== 'running') continue
          const sessionId = task.sessionId ?? task.sessions[task.sessions.length - 1]?.sessionId
          if (typeof sessionId === 'string' && sessionsStore?.get?.(sessionId) !== undefined) continue
          task.status = 'failed'
          task.failure = { code: 'interrupted', text: '执行中断：应用重启或会话已结束', at: nowIso() }
          task.updatedAt = nowIso()
          task.updatedBy = 'dsh'
          const record = task.sessions[task.sessions.length - 1]
          if (record !== undefined) {
            record.state = '执行中断'
            record.endedAt = nowIso()
          }
        }
      })
      await this.appendLog(entry, { action: 'board.recover', count: stuck.length })
      await this.refreshProjectState(entry)
    }
  }

  async tick() {
    if (this.stopped) return
    if (current(this.config?.autoRun, true) !== true) return
    const projects = await this.listProjects()
    const now = new Date()
    for (const entry of projects) {
      const board = await this.loadBoard(entry)
      if (board.paused) continue
      const settings = this.settingsOf(board)
      if (settings.schedule.mode === 'manual') continue
      if (!this.inWindow(settings.schedule, now)) continue
      if (this.roundActive(entry.key)) continue
      const ready = board.tasks.filter((task) => task.status === 'ready')
      if (ready.length === 0) continue
      const last = board.lastRunAt === null ? 0 : Date.parse(board.lastRunAt)
      if (Number.isFinite(last) && last > this.windowStart(settings.schedule, now)) continue
      await this.startRound(entry.key, 'timer')
    }
  }

  inWindow(schedule, date = new Date()) {
    const start = parseHhmm(schedule.start)
    const end = parseHhmm(schedule.end)
    if (start === undefined || end === undefined) return false
    if (isWeekend(date)) return true
    const minutes = minutesOf(date)
    if (start <= end) return minutes >= start && minutes < end
    return minutes >= start || minutes < end
  }

  /** Start of the window that contains `date` (ms epoch). */
  windowStart(schedule, date = new Date()) {
    const start = parseHhmm(schedule.start) ?? 0
    const base = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0)
    const minutes = minutesOf(date)
    const startToday = new Date(base.getTime() + start * 60_000)
    if (minutes >= start) return startToday.getTime()
    return startToday.getTime() - 24 * 3600_000
  }

  roundActive(key) {
    const round = this.rounds.get(key)
    if (round?.running === true) return true
    const tasks = this.cache.get(key)?.tasks ?? []
    return tasks.some((task) => task.status === 'running')
  }

  bindingFor(sessionId) {
    return this.bindings.get(sessionId)
  }

  taskOfBinding(binding) {
    const board = this.cache.get(binding.projectKey)
    return board?.tasks.find((task) => task.id === binding.taskId)
  }

  /** Deliver one text prompt to an existing session. */
  async deliver(sessionId, text, requestId = randomUUID()) {
    const controller = this.sessionController
    if (controller === undefined) throw new Error('会话服务不可用')
    await controller.prompt({
      sessionId,
      requestId,
      content: [{ type: 'text', text }],
    }, new AbortController().signal)
  }

  /** Match a project directory to a registered DSH workspace (so the session joins it). */
  workspaceIdFor(path) {
    try {
      const registry = this.ctx.get('workspaceRegistry')
      const items = typeof registry?.list === 'function' ? registry.list() : []
      const match = items.find((workspace) => samePath(workspace?.path, path))
      return typeof match?.id === 'string' ? match.id : undefined
    } catch {
      return undefined
    }
  }

  /** Create a visible session and give it a stable title when possible. */
  async createSession(cwd, title, joinWorkspace = false) {
    const controller = this.sessionController
    if (controller === undefined) throw new Error('会话服务不可用')
    const workspaceId = joinWorkspace ? this.workspaceIdFor(cwd) : undefined
    const created = workspaceId === undefined
      ? await controller.create({ cwd })
      : await controller.create({ workspaceId })
    const sessionId = created?.sessionId
    if (typeof sessionId !== 'string' || sessionId.length === 0) throw new Error('session-create-failed')
    if (typeof title === 'string' && title.length > 0) {
      try {
        await controller.rename?.({ sessionId, title })
      } catch {
        // Titles are cosmetic; a failed rename must not fail the task.
      }
    }
    return sessionId
  }

  buildBrief(task, board) {
    const acceptance = task.acceptance.length > 0 ? task.acceptance.map((line) => `  · ${line}`).join('\n') : '  · （无验收标准，做完后说明你验证了什么）'
    const prereqs = task.humanPrereqs.length > 0 ? task.humanPrereqs.map((line) => `  · ${line}`).join('\n') : '  · （无）'
    const depends = task.dependsOn.length > 0 ? task.dependsOn.join('、') : '无'
    const rotate = Math.round((this.rotateThreshold(board) ?? 0.35) * 100)
    return [
      `【任务 ${task.id}】${task.title}`,
      '',
      `· 目标：${task.description.length > 0 ? task.description : '（未填写）'}`,
      '· 验收：',
      acceptance,
      '· 需要我准备（如果你卡住，先跳过并记录，不要等我）：',
      prereqs,
      `· 依赖（仅提示）：${depends}`,
      '· 纪律：',
      '  1) 只改这个项目目录内的文件；别动我不认识的东西',
      '  2) 如无必要勿增实体；不要过度设计；能 10 行解决不要 50 行',
      '  3) 需要我拍板时，按最简方案自己决定，并把决定写进完成摘要',
      `  4) 接近上下文 ${rotate}% 时：先写「已完成/未完成/下一步」，再结束`,
      '· 完成时调用工具 pm_task_finish，传入三行摘要（改了什么 / 验证结果 / 需要我决定什么）。',
      '· 确认无法完成时调用 pm_task_fail，用一句人话写原因。',
    ].join('\n')
  }

  async startRound(projectKeyValue, trigger = 'manual') {
    const entry = await this.resolveProject(projectKeyValue)
    if (entry === undefined) throw new Error('project-not-found')
    const board = await this.loadBoard(entry)
    if (board.paused) return { started: false, reason: 'paused' }
    if (this.roundActive(entry.key)) return { started: false, reason: 'busy' }
    const settings = this.settingsOf(board)
    const ready = sortedTasks(board.tasks.filter((task) => task.status === 'ready'))
    if (ready.length === 0) return { started: false, reason: 'no-ready' }
    const round = { running: true, trigger, startedAt: nowIso(), dispatched: [] }
    this.rounds.set(entry.key, round)
    void this.runRound(entry, round).catch((error) => {
      this.ctx.logger?.warn?.(`dsh-pm: round failed: ${errorText(error)}`)
    })
    return { started: true, ready: ready.length }
  }

  async runRound(entry, round) {
    let plan
    try {
      plan = await this.requestPlan(entry, round)
    } catch (error) {
      this.ctx.logger?.warn?.(`dsh-pm: plan unavailable: ${errorText(error)}`)
      plan = undefined
    }
    try {
      const board = await this.loadBoard(entry)
      const settings = this.settingsOf(board)
      const limit = clampInt(settings.maxConcurrent, 1, 8, 2)
      const concurrency = plan?.concurrency === undefined ? limit : clampInt(plan.concurrency, 1, limit, limit)
      const ready = sortedTasks(board.tasks.filter((task) => task.status === 'ready'))
      const order = this.orderReady(ready, plan)
      const running = board.tasks.filter((task) => task.status === 'running').length
      const slots = Math.max(0, concurrency - running)
      for (const task of order.slice(0, slots)) {
        await this.dispatchTask(entry, round, task.id, plan?.rationale ?? '')
        round.dispatched.push(task.id)
      }
      await this.mutateBoard(entry, (boardValue) => {
        boardValue.lastRunAt = nowIso()
      })
      await this.appendLog(entry, { action: 'round.start', trigger: round.trigger, dispatched: round.dispatched, plan: plan === undefined ? null : plan.order })
      await this.refreshProjectState(entry)
    } finally {
      round.running = false
      await this.writeReport(entry).catch(() => {})
    }
  }

  orderReady(ready, plan) {
    if (plan === undefined || !Array.isArray(plan.order) || plan.order.length === 0) return ready
    const byId = new Map(ready.map((task) => [task.id, task]))
    const ordered = []
    for (const id of plan.order) {
      const task = byId.get(String(id))
      if (task !== undefined) {
        ordered.push(task)
        byId.delete(String(id))
      }
    }
    for (const task of ready) if (byId.has(task.id)) ordered.push(task)
    return ordered
  }

  /** Ask the PMO scheduler to read the whole board and propose an order. */
  async requestPlan(entry, round) {
    if (current(this.config?.planWithAgent, true) !== true) return undefined
    const board = await this.loadBoard(entry)
    if (typeof this.sessionController?.create !== 'function') return undefined
    const digest = board.tasks.map((task) => ({
      id: task.id,
      title: task.title,
      status: task.status,
      dependsOn: task.dependsOn,
      humanPrereqs: task.humanPrereqs,
      acceptance: task.acceptance,
    }))
    const conversation = await this.ensureSchedulerConversation(entry)
    if (conversation === undefined) return undefined
    const prompt = [
      '读一遍下面这块看板（JSON），只输出一个 JSON 对象，不要别的话：',
      '{"order":["T-001","T-002"],"concurrency":2,"rationale":"一句话"}',
      'order 只放 status 为 ready 的任务，按你建议的执行顺序；concurrency 不超过面板并发上限。',
      `看板：${JSON.stringify(digest)}`,
      `并发上限：${this.settingsOf(board).maxConcurrent}`,
    ].join('\n')
    const turn = this.waitTurnEnd(conversation.sessionId, 90_000)
    try {
      await this.deliver(conversation.sessionId, prompt)
    } catch (error) {
      this.cancelTurnWait(conversation.sessionId)
      throw error
    }
    const settled = await turn
    if (settled === false) return undefined
    const text = await this.lastAssistantText(conversation.sessionId)
    const plan = this.parsePlan(text)
    if (plan !== undefined) {
      await this.appendLog(entry, { action: 'round.plan', order: plan.order, concurrency: plan.concurrency, rationale: plan.rationale ?? '' })
    }
    return plan
  }

  parsePlan(text) {
    if (typeof text !== 'string' || text.length === 0) return undefined
    const start = text.indexOf('{')
    const end = text.lastIndexOf('}')
    if (start < 0 || end <= start) return undefined
    try {
      const value = JSON.parse(text.slice(start, end + 1))
      if (value === null || typeof value !== 'object') return undefined
      const order = Array.isArray(value.order) ? value.order.map((id) => String(id)) : []
      const concurrency = Number.isFinite(Number(value.concurrency)) ? Number(value.concurrency) : undefined
      return { order, concurrency, rationale: typeof value.rationale === 'string' ? value.rationale : '' }
    } catch {
      return undefined
    }
  }

  async ensureSchedulerConversation(entry) {
    const existing = this.schedulerConversations.get(entry.key)
    if (existing !== undefined) {
      const live = this.ctx.get('sessions')?.get?.(existing)
      if (live !== undefined) return { sessionId: existing }
    }
    try {
      const sessionId = await this.createSchedulerSession(entry)
      this.schedulerConversations.set(entry.key, sessionId)
      return { sessionId }
    } catch (error) {
      this.ctx.logger?.warn?.(`dsh-pm: scheduler session unavailable: ${errorText(error)}`)
      return undefined
    }
  }

  async createSchedulerSession(entry) {
    const dir = this.pmoDir(entry)
    await mkdir(dir, { recursive: true })
    const date = new Date()
    const title = `今晚排期 · ${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`
    const sessionId = await this.createSession(dir, title)
    // Keep the scheduler conversation findable in the PMO list.
    const sessions = await this.loadSessions(entry)
    sessions.pmo.conversations = sessions.pmo.conversations.filter((item) => item.id !== sessionId)
    sessions.pmo.conversations.push({ id: sessionId, title, createdAt: nowIso(), updatedAt: nowIso(), kind: 'schedule' })
    await this.saveSessions(entry, sessions)
    return sessionId
  }

  /** Wait once for `turn/end` on a session. Resolves false on timeout. */
  waitTurnEnd(sessionId, timeoutMs) {
    return new Promise((resolvePromise) => {
      const waiters = this.turnWaiters.get(sessionId) ?? new Set()
      this.turnWaiters.set(sessionId, waiters)
      const waiter = (value) => {
        clearTimeout(waiter.timer)
        waiters.delete(waiter)
        if (waiters.size === 0) this.turnWaiters.delete(sessionId)
        resolvePromise(value)
      }
      waiter.timer = setTimeout(() => waiter(false), timeoutMs)
      waiters.add(waiter)
    })
  }

  cancelTurnWait(sessionId) {
    const waiters = this.turnWaiters.get(sessionId)
    if (waiters === undefined) return
    for (const waiter of [...waiters]) waiter(false)
  }

  async lastAssistantText(sessionId) {
    const entries = await this.transcript(sessionId).catch(() => [])
    for (let index = entries.length - 1; index >= 0; index -= 1) {
      if (entries[index].role === 'ai' && entries[index].text.length > 0) return entries[index].text
    }
    return ''
  }

  /** Dispatch one ready task: status running, visible session, brief delivered. */
  async dispatchTask(entry, round, taskId, rationale) {
    const board = await this.loadBoard(entry)
    const task = board.tasks.find((item) => item.id === taskId)
    if (task === undefined || task.status !== 'ready') return
    const title = `${task.id} · ${task.title}`
    let sessionId
    try {
      sessionId = await this.createSession(entry.path, title, true)
    } catch (error) {
      await this.failTask(entry, taskId, 'session-create', `建立对话失败：${errorText(error)}`)
      return
    }
    const startedAt = nowIso()
    await this.mutateBoard(entry, (boardValue) => {
      const currentTask = boardValue.tasks.find((item) => item.id === taskId)
      if (currentTask === undefined) return
      currentTask.status = 'running'
      currentTask.updatedAt = startedAt
      currentTask.updatedBy = 'dsh'
      currentTask.failure = null
      currentTask.sessions.push({ sessionId, title, startedAt, endedAt: null, state: '进行中 · 上下文 0%', ratio: 0 })
      currentTask.sessionId = sessionId
    })
    this.bindings.set(sessionId, { projectKey: entry.key, taskId, continues: 0, mode: 'run' })
    await this.appendLog(entry, { action: 'task.run', taskId, sessionId, rationale })
    await this.saveSessionsFor(entry, taskId, sessionId, title, startedAt)
    try {
      await this.deliver(sessionId, this.buildBrief(task, board))
    } catch (error) {
      await this.failTask(entry, taskId, 'prompt', `投递任务简报失败：${errorText(error)}`)
    }
  }

  async failTask(entry, taskId, code, text) {
    await this.mutateBoard(entry, (board) => {
      const task = board.tasks.find((item) => item.id === taskId)
      if (task === undefined) return
      task.status = 'failed'
      task.failure = { code, text, at: nowIso() }
      task.updatedAt = nowIso()
      task.updatedBy = 'dsh'
      const session = task.sessions[task.sessions.length - 1]
      if (session !== undefined) {
        session.state = `执行失败 · ${text}`
        session.endedAt = nowIso()
      }
    })
    const board = this.cache.get(entry.key)
    const task = board?.tasks.find((item) => item.id === taskId)
    if (task !== undefined) this.releaseBinding(task)
    await this.appendLog(entry, { action: 'task.failed', taskId, code, text })
    await this.refreshProjectState(entry)
    await this.maybeDispatchNext(entry)
  }

  releaseBinding(task) {
    for (const [sessionId, binding] of this.bindings) {
      if (binding.taskId === task.id) this.bindings.delete(sessionId)
    }
    if (task.sessionId !== undefined) this.bindings.delete(task.sessionId)
  }

  /** After a task ends, keep the queue moving while slots are free. */
  async maybeDispatchNext(entry) {
    const board = this.cache.get(entry.key) ?? await this.loadBoard(entry)
    if (board.paused) return
    const round = this.rounds.get(entry.key)
    if (round?.running === true) return
    const settings = this.settingsOf(board)
    const limit = clampInt(settings.maxConcurrent, 1, 8, 2)
    const running = board.tasks.filter((task) => task.status === 'running').length
    if (running >= limit) return
    const next = sortedTasks(board.tasks.filter((task) => task.status === 'ready'))[0]
    if (next === undefined) return
    await this.dispatchTask(entry, { running: false, dispatched: [] }, next.id, 'queue')
  }

  /** `turn/end` on any session: task progress, plan/handoff waiters, rotation. */
  async onSessionEvent(session, event) {
    if (event?.type !== 'turn/end') return
    void this.pingForSession(session)
    const waiters = this.turnWaiters.get(session.id)
    if (waiters !== undefined) {
      const first = waiters.values().next().value
      if (first !== undefined) first(true)
    }
    const binding = this.bindings.get(session.id)
    if (binding === undefined) return
    try {
      await this.onTaskTurnEnd(binding, session, event)
    } catch (error) {
      this.ctx.logger?.warn?.(`dsh-pm: turn handler failed: ${errorText(error)}`)
    }
  }

  /** Wake the page for the project that owns this session (e.g. a PMO reply). */
  async pingForSession(session) {
    try {
      const cwd = session?.header?.cwd ?? session?.cwd
      const entry = await this.projectForCwd(cwd)
      if (entry !== undefined) this.pingChannel(entry.key)
    } catch {
      // best effort
    }
  }

  async onTaskTurnEnd(binding, session, event) {
    const entry = await this.resolveProject(binding.projectKey)
    if (entry === undefined) return
    const board = this.cache.get(entry.key) ?? await this.loadBoard(entry)
    const task = board.tasks.find((item) => item.id === binding.taskId)
    if (task === undefined) {
      this.bindings.delete(session.id)
      return
    }
    if (task.status !== 'running') {
      this.bindings.delete(session.id)
      return
    }
    // The provider refused the turn (auth, quota, network): report the reason once.
    const reason = event?.data?.reason
    if (reason?.kind === 'error') {
      const message = String(reason.error?.message ?? '模型调用失败').slice(0, 200)
      const code = String(reason.error?.status ?? reason.error?.code ?? 'error')
      await this.failTask(entry, task.id, code, `执行失败：${message}`)
      return
    }
    const ratio = this.pressureRatio(session)
    if (ratio !== undefined) {
      await this.mutateBoard(entry, (boardValue) => {
        const currentTask = boardValue.tasks.find((item) => item.id === task.id)
        const record = currentTask?.sessions.find((item) => item.sessionId === session.id)
        if (record !== undefined) {
          record.ratio = ratio
          record.state = `进行中 · 上下文 ${Math.round(ratio * 100)}%`
        }
      })
    }
    const threshold = this.rotateThreshold(board)
    await this.appendLog(entry, { action: 'task.turn', taskId: task.id, ratio: ratio ?? null, threshold, continues: binding.continues ?? 0 })
    if (ratio !== undefined && ratio >= threshold) {
      await this.rotateTask(entry, task.id, session, ratio)
      return
    }
    if ((binding.continues ?? 0) < 3) {
      binding.continues = (binding.continues ?? 0) + 1
      try {
        await this.deliver(session.id, [
          `（第 ${binding.continues} 次继续）上一个回合结束了，任务尚未标记完成。`,
          '继续推进；只做这个任务；完成后调用 pm_task_finish 写三行摘要；无法完成则调用 pm_task_fail。',
        ].join('\n'))
        return
      } catch (error) {
        this.ctx.logger?.warn?.(`dsh-pm: continue prompt failed: ${errorText(error)}`)
      }
    }
    await this.failTask(entry, task.id, 'stalled', '回合结束但未报告完成')
  }

  /** Context pressure crossed the threshold: hand off, then continue in a new session. */
  async rotateTask(entry, taskId, session, ratio) {
    const board = this.loadBoard ? await this.loadBoard(entry) : undefined
    const threshold = board === undefined ? 0.35 : this.rotateThreshold(board)
    await this.mutateBoard(entry, (boardValue) => {
      const task = boardValue.tasks.find((item) => item.id === taskId)
      if (task === undefined) return
      task.updatedAt = nowIso()
      task.updatedBy = 'dsh'
      const record = task.sessions.find((item) => item.sessionId === session.id)
      if (record !== undefined) {
        record.ratio = ratio
        record.state = `已达阈值并交接 · 上下文 ${Math.round(ratio * 100)}%`
        record.endedAt = nowIso()
      }
    })
    this.bindings.delete(session.id)
    await this.appendLog(entry, { action: 'task.rotate', taskId, from: session.id, ratio, threshold })
    let handoff = ''
    try {
      const wait = this.waitTurnEnd(session.id, 60_000)
      await this.deliver(session.id, [
        `上下文已到 ${Math.round(ratio * 100)}%（阈值 ${Math.round(threshold * 100)}%），这个对话要收尾了。`,
        '只输出三行，不要做别的：',
        '已完成：……',
        '未完成：……',
        '下一步：……',
      ].join('\n'))
      await wait
      handoff = await this.lastAssistantText(session.id)
    } catch (error) {
      this.ctx.logger?.warn?.(`dsh-pm: handoff failed: ${errorText(error)}`)
    }
    const currentBoard = this.cache.get(entry.key) ?? await this.loadBoard(entry)
    const task = currentBoard.tasks.find((item) => item.id === taskId)
    if (task === undefined || task.status !== 'running') return
    const title = `${taskId} · ${task.title}（续）`
    let newSessionId
    try {
      newSessionId = await this.createSession(entry.path, title, true)
    } catch (error) {
      await this.failTask(entry, taskId, 'rotate', `换对话失败：${errorText(error)}`)
      return
    }
    await this.mutateBoard(entry, (boardValue) => {
      const currentTask = boardValue.tasks.find((item) => item.id === taskId)
      if (currentTask === undefined) return
      currentTask.sessions.push({ sessionId: newSessionId, title, startedAt: nowIso(), endedAt: null, state: '进行中 · 上下文 0%', ratio: 0 })
      currentTask.sessionId = newSessionId
    })
    this.bindings.set(newSessionId, { projectKey: entry.key, taskId, continues: 0, mode: 'run' })
    await this.saveSessionsFor(entry, taskId, newSessionId, title, nowIso())
    const handoffBlock = handoff.length > 0 ? `【上一个对话的交接】\n${handoff}` : '【上一个对话没有留下交接】'
    try {
      await this.deliver(newSessionId, `${handoffBlock}\n\n${this.buildBrief(task, currentBoard)}`)
    } catch (error) {
      await this.failTask(entry, taskId, 'prompt', `投递交接失败：${errorText(error)}`)
    }
  }

  /** Tool: mark the bound task done. */
  async finishTask(exec, summary, verified) {
    const sessionId = exec?.agent?.session?.id ?? exec?.agent?.id
    const binding = this.bindings.get(sessionId)
    if (binding === undefined) return { ok: false, error: 'no-running-task' }
    const entry = await this.resolveProject(binding.projectKey)
    if (entry === undefined) return { ok: false, error: 'project-not-found' }
    let didFinish = false
    await this.mutateBoard(entry, (board) => {
      const task = board.tasks.find((item) => item.id === binding.taskId)
      if (task === undefined || task.status !== 'running') return
      task.status = 'done'
      task.completedAt = nowIso()
      task.updatedAt = task.completedAt
      task.updatedBy = 'dsh'
      task.summary = String(summary ?? '').slice(0, 2000)
      task.verified = task.acceptance.length > 0 && verified !== false
      task.failure = null
      const record = task.sessions.find((item) => item.sessionId === sessionId)
      if (record !== undefined) {
        record.state = '已完结'
        record.endedAt = nowIso()
      }
      didFinish = true
    })
    if (!didFinish) return { ok: false, error: 'not-running' }
    const board = this.cache.get(entry.key)
    const task = board?.tasks.find((item) => item.id === binding.taskId)
    if (task !== undefined) this.releaseBinding(task)
    await this.appendLog(entry, { action: 'task.done', taskId: binding.taskId })
    await this.refreshProjectState(entry)
    await this.maybeDispatchNext(entry)
    return { ok: true, taskId: binding.taskId }
  }

  // -------------------------------------------------------------------- PMO

  async loadSessions(entry) {
    const raw = await readJsonFile(this.sessionsFile(entry), undefined)
    const sessions = raw !== null && typeof raw === 'object' ? raw : {}
    if (sessions.tasks === undefined || typeof sessions.tasks !== 'object') sessions.tasks = {}
    if (sessions.pmo === undefined || typeof sessions.pmo !== 'object') sessions.pmo = {}
    if (!Array.isArray(sessions.pmo.conversations)) sessions.pmo.conversations = []
    return sessions
  }

  async saveSessions(entry, sessions) {
    sessions.schemaVersion = 1
    sessions.updatedAt = nowIso()
    await writeJsonFile(this.sessionsFile(entry), sessions)
  }

  async saveSessionsFor(entry, taskId, sessionId, title, startedAt) {
    const sessions = await this.loadSessions(entry)
    const list = Array.isArray(sessions.tasks[taskId]) ? sessions.tasks[taskId] : []
    if (!list.some((item) => item.id === sessionId)) list.push({ id: sessionId, title, startedAt })
    sessions.tasks[taskId] = list
    await this.saveSessions(entry, sessions)
  }

  async pmoConversations(entry) {
    const sessions = await this.loadSessions(entry)
    const items = sessions.pmo.conversations.filter((item) => typeof item?.id === 'string')
    items.sort((left, right) => String(right.createdAt).localeCompare(String(left.createdAt)))
    return items
  }

  async ensurePmoConversation(entry, forceNew = false) {
    const conversations = await this.pmoConversations(entry)
    if (!forceNew && conversations.length > 0) return conversations[0]
    const dir = this.pmoDir(entry)
    await mkdir(dir, { recursive: true })
    const sessionId = await this.createSession(dir, '新对话')
    const sessions = await this.loadSessions(entry)
    sessions.pmo.conversations.push({ id: sessionId, title: '新对话', createdAt: nowIso(), updatedAt: nowIso() })
    await this.saveSessions(entry, sessions)
    return { id: sessionId, title: '新对话', createdAt: nowIso(), kind: 'pmo' }
  }

  /** First-message briefing: project state + how to drive the board. */
  async pmoBriefing(entry) {
    const state = await this.readProjectState(entry)
    return [
      '【项目状态清单】（由插件自动注入）',
      state.length > 0 ? state : '（还没有项目状态文件）',
      '',
      '你可以用这些工具：pm_read_board / pm_create_task / pm_update_task / pm_set_task_status / pm_archive_done / pm_delete_task / pm_write_project_state / pm_read_project_state / pm_run_round。',
      '每轮结束前用 pm_write_project_state 更新「最近决定」「下一步」。',
    ].join('\n')
  }

  async sendPmo(entry, conversationId, text, requestId) {
    const conversations = await this.pmoConversations(entry)
    let conversation = conversations.find((item) => item.id === conversationId)
    if (conversation === undefined) conversation = conversations[0]
    if (conversation === undefined) {
      const created = await this.ensurePmoConversation(entry, true)
      conversation = created
      await this.deliver(conversation.id, await this.pmoBriefing(entry))
    } else {
      const sessions = await this.loadSessions(entry)
      const record = sessions.pmo.conversations.find((item) => item.id === conversation.id)
      if (record !== undefined && record.briefed !== true) {
        record.briefed = true
        await this.saveSessions(entry, sessions)
        await this.deliver(conversation.id, await this.pmoBriefing(entry))
      }
    }
    const prompt = String(text ?? '').slice(0, 20_000)
    if (prompt.trim().length === 0) throw new Error('empty-message')
    await this.deliver(conversation.id, prompt, requestId ?? randomUUID())
    this.pingChannel(entry.key)
    if (conversation.title === '新对话') {
      const title = prompt.replace(/\s+/g, ' ').trim().slice(0, 20)
      if (title.length > 0) {
        conversation.title = title
        const sessions = await this.loadSessions(entry)
        const record = sessions.pmo.conversations.find((item) => item.id === conversation.id)
        if (record !== undefined) record.title = title
        await this.saveSessions(entry, sessions)
        try {
          await this.sessionController?.rename?.({ sessionId: conversation.id, title })
        } catch {
          // ignore
        }
      }
    }
    return conversation
  }

  // ---------------------------------------------------------------- sessions

  /** Read raw session events, live or cold, through the query service. */
  async readEvents(sessionId) {
    try {
      const query = this.ctx.get('sessionQuery')
      if (query !== undefined) {
        const observation = await query.observeSession(sessionId, {})
        try {
          return observation.events ?? []
        } finally {
          observation[Symbol.dispose]?.()
        }
      }
    } catch {
      // fall through to the live session
    }
    try {
      const live = this.ctx.get('sessions')?.get?.(sessionId)
      if (live !== undefined && typeof live.snapshotEvents === 'function') return live.snapshotEvents()
    } catch {
      // unavailable
    }
    return []
  }

  /** Read one transcript as UI entries. */
  async transcript(sessionId) {
    const events = await this.readEvents(sessionId)
    if (!Array.isArray(events)) return []
    const entries = []
    for (const event of events.slice(-800)) {
      if (event?.type === 'user/message') {
        const text = textBlocks(event.data?.content)
        if (text.startsWith('【项目状态清单】')) {
          entries.push({ role: 'tool', text: '已读项目状态清单' })
          continue
        }
        // Harness-injected turn context is not part of the human transcript.
        if (/^(Current runtime context|<system-reminder>|Time sampled while preparing|The working directory changed)/.test(text)) continue
        if (text.startsWith('读一遍下面这块看板')) {
          entries.push({ role: 'tool', text: '已读取看板 · 生成执行顺序' })
          continue
        }
        if (text.length > 0) entries.push({ role: 'user', text: text.slice(0, 8000) })
      } else if (event?.type === 'assistant/message') {
        const text = textBlocks(event.data?.message?.content)
        if (/^\s*\{[\s\S]*"order"\s*:/.test(text)) {
          const plan = this.parsePlan(text)
          if (plan !== undefined) {
            entries.push({ role: 'tool', text: `执行顺序：${plan.order.join('、') || '无'}${plan.concurrency === undefined ? '' : ` · 并发 ${plan.concurrency}`}` })
            continue
          }
        }
        if (text.length > 0) entries.push({ role: 'ai', text: text.slice(0, 8000) })
      } else if (event?.type === 'tool/call') {
        const name = String(event.data?.name ?? '')
        if (name.startsWith('pm_')) entries.push({ role: 'tool', text: toolLine(name, event.data?.arguments) })
      }
    }
    return entries
  }

  async conversationStats(sessionId) {
    const events = await this.readEvents(sessionId)
    let turns = 0
    let steps = 0
    let tokens = 0
    let cached = 0
    let durationMs = 0
    for (const event of Array.isArray(events) ? events : []) {
      if (event?.type === 'turn/start') turns += 1
      if (event?.type === 'step/end') steps += 1
      const usage = event?.data?.usage
      if (usage !== null && typeof usage === 'object') {
        const input = Number(usage.inputTokens ?? usage.promptTokens ?? 0)
        const output = Number(usage.outputTokens ?? usage.completionTokens ?? 0)
        const cacheRead = Number(usage.cacheReadTokens ?? usage.cachedTokens ?? usage.cacheHitTokens ?? 0)
        if (Number.isFinite(input)) tokens += input
        if (Number.isFinite(output)) tokens += output
        if (Number.isFinite(cacheRead)) cached += cacheRead
        if (Number.isFinite(Number(usage.durationMs))) durationMs += Number(usage.durationMs)
      }
    }
    const tps = durationMs > 0 ? Math.round(tokens / (durationMs / 1000)) : 0
    const cacheRate = tokens > 0 ? Math.min(100, Math.round((cached / tokens) * 100)) : 0
    return { turns, steps, tokens, cacheRate, tps }
  }

  // -------------------------------------------------------------- state file

  async readProjectState(entry) {
    try {
      return await readFile(this.stateFile(entry), 'utf8')
    } catch {
      return ''
    }
  }

  /** Keep 最近决定 / 下一步 the agent wrote, regenerate the rest. */
  async refreshProjectState(entry) {
    const board = this.cache.get(entry.key) ?? await this.loadBoard(entry)
    const existing = await this.readProjectState(entry)
    const decisions = extractStateSection(existing, '最近决定')
    const next = extractStateSection(existing, '下一步')
    const counts = statusCounts(board.tasks)
    const stuck = []
    for (const task of board.tasks) {
      if (task.status === 'failed') stuck.push(`${task.id} 失败：${task.failure?.text ?? '未写原因'}`)
      if (task.status === 'paused') stuck.push(`${task.id} 暂停${task.humanPrereqs.length > 0 ? `（等 ${task.humanPrereqs.join('、')}）` : ''}`)
      if (task.status === 'ready' && task.humanPrereqs.length > 0) stuck.push(`${task.id} 待执行（等 ${task.humanPrereqs.join('、')}）`)
      if (task.status === 'running') {
        const record = task.sessions[task.sessions.length - 1]
        stuck.push(`${task.id} 执行中${record?.ratio !== undefined ? ` · 上下文 ${Math.round(record.ratio * 100)}%` : ''}`)
      }
    }
    const state = [
      `# 项目状态 · ${entry.name}`,
      '<!-- 由 PM agent 与看板插件维护；给 agent 读，不是给人看的。 -->',
      '',
      '## 项目',
      `${entry.name} · ${entry.path}`,
      `看板 .dsh-kanban/${entry.dir}/board.json`,
      '',
      '## 任务状态',
      `共 ${board.tasks.length}：${STATUS_KEYS.map((key) => `${STATUS[key].label} ${counts[key]}`).join(' · ')}`,
      ...stuck.map((line) => `- ${line}`),
      '',
      '## 明细路径',
      `任务文件 .dsh-kanban/${entry.dir}/board.json（tasks 数组）`,
      `执行记录 .dsh-kanban/${entry.dir}/sessions.json`,
      `晨报 .dsh-kanban/${entry.dir}/report/${dayKey()}.md`,
      `变更日志 .dsh-kanban/${entry.dir}/log/${dayKey()}.jsonl`,
      '',
      '## 最近决定',
      decisions.length > 0 ? decisions : '- （还没有记录）',
      '',
      '## 下一步',
      next.length > 0 ? next : '- （还没有记录）',
      '',
    ].join('\n')
    await writeTextFile(this.stateFile(entry), state)
    return state
  }

  async writeAgentState(entry, decisions, next) {
    const board = this.cache.get(entry.key) ?? await this.loadBoard(entry)
    const existing = await this.readProjectState(entry)
    const oldDecisions = extractStateSection(existing, '最近决定')
    const oldNext = extractStateSection(existing, '下一步')
    const mergedDecisions = decisions.length > 0 ? decisions : oldDecisions
    const mergedNext = next.length > 0 ? next : oldNext
    if (mergedDecisions.length > 0) {
      const sessions = await this.loadSessions(entry)
      sessions.state = { ...(sessions.state ?? {}), decisions: mergedDecisions, next: mergedNext, updatedAt: nowIso() }
      await this.saveSessions(entry, sessions)
    }
    await this.refreshProjectState(entry)
    const state = await this.readProjectState(entry)
    return { ok: true, state }
  }

  // ----------------------------------------------------------------- report

  async writeReport(entry) {
    const board = this.cache.get(entry.key) ?? await this.loadBoard(entry)
    const completed = board.tasks.filter((task) => task.status === 'done' && task.completedAt !== null && dayKey(new Date(task.completedAt)) === dayKey())
    const failed = board.tasks.filter((task) => task.status === 'failed')
    const needs = board.tasks.filter((task) => task.humanPrereqs.length > 0 && task.status !== 'done')
    const unverified = board.tasks.filter((task) => task.status === 'done' && !task.verified)
    const lines = [
      `# ${dayKey()} 执行报告`,
      '',
      `触发：${board.lastRunAt ?? '—'}`,
      `看板：${entry.name}`,
      '',
      `## 完成 ${completed.length}`,
      ...(completed.length === 0 ? ['- 无'] : completed.map((task) => `- ${task.id} ${task.title} — 完成于 ${task.completedAt === null ? '' : hhmm(new Date(task.completedAt))}`)),
      '',
      `## 失败 ${failed.length}`,
      ...(failed.length === 0 ? ['- 无'] : failed.map((task) => `- ${task.id} ${task.title} — ${task.failure?.text ?? '未写原因'}`)),
      '',
      `## 待你准备 ${needs.length}`,
      ...(needs.length === 0 ? ['- 无'] : needs.map((task) => `- ${task.id} ${task.title} — ${task.humanPrereqs.join('；')}`)),
      '',
      `## 未验证 ${unverified.length}`,
      ...(unverified.length === 0 ? ['- 无'] : unverified.map((task) => `- ${task.id} ${task.title}（无验收标准）`)),
      '',
    ]
    await writeTextFile(this.reportFile(entry), lines.join('\n'))
    return lines.join('\n')
  }
}

function toolLine(toolName, args) {
  const name = String(toolName ?? '').replace(/^pm_/, '')
  const map = {
    read_board: '读取看板',
    create_task: '新建任务',
    update_task: '更新任务',
    set_task_status: '修改状态',
    archive_done: '归档已完结',
    delete_task: '删除任务',
    write_project_state: '更新项目状态',
    read_project_state: '读取项目状态',
    run_round: '开始执行',
    task_finish: '任务完成',
    task_fail: '任务失败',
  }
  const label = map[name] ?? name
  const taskId = args !== null && typeof args === 'object' ? args.task_id : undefined
  return typeof taskId === 'string' && taskId.length > 0 ? `${label} · ${taskId}` : label
}

/** Read one `## 标题` section body from project-state.md. */
function extractStateSection(text, heading) {  if (typeof text !== 'string') return ''
  const lines = text.split(/\r?\n/)
  const start = lines.findIndex((line) => line.trim() === `## ${heading}`)
  if (start < 0) return ''
  const body = []
  for (let index = start + 1; index < lines.length; index += 1) {
    const line = lines[index]
    if (/^##\s/.test(line)) break
    body.push(line)
  }
  return body.join('\n').trim()
}

/** Mount the plugin timer through a declared child context (cordis inject rule). */
function ctxInjectTimer(ctx, setup) {
  try {
    if (typeof ctx.inject !== 'function') return
    ctx.inject(['timer'], (scope) => { setup(scope) }, 'dsh-pm: timer')
  } catch (error) {
    ctx.logger?.warn?.(`dsh-pm: timer unavailable: ${errorText(error)}`)
  }
}

export function apply(ctx, config) {
  const host = new PmHost(ctx, config)

  ctx.effect(() => {
    const off = ctx.on('session/event', (session, event) => {
      void host.onSessionEvent(session, event)
    })
    return () => {
      if (typeof off === 'function') off()
    }
  }, 'dsh-pm: turn events')

  host.startTimer()
  ctx.effect(() => () => {
    host.stopped = true
  }, 'dsh-pm: stop tick')

  // A settings write changes volatile Config: drop caches and re-read the root.
  ctx.effect(() => {
    const off = ctx.on('loader/volatile-update', () => {
      try {
        host.resetDataRoot()
        void host.tick().catch(() => {})
      } catch (error) {
        ctx.logger?.warn?.(`dsh-pm: config reload failed: ${errorText(error)}`)
      }
    })
    return () => {
      if (typeof off === 'function') off()
    }
  }, 'dsh-pm: config changes')

  // The plugin ships its own settings page, so hide the generated schema page.
  ctx.inject(['settings'], (scope) => {
    scope.effect(() => scope.settings.configure({ auto: false }, ctx.fiber), 'dsh-pm: settings page policy')
  })

  // ------------------------------------------------------------- tools
  ctx.inject(['tools'], (toolsCtx) => {
    registerTools(toolsCtx, host)
  }, 'dsh-pm: agent tools')

  // Session control is optional at mount time: wait for the service, then use it.
  ctx.inject(['sessionController'], (scope) => {
    host.attachEngine(scope)
  }, 'dsh-pm: session control')

  // ------------------------------------------------------------- route
  ctx.effect(() => {
    const off = ctx.webServer.register({
      kind: 'exact',
      path: '/dsh-pm/api',
      handler: async (req, res) => {
        if (req.method !== 'POST') {
          sendJson(res, 405, { ok: false, error: 'method' })
          return
        }
        if (ctx.connection.requestRejection({ headers: req.headers }) !== undefined) {
          sendJson(res, 401, { ok: false, error: 'unauthorized' })
          return
        }
        let body
        try {
          body = await readJsonBody(req)
        } catch (error) {
          sendJson(res, 400, { ok: false, error: errorText(error) })
          return
        }
        try {
          const value = await handleRequest(ctx, host, body)
          sendJson(res, 200, value)
        } catch (error) {
          sendJson(res, 200, { ok: false, error: errorText(error) })
        }
      },
    })
    return () => {
      if (typeof off === 'function') off()
    }
  }, 'dsh-pm: HTTP surface')
}

// ---------------------------------------------------------------- request ops

async function handleRequest(ctx, host, body) {
  const op = String(body.op ?? '')
  switch (op) {
    case 'hello':
      return { ok: true, dataRoot: host.dataRootPath, version: '0.1.0', now: nowIso() }
    case 'sync':
      return syncProjects(host, body)
    case 'snapshot':
      return snapshot(ctx, host, body)
    case 'watch':
      return watchOp(host, body)
    case 'task.create':
      return createTask(ctx, host, body)
    case 'task.update':
      return updateTask(host, body)
    case 'task.status':
      return setStatus(host, body)
    case 'task.archive':
      return archiveTask(host, body)
    case 'board.archiveDone':
      return archiveDone(host, body)
    case 'settings.update':
      return updateSettings(host, body)
    case 'pause.set':
      return setPaused(host, body)
    case 'run.start':
      return startRun(host, body)
    case 'report.list':
      return reportList(host, body)
    case 'report.get':
      return reportGet(host, body)
    case 'pmo.new':
      return newConversation(host, body)
    case 'pmo.send':
      return sendMessage(host, body)
    case 'state.get':
      return getState(host, body)
    default:
      return { ok: false, error: 'unknown-op' }
  }
}

async function entryFor(host, body) {
  const entry = await host.resolveProject(body.project)
  if (entry === undefined) throw new Error('project-not-found')
  return entry
}

async function syncProjects(host, body) {
  const workspaces = Array.isArray(body.workspaces) ? body.workspaces : []
  const projects = []
  for (const workspace of workspaces) {
    const entry = await host.ensureProject(workspace)
    if (entry !== undefined) projects.push(entry)
  }
  const all = await host.listProjects()
  const cards = []
  for (const entry of all) {
    const board = await host.loadBoard(entry)
    cards.push({
      key: entry.key,
      name: entry.name,
      path: entry.path,
      counts: statusCounts(board.tasks),
      paused: board.paused,
      running: board.tasks.filter((task) => task.status === 'running').length,
    })
  }
  return { ok: true, projects: cards }
}

async function snapshot(ctx, host, body) {
  const entry = await entryFor(host, body)
  const board = await host.loadBoard(entry)
  const conversations = await host.pmoConversations(entry)
  const requested = typeof body.convId === 'string' ? body.convId : undefined
  const current = conversations.find((item) => item.id === requested) ?? conversations[0]
  const messages = current === undefined ? [] : await host.transcript(current.id)
  const stats = current === undefined ? { turns: 0, steps: 0, tokens: 0, cacheRate: 0, tps: 0 } : await host.conversationStats(current.id)
  const contextRate = current === undefined ? 0 : await readContextRate(ctx, current.id)
  const state = await host.readProjectState(entry)
  const reportExists = existsSync(host.reportFile(entry))
  return {
    ok: true,
    now: nowIso(),
    project: { key: entry.key, name: entry.name, path: entry.path, dir: entry.dir },
    board: {
      version: board.version,
      paused: board.paused,
      settings: board.settings,
      seq: board.seq,
      tasks: board.tasks,
      archivedCount: board.archived.length,
      lastRunAt: board.lastRunAt,
    },
    subline: sublineOf(board),
    pmo: {
      conversations: conversations.map((item) => ({ id: item.id, title: item.title, date: shortDate(item.createdAt) })),
      currentId: current?.id ?? null,
      messages,
      stats: { ...stats, contextRate },
    },
    state: { text: state, updatedAt: nowIso() },
    report: { date: dayKey(), exists: reportExists },
  }
}

async function readContextRate(ctx, sessionId) {
  try {
    const session = ctx.get('sessions')?.get?.(sessionId)
    if (session === undefined) return 0
    const projections = ctx.get('sessionProjections')
    if (projections === undefined) return 0
    const snapshotValue = projections.snapshot(session, ['contextPressure'])
    const pressure = snapshotValue?.values?.contextPressure
    if (pressure === undefined || !Number.isFinite(pressure.contextWindow) || pressure.contextWindow <= 0) return 0
    const used = pressure.projectedTokens ?? pressure.pressureTokens
    if (!Number.isFinite(used)) return 0
    return Math.min(1, Math.max(0, used / pressure.contextWindow))
  } catch {
    return 0
  }
}

function shortDate(value) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return `${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`
}

function sublineOf(board) {
  if (board.paused) return '已暂停 · 不会派新任务'
  const running = board.tasks.filter((task) => task.status === 'running').length
  if (running > 0) return `正在执行 · ${running} 条对话在跑`
  const settings = board.settings
  const rotate = Math.round(settings.rotateAt * 100)
  return `${settings.schedule.start} 开始 · 并发 ${settings.maxConcurrent} · ${rotate}% 换对话`
}

async function watchOp(host, body) {
  const entry = await host.resolveProject(body.project)
  if (entry === undefined) return { ok: false, error: 'project-not-found' }
  const channel = host.channel(entry.key)
  const version = Number(body.version)
  const base = Number.isFinite(version) ? version : channel.version
  if (channel.version !== base) return { ok: true, changed: true, version: channel.version }
  const timeoutMs = Math.min(25_000, Math.max(2_000, Number(body.timeoutMs) || 15_000))
  const changed = await new Promise((resolvePromise) => {
    const waiter = (value) => {
      clearTimeout(timer)
      channel.waiters.delete(waiter)
      resolvePromise(value)
    }
    const timer = setTimeout(() => {
      channel.waiters.delete(waiter)
      resolvePromise(undefined)
    }, timeoutMs)
    channel.waiters.add(waiter)
  })
  return { ok: true, changed: changed !== undefined, version: channel.version }
}

async function createTask(ctx, host, body) {
  const entry = await entryFor(host, body)
  const input = body.task ?? {}
  const title = String(input.title ?? '').trim()
  if (title.length === 0) return { ok: false, error: '任务名称不能为空' }
  const actor = body.actor === 'dsh' ? 'dsh' : 'adar'
  const sessionId = typeof body.sessionId === 'string' ? body.sessionId : undefined
  const agentMode = actor === 'dsh' && isAgentSession(ctx, host, entry, sessionId)
  let created
  await host.mutateBoard(entry, (board) => {
    const id = newTaskId(board)
    const time = nowIso()
    const task = {
      id,
      title: title.slice(0, 200),
      description: String(input.description ?? ''),
      status: agentMode ? 'ready' : 'editing',
      createdAt: time,
      createdBy: actor,
      updatedAt: time,
      updatedBy: actor,
      completedAt: null,
      acceptance: toStringArray(input.acceptance),
      humanPrereqs: toStringArray(input.humanPrereqs),
      dependsOn: toStringArray(input.dependsOn),
      summary: '',
      failure: null,
      retryCount: 0,
      maxRetries: clampInt(input.maxRetries, 0, 2, board.settings.maxRetries),
      sessions: [],
      verified: false,
      revision: 1,
      archivedAt: null,
    }
    board.tasks.unshift(task)
    created = task
  })
  await host.appendLog(entry, { action: 'task.create', taskId: created.id, by: actor })
  await host.refreshProjectState(entry)
  return { ok: true, task: created }
}

function toStringArray(value) {
  if (!Array.isArray(value)) return []
  return value.map((line) => String(line).trim()).filter((line) => line.length > 0).slice(0, 50)
}

async function updateTask(host, body) {
  const entry = await entryFor(host, body)
  const input = body.patch ?? {}
  const revision = Number(body.revision)
  let updated
  let conflict
  await host.mutateBoard(entry, (board) => {
    const task = board.tasks.find((item) => item.id === body.id)
    if (task === undefined) {
      conflict = { ok: false, error: 'task-not-found' }
      return
    }
    if (Number.isFinite(revision) && revision !== task.revision) {
      conflict = { ok: false, error: 'conflict', task }
      return
    }
    const wasReady = task.status === 'ready'
    if (typeof input.title === 'string' && input.title.trim().length > 0) task.title = input.title.trim().slice(0, 200)
    if (typeof input.description === 'string') task.description = input.description
    if (Array.isArray(input.acceptance)) task.acceptance = toStringArray(input.acceptance)
    if (Array.isArray(input.humanPrereqs)) task.humanPrereqs = toStringArray(input.humanPrereqs)
    if (Array.isArray(input.dependsOn)) task.dependsOn = toStringArray(input.dependsOn)
    if (input.maxRetries !== undefined) task.maxRetries = clampInt(input.maxRetries, 0, 2, task.maxRetries)
    if (typeof input.sessionTitle === 'string') task.title = task.title
    task.updatedAt = nowIso()
    task.updatedBy = 'adar'
    if (wasReady) task.status = 'editing'
    task.revision = clampInt(task.revision, 1, 1e9, 1) + 1
    updated = task
  })
  if (conflict !== undefined) return conflict
  if (updated === undefined) return { ok: false, error: 'task-not-found' }
  await host.appendLog(entry, { action: 'task.update', taskId: updated.id, by: 'adar' })
  await host.refreshProjectState(entry)
  return { ok: true, task: updated }
}

async function setStatus(host, body) {
  const entry = await entryFor(host, body)
  const to = String(body.to ?? '')
  if (!STATUS_KEYS.includes(to)) return { ok: false, error: 'unknown-status' }
  if (to === 'running') return { ok: false, error: '只有调度器能把任务置为执行中' }
  let result
  let conflict
  await host.mutateBoard(entry, (board) => {
    const task = board.tasks.find((item) => item.id === body.id)
    if (task === undefined) {
      conflict = { ok: false, error: 'task-not-found' }
      return
    }
    if (Number.isFinite(Number(body.revision)) && Number(body.revision) !== task.revision) {
      conflict = { ok: false, error: 'conflict', task }
      return
    }
    if (task.status === to) {
      result = { ok: true, task }
      return
    }
    const allowed = TRANSITIONS[task.status] ?? []
    if (!allowed.includes(to)) {
      conflict = { ok: false, error: 'illegal-transition', from: task.status, fromLabel: STATUS[task.status]?.label ?? task.status, to }
      return
    }
    task.status = to
    task.updatedAt = nowIso()
    task.updatedBy = 'adar'
    if (to === 'done') task.completedAt = nowIso()
    if (to === 'ready') {
      task.failure = null
      if (task.status === 'failed') task.retryCount = task.retryCount
    }
    task.revision = clampInt(task.revision, 1, 1e9, 1) + 1
    result = { ok: true, task }
  })
  if (conflict !== undefined) return conflict
  if (result === undefined) return { ok: false, error: 'task-not-found' }
  await host.appendLog(entry, { action: 'task.status', taskId: body.id, to, by: 'adar' })
  await host.refreshProjectState(entry)
  return result
}

async function archiveTask(host, body) {
  const entry = await entryFor(host, body)
  let archived
  await host.mutateBoard(entry, (board) => {
    const index = board.tasks.findIndex((item) => item.id === body.id)
    if (index < 0) return
    if (body.onlyDone === true && board.tasks[index].status !== 'done') return
    const [task] = board.tasks.splice(index, 1)
    task.archivedAt = nowIso()
    task.revision += 1
    board.archived.push(task)
    archived = task
  })
  if (archived === undefined) return { ok: false, error: 'task-not-found' }
  await host.appendLog(entry, { action: 'task.archive', taskId: archived.id })
  await host.refreshProjectState(entry)
  return { ok: true, taskId: archived.id, archivedCount: (await host.loadBoard(entry)).archived.length }
}

async function archiveDone(host, body) {
  const entry = await entryFor(host, body)
  let count = 0
  await host.mutateBoard(entry, (board) => {
    const keep = []
    for (const task of board.tasks) {
      if (task.status === 'done') {
        task.archivedAt = nowIso()
        task.revision += 1
        board.archived.push(task)
        count += 1
      } else keep.push(task)
    }
    board.tasks = keep
  })
  await host.appendLog(entry, { action: 'board.archive-done', count })
  await host.refreshProjectState(entry)
  return { ok: true, count }
}

async function updateSettings(host, body) {  const entry = await entryFor(host, body)
  const input = body.settings ?? {}
  let conflict
  let settings
  await host.mutateBoard(entry, (board) => {
    if (Number.isFinite(Number(body.revision)) && Number(body.revision) !== board.version) {
      conflict = { ok: false, error: 'conflict' }
      return
    }
    const next = { ...board.settings }
    if (input.schedule !== undefined && input.schedule !== null) {
      const mode = ['offpeak', 'custom', 'manual'].includes(input.schedule.mode) ? input.schedule.mode : next.schedule.mode
      const start = parseHhmm(input.schedule.start) === undefined ? next.schedule.start : input.schedule.start
      const end = parseHhmm(input.schedule.end) === undefined ? next.schedule.end : input.schedule.end
      next.schedule = { mode, start, end }
    }
    next.maxConcurrent = clampInt(input.maxConcurrent, 1, 8, next.maxConcurrent)
    next.maxRetries = clampInt(input.maxRetries, 0, 2, next.maxRetries)
    if (input.rotateAt !== undefined) {
      const rotate = typeof input.rotateAt === 'string' ? Number(input.rotateAt.replace('%', '')) / 100 : Number(input.rotateAt)
      next.rotateAt = Math.min(0.95, Math.max(0.001, Number.isFinite(rotate) ? rotate : next.rotateAt))
    }
    board.settings = next
    settings = next
  })
  if (conflict !== undefined) return conflict
  await host.appendLog(entry, { action: 'board.settings', settings })
  await host.refreshProjectState(entry)
  return { ok: true, settings }
}

async function setPaused(host, body) {
  const entry = await entryFor(host, body)
  const paused = body.paused === true
  await host.mutateBoard(entry, (board) => {
    board.paused = paused
  })
  await host.appendLog(entry, { action: 'board.pause', paused })
  return { ok: true, paused }
}

async function startRun(host, body) {
  const entry = await entryFor(host, body)
  const result = await host.startRound(entry.key, 'manual')
  if (result.started !== true) {
    const text = {
      paused: '已暂停：先恢复再执行',
      busy: '已有任务在执行',
      'no-ready': '没有待执行的任务',
    }[result.reason] ?? '没有可执行的任务'
    return { ok: false, error: text }
  }
  return { ok: true }
}

async function reportList(host, body) {
  const entry = await entryFor(host, body)
  const dir = join(host.projectDir(entry), 'report')
  const list = []
  try {
    const { readdir } = await import('node:fs/promises')
    const names = await readdir(dir)
    for (const name of names) {
      if (!name.endsWith('.md')) continue
      list.push(name.replace(/\.md$/, ''))
    }
  } catch {
    // no report dir yet
  }
  list.sort((left, right) => right.localeCompare(left))
  return { ok: true, dates: list.slice(0, REPORT_KEEP_DAYS) }
}

async function reportGet(host, body) {
  const entry = await entryFor(host, body)
  const date = /^\d{4}-\d{2}-\d{2}$/.test(String(body.date ?? '')) ? String(body.date) : dayKey()
  try {
    const text = await readFile(host.reportFile(entry, date), 'utf8')
    return { ok: true, date, text }
  } catch {
    return { ok: true, date, text: '' }
  }
}

async function newConversation(host, body) {
  const entry = await entryFor(host, body)
  const conversation = await host.ensurePmoConversation(entry, true)
  return { ok: true, conversation: { id: conversation.id, title: conversation.title, date: shortDate(conversation.createdAt) } }
}

async function sendMessage(host, body) {
  const entry = await entryFor(host, body)
  const text = String(body.text ?? '')
  if (text.trim().length === 0) return { ok: false, error: '消息不能为空' }
  const conversation = await host.sendPmo(entry, body.convId, text, body.requestId)
  return { ok: true, conversationId: conversation.id }
}

async function getState(host, body) {
  const entry = await entryFor(host, body)
  const text = await host.readProjectState(entry)
  return { ok: true, text }
}

/** True when a tool call arrives from a PMO conversation of this project. */
function isAgentSession(ctx, host, entry, sessionId) {
  if (typeof sessionId !== 'string') return true
  const session = ctx.get('sessions')?.get?.(sessionId)
  const cwd = session?.header?.cwd
  if (typeof cwd !== 'string') return true
  return normalizePath(cwd).startsWith(normalizePath(host.pmoDir(entry)))
}

// ------------------------------------------------------------------- tools

function registerTools(toolsCtx, host) {
  const ctx = host.ctx

  function projectForExec(exec) {
    const session = exec?.agent?.session
    const cwd = session?.header?.cwd ?? session?.cwd
    return resolveProjectForCwd(ctx, host, cwd)
  }

  function toolOutput(properties, required) {
    return {
      schema: {
        type: 'object',
        additionalProperties: false,
        properties: { ok: { type: 'boolean' }, error: { type: 'string' }, ...properties },
        required: ['ok', ...required],
      },
      render: (_args, value) => [{ type: 'text', text: typeof value.text === 'string' ? value.text : (value.ok === true ? '完成' : `失败：${value.error ?? '未知错误'}`) }],
    }
  }

  toolsCtx.tools.register({
    name: 'pm_read_board',
    description: 'Read the current project ticket board: tasks with status, acceptance, human prerequisites, dependencies, failure reason and summary.',
    parameters: { type: 'object', additionalProperties: false, properties: {} },
    output: toolOutput({ text: { type: 'string' } }, []),
    async execute(_args, exec) {
      const entry = await projectForExec(exec)
      if (entry === undefined) return { ok: false, error: '找不到项目' }
      const board = await host.loadBoard(entry)
      const text = JSON.stringify({
        project: entry.name,
        paused: board.paused,
        settings: board.settings,
        tasks: board.tasks.map((task) => ({
          id: task.id,
          title: task.title,
          status: task.status,
          description: task.description,
          acceptance: task.acceptance,
          humanPrereqs: task.humanPrereqs,
          dependsOn: task.dependsOn,
          failure: task.failure,
          summary: task.summary,
          revision: task.revision,
        })),
      })
      return { ok: true, text }
    },
  })

  toolsCtx.tools.register({
    name: 'pm_create_task',
    description: 'Create a ticket on the current project board. Agent-created tickets go straight to ready.',
    parameters: {
      type: 'object',
      additionalProperties: false,
      properties: {
        title: { type: 'string' },
        description: { type: 'string' },
        acceptance: { type: 'array', items: { type: 'string' } },
        human_prereqs: { type: 'array', items: { type: 'string' } },
        depends_on: { type: 'array', items: { type: 'string' } },
      },
      required: ['title'],
    },
    output: toolOutput({ task_id: { type: 'string' }, text: { type: 'string' } }, []),
    async execute(args, exec) {
      const entry = await projectForExec(exec)
      if (entry === undefined) return { ok: false, error: '找不到项目' }
      const input = args !== null && typeof args === 'object' ? args : {}
      if (typeof input.title !== 'string' || input.title.trim().length === 0) return { ok: false, error: '缺 title' }
      let created
      await host.mutateBoard(entry, (board) => {
        const time = nowIso()
        created = {
          id: newTaskId(board),
          title: input.title.trim().slice(0, 200),
          description: String(input.description ?? ''),
          status: 'ready',
          createdAt: time,
          createdBy: 'dsh',
          updatedAt: time,
          updatedBy: 'dsh',
          completedAt: null,
          acceptance: toStringArray(input.acceptance),
          humanPrereqs: toStringArray(input.human_prereqs),
          dependsOn: toStringArray(input.depends_on),
          summary: '',
          failure: null,
          retryCount: 0,
          maxRetries: board.settings.maxRetries,
          sessions: [],
          verified: false,
          revision: 1,
          archivedAt: null,
        }
        board.tasks.unshift(created)
      })
      await host.appendLog(entry, { action: 'task.create', taskId: created.id, by: 'dsh' })
      await host.refreshProjectState(entry)
      return { ok: true, task_id: created.id, text: `已创建 ${created.id} · ${created.title}（待执行）` }
    },
  })

  toolsCtx.tools.register({
    name: 'pm_update_task',
    description: 'Edit title, description, acceptance, human prerequisites, dependencies or retry limit of one ticket. A ready ticket returns to editing until someone marks it executable again.',
    parameters: {
      type: 'object',
      additionalProperties: false,
      properties: {
        task_id: { type: 'string' },
        title: { type: 'string' },
        description: { type: 'string' },
        acceptance: { type: 'array', items: { type: 'string' } },
        human_prereqs: { type: 'array', items: { type: 'string' } },
        depends_on: { type: 'array', items: { type: 'string' } },
        max_retries: { type: 'number' },
      },
      required: ['task_id'],
    },
    output: toolOutput({ text: { type: 'string' } }, []),
    async execute(args, exec) {
      const entry = await projectForExec(exec)
      if (entry === undefined) return { ok: false, error: '找不到项目' }
      const input = args !== null && typeof args === 'object' ? args : {}
      const taskId = String(input.task_id ?? '')
      let updated
      await host.mutateBoard(entry, (board) => {
        const task = board.tasks.find((item) => item.id === taskId)
        if (task === undefined) return
        if (task.status === 'done' && !inPmoConversation(ctx, host, entry, exec)) return
        if (typeof input.title === 'string' && input.title.trim().length > 0) task.title = input.title.trim().slice(0, 200)
        if (typeof input.description === 'string') task.description = input.description
        if (Array.isArray(input.acceptance)) task.acceptance = toStringArray(input.acceptance)
        if (Array.isArray(input.human_prereqs)) task.humanPrereqs = toStringArray(input.human_prereqs)
        if (Array.isArray(input.depends_on)) task.dependsOn = toStringArray(input.depends_on)
        if (input.max_retries !== undefined) task.maxRetries = clampInt(input.max_retries, 0, 2, task.maxRetries)
        // Agents finish editing by leaving the ticket executable.
        if (task.status === 'editing' || task.status === 'ready') task.status = 'ready'
        task.updatedAt = nowIso()
        task.updatedBy = 'dsh'
        task.revision += 1
        updated = task
      })
      if (updated === undefined) return { ok: false, error: '任务不存在，或已完结任务只能在项目调度对话里改' }
      await host.appendLog(entry, { action: 'task.update', taskId, by: 'dsh' })
      await host.refreshProjectState(entry)
      return { ok: true, text: `已更新 ${taskId}（${STATUS[updated.status]?.label ?? updated.status}）` }
    },
  })

  toolsCtx.tools.register({
    name: 'pm_set_task_status',
    description: 'Move one ticket through the state machine. Illegal moves are rejected with the current state.',
    parameters: {
      type: 'object',
      additionalProperties: false,
      properties: {
        task_id: { type: 'string' },
        status: { type: 'string', enum: ['editing', 'ready', 'done', 'failed', 'paused'] },
        reason: { type: 'string' },
      },
      required: ['task_id', 'status'],
    },
    output: toolOutput({ text: { type: 'string' } }, []),
    async execute(args, exec) {
      const entry = await projectForExec(exec)
      if (entry === undefined) return { ok: false, error: '找不到项目' }
      const input = args !== null && typeof args === 'object' ? args : {}
      const taskId = String(input.task_id ?? '')
      const to = String(input.status ?? '')
      if (!['editing', 'ready', 'done', 'failed', 'paused'].includes(to)) return { ok: false, error: '不支持的 status' }
      let result
      await host.mutateBoard(entry, (board) => {
        const task = board.tasks.find((item) => item.id === taskId)
        if (task === undefined) return
        if (task.status === 'done' && !inPmoConversation(ctx, host, entry, exec)) return
        const allowed = TRANSITIONS[task.status] ?? []
        if (task.status !== to && !allowed.includes(to)) {
          result = { ok: false, error: `非法流转：${STATUS[task.status]?.label ?? task.status} → ${STATUS[to]?.label ?? to}` }
          return
        }
        task.status = to
        task.updatedAt = nowIso()
        task.updatedBy = 'dsh'
        if (to === 'done') {
          task.completedAt = nowIso()
          task.verified = task.acceptance.length > 0
        }
        if (to === 'failed' && typeof input.reason === 'string' && input.reason.length > 0) {
          task.failure = { code: 'AGENT', text: input.reason.slice(0, 300), at: nowIso() }
        }
        if (to === 'ready') task.failure = null
        task.revision += 1
        result = { ok: true, task }
      })
      if (result === undefined) return { ok: false, error: '任务不存在，或已完结任务只能在项目调度对话里改' }
      await host.appendLog(entry, { action: 'task.status', taskId, to, by: 'dsh' })
      await host.refreshProjectState(entry)
      return result.ok === true ? { ok: true, text: `${taskId} → ${STATUS[to]?.label ?? to}` } : result
    },
  })

  toolsCtx.tools.register({
    name: 'pm_archive_done',
    description: 'Archive finished tickets so they leave the board but stay recoverable in board.json.',
    parameters: { type: 'object', additionalProperties: false, properties: {} },
    output: toolOutput({ count: { type: 'number' }, text: { type: 'string' } }, []),
    async execute(_args, exec) {
      const entry = await projectForExec(exec)
      if (entry === undefined) return { ok: false, error: '找不到项目' }
      let count = 0
      await host.mutateBoard(entry, (board) => {
        const keep = []
        for (const task of board.tasks) {
          if (task.status === 'done') {
            task.archivedAt = nowIso()
            board.archived.push(task)
            count += 1
          } else keep.push(task)
        }
        board.tasks = keep
      })
      await host.appendLog(entry, { action: 'board.archive-done', count })
      await host.refreshProjectState(entry)
      return { ok: true, count, text: `已归档 ${count} 条已完结任务` }
    },
  })

  toolsCtx.tools.register({
    name: 'pm_delete_task',
    description: 'Delete one ticket. Only allowed when talking to a human in the PMO conversation, never in the nightly automatic flow.',
    parameters: { type: 'object', additionalProperties: false, properties: { task_id: { type: 'string' } }, required: ['task_id'] },
    output: toolOutput({ text: { type: 'string' } }, []),
    async execute(args, exec) {
      const entry = await projectForExec(exec)
      if (entry === undefined) return { ok: false, error: '找不到项目' }
      if (!inPmoConversation(ctx, host, entry, exec)) return { ok: false, error: '删除只能在项目调度对话里做' }
      const taskId = String((args ?? {}).task_id ?? '')
      let removed
      await host.mutateBoard(entry, (board) => {
        const index = board.tasks.findIndex((item) => item.id === taskId)
        if (index < 0) return
        removed = board.tasks.splice(index, 1)[0]
      })
      if (removed === undefined) return { ok: false, error: '任务不存在' }
      await host.appendLog(entry, { action: 'task.delete', taskId, by: 'dsh' })
      await host.refreshProjectState(entry)
      return { ok: true, text: `已删除 ${taskId}` }
    },
  })

  toolsCtx.tools.register({
    name: 'pm_write_project_state',
    description: 'Update the 最近决定 / 下一步 sections of project-state.md. Keep it short; this file is read by agents.',
    parameters: {
      type: 'object',
      additionalProperties: false,
      properties: { decisions: { type: 'string' }, next: { type: 'string' } },
    },
    output: toolOutput({ text: { type: 'string' } }, []),
    async execute(args, exec) {
      const entry = await projectForExec(exec)
      if (entry === undefined) return { ok: false, error: '找不到项目' }
      const input = args !== null && typeof args === 'object' ? args : {}
      const result = await host.writeAgentState(entry, String(input.decisions ?? ''), String(input.next ?? ''))
      return { ok: true, text: result.state }
    },
  })

  toolsCtx.tools.register({
    name: 'pm_read_project_state',
    description: 'Read project-state.md (the PMO memory).',
    parameters: { type: 'object', additionalProperties: false, properties: {} },
    output: toolOutput({ text: { type: 'string' } }, []),
    async execute(_args, exec) {
      const entry = await projectForExec(exec)
      if (entry === undefined) return { ok: false, error: '找不到项目' }
      return { ok: true, text: await host.readProjectState(entry) }
    },
  })

  toolsCtx.tools.register({
    name: 'pm_run_round',
    description: 'Start one execution round now: dispatch ready tickets into visible sessions.',
    parameters: { type: 'object', additionalProperties: false, properties: {} },
    output: toolOutput({ text: { type: 'string' } }, []),
    async execute(_args, exec) {
      const entry = await projectForExec(exec)
      if (entry === undefined) return { ok: false, error: '找不到项目' }
      const result = await host.startRound(entry.key, 'agent')
      if (result.started !== true) {
        const reason = { paused: '已暂停', busy: '已有任务在执行', 'no-ready': '没有待执行的任务' }[result.reason] ?? '没有可执行的任务'
        return { ok: false, error: reason }
      }
      return { ok: true, text: '已开始执行' }
    },
  })

  toolsCtx.tools.register({
    name: 'pm_task_finish',
    description: 'Mark the ticket of this execution session finished. Pass the three-line summary (what changed / verification / what the human must decide).',
    parameters: {
      type: 'object',
      additionalProperties: false,
      properties: { summary: { type: 'string' }, verified: { type: 'boolean' } },
      required: ['summary'],
    },
    output: toolOutput({ task_id: { type: 'string' }, text: { type: 'string' } }, []),
    async execute(args, exec) {
      const input = args !== null && typeof args === 'object' ? args : {}
      const result = await host.finishTask(exec, input.summary, input.verified)
      if (result.ok !== true) return { ok: false, error: result.error ?? '没有正在执行的任务' }
      return { ok: true, task_id: result.taskId, text: `已标记 ${result.taskId} 完结` }
    },
  })

  toolsCtx.tools.register({
    name: 'pm_task_fail',
    description: 'Mark the ticket of this execution session failed with one plain-language reason.',
    parameters: {
      type: 'object',
      additionalProperties: false,
      properties: { reason: { type: 'string' }, code: { type: 'string' } },
      required: ['reason'],
    },
    output: toolOutput({ text: { type: 'string' } }, []),
    async execute(args, exec) {
      const input = args !== null && typeof args === 'object' ? args : {}
      const reason = String(input.reason ?? '').slice(0, 300)
      if (reason.length === 0) return { ok: false, error: '缺 reason' }
      const sessionId = exec?.agent?.session?.id ?? exec?.agent?.id
      const binding = host.bindingFor(sessionId)
      if (binding === undefined) return { ok: false, error: '没有正在执行的任务' }
      const entry = await host.resolveProject(binding.projectKey)
      if (entry === undefined) return { ok: false, error: '找不到项目' }
      await host.failTask(entry, binding.taskId, String(input.code ?? 'AGENT'), reason)
      return { ok: true, text: `已标记 ${binding.taskId} 失败：${reason}` }
    },
  })
}

function inPmoConversation(ctx, host, entry, exec) {
  const session = exec?.agent?.session
  const cwd = session?.header?.cwd ?? session?.cwd
  if (typeof cwd !== 'string') return false
  return normalizePath(cwd).startsWith(normalizePath(host.pmoDir(entry)))
}

async function resolveProjectForCwd(ctx, host, cwd) {
  if (typeof cwd !== 'string' || cwd.length === 0) {
    const projects = await host.listProjects()
    return projects.length === 1 ? projects[0] : undefined
  }
  const normalized = normalizePath(cwd)
  const projects = await host.listProjects()
  let best
  let bestLength = -1
  for (const entry of projects) {
    const projectPath = normalizePath(entry.path)
    if (normalized === projectPath || normalized.startsWith(`${projectPath}/`)) {
      if (projectPath.length > bestLength) {
        best = entry
        bestLength = projectPath.length
      }
    }
  }
  return best
}
