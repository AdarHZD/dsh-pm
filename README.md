# 项目 PM（插件名 @local/dsh-pm）

GitHub: https://github.com/AdarHZD/dsh-pm

跟着项目走的任务队列 + 夜间 agent 领活入口 + 每个任务一条能点开的对话。UI 以
`research/kanban/prototype/board.html` 为唯一标准。

```
dsh-pm/
  package.json          # @local/dsh-pm，含 dsh.bundle.patch + dsh.client
  cordis.patch.yml      # 只做 insert：宿主半
  index.js              # 宿主半：存储 / 执行引擎 / 定时 / PMO / 工具 / HTTP 路由
  client.js             # 客户端半：main 页面 + sidebar.panellist + settings.section
  locale/zh.json, en.json
  icon.svg
  test/host.test.mjs    # 无 DSH 的宿主半单测
```

## 安装

任选其一（**不要**用 `dsh plugin --profile desktop add`，桌面 profile 由 Electron 独占）：

1. DSH → 设置 → 插件 → 添加插件 → 本地路径，填本目录绝对路径；
2. 宿主侧 `plugin_manager.install_bundle`（Creator 模式）。

装完侧边栏图标栏出现「PM」入口，点开是看板页。`client.js` 改动由客户端 HMR 热替换；
`index.js` 改动需要停用/启用一次插件（或重启 DSH）生效。

## 卸载

设置 → 插件 → 停用/移除。**卸载插件不会删除看板数据**：数据独立在数据根目录下，
重装后自动恢复。

## 数据位置

数据根默认：`C:\Users\huang\项目总入口\.dsh-kanban\`（设置 → 插件 → 项目 PM 里可改）

> 插件名已从 `dsh-kanban` 更正为 `dsh-pm`；数据根沿用最初规格 `.dsh-kanban`，已有数据无需迁移。
> 如果你希望数据根也改叫 `.dsh-pm`，在设置里改一下即可（新目录从空板开始，不会自动搬旧数据）。

```
.dsh-kanban/index.json                   # 项目列表（项目名 → 目录、workspace 路径）
.dsh-kanban/<项目名>/
  board.json                             # 板设置 + 任务（唯一真相）
  project-state.md                       # PMO 的记忆（agent 读，不是给人看）
  sessions.json                          # 任务↔对话映射 + PMO 对话列表（可重建）
  pmo/                                   # 项目调度的一组对话（cwd 指这里 → 不混入项目会话清单）
  log/YYYY-MM-DD.jsonl                   # 变更日志
  report/YYYY-MM-DD.md                   # 晨报
```

写盘方式：临时文件 + rename 原子写；任务写入前比对 `revision`，不一致返回冲突让客户端重读
（不静默覆盖）。

## 状态机

`editing 编辑中 / ready 待执行 / running 执行中 / done 已完结 / failed 执行失败 / paused 暂停`。

- 人新建/编辑 → 停留 `editing`，由人点「标为可执行」；
- agent 新建/编辑 → 写完前提依赖后自动 `ready`；
- `running` 只由调度器进入；
- 非法流转（例如编辑中直接跳已完结）一律拒绝并提示当前状态；
- 删除任务、修改已完结任务只允许在与人的 PMO 对话里发生，夜间自动流程没有这两项权限。

## 执行引擎

1. 手动「开始执行」或到点（默认谷时 18:05；工作日 18:00–次日 09:00 + 周末全天）；
2. 读板取 `ready`，让 PMO 调度对话通读整板输出执行顺序与并发（失败时退回板内顺序）；
3. 取 `min(建议并发, 设置最大并发 2)` 条，每条新建**可见会话**（标题 `T-xxx · 标题`）并投任务简报；
4. 任务完成由 agent 调用 `pm_task_finish` 写完成摘要；无法完成调用 `pm_task_fail` 写一句原因；
5. 失败且 `retryCount < maxRetries` 时任务在下一轮回 `ready` 重跑；
6. 全板暂停只停派新活，不打断正在跑的会话；
7. 回合结束写晨报 `report/YYYY-MM-DD.md`（成功/失败/待你准备/未验证 四类）。

### 换对话

`turn/end` 时读 `projectedTokens / contextWindow`，≥ 阈值（默认 35%）且任务未完成时：

1. 让 agent 输出「已完成 / 未完成 / 下一步」；
2. 新建会话（标题 `T-xxx · 标题（续）`），任务当前会话指针指向新会话；
3. 把交接摘要 + 任务简报作为新会话第一条消息；旧会话保留可查。

模型自己看不到上下文占比，阈值判定完全由插件做。

## 定时限制（必读）

- 点窗口 X = 隐藏到托盘，DSH 仍在跑，定时器继续工作；
- **托盘「退出」/ 关机 = 全停**，重启后按 `board.lastRunAt` 补一次当前窗口内的执行轮；
- 休眠/待机会让定时器延迟到唤醒后才补，不精确跨睡眠计时；
- 需要「应用关着也准点跑」只能外挂 Windows 计划任务拉起 headless（有写锁/双实例风险，默认不做）。

## 项目调度（PMO）

- 右侧常驻面板（默认 400px，可拖 360–720，可收到 44px；顶部「项目 PM」可再打开）；
- 一组对话：新开由人点「+」决定，不自动换；列表按开启时间倒序、显示日期、当前项打勾；
- 新对话第一条自动注入 `project-state.md` 摘要 + 可用工具说明；
- 每轮结束由 agent 用 `pm_write_project_state` 更新「最近决定」「下一步」；
- 面板头部「项目状态」打开紧凑只读视图。

## agent 工具

`pm_read_board` / `pm_create_task` / `pm_update_task` / `pm_set_task_status` /
`pm_archive_done` / `pm_delete_task` / `pm_write_project_state` /
`pm_read_project_state` / `pm_run_round` / `pm_task_finish` / `pm_task_fail`。

## 自测

```powershell
cd dsh-pm
node --check index.js
node --check client.js
node --test test/host.test.mjs
```

单测用假 ctx 驱动真实 `index.js`（只把 schemastery import 替换为 stub），覆盖：项目发现、
board.json 落盘、新建/编辑/六态流转/非法流转拒绝、revision CAS 冲突、设置保存、暂停、
开始执行建会话并投简报、归档、晨报读取、PMO 对话与 requestId 透传、agent 工具注册与完成任务。

### 实机自测记录（2026-10-29，隔离环境）

用 desktop 自带 `dsh` 0.2.1-rc.3 在临时 `DSH_HOME` 起独立 web 实例（不写 `~/.dsh`、
不占 54078、不动 desktop）跑通：

| 项 | 结果 |
|---|---|
| 安装/加载 | `dsh plugin add` 成功，侧边栏出现「PM」，页面可开，无宿主报错 |
| 数据落盘 | `board.json` / `project-state.md` / `sessions.json` / `log/` / `report/` 均生成 |
| 新建/编辑/状态 | UI 新建→编辑中；详情底部「标为可执行」→待执行；非法流转被拒；revision 冲突返回错误 |
| 执行引擎 | 开始执行 → 建**可见会话**（标题 `T-xxx · 标题`，侧边栏可见）→ 状态 running → agent 完成任务 → done + 完成时间 + 摘要 + 已验证 |
| 失败原因 | provider 401 时 `turn/end` 的错误被写成一句人话原因，不再空转重试 |
| 换对话 | 阈值临时调到 0.5%（默认 35%）后实测：旧会话 `已达阈值并交接 · 上下文 1%`，新会话 `T-027 · …（续）` 收到交接与简报继续跑；随后设置恢复 35% |
| 全板暂停 | 暂停后「开始执行」被拒、定时 tick 不派活、顶部小字变 `已暂停 · 不会派新任务`；恢复后正常 |
| 定时 | 宿主 60s tick 挂载成功；谷时/自定义窗口判定正确；窗口内单次触发一轮（`lastRunAt` 更新、任务被派发） |
| PMO | 可新开对话、标题取首条消息、`project-state.md` 自动注入为「已读项目状态清单」、AI 回复与工具行正常显示、统计条有真实轮/步/token/缓存命中 |
| 调度排序 | 一轮执行前 PMO 生成「今晚排期 · MM-DD」对话，`round.plan` 记录 agent 建议顺序与并发，按建议派发 |
| 卸载/重装 | 移除插件后图标消失、页面不可达，`board.json` 仍在；重装后 18 条任务原样恢复；真实数据目录未被写入 |
| UI | 与原型逐屏对比：60/40 基线（首行 top=102、行高 87.25）、无水平分隔线、行间细线、三处溢出渐变、灰底对话胶囊、官方同款 composer、深浅色、窄窗紧凑模式、详情卡 ▲▼ 循环、各菜单/弹窗/toast |

截图与命令记录：`research/kanban/_impl/shots/impl-*.png`、`research/kanban/_impl/env-selftest.md`。

## 已知限制 / 未实测项

- 宿主 API（`ctx.sessionController.create/rename/prompt`、`ctx.sessionProjections.snapshot`、
  `ctx.sessionQuery.observeSession`、`ctx.workspaceRegistry`）已在本机 0.2.1-rc.3 运行实例实测；
  升到其它 DSH 版本仍建议按 `research/kanban/api-map.md` 重新核对。
- `ctx.schedule` 持久化提醒未接入：定时用宿主进程内 `ctx.interval` + `board.lastRunAt` 兜底，
  因为 `ctx.schedule.create` 需要绑定已存在会话、且到点会把提醒当用户消息投进该会话。
  应用退出/关机期间不会触发；重启后在当前谷时窗口内补一轮。
- 换对话阈值默认 35%；实机验证用了 0.5%（短任务单回合只占 ~1.3%，3% 触发不到），
  机制与阈值数值无关，验证后已恢复 35%。
- PMO 消息统计里的 tok/s 依赖 provider 是否上报耗时，缺失时显示 0；缓存命中率已限幅到 100%。
- 详情底部比原型多一个状态动作按钮（标为可执行/暂停/重试/恢复/回到编辑中）：
  原型未画入口，但六态流转需要由人触发。
- 执行会话的 cwd 若匹配已注册工作区，会通过 `workspaceId` 建会话以归入该项目；
  PMO 会话按设计留在 `<项目>/pmo/`（不出现在项目工作区列表里）。
- 应用重启时仍处于 `running` 的任务会被标为「执行中断：应用重启或会话已结束」。
- 插件在 desktop 里的最终安装动作按用户要求由 GUI 点击（设置 → 插件 → 本地路径）；
  本机已在隔离 web 实例完成同等加载验证。

## 版本

- 0.1.0 首个可安装版本。
