/**
 * @local/dsh-pm — client half.
 *
 * One keyed `main` page (the board + the project调度 panel) and one
 * `sidebar.panellist` entry. No build step: plain JS + React.createElement.
 * Visual contract: research/dsh-pm/prototype/board.html.
 */
window.__ModuleLoader__.load({
  id: '@local/dsh-pm',
  factory(require) {
    const React = require('react')
    const h = React.createElement

    const NS = 'dsh-pm'
    const PANEL_ID = 'dsh-pm'
    const API_PATH = 'dsh-pm/api'
    const LS_PROJECT = 'dsh-pm-project'
    const LS_PMO_W = 'dsh-pm-pmo-w'
    const LS_CONV = 'dsh-pm-conv-'

    const STATUS = {
      editing: { label: '编辑中', dot: 'var(--pm-text-4)' },
      ready: { label: '待执行', dot: 'var(--pm-accent)' },
      running: { label: '执行中', dot: 'var(--pm-accent)' },
      done: { label: '已完结', dot: 'var(--pm-green)' },
      failed: { label: '执行失败', dot: 'var(--pm-red)' },
      paused: { label: '暂停', dot: 'var(--pm-amber)' },
    }
    const TABS = [
      ['all', '全部'],
      ['editing', '编辑中'],
      ['ready', '待执行'],
      ['running', '执行中'],
      ['failed', '失败'],
      ['done', '已完结'],
      ['paused', '暂停'],
    ]
    const WHO = { adar: 'Adar', dsh: 'DSH' }

    const ZH = {
      panel: 'PM',
      loading: '加载中…',
      loadFailed: '加载失败',
      retry: '重试',
      noProject: '还没有工作区',
      newTask: '新建任务',
      editTask: '编辑任务',
      run: '开始执行',
      pause: '暂停',
      resume: '恢复',
      pmo: '项目 PM',
      more: '更多',
      all: '全部',
      editing: '编辑中',
      ready: '待执行',
      running: '执行中',
      done: '已完结',
      failed: '执行失败',
      paused: '暂停',
      failedTab: '失败',
      waitingYou: '待你准备',
      verified: '已验证',
      unverified: '未验证',
      created: '创建',
      edited: '最后编辑',
      completed: '完成',
      goal: '目标',
      acceptance: '验收标准',
      summary: '完成摘要',
      failure: '失败原因',
      sessions: '执行记录',
      prev: '上一个任务',
      next: '下一个任务',
      close: '关闭',
      openConversation: '打开对话',
      archive: '归档',
      edit: '编辑',
      id: '编号',
      status: '状态',
      createdBy: '创建人',
      createdAt: '创建时间',
      updatedBy: '最后编辑人',
      updatedAt: '最后编辑时间',
      completedAt: '完成时间',
      verifyResult: '验证结果',
      retries: '重试次数',
      depends: '依赖',
      dependsHint: '仅提示',
      sessionCount: '执行对话',
      revision: '记录版本',
      prereqs: '需要你准备',
      none: '无',
      empty: '这个项目还没有任务',
      emptyFilter: '没有符合条件的任务',
      pausedBanner: '已暂停 · 不会派新任务',
      saved: '已保存 · 编辑中',
      taskName: '任务名称',
      taskNamePlaceholder: '一句话说清要做什么',
      taskDesc: '任务描述',
      taskDescPlaceholder: '背景、范围、不要动什么',
      acceptancePlaceholder: '一行一条，例如：pnpm vitest run tests/billing',
      prereqPlaceholder: '一行一条，例如：在 .env 填 PAYMENT_KEY',
      depPick: '依赖任务',
      noneDep: '不引用其他任务',
      retryLabel: '失败后重试次数',
      cancel: '取消',
      save: '保存',
      runStarted: '已开始执行',
      runNoTask: '没有待执行的任务',
      pausedToast: '已暂停',
      resumedToast: '已恢复',
      pausedAction: '先恢复再执行',
      archivedToast: '已归档',
      settings: '看板设置',
      scheduleMode: '触发时段',
      scheduleOffpeak: 'DeepSeek 谷时（工作日 18:00–次日 9:00 + 周末/节假日）',
      scheduleCustom: '自定义',
      scheduleManual: '只手动',
      start: '开始',
      end: '结束',
      reset: '复原',
      concurrency: '最大并发',
      rotate: '换对话阈值',
      retryCount: '失败后重试次数',
      settingsSaved: '设置已保存',
      resetDone: '已复原为谷时预设',
      report: '昨晚报告',
      archiveDone: '归档已完结',
      reportEmpty: '这一天没有报告',
      stateTitle: '项目状态清单',
      stateCrumb: '项目调度 · 记忆',
      stateFoot: '由 PM agent 自动维护',
      conv: '对话',
      newConv: '新对话',
      stateMemory: '项目状态',
      newChat: '新对话',
      placeholder: '描述你想要构建的内容，/ 调用指令，@ 文件或对话',
      send: '发送',
      permission: '完全权限',
      thinking: 'High',
      add: '添加',
      today: '今天',
      yesterday: '昨天',
      justNow: '刚刚',
      minutesAgo: '分钟前',
      hoursAgo: '小时前',
      daysAgo: '天前',
      projectMenu: '项目',
      openOther: '打开其他项目…',
      current: '当前',
      switchInSidebar: '从左侧工作区切换项目',
      noConversation: '还没有对话',
      deleteConfirm: '确认删除',
      conflict: '内容已被更新，请刷新后重试',
      illegal: '当前状态不允许这一步',
      saveFailed: '保存失败，请重试',
      titleRequired: '先写任务名称',
      dataRoot: '数据目录',
      autoRun: '谷时自动开始执行',
      sessionsUnit: '条',
      actionMarkReady: '标为可执行',
      actionPauseTask: '暂停任务',
      actionResumeTask: '恢复任务',
      actionRetry: '重试',
      actionReopen: '回到编辑中',
      markReadyDone: '已标为待执行',
      notFound: '找不到这个任务',
      reportTitle: '昨晚报告',
      noReport: '还没有报告',
      openSession: '打开对话',
      archiveDoneToast: '已归档已完结任务',
    }
    const EN = {
      panel: 'PM',
      loading: 'Loading…',
      loadFailed: 'Could not load',
      retry: 'Retry',
      noProject: 'No workspace yet',
      newTask: 'New task',
      editTask: 'Edit task',
      run: 'Run now',
      pause: 'Pause',
      resume: 'Resume',
      pmo: 'Project PM',
      more: 'More',
      all: 'All',
      editing: 'Editing',
      ready: 'Ready',
      running: 'Running',
      done: 'Done',
      failed: 'Failed',
      paused: 'Paused',
      failedTab: 'Failed',
      waitingYou: 'needs you',
      verified: 'Verified',
      unverified: 'Unverified',
      created: 'created',
      edited: 'last edited',
      completed: 'completed',
      goal: 'Goal',
      acceptance: 'Acceptance',
      summary: 'Summary',
      failure: 'Failure',
      sessions: 'Sessions',
      prev: 'Previous task',
      next: 'Next task',
      close: 'Close',
      openConversation: 'Open conversation',
      archive: 'Archive',
      edit: 'Edit',
      id: 'ID',
      status: 'Status',
      createdBy: 'Created by',
      createdAt: 'Created at',
      updatedBy: 'Last edited by',
      updatedAt: 'Last edited at',
      completedAt: 'Completed at',
      verifyResult: 'Verification',
      retries: 'Retries',
      depends: 'Depends on',
      dependsHint: 'hint only',
      sessionCount: 'Sessions',
      revision: 'Revision',
      prereqs: 'Needs you to prepare',
      none: 'None',
      empty: 'No tasks in this project yet',
      emptyFilter: 'No task matches this filter',
      pausedBanner: 'Paused · no new tasks are dispatched',
      saved: 'Saved · Editing',
      taskName: 'Title',
      taskNamePlaceholder: 'One line: what should be built',
      taskDesc: 'Description',
      taskDescPlaceholder: 'Background, scope, what not to touch',
      acceptancePlaceholder: 'One per line, e.g. pnpm vitest run tests/billing',
      prereqPlaceholder: 'One per line, e.g. put PAYMENT_KEY in .env',
      depPick: 'Depends on',
      noneDep: 'No dependency',
      retryLabel: 'Retries after failure',
      cancel: 'Cancel',
      save: 'Save',
      runStarted: 'Started',
      runNoTask: 'No ready task',
      pausedToast: 'Paused',
      resumedToast: 'Resumed',
      pausedAction: 'Resume first',
      archivedToast: 'Archived',
      settings: 'Board settings',
      scheduleMode: 'Schedule',
      scheduleOffpeak: 'DeepSeek off-peak (weekdays 18:00–09:00 + weekends/holidays)',
      scheduleCustom: 'Custom',
      scheduleManual: 'Manual only',
      start: 'Start',
      end: 'End',
      reset: 'Restore',
      concurrency: 'Max parallel',
      rotate: 'Session rotation',
      retryCount: 'Retries after failure',
      settingsSaved: 'Settings saved',
      resetDone: 'Restored off-peak preset',
      report: 'Last night report',
      archiveDone: 'Archive done',
      reportEmpty: 'No report for this day',
      stateTitle: 'Project state',
      stateCrumb: 'PMO · memory',
      stateFoot: 'Maintained by the PM agent',
      conv: 'Conversations',
      newConv: 'New conversation',
      stateMemory: 'Project state',
      newChat: 'New conversation',
      placeholder: 'Describe what you want to build, / for commands, @ for files or conversations',
      send: 'Send',
      permission: 'Full access',
      thinking: 'High',
      add: 'Add',
      today: 'Today',
      yesterday: 'Yesterday',
      justNow: 'just now',
      minutesAgo: 'min ago',
      hoursAgo: 'h ago',
      daysAgo: 'd ago',
      projectMenu: 'Projects',
      openOther: 'Open another project…',
      current: 'Current',
      switchInSidebar: 'Switch projects from the sidebar',
      noConversation: 'No conversation yet',
      deleteConfirm: 'Confirm delete',
      conflict: 'Content changed, reload and try again',
      illegal: 'Current state does not allow this step',
      saveFailed: 'Could not save, try again',
      titleRequired: 'Write a title first',
      dataRoot: 'Data directory',
      autoRun: 'Start automatically off-peak',
      sessionsUnit: '',
      actionMarkReady: 'Mark executable',
      actionPauseTask: 'Pause task',
      actionResumeTask: 'Resume task',
      actionRetry: 'Retry',
      actionReopen: 'Back to editing',
      markReadyDone: 'Marked ready',
      notFound: 'Task not found',
      reportTitle: 'Last night report',
      noReport: 'No report yet',
      openSession: 'Open conversation',
      archiveDoneToast: 'Archived finished tasks',
    }

    const CSS = `
.pm-root{
  --pm-font:var(--dsw-font-family,-apple-system,BlinkMacSystemFont,"Segoe UI","PingFang SC","Hiragino Sans GB","Microsoft YaHei","Helvetica Neue",Helvetica,Arial,sans-serif);
  --pm-radius-xs:var(--dsw-radius-xs,4px);
  --pm-radius-sm:var(--dsw-radius-sm,8px);
  --pm-radius-md:var(--dsw-radius-md,12px);
  --pm-radius-lg:var(--dsw-radius-lg,16px);
  --pm-shadow-1:0 2px 4px 0 rgba(0,0,0,.05);
  --pm-shadow-2:0 4px 12px 0 rgba(0,0,0,.02),0 2px 8px 0 rgba(0,0,0,.04);
  --pm-shadow-3:0 0 1px 0 rgba(0,0,0,.2),0 0 4px 0 rgba(0,0,0,.02),0 12px 32px 0 rgba(0,0,0,.08);
  --pm-bg:var(--dsw-alias-bg-base,#fff);
  --pm-bg-sub:var(--dsw-static-neutral-bluish-50,#f9fafb);
  --pm-bg-sub2:var(--dsw-static-neutral-bluish-60,#f5f6f7);
  --pm-bg-hover:var(--dsw-static-neutral-bluish-75,#f1f3f5);
  --pm-border-1:var(--dsw-alias-border-l1,rgba(0,0,0,.04));
  --pm-border-2:var(--dsw-alias-border-l2,rgba(0,0,0,.10));
  --pm-border-3:var(--dsw-alias-border-l3,rgba(0,0,0,.12));
  --pm-border-4:var(--dsw-alias-border-l4,rgba(0,0,0,.16));
  --pm-text-1:var(--dsw-static-neutral-bluish-1000,#0f1115);
  --pm-text-2:var(--dsw-static-neutral-bluish-700,#61666b);
  --pm-text-3:var(--dsw-static-neutral-bluish-600,#81858c);
  --pm-text-4:var(--dsw-static-neutral-bluish-500,#979da6);
  --pm-brand:var(--dsw-alias-label-primary,#0f1115);
  --pm-brand-text:var(--dsw-alias-bg-base,#fff);
  --pm-accent:var(--dsw-static-deepseek-500,#4176e6);
  --pm-accent-soft:var(--dsw-static-deepseek-50,#edf3fe);
  --pm-green:var(--dsw-static-green-500,#22c55e);
  --pm-green-soft:var(--dsw-static-green-100,#e6faed);
  --pm-red:var(--dsw-static-red-500,#ef4444);
  --pm-red-soft:var(--dsw-static-red-50,#fef2f2);
  --pm-amber:var(--dsw-static-amber-500,#f59e0b);
  --pm-amber-soft:var(--dsw-static-amber-100,#fef5e7);
  --pm-amber-text:#b45309;
  --pm-mask:rgba(0,0,0,.18);
  position:relative;display:flex;height:100%;min-height:0;overflow:hidden;
  background:var(--pm-bg);color:var(--pm-text-1);font-family:var(--pm-font);
  font-size:14px;line-height:1.5;-webkit-font-smoothing:antialiased;
}
body[data-ds-dark-theme] .pm-root{
  --pm-bg-sub:var(--dsw-static-neutral-bluish-900,#1b1b1c);
  --pm-bg-sub2:var(--dsw-static-neutral-bluish-875,#232324);
  --pm-bg-hover:var(--dsw-static-neutral-bluish-850,#2c2c2e);
  --pm-text-1:var(--dsw-static-neutral-bluish-50,#f9fafb);
  --pm-text-2:var(--dsw-static-neutral-bluish-400,#adb2b8);
  --pm-text-3:var(--dsw-static-neutral-bluish-500,#979da6);
  --pm-text-4:var(--dsw-static-neutral-bluish-600,#81858c);
  --pm-accent:var(--dsw-static-deepseek-450,#5686fe);
  --pm-accent-soft:var(--dsw-static-deepseek-900,#283142);
  --pm-green:var(--dsw-static-green-400,#4ed17e);
  --pm-green-soft:var(--dsw-static-green-900,#233c2c);
  --pm-red:var(--dsw-static-red-400,#f25a5a);
  --pm-red-soft:#3c1f1b;
  --pm-amber:var(--dsw-static-amber-400,#f7ad31);
  --pm-amber-soft:var(--dsw-static-amber-900,#27241f);
  --pm-amber-text:#f7ad31;
  --pm-mask:rgba(0,0,0,.5);
  --pm-brand:var(--dsw-alias-label-primary,#f9fafb);
  --pm-brand-text:var(--dsw-alias-bg-base,#151517);
  --pm-shadow-3:0 0 1px 0 rgba(0,0,0,.6),0 0 4px 0 rgba(0,0,0,.3),0 12px 32px 0 rgba(0,0,0,.5);
}
.pm-root *{box-sizing:border-box}
.pm-root :where(button){font-family:inherit;font-size:14px;cursor:pointer;border:none;background:none;color:inherit;padding:0}
.pm-root input,.pm-root textarea,.pm-root select{font-family:inherit;font-size:14px;color:inherit}
.pm-root ::selection{background:var(--pm-accent-soft)}
.pm-root ::-webkit-scrollbar{width:10px;height:10px}
.pm-root ::-webkit-scrollbar-button{display:none;width:0;height:0}
.pm-root ::-webkit-scrollbar-thumb{background:var(--pm-border-4);border-radius:8px;border:3px solid transparent;background-clip:content-box}
.pm-root ::-webkit-scrollbar-thumb:hover{background:var(--pm-text-4);border:3px solid transparent;background-clip:content-box}
.pm-root ::-webkit-scrollbar-track{background:transparent}
.pm-page{position:relative;flex:1;min-width:0;display:flex;flex-direction:column;overflow:hidden;min-height:0}
.pm-head{display:flex;align-items:center;gap:10px;height:60px;flex:0 0 60px;padding:0 26px;flex-wrap:nowrap;overflow:hidden}
.pm-proj{display:flex;align-items:center;gap:5px;font-size:19px;font-weight:500;letter-spacing:-.01em;padding:2px 6px 2px 0;border-radius:var(--pm-radius-sm);color:var(--pm-text-1);white-space:nowrap;flex:0 0 auto}
.pm-proj:hover{background:var(--pm-bg-hover)}
.pm-proj svg{width:15px;height:15px;color:var(--pm-text-4)}
.pm-subline{display:flex;align-items:center;gap:8px;color:var(--pm-text-4);font-size:12px;min-width:0;overflow:hidden;white-space:nowrap;flex:1 1 auto;margin:0;opacity:1;transition:opacity .2s ease}
.pm-subline.narrow{opacity:0}
.pm-subtext{white-space:nowrap;overflow:hidden;text-overflow:clip;min-width:0;display:block;max-width:100%}
.pm-subline.fade .pm-subtext{-webkit-mask-image:linear-gradient(to right,#000 calc(100% - 32px),transparent 100%);mask-image:linear-gradient(to right,#000 calc(100% - 32px),transparent 100%)}
.pm-actions{margin-left:auto;display:flex;align-items:center;gap:6px;flex:0 0 auto}
.pm-btn{height:30px;padding:0 10px;border-radius:var(--pm-radius-sm);display:inline-flex;align-items:center;gap:6px;font-size:12.5px;font-weight:500;white-space:nowrap;flex:0 0 auto}
.pm-btn svg{width:14px;height:14px}
.pm-btn-primary{background:var(--pm-brand);color:var(--pm-brand-text)}
.pm-btn-primary:hover{opacity:.88}
.pm-btn-secondary{background:var(--pm-bg);border:1px solid var(--pm-border-2);color:var(--pm-text-1)}
.pm-btn-secondary:hover{background:var(--pm-bg-sub);border-color:var(--pm-border-3)}
.pm-btn-ghost{color:var(--pm-text-2);width:30px;padding:0;justify-content:center}
.pm-btn-ghost:hover{background:var(--pm-bg-hover);color:var(--pm-text-1)}
.pm-btn-icon{width:30px;padding:0;justify-content:center}
.pm-icon-btn{width:26px;height:26px;border-radius:var(--pm-radius-xs);display:grid;place-items:center;color:var(--pm-text-3)}
.pm-icon-btn:hover{background:var(--pm-bg-hover);color:var(--pm-text-1)}
.pm-tabs{display:flex;align-items:center;gap:2px;height:40px;flex:0 0 40px;padding:0 26px;overflow:auto}
.pm-tab{padding:7px 9px;border-radius:var(--pm-radius-sm) var(--pm-radius-sm) 0 0;color:var(--pm-text-3);font-size:12.5px;display:flex;align-items:center;gap:5px;white-space:nowrap;border-bottom:1.5px solid transparent;margin-bottom:-1px}
.pm-tab b{font-weight:500;color:var(--pm-text-4);font-variant-numeric:tabular-nums;font-size:11.5px}
.pm-tab:hover{color:var(--pm-text-1)}
.pm-tab.active{color:var(--pm-text-1);border-bottom-color:var(--pm-text-1)}
.pm-tab.active b{color:var(--pm-text-2)}
.pm-body{flex:1;overflow:auto;min-height:0;padding:0 26px 80px}
.pm-rows{margin-top:2px}
.pm-row{display:flex;gap:10px;padding:12px 10px;border-bottom:1px solid var(--pm-border-1);cursor:pointer;border-radius:var(--pm-radius-sm);align-items:flex-start}
.pm-row:hover{background:var(--pm-bg-sub)}
.pm-sdot{width:7px;height:7px;border-radius:50%;margin-top:8px;flex:0 0 7px}
.pm-sdot.running{box-shadow:0 0 0 3px color-mix(in srgb,var(--pm-accent) 18%,transparent);animation:pm-pulse 1.6s infinite}
@keyframes pm-pulse{0%,100%{opacity:1}50%{opacity:.45}}
.pm-row-main{flex:1;min-width:0}
.pm-row-top{display:flex;align-items:center;gap:7px;min-width:0}
.pm-tid{font-size:11.5px;color:var(--pm-text-4);font-variant-numeric:tabular-nums;flex:0 0 auto}
.pm-ttl{font-size:13.5px;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.pm-badge{height:19px;padding:0 6px;border-radius:5px;display:inline-flex;align-items:center;gap:3px;font-size:11px;font-weight:500;flex:0 0 auto}
.pm-badge.warn{background:var(--pm-amber-soft);color:var(--pm-amber-text)}
.pm-badge.plain{background:var(--pm-bg-sub2);color:var(--pm-text-2)}
.pm-badge.unverified{background:var(--pm-bg-sub2);color:var(--pm-text-3)}
.pm-row-desc{color:var(--pm-text-3);font-size:12.5px;margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:clip}
.pm-row-desc.fade{-webkit-mask-image:linear-gradient(to right,#000 calc(100% - 40px),transparent 100%);mask-image:linear-gradient(to right,#000 calc(100% - 40px),transparent 100%)}
.pm-row-meta{display:flex;align-items:center;gap:7px;margin-top:4px;font-size:11.5px;color:var(--pm-text-4);flex-wrap:wrap}
.pm-row-meta .who{color:var(--pm-text-3)}
.pm-row-meta .dot2{width:2px;height:2px;border-radius:50%;background:var(--pm-border-4)}
.pm-row-meta .fail{color:var(--pm-red)}
.pm-row-right{display:flex;align-items:center;color:var(--pm-text-4);font-size:11.5px;flex:0 0 auto;padding-top:3px}
.pm-empty{text-align:center;color:var(--pm-text-3);padding:64px 0}
.pm-empty .big{font-size:15px;color:var(--pm-text-2);margin-bottom:6px}
.pm-empty .pm-btn{margin-top:14px}
.pm-paused-banner{display:flex;align-items:center;gap:8px;margin:0 0 12px;padding:8px 12px;border-radius:var(--pm-radius-sm);background:var(--pm-amber-soft);color:var(--pm-amber-text);font-size:13px}
.pm-paused-banner .sp{flex:1}
.pm-pmo{position:relative;width:var(--pm-pmo-w,400px);flex:0 0 auto;border-left:1px solid var(--pm-border-1);background:var(--pm-bg);display:flex;flex-direction:column;min-width:0}
.pm-pmo.collapsed{width:44px}
.pm-pmo.collapsed .pm-pmo-body,.pm-pmo.collapsed .pm-pmo-title,.pm-pmo.collapsed .pm-pmo-acts,.pm-pmo.collapsed .pm-pmo-ic{display:none}
.pm-pmo.collapsed .pm-pmo-head{justify-content:center;padding:0}
.pm-pmo.collapsed .pm-pmo-expand{display:grid}
.pm-pmo-handle{position:absolute;left:-3px;top:0;bottom:0;width:8px;cursor:col-resize;z-index:6}
.pm-pmo-handle:hover{background:color-mix(in srgb,var(--pm-accent) 22%,transparent)}
.pm-pmo-head{height:60px;flex:0 0 60px;display:flex;align-items:center;gap:6px;padding:0 8px 0 14px}
.pm-pmo-ic{color:var(--pm-text-3);display:grid;place-items:center}
.pm-pmo-title{font-size:13px;font-weight:600;display:flex;align-items:center;gap:6px;white-space:nowrap}
.pm-pmo-title .role{font-size:11px;font-weight:400;color:var(--pm-text-4)}
.pm-pmo-acts{margin-left:auto;display:flex;gap:1px}
.pm-pmo-expand{display:none;margin:0 auto}
.pm-pmo-body{flex:1;display:flex;flex-direction:column;min-height:0}
.pm-pmo-conv{height:40px;flex:0 0 40px;display:flex;align-items:center;padding:0 8px}
.pm-conv-btn{width:100%;height:34px;border-radius:10px;background:var(--pm-bg-hover);display:flex;align-items:center;gap:7px;padding:0 9px;color:var(--pm-text-1);font-size:13px}
.pm-conv-btn:hover{background:color-mix(in srgb,var(--pm-text-1) 6%,var(--pm-bg-hover))}
.pm-conv-btn .lbl{flex:1;text-align:left;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-weight:500}
.pm-conv-btn .meta{color:var(--pm-text-4);font-size:11.5px;font-weight:400}
.pm-conv-btn svg{color:var(--pm-text-4)}
.pm-msgs{flex:1;overflow:auto;padding:14px;display:flex;flex-direction:column;gap:13px;min-height:0}
.pm-msg{font-size:13px;line-height:1.62}
.pm-msg .who{font-size:11px;color:var(--pm-text-4);margin-bottom:4px;display:flex;align-items:center;gap:6px}
.pm-msg.user{align-self:flex-end;max-width:88%;background:var(--pm-bg-sub2);border-radius:10px;padding:8px 11px;white-space:pre-wrap;word-break:break-word}
.pm-msg.ai{align-self:flex-start;max-width:100%;white-space:pre-wrap;word-break:break-word}
.pm-msg.ai p{margin:0 0 6px}
.pm-msg.ai p:last-child{margin-bottom:0}
.pm-tool{display:flex;align-items:center;gap:6px;background:transparent;border:none;border-radius:0;padding:1px 0;font-size:12px;color:var(--pm-text-4)}
.pm-tool .ok{color:var(--pm-green);font-weight:600}
.pm-tool svg{flex:0 0 13px}
.pm-pmo-foot{padding:10px 10px 8px;flex:0 0 auto}
.pm-composer{border:1px solid var(--pm-border-2);border-radius:14px;background:var(--pm-bg);padding:8px 10px 8px;transition:border-color .15s,box-shadow .15s}
.pm-composer:focus-within{border-color:var(--pm-border-3)}
.pm-composer-input{width:100%;border:none;background:transparent;resize:none;outline:none;min-height:44px;font-size:13px;line-height:1.55;color:var(--pm-text-1)}
.pm-composer-input::placeholder{color:var(--pm-text-4)}
.pm-composer-bar{display:flex;align-items:center;gap:4px;margin-top:2px;flex-wrap:wrap}
.pm-cbtn{height:24px;min-width:24px;padding:0 4px;border-radius:12px;display:inline-flex;align-items:center;justify-content:center;gap:3px;color:var(--pm-text-2);font-size:12px;white-space:nowrap}
.pm-cbtn:hover{background:var(--pm-bg-hover)}
.pm-cbtn.round{border:1px solid var(--pm-border-2);border-radius:50%;width:24px;min-width:24px;padding:0}
.pm-cbtn .shield{color:var(--pm-text-3);display:grid;place-items:center}
.pm-cbtn .chev{color:var(--pm-text-4)}
.pm-cspacer{flex:1 1 auto;min-width:2px}
.pm-cmodel{font-size:12px;color:var(--pm-text-2);white-space:nowrap;display:flex;align-items:center;gap:4px}
.pm-cver{font-size:10px;color:var(--pm-accent);background:var(--pm-accent-soft);border-radius:4px;padding:1px 4px;line-height:1.4}
.pm-csend{width:28px;height:28px;border-radius:50%;background:#b9cbf5;color:#fff;display:grid;place-items:center;flex:0 0 28px}
body[data-ds-dark-theme] .pm-csend{background:#3a5a9e}
.pm-csend:hover{filter:brightness(.96)}
.pm-csend:disabled{opacity:.6;cursor:default}
.pm-pmo-stats{display:flex;align-items:center;gap:9px;font-size:11px;color:var(--pm-text-4);padding:8px 2px 0;flex-wrap:nowrap;overflow:hidden;-webkit-mask-image:linear-gradient(to right,#000 calc(100% - 20px),transparent 100%);mask-image:linear-gradient(to right,#000 calc(100% - 20px),transparent 100%)}
.pm-pmo-stats .g{display:flex;align-items:center;gap:4px;white-space:nowrap;flex:0 0 auto}
.pm-pmo-stats svg{width:12px;height:12px;color:var(--pm-text-4)}
.pm-ring{width:13px;height:13px;border-radius:50%;background:conic-gradient(var(--pm-accent) 0 var(--p,0%),var(--pm-border-2) var(--p,0%) 100%);-webkit-mask:radial-gradient(farthest-side,transparent 56%,#000 58%);mask:radial-gradient(farthest-side,transparent 56%,#000 58%)}
.pm-menu{position:fixed;min-width:220px;max-width:340px;background:var(--pm-bg);border:1px solid var(--pm-border-2);border-radius:var(--pm-radius-md);box-shadow:var(--pm-shadow-3);padding:5px;z-index:60}
.pm-menu-label{font-size:11.5px;color:var(--pm-text-4);padding:6px 8px 4px;font-weight:500}
.pm-menu-item{display:flex;align-items:center;gap:9px;width:100%;padding:7px 8px;border-radius:var(--pm-radius-sm);font-size:13px;color:var(--pm-text-1);text-align:left}
.pm-menu-item:hover{background:var(--pm-bg-hover)}
.pm-menu-item .ico{width:16px;height:16px;display:grid;place-items:center;color:var(--pm-text-3);flex:0 0 16px}
.pm-menu-item .lbl{flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.pm-menu-item .meta{font-size:11.5px;color:var(--pm-text-4);flex:0 0 auto}
.pm-menu-item .check{width:16px;height:16px;display:grid;place-items:center;color:var(--pm-text-1);opacity:0;flex:0 0 16px}
.pm-menu-item.on .check{opacity:1}
.pm-menu-sep{height:1px;background:var(--pm-border-1);margin:5px 4px}
.pm-modal-wrap{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;z-index:30;background:var(--pm-mask);padding:0 12px}
.pm-modal{width:640px;max-width:94%;max-height:88%;flex:0 1 auto;min-width:0;background:var(--pm-bg);border-radius:var(--pm-radius-lg);box-shadow:var(--pm-shadow-3);display:flex;flex-direction:column;overflow:hidden;border:1px solid var(--pm-border-1)}
.pm-modal-lg{width:920px}
.pm-m-head{padding:16px 20px 12px;border-bottom:1px solid var(--pm-border-1);display:flex;align-items:flex-start;gap:10px}
.pm-nav-group{display:flex;align-items:center;border:1px solid var(--pm-border-2);border-radius:8px;overflow:hidden;flex:0 0 auto}
.pm-nav-btn{width:28px;height:26px;display:grid;place-items:center;color:var(--pm-text-2);background:var(--pm-bg)}
.pm-nav-btn:hover{background:var(--pm-bg-hover);color:var(--pm-text-1)}
.pm-nav-btn + .pm-nav-btn{border-left:1px solid var(--pm-border-2)}
.pm-m-head .h-main{flex:1;min-width:0}
.pm-m-head .crumb{font-size:11.5px;color:var(--pm-text-4);margin-bottom:3px;display:flex;gap:6px;align-items:center}
.pm-m-head .title{font-size:17px;font-weight:500;line-height:1.35}
.pm-m-body{overflow:auto;min-height:0}
.pm-m-foot{padding:12px 20px;border-top:1px solid var(--pm-border-1);display:flex;gap:8px;justify-content:flex-end;background:var(--pm-bg-sub)}
.pm-m-foot .sp{flex:1}
.pm-detail-grid{display:grid;grid-template-columns:minmax(0,1fr) 296px;gap:24px;padding:18px 20px 22px}
@media (max-width:1080px){.pm-detail-grid{grid-template-columns:1fr}}
.pm-field{padding:11px 0;border-bottom:1px solid var(--pm-border-1)}
.pm-field:first-child{padding-top:0}
.pm-field:last-child{border-bottom:none}
.pm-field .k{font-size:11.5px;color:var(--pm-text-4);margin-bottom:4px;font-weight:500}
.pm-field .v{font-size:13.5px;color:var(--pm-text-1);white-space:pre-wrap;word-break:break-word}
.pm-field .v.dim{color:var(--pm-text-3)}
.pm-accept{margin:0;padding-left:17px}
.pm-accept li{color:var(--pm-text-1);font-size:13px;margin:3px 0}
.pm-sess{display:flex;align-items:center;gap:8px;padding:8px 10px;border:1px solid var(--pm-border-1);border-radius:var(--pm-radius-sm);margin:6px 0;font-size:12.5px;cursor:pointer}
.pm-sess:hover{border-color:var(--pm-border-3);background:var(--pm-bg-sub)}
.pm-sess .st{font-size:11px;color:var(--pm-text-4)}
.pm-sess .sp{flex:1}
.pm-d-side{background:var(--pm-bg-sub);border:1px solid var(--pm-border-1);border-radius:var(--pm-radius-md);padding:14px;align-self:start}
.pm-props{display:flex;flex-direction:column;gap:9px}
.pm-props .p{display:flex;gap:10px;font-size:12.5px;line-height:1.5}
.pm-props .p .k{width:76px;flex:0 0 76px;color:var(--pm-text-4)}
.pm-props .p .v{flex:1;min-width:0;color:var(--pm-text-1);word-break:break-word}
.pm-props .p .v.dim{color:var(--pm-text-3)}
.pm-prereq-inline{background:var(--pm-amber-soft);border:1px solid color-mix(in srgb,var(--pm-amber) 30%,transparent);border-radius:8px;padding:7px 9px;color:var(--pm-amber-text);font-size:12px;line-height:1.6}
.pm-prereq-inline ul{margin:0;padding-left:15px}
.pm-prereq-empty{color:var(--pm-text-3)}
.pm-summary{background:var(--pm-bg-sub2);border-radius:var(--pm-radius-sm);padding:9px 11px;font-size:12.5px;color:var(--pm-text-2);line-height:1.6}
.pm-form{padding:16px 20px}
.pm-fld{margin-bottom:14px}
.pm-fld label{display:block;font-size:12px;color:var(--pm-text-3);margin-bottom:5px;font-weight:500}
.pm-fld input[type=text],.pm-fld textarea,.pm-fld input[type=number]{width:100%;border:1px solid var(--pm-border-2);border-radius:var(--pm-radius-sm);padding:8px 10px;background:var(--pm-bg);outline:none}
.pm-fld input:focus,.pm-fld textarea:focus,.pm-fld button:focus-visible{border-color:var(--pm-accent);box-shadow:0 0 0 3px color-mix(in srgb,var(--pm-accent) 14%,transparent)}
.pm-fld textarea{min-height:78px;resize:vertical;line-height:1.55}
.pm-pick{width:100%;min-height:34px;border:1px solid var(--pm-border-2);border-radius:var(--pm-radius-sm);padding:5px 9px;display:flex;align-items:center;gap:6px;flex-wrap:wrap;background:var(--pm-bg);text-align:left;color:var(--pm-text-3);font-size:13px}
.pm-pick:hover{border-color:var(--pm-border-3)}
.pm-chip{height:22px;padding:0 7px;border-radius:6px;background:var(--pm-bg-sub2);color:var(--pm-text-2);font-size:11.5px;display:inline-flex;align-items:center;gap:4px}
.pm-chip b{font-weight:500;color:var(--pm-text-1)}
.pm-pop{position:absolute;top:52px;right:16px;width:360px;background:var(--pm-bg);border:1px solid var(--pm-border-2);border-radius:var(--pm-radius-md);box-shadow:var(--pm-shadow-3);padding:14px;z-index:25}
.pm-pop h4{margin:0 0 10px;font-size:13px;font-weight:600}
.pm-pop .row2{display:flex;gap:8px;align-items:flex-end}
.pm-pop .row2 > *{flex:1}
.pm-pop .pm-fld{margin-bottom:12px}
.pm-pop .pm-fld label{font-size:11.5px}
.pm-pop .pm-fld input,.pm-pop .pm-fld select{padding:6px 8px;font-size:13px;width:100%;border:1px solid var(--pm-border-2);border-radius:6px;background:var(--pm-bg)}
.pm-pop .foot{display:flex;gap:8px;justify-content:flex-end;margin-top:4px}
.pm-state-body{padding:16px 20px 18px;font-size:13px;line-height:1.72;white-space:pre-wrap;font-family:var(--pm-font)}
.pm-state-foot{padding:0 20px 16px;font-size:11.5px;color:var(--pm-text-4)}
.pm-toast{position:fixed;left:50%;bottom:26px;transform:translate(-50%,20px);background:var(--pm-text-1);color:var(--pm-bg);padding:8px 14px;border-radius:var(--pm-radius-sm);font-size:13px;opacity:0;pointer-events:none;transition:.2s;z-index:70;box-shadow:var(--pm-shadow-2)}
.pm-toast.on{opacity:1;transform:translate(-50%,0)}
.pm-report{white-space:pre-wrap;font-size:13px;line-height:1.7;padding:16px 20px 20px;color:var(--pm-text-1);font-family:var(--pm-font)}
@media (max-width:900px){.pm-head{padding:0 16px;gap:6px}.pm-tabs{padding:0 16px}.pm-body{padding:0 16px 60px}.pm-btn{padding:0 8px}.pm-btn .pm-btn-label{display:none}}
.pm-root.pm-compact .pm-head{padding:0 14px;gap:8px}
.pm-root.pm-compact .pm-btn{padding:0 8px}
.pm-root.pm-compact .pm-btn-label{display:none}
.pm-root.pm-compact .pm-subline{display:none}
`

    /** Small JSON-RPC over the plugin's own authenticated route. */
    async function api(payload) {
      try {
        const response = await fetch(API_PATH, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(payload),
        })
        const value = await response.json().catch(() => undefined)
        if (value !== null && typeof value === 'object') return value
        return { ok: false, error: `http-${response.status}` }
      } catch (_network) {
        return { ok: false, error: 'network' }
      }
    }

    function sleep(ms) {
      return new Promise((resolve) => setTimeout(resolve, ms))
    }

    function pad2(value) {
      return String(value).padStart(2, '0')
    }

    /** Relative time in the prototype's wording: 刚刚 / N 分钟前 / 今天 09:12 / 昨天 22:10 / 10-28 01:10. */
    function relativeTime(value, t) {
      const date = new Date(value)
      if (Number.isNaN(date.getTime())) return ''
      const now = new Date()
      const diff = now.getTime() - date.getTime()
      if (diff >= 0 && diff < 60_000) return t('justNow')
      if (diff >= 0 && diff < 3600_000) return `${Math.floor(diff / 60_000)} ${t('minutesAgo')}`
      const sameDay = date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth() && date.getDate() === now.getDate()
      if (sameDay) return `${t('today')} ${pad2(date.getHours())}:${pad2(date.getMinutes())}`
      const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1)
      const isYesterday = date.getFullYear() === yesterday.getFullYear() && date.getMonth() === yesterday.getMonth() && date.getDate() === yesterday.getDate()
      if (isYesterday) return `${t('yesterday')} ${pad2(date.getHours())}:${pad2(date.getMinutes())}`
      const hours = Math.floor(diff / 3600_000)
      if (diff >= 0 && hours < 24) return `${hours} ${t('hoursAgo')}`
      return `${pad2(date.getMonth() + 1)}-${pad2(date.getDate())} ${pad2(date.getHours())}:${pad2(date.getMinutes())}`
    }

    function shortDate(value) {
      const date = new Date(value)
      if (Number.isNaN(date.getTime())) return ''
      return `${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`
    }

    function pct(ratio) {
      const value = Math.round((Number(ratio) || 0) * 100)
      return Math.max(0, Math.min(100, value))
    }

    function readStored(key, fallback) {
      try {
        const value = window.localStorage.getItem(key)
        return value === null ? fallback : value
      } catch {
        return fallback
      }
    }

    function store(key, value) {
      try {
        window.localStorage.setItem(key, String(value))
      } catch {
        // ignore quota/private mode
      }
    }

    function baseName(path) {
      const text = String(path ?? '')
      const index = Math.max(text.lastIndexOf('/'), text.lastIndexOf('\\'))
      return index < 0 ? text : text.slice(index + 1)
    }

    // ------------------------------------------------------------------ icons

    function svg(size, children, options) {
      return h('svg', {
        viewBox: (options && options.viewBox) || '0 0 24 24',
        width: size,
        height: size,
        fill: 'none',
        stroke: 'currentColor',
        strokeWidth: (options && options.strokeWidth) || 1.8,
        strokeLinecap: 'round',
        strokeLinejoin: 'round',
        'aria-hidden': 'true',
      }, children)
    }

    function IconChevronDown(size = 15) {
      return svg(size, [h('path', { key: 'p', d: 'm6 9 6 6 6-6' })])
    }
    function IconChevronUp(size = 13) {
      return svg(size, [h('path', { key: 'p', d: 'm6 15 6-6 6 6' })], { strokeWidth: 2 })
    }
    function IconChevronDownSmall(size = 13) {
      return svg(size, [h('path', { key: 'p', d: 'm6 9 6 6 6-6' })], { strokeWidth: 2 })
    }
    function IconPlay(size = 14) {
      return svg(size, [h('path', { key: 'p', d: 'M7 4.5v15l13-7.5-13-7.5Z' })])
    }
    function IconPause(size = 14) {
      return svg(size, [h('path', { key: 'p', d: 'M8 5v14M16 5v14' })])
    }
    function IconPlus(size = 14) {
      return svg(size, [h('path', { key: 'p', d: 'M12 5v14M5 12h14' })])
    }
    function IconClose(size = 16) {
      return svg(size, [h('path', { key: 'p', d: 'M6 6l12 12M18 6 6 18' })])
    }
    function IconMore(size = 15) {
      return svg(size, [
        h('circle', { key: 'a', cx: 5, cy: 12, r: 1.4 }),
        h('circle', { key: 'b', cx: 12, cy: 12, r: 1.4 }),
        h('circle', { key: 'c', cx: 19, cy: 12, r: 1.4 }),
      ], { strokeWidth: 2 })
    }
    function IconFolder(size = 15) {
      return svg(size, [h('path', { key: 'p', d: 'M3 7a2 2 0 0 1 2-2h4l2 2h7a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z' })], { strokeWidth: 1.7 })
    }
    function IconChat(size = 14) {
      return svg(size, [h('path', { key: 'p', d: 'M21 11.5a8.4 8.4 0 0 1-9 8.4 9 9 0 0 1-3.9-.9L3 20l1-4.1A8.4 8.4 0 0 1 3.6 11 8.4 8.4 0 0 1 12 3a8.4 8.4 0 0 1 9 8.5Z' })], { strokeWidth: 1.7 })
    }
    function IconClock(size = 12) {
      return svg(size, [
        h('circle', { key: 'c', cx: 12, cy: 12, r: 8.5 }),
        h('path', { key: 'p', d: 'M12 7.5V12l3 1.8' }),
      ])
    }
    function IconDb(size = 12) {
      return svg(size, [
        h('ellipse', { key: 'e', cx: 12, cy: 5.5, rx: 7.5, ry: 3 }),
        h('path', { key: 'a', d: 'M4.5 5.5v13c0 1.7 3.4 3 7.5 3s7.5-1.3 7.5-3v-13' }),
        h('path', { key: 'b', d: 'M4.5 12c0 1.7 3.4 3 7.5 3s7.5-1.3 7.5-3' }),
      ])
    }
    function IconCheck(size = 13) {
      return svg(size, [h('path', { key: 'p', d: 'M20 6 9 17l-5-5' })], { strokeWidth: 2 })
    }
    function IconShield(size = 13) {
      return svg(size, [h('path', { key: 'p', d: 'M12 3l7 3v5c0 4.5-3 7.7-7 10-4-2.3-7-5.5-7-10V6l7-3Z' })])
    }
    function IconSend(size = 15) {
      return svg(size, [h('path', { key: 'p', d: 'M12 19V5M6 11l6-6 6 6' })], { strokeWidth: 2.2 })
    }
    function IconTrace(size = 16, second = false) {
      return svg(size, [
        h('path', { key: 'a', d: 'M24 6C14.0589 6 6 14.0589 6 24C6 33.9411 14.0589 42 24 42C33.9411 42 42 33.9411 42 24' }),
        h('path', { key: 'b', d: 'M24 15C19.0294 15 15 19.0294 15 24C15 28.9706 19.0294 33 24 33C28.9706 33 33 28.9706 33 24' }),
        h('path', { key: 'c', d: 'M24 24.0001L30.3 17.6943' }),
        second ? h('path', { key: 'd', d: 'M30.2998 11.4264V17.7H36.6249L41.9999 12.3002H35.7031V6L30.2998 11.4264Z' }) : null,
      ], { viewBox: '0 0 48 48', strokeWidth: 3.2 })
    }
    function IconReport(size = 15) {
      return svg(size, [h('path', { key: 'p', d: 'M4 5h16M4 12h16M4 19h10' })])
    }
    function IconSliders(size = 15) {
      return svg(size, [
        h('circle', { key: 'c', cx: 12, cy: 12, r: 3 }),
        h('path', { key: 'p', d: 'M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3' }),
      ])
    }
    function IconTrash(size = 15) {
      return svg(size, [
        h('path', { key: 'a', d: 'M3 6h18' }),
        h('path', { key: 'b', d: 'M8 6V4h8v2' }),
        h('path', { key: 'c', d: 'M6 6l1 14h10l1-14' }),
      ])
    }
    function IconRows(size = 15) {
      return svg(size, [h('path', { key: 'p', d: 'M4 6h16M4 12h16M4 18h10' })])
    }
    function IconArrowLeft(size = 15) {
      return svg(size, [h('path', { key: 'p', d: 'M15 6l-6 6 6 6' })])
    }
    function IconArrowRight(size = 15) {
      return svg(size, [h('path', { key: 'p', d: 'M9 6l6 6-6 6' })])
    }
    function IconBoxCheck(size = 15, checked = false) {
      return svg(size, [
        h('rect', { key: 'r', x: 4, y: 4, width: 16, height: 16, rx: 3 }),
        checked ? h('path', { key: 'p', d: 'm8 12 3 3 5-6' }) : null,
      ], { strokeWidth: checked ? 2 : 1.6 })
    }

    // Exported through the module closure for the components below.
    const UI = {
      NS, PANEL_ID, api, sleep, pad2, relativeTime, shortDate, pct, readStored, store, baseName,
      STATUS, TABS, WHO, ZH, EN,
      icons: {
        IconChevronDown, IconChevronUp, IconChevronDownSmall, IconPlay, IconPause, IconPlus, IconClose,
        IconMore, IconFolder, IconChat, IconClock, IconDb, IconCheck, IconShield, IconSend, IconTrace,
        IconReport, IconSliders, IconTrash, IconRows, IconArrowLeft, IconArrowRight, IconBoxCheck,
      },
    }
    // -------------------------------------------------------------- components

    /** One fixed menu, anchored to a rect; DSH look: group labels, icons, checks. */
    function MenuSurface({ spec }) {
      const ref = React.useRef(null)
      const [pos, setPos] = React.useState(null)
      React.useLayoutEffect(() => {
        const node = ref.current
        if (node === null || spec === null) return
        const rect = spec.rect
        const width = node.offsetWidth
        const height = node.offsetHeight
        let left = rect.left
        let top = rect.bottom + 6
        if (left + width > window.innerWidth - 12) left = window.innerWidth - width - 12
        if (top + height > window.innerHeight - 12) top = rect.top - height - 6
        setPos({ left: Math.max(12, left), top: Math.max(12, top) })
      }, [spec])
      if (spec === null) return null
      return h('div', {
        ref,
        className: 'pm-menu',
        style: pos === null ? { left: -9999, top: -9999 } : pos,
        onClick: (event) => event.stopPropagation(),
      }, spec.sections.map((section, sectionIndex) => {
        const children = []
        if (section.label) children.push(h('div', { key: 'label', className: 'pm-menu-label' }, section.label))
        for (const item of section.items) {
          children.push(h('button', {
            key: `item-${item.label}-${item.meta ?? ''}`,
            type: 'button',
            className: `pm-menu-item${item.on === true ? ' on' : ''}`,
            onClick: (event) => {
              event.stopPropagation()
              if (typeof item.onClick === 'function') item.onClick()
              if (item.keepOpen !== true && typeof spec.onClose === 'function') spec.onClose()
            },
          }, [
            h('span', { key: 'ico', className: 'ico' }, item.icon === undefined ? null : item.icon),
            h('span', { key: 'lbl', className: 'lbl' }, item.label),
            item.meta ? h('span', { key: 'meta', className: 'meta' }, item.meta) : null,
            h('span', { key: 'check', className: 'check' }, IconCheck(15)),
          ]))
        }
        if (sectionIndex < spec.sections.length - 1) children.push(h('div', { key: 'sep', className: 'pm-menu-sep' }))
        return h(React.Fragment, { key: `section-${sectionIndex}` }, children)
      }))
    }

    function Toast({ value }) {
      return h('div', { className: `pm-toast${value.on ? ' on' : ''}`, role: 'status' }, value.text)
    }

    /** Board row. Description fades on its right edge only when it overflows. */
    function Row({ task, t, onOpen }) {
      const descRef = React.useRef(null)
      const [fade, setFade] = React.useState(false)
      React.useLayoutEffect(() => {
        const node = descRef.current
        if (node !== null) setFade(node.scrollWidth > node.clientWidth + 1)
      }, [task.description, task.id])
      const status = STATUS[task.status] ?? STATUS.editing
      const meta = [
        h('span', { key: 'cwho', className: 'who' }, `${WHO[task.createdBy] ?? WHO.adar} ${t('created')}`),
        h('span', { key: 'cdot1', className: 'dot2' }),
        h('span', { key: 'cat' }, relativeTime(task.createdAt, t)),
        h('span', { key: 'cdot2', className: 'dot2' }),
        h('span', { key: 'uwho', className: 'who' }, `${WHO[task.updatedBy] ?? WHO.adar} ${t('edited')}`),
        h('span', { key: 'cdot3', className: 'dot2' }),
        h('span', { key: 'uat' }, relativeTime(task.updatedAt, t)),
      ]
      if (task.status === 'failed' && task.failure !== null && task.failure !== undefined) {
        meta.push(h('span', { key: 'cdot4', className: 'dot2' }))
        meta.push(h('span', { key: 'fail', className: 'fail' }, task.failure.text))
      }
      if (task.status === 'done' && task.completedAt !== null) {
        meta.push(h('span', { key: 'cdot5', className: 'dot2' }))
        meta.push(h('span', { key: 'done' }, `${t('completed')} ${relativeTime(task.completedAt, t)}`))
      }
      const topChildren = [
        h('span', { key: 'id', className: 'pm-tid' }, task.id),
        h('span', { key: 'title', className: 'pm-ttl' }, task.title),
      ]
      if (task.humanPrereqs.length > 0) topChildren.push(h('span', { key: 'prereq', className: 'pm-badge warn' }, `⚠ ${t('waitingYou')} ${task.humanPrereqs.length}`))
      if (task.status === 'done' && task.verified === true) topChildren.push(h('span', { key: 'verified', className: 'pm-badge plain' }, t('verified')))
      if (task.status === 'done' && task.verified !== true) topChildren.push(h('span', { key: 'unverified', className: 'pm-badge unverified' }, t('unverified')))
      return h('div', { className: 'pm-row', onClick: onOpen, role: 'button', tabIndex: 0, onKeyDown: (event) => { if (event.key === 'Enter') onOpen() } }, [
        h('span', {
          key: 'dot',
          className: `pm-sdot${task.status === 'running' ? ' running' : ''}`,
          style: { background: status.dot },
        }),
        h('div', { key: 'main', className: 'pm-row-main' }, [
          h('div', { key: 'top', className: 'pm-row-top' }, topChildren),
          h('div', { key: 'desc', ref: descRef, className: `pm-row-desc${fade ? ' fade' : ''}` }, task.description || '—'),
          h('div', { key: 'meta', className: 'pm-row-meta' }, meta),
        ]),
        h('div', { key: 'right', className: 'pm-row-right' }, status.label),
      ])
    }

    function PropertyRow({ name, value, dim }) {
      return h('div', { className: 'p' }, [
        h('span', { key: 'k', className: 'k' }, name),
        h('span', { key: 'v', className: `v${dim ? ' dim' : ''}` }, value),
      ])
    }

    /** Detail = centered large card (920px), left content column, right property table. */
    function DetailModal({ task, t, onClose, onPrev, onNext, onOpenSession, onArchive, onEdit, onStatus }) {
      const status = STATUS[task.status] ?? STATUS.editing
      const verifiedText = task.status === 'done' ? (task.verified === true ? t('verified') : t('unverified')) : '—'
      const left = [
        h('div', { key: 'goal', className: 'pm-field' }, [
          h('div', { key: 'k', className: 'k' }, t('goal')),
          h('div', { key: 'v', className: 'v' }, task.description || '—'),
        ]),
        h('div', { key: 'acceptance', className: 'pm-field' }, [
          h('div', { key: 'k', className: 'k' }, t('acceptance')),
          task.acceptance.length > 0
            ? h('ul', { key: 'v', className: 'pm-accept' }, task.acceptance.map((line, index) => h('li', { key: index }, line)))
            : h('div', { key: 'v', className: 'v dim' }, '—'),
        ]),
        h('div', { key: 'summary', className: 'pm-field' }, [
          h('div', { key: 'k', className: 'k' }, t('summary')),
          task.summary
            ? h('div', { key: 'v', className: 'pm-summary' }, task.summary)
            : h('div', { key: 'v', className: 'v dim' }, '—'),
        ]),
        h('div', { key: 'failure', className: 'pm-field' }, [
          h('div', { key: 'k', className: 'k' }, t('failure')),
          task.failure !== null && task.failure !== undefined
            ? h('div', { key: 'v', className: 'v', style: { color: 'var(--pm-red)' } }, task.failure.text)
            : h('div', { key: 'v', className: 'v dim' }, '—'),
        ]),
        h('div', { key: 'sessions', className: 'pm-field' }, [
          h('div', { key: 'k', className: 'k' }, t('sessions')),
          task.sessions.length > 0
            ? h(React.Fragment, { key: 'v' }, task.sessions.map((session, index) => h('div', {
              key: `${session.sessionId ?? index}`,
              className: 'pm-sess',
              onClick: () => onOpenSession(session.sessionId),
            }, [
              h('span', { key: 'title' }, session.title ?? task.title),
              h('span', { key: 'sp', className: 'sp' }),
              h('span', { key: 'st', className: 'st' }, `${session.startedAt ? relativeTime(session.startedAt, t) : ''} · ${session.state ?? ''}`),
            ])))
            : h('div', { key: 'v', className: 'v dim' }, '—'),
        ]),
      ]
      const depends = task.dependsOn.length > 0 ? `${task.dependsOn.join('、')}（${t('dependsHint')}）` : t('none')
      const prereq = task.humanPrereqs.length > 0
        ? h('div', { className: 'pm-prereq-inline' }, h('ul', null, task.humanPrereqs.map((line, index) => h('li', { key: index }, line))))
        : h('span', { className: 'pm-prereq-empty' }, t('none'))
      const right = h('aside', { className: 'pm-d-side' }, h('div', { className: 'pm-props' }, [
        PropertyRow({ key: 'id', name: t('id'), value: task.id }),
        PropertyRow({ key: 'status', name: t('status'), value: status.label }),
        PropertyRow({ key: 'createdBy', name: t('createdBy'), value: WHO[task.createdBy] ?? WHO.adar }),
        PropertyRow({ key: 'createdAt', name: t('createdAt'), value: relativeTime(task.createdAt, t) }),
        PropertyRow({ key: 'updatedBy', name: t('updatedBy'), value: WHO[task.updatedBy] ?? WHO.adar }),
        PropertyRow({ key: 'updatedAt', name: t('updatedAt'), value: relativeTime(task.updatedAt, t) }),
        PropertyRow({ key: 'completedAt', name: t('completedAt'), value: task.completedAt ? relativeTime(task.completedAt, t) : '—', dim: !task.completedAt }),
        PropertyRow({ key: 'verified', name: t('verifyResult'), value: verifiedText, dim: verifiedText === '—' }),
        PropertyRow({ key: 'retries', name: t('retries'), value: `${task.retryCount ?? 0} / ${task.maxRetries ?? 0}` }),
        PropertyRow({ key: 'depends', name: t('depends'), value: depends, dim: task.dependsOn.length === 0 }),
        PropertyRow({ key: 'sessions', name: t('sessionCount'), value: task.sessions.length > 0 ? `${task.sessions.length} ${t('sessionsUnit')}`.trim() : t('none'), dim: task.sessions.length === 0 }),
        PropertyRow({ key: 'revision', name: t('revision'), value: `v${task.revision ?? 1}` }),
        h('div', { key: 'prereq', className: 'p' }, [
          h('span', { key: 'k', className: 'k' }, t('prereqs')),
          h('span', { key: 'v', className: 'v' }, prereq),
        ]),
      ]))
      const action = statusAction(task, t)
      const hasSessions = task.sessions.length > 0
      return h('div', { className: 'pm-modal-wrap', onClick: (event) => { if (event.target === event.currentTarget) onClose() } },
        h('div', { className: 'pm-modal pm-modal-lg', role: 'dialog', 'aria-label': t('sessions') }, [
          h('div', { key: 'head', className: 'pm-m-head' }, [
            h('div', { key: 'main', className: 'h-main' }, [
              h('div', { key: 'crumb', className: 'crumb' }, [
                h('span', { key: 'id' }, task.id),
                h('span', { key: 'dot' }, '·'),
                h('span', { key: 'status' }, status.label),
              ]),
              h('div', { key: 'title', className: 'title' }, task.title),
            ]),
            h('div', { key: 'nav', className: 'pm-nav-group', role: 'group' }, [
              h('button', { key: 'prev', type: 'button', className: 'pm-nav-btn', title: t('prev'), 'aria-label': t('prev'), onClick: onPrev }, IconChevronUp(13)),
              h('button', { key: 'next', type: 'button', className: 'pm-nav-btn', title: t('next'), 'aria-label': t('next'), onClick: onNext }, IconChevronDownSmall(13)),
            ]),
            h('button', { key: 'close', type: 'button', className: 'pm-icon-btn', 'aria-label': t('close'), onClick: onClose }, IconClose(16)),
          ]),
          h('div', { key: 'body', className: 'pm-m-body' }, h('div', { className: 'pm-detail-grid' }, [
            h('div', { key: 'left' }, left),
            right,
          ])),
          h('div', { key: 'foot', className: 'pm-m-foot' }, [
            hasSessions
              ? h('button', {
                key: 'open',
                type: 'button',
                className: 'pm-btn pm-btn-secondary',
                onClick: () => onOpenSession(task.sessions[task.sessions.length - 1].sessionId),
              }, t('openConversation'))
              : null,
            h('span', { key: 'sp', className: 'sp' }),
            action !== undefined
              ? h('button', {
                key: 'action',
                type: 'button',
                className: 'pm-btn pm-btn-secondary',
                onClick: () => onStatus(action.to),
              }, action.label)
              : null,
            h('button', { key: 'archive', type: 'button', className: 'pm-btn pm-btn-secondary', onClick: onArchive }, t('archive')),
            h('button', { key: 'edit', type: 'button', className: 'pm-btn pm-btn-primary', onClick: onEdit }, t('edit')),
          ]),
        ]))
    }

    function statusAction(task, t) {
      if (task.status === 'editing') return { label: t('actionMarkReady'), to: 'ready' }
      if (task.status === 'ready') return { label: t('actionPauseTask'), to: 'paused' }
      if (task.status === 'running') return { label: t('actionPauseTask'), to: 'paused' }
      if (task.status === 'failed') return { label: t('actionRetry'), to: 'ready' }
      if (task.status === 'paused') return { label: t('actionResumeTask'), to: 'ready' }
      if (task.status === 'done') return { label: t('actionReopen'), to: 'editing' }
      return undefined
    }

    function StateModal({ text, updatedAt, t, onClose }) {
      return h('div', { className: 'pm-modal-wrap', onClick: (event) => { if (event.target === event.currentTarget) onClose() } },
        h('div', { className: 'pm-modal', role: 'dialog', 'aria-label': t('stateTitle') }, [
          h('div', { key: 'head', className: 'pm-m-head' }, [
            h('div', { key: 'main', className: 'h-main' }, [
              h('div', { key: 'crumb', className: 'crumb' }, t('stateCrumb')),
              h('div', { key: 'title', className: 'title' }, t('stateTitle')),
            ]),
            h('button', { key: 'close', type: 'button', className: 'pm-icon-btn', 'aria-label': t('close'), onClick: onClose }, IconClose(16)),
          ]),
          h('div', { key: 'body', className: 'pm-m-body' }, [
            h('div', { key: 'text', className: 'pm-state-body' }, text.length > 0 ? text : '—'),
            h('div', { key: 'foot', className: 'pm-state-foot' }, `${t('stateFoot')} · ${relativeTime(updatedAt, t)}`),
          ]),
        ]))
    }

    function ReportModal({ text, date, t, onClose }) {
      return h('div', { className: 'pm-modal-wrap', onClick: (event) => { if (event.target === event.currentTarget) onClose() } },
        h('div', { className: 'pm-modal', role: 'dialog', 'aria-label': t('reportTitle') }, [
          h('div', { key: 'head', className: 'pm-m-head' }, [
            h('div', { key: 'main', className: 'h-main' }, [
              h('div', { key: 'crumb', className: 'crumb' }, date),
              h('div', { key: 'title', className: 'title' }, t('reportTitle')),
            ]),
            h('button', { key: 'close', type: 'button', className: 'pm-icon-btn', 'aria-label': t('close'), onClick: onClose }, IconClose(16)),
          ]),
          h('div', { key: 'body', className: 'pm-m-body' }, h('div', { className: 'pm-report' }, text.length > 0 ? text : t('noReport'))),
        ]))
    }

    /** Board settings popover (trigger window / concurrency / rotation / retries). */
    function SettingsPopover({ settings, t, onClose, onSave }) {
      const [mode, setMode] = React.useState(settings.schedule.mode)
      const [start, setStart] = React.useState(settings.schedule.start)
      const [end, setEnd] = React.useState(settings.schedule.end)
      const [concurrency, setConcurrency] = React.useState(String(settings.maxConcurrent))
      const [rotate, setRotate] = React.useState(String(Math.round(settings.rotateAt * 100)))
      const [retries, setRetries] = React.useState(String(settings.maxRetries))
      return h('div', { className: 'pm-pop' }, [
        h('h4', { key: 'title' }, t('settings')),
        h('div', { key: 'mode', className: 'pm-fld' }, [
          h('label', { key: 'l' }, t('scheduleMode')),
          h('select', {
            key: 's',
            value: mode,
            onChange: (event) => setMode(event.target.value),
          }, [
            h('option', { key: 'off', value: 'offpeak' }, t('scheduleOffpeak')),
            h('option', { key: 'custom', value: 'custom' }, t('scheduleCustom')),
            h('option', { key: 'manual', value: 'manual' }, t('scheduleManual')),
          ]),
        ]),
        h('div', { key: 'times', className: 'row2' }, [
          h('div', { key: 'start', className: 'pm-fld' }, [h('label', { key: 'l' }, t('start')), h('input', { key: 'i', type: 'text', value: start, onChange: (event) => setStart(event.target.value) })]),
          h('div', { key: 'end', className: 'pm-fld' }, [h('label', { key: 'l' }, t('end')), h('input', { key: 'i', type: 'text', value: end, onChange: (event) => setEnd(event.target.value) })]),
          h('div', { key: 'reset', className: 'pm-fld', style: { flex: '0 0 auto' } }, h('button', {
            type: 'button',
            className: 'pm-btn pm-btn-secondary',
            style: { height: 30 },
            onClick: () => { setMode('offpeak'); setStart('18:05'); setEnd('08:55') },
          }, t('reset'))),
        ]),
        h('div', { key: 'numbers', className: 'row2' }, [
          h('div', { key: 'conc', className: 'pm-fld' }, [h('label', { key: 'l' }, t('concurrency')), h('input', { key: 'i', type: 'number', min: 1, max: 8, value: concurrency, onChange: (event) => setConcurrency(event.target.value) })]),
          h('div', { key: 'rotate', className: 'pm-fld' }, [h('label', { key: 'l' }, t('rotate')), h('input', { key: 'i', type: 'text', value: `${rotate}%`, onChange: (event) => setRotate(event.target.value.replace('%', '')) })]),
        ]),
        h('div', { key: 'retry', className: 'pm-fld' }, [
          h('label', { key: 'l' }, t('retryCount')),
          h('input', { key: 'i', type: 'number', min: 0, max: 2, value: retries, style: { width: 90 }, onChange: (event) => setRetries(event.target.value) }),
        ]),
        h('div', { key: 'foot', className: 'foot' }, [
          h('button', { key: 'cancel', type: 'button', className: 'pm-btn pm-btn-ghost', style: { width: 'auto', padding: '0 11px' }, onClick: onClose }, t('cancel')),
          h('button', {
            key: 'save',
            type: 'button',
            className: 'pm-btn pm-btn-primary',
            onClick: () => onSave({
              schedule: { mode, start, end },
              maxConcurrent: Number(concurrency),
              rotateAt: Number(rotate) / 100,
              maxRetries: Number(retries),
            }),
          }, t('save')),
        ]),
      ])
    }

    /** New / edit task form. Dependencies are picked from a checkbox menu, not typed. */
    function TaskFormModal({ mode, task, tasks, t, onClose, onSave }) {
      const [title, setTitle] = React.useState(task?.title ?? '')
      const [description, setDescription] = React.useState(task?.description ?? '')
      const [acceptance, setAcceptance] = React.useState((task?.acceptance ?? []).join('\n'))
      const [prereqs, setPrereqs] = React.useState((task?.humanPrereqs ?? []).join('\n'))
      const [depends, setDepends] = React.useState(task?.dependsOn ?? [])
      const [retries, setRetries] = React.useState(String(task?.maxRetries ?? 1))
      const [depRect, setDepRect] = React.useState(null)
      const [error, setError] = React.useState('')
      React.useEffect(() => {
        const timer = setTimeout(() => {
          const node = document.getElementById('pm-form-title')
          if (node !== null) node.focus()
        }, 50)
        return () => clearTimeout(timer)
      }, [])
      React.useEffect(() => {
        if (depRect === null) return undefined
        const onDown = (event) => {
          const target = event.target
          if (target instanceof Node && (target.closest('.pm-menu') !== null || target.closest('.pm-pick') !== null)) return
          setDepRect(null)
        }
        document.addEventListener('mousedown', onDown)
        return () => document.removeEventListener('mousedown', onDown)
      }, [depRect])
      const options = tasks.filter((item) => item.id !== task?.id)
      const depMenuSpec = depRect === null ? null : {
        rect: depRect,
        onClose: () => setDepRect(null),
        sections: [{
          label: t('depPick'),
          items: options.map((item) => ({
            icon: IconBoxCheck(15, depends.includes(item.id)),
            label: item.title,
            meta: item.id,
            on: depends.includes(item.id),
            keepOpen: true,
            onClick: () => {
              setDepends((previous) => previous.includes(item.id) ? previous.filter((id) => id !== item.id) : [...previous, item.id])
            },
          })),
        }],
      }
      const submit = () => {
        if (title.trim().length === 0) {
          setError(t('titleRequired'))
          return
        }
        const wait = Number(retries)
        onSave({
          title: title.trim(),
          description,
          acceptance: acceptance.split('\n').map((line) => line.trim()).filter(Boolean),
          humanPrereqs: prereqs.split('\n').map((line) => line.trim()).filter(Boolean),
          dependsOn: depends,
          maxRetries: Number.isFinite(wait) ? wait : 1,
        })
      }
      return h('div', { className: 'pm-modal-wrap', onClick: (event) => { if (event.target === event.currentTarget) onClose() } },
        h('div', { className: 'pm-modal', role: 'dialog', 'aria-label': mode === 'edit' ? t('editTask') : t('newTask') }, [
          h('div', { key: 'head', className: 'pm-m-head' }, [
            h('div', { key: 'main', className: 'h-main' }, h('div', { key: 'title', className: 'title' }, mode === 'edit' ? t('editTask') : t('newTask'))),
            h('button', { key: 'close', type: 'button', className: 'pm-icon-btn', 'aria-label': t('close'), onClick: onClose }, IconClose(16)),
          ]),
          h('div', { key: 'body', className: 'pm-m-body' }, h('div', { className: 'pm-form' }, [
            h('div', { key: 'title', className: 'pm-fld' }, [
              h('label', { key: 'l', htmlFor: 'pm-form-title' }, t('taskName')),
              h('input', { key: 'i', id: 'pm-form-title', type: 'text', value: title, placeholder: t('taskNamePlaceholder'), onChange: (event) => { setTitle(event.target.value); setError('') } }),
            ]),
            h('div', { key: 'desc', className: 'pm-fld' }, [
              h('label', { key: 'l' }, t('taskDesc')),
              h('textarea', { key: 'i', value: description, placeholder: t('taskDescPlaceholder'), onChange: (event) => setDescription(event.target.value) }),
            ]),
            h('div', { key: 'acceptance', className: 'pm-fld' }, [
              h('label', { key: 'l' }, t('acceptance')),
              h('textarea', { key: 'i', value: acceptance, style: { minHeight: 56 }, placeholder: t('acceptancePlaceholder'), onChange: (event) => setAcceptance(event.target.value) }),
            ]),
            h('div', { key: 'prereq', className: 'pm-fld' }, [
              h('label', { key: 'l' }, t('prereqs')),
              h('textarea', { key: 'i', value: prereqs, style: { minHeight: 50 }, placeholder: t('prereqPlaceholder'), onChange: (event) => setPrereqs(event.target.value) }),
            ]),
            h('div', { key: 'depends', className: 'pm-fld' }, [
              h('label', { key: 'l' }, t('depPick')),
              h('button', {
                key: 'pick',
                type: 'button',
                className: 'pm-pick',
                onClick: (event) => {
                  event.stopPropagation()
                  const rect = event.currentTarget.getBoundingClientRect()
                  setDepRect((previous) => previous === null ? rect : null)
                },
              }, depends.length === 0
                ? h('span', { style: { color: 'var(--pm-text-3)' } }, t('noneDep'))
                : depends.map((id) => {
                  const item = tasks.find((candidate) => candidate.id === id)
                  return h('span', { key: id, className: 'pm-chip' }, [h('b', { key: 'id' }, id), item ? item.title : ''])
                })),
            ]),
            h('div', { key: 'retry', className: 'pm-fld' }, [
              h('label', { key: 'l' }, t('retryLabel')),
              h('input', { key: 'i', type: 'number', min: 0, max: 2, value: retries, style: { width: 90 }, onChange: (event) => setRetries(event.target.value) }),
            ]),
            error.length > 0 ? h('div', { key: 'error', style: { color: 'var(--pm-red)', fontSize: 12.5 } }, error) : null,
          ])),
          h('div', { key: 'foot', className: 'pm-m-foot' }, [
            h('button', { key: 'cancel', type: 'button', className: 'pm-btn pm-btn-secondary', onClick: onClose }, t('cancel')),
            h('button', { key: 'save', type: 'button', className: 'pm-btn pm-btn-primary', onClick: submit }, t('save')),
          ]),
          depMenuSpec === null ? null : h(MenuSurface, { key: 'menu', spec: depMenuSpec }),
        ]))
    }

    /** Sidebar rail icon: IconPark "Trace" outline. */
    function PanellistIcon({ size }) {
      return h('svg', {
        viewBox: '0 0 48 48',
        width: size,
        height: size,
        fill: 'none',
        stroke: 'currentColor',
        strokeWidth: 3.2,
        strokeLinecap: 'round',
        strokeLinejoin: 'round',
        'aria-hidden': 'true',
      }, [
        h('path', { key: 'a', d: 'M24 6C14.0589 6 6 14.0589 6 24C6 33.9411 14.0589 42 24 42C33.9411 42 42 33.9411 42 24' }),
        h('path', { key: 'b', d: 'M24 15C19.0294 15 15 19.0294 15 24C15 28.9706 19.0294 33 24 33C28.9706 33 33 28.9706 33 24' }),
        h('path', { key: 'c', d: 'M24 24.0001L30.3 17.6943' }),
        h('path', { key: 'd', d: 'M30.2998 11.4264V17.7H36.6249L41.9999 12.3002H35.7031V6L30.2998 11.4264Z' }),
      ])
    }

    /** Right-hand常驻 PMO panel: conversation pill, messages, composer, stats. */
    function PmoPanel({
      pmo, collapsed, width, draft, sending, t,
      onCollapse, onExpand, onNewConversation, onState, onConversationMenu, onWidth, onDraft, onSend, onResizeStart,
    }) {
      const panelRef = React.useRef(null)
      const messages = pmo.messages ?? []
      const stats = pmo.stats ?? { turns: 0, steps: 0, tokens: 0, cacheRate: 0, tps: 0, contextRate: 0 }
      const conversation = (pmo.conversations ?? []).find((item) => item.id === pmo.currentId)
      const rows = []
      let previousRole = ''
      for (let index = 0; index < messages.length; index += 1) {
        const message = messages[index]
        if (message.role === 'tool') {
          rows.push(h('div', { key: `m-${index}`, className: 'pm-tool' }, [
            h('span', { key: 'ok', className: 'ok' }, IconCheck(13)),
            h('span', { key: 'text' }, message.text),
          ]))
          previousRole = 'tool'
          continue
        }
        if (message.role === 'user') {
          rows.push(h('div', { key: `m-${index}`, className: 'pm-msg user' }, message.text))
          previousRole = 'user'
          continue
        }
        const showWho = previousRole !== 'ai'
        const paragraphs = String(message.text ?? '').split(/\n{2,}/).filter((part) => part.length > 0)
        rows.push(h('div', { key: `m-${index}`, className: 'pm-msg ai' }, [
          showWho ? h('div', { key: 'who', className: 'who' }, [
            h('span', { key: 'a' }, 'DSH'),
            h('span', { key: 'dot' }, '·'),
            h('span', { key: 'b' }, '项目调度'),
          ]) : null,
          paragraphs.length > 0
            ? paragraphs.map((part, partIndex) => h('p', { key: `p-${partIndex}` }, part))
            : h('p', { key: 'p-0' }, message.text),
        ]))
        previousRole = 'ai'
      }
      const tokenText = (value) => {
        const number = Number(value) || 0
        if (number >= 1_000_000) return `${(number / 1_000_000).toFixed(1)}M`
        if (number >= 1_000) return `${(number / 1_000).toFixed(1)}k`
        return String(number)
      }
      const contextPct = pct(stats.contextRate)
      const showExtras = !collapsed
      return h('div', {
        ref: panelRef,
        className: `pm-pmo${collapsed ? ' collapsed' : ''}`,
        style: collapsed ? undefined : { width: `${width}px`, ['--pm-pmo-w']: `${width}px` },
      }, [
        collapsed ? null : h('div', { key: 'handle', className: 'pm-pmo-handle', title: '拖动调宽', onMouseDown: onResizeStart }),
        h('div', { key: 'head', className: 'pm-pmo-head' }, [
          h('span', { key: 'ic', className: 'pm-pmo-ic' }, IconTrace(16, true)),
          h('span', { key: 'title', className: 'pm-pmo-title' }, [
            '项目调度',
            h('span', { key: 'role', className: 'role' }, '· DSH'),
          ]),
          h('div', { key: 'acts', className: 'pm-pmo-acts' }, [
            h('button', { key: 'state', type: 'button', className: 'pm-icon-btn', title: t('stateMemory'), 'aria-label': t('stateMemory'), onClick: onState }, IconRows(15)),
            h('button', { key: 'new', type: 'button', className: 'pm-icon-btn', title: t('newChat'), 'aria-label': t('newChat'), onClick: onNewConversation }, IconPlus(15)),
            h('button', { key: 'collapse', type: 'button', className: 'pm-icon-btn', title: t('close'), 'aria-label': t('close'), onClick: onCollapse }, IconArrowRight(15)),
          ]),
          collapsed
            ? h('button', { key: 'expand', type: 'button', className: 'pm-icon-btn pm-pmo-expand', title: '展开', 'aria-label': '展开', onClick: onExpand }, IconArrowLeft(15))
            : null,
        ]),
        h('div', { key: 'body', className: 'pm-pmo-body' }, [
          h('div', { key: 'conv', className: 'pm-pmo-conv' }, h('button', {
            key: 'btn',
            type: 'button',
            className: 'pm-conv-btn',
            onClick: (event) => onConversationMenu(event),
          }, [
            h('span', { key: 'icon' }, IconChat(14)),
            h('span', { key: 'lbl', className: 'lbl' }, conversation === undefined ? t('noConversation') : conversation.title),
            conversation === undefined ? null : h('span', { key: 'meta', className: 'meta' }, conversation.date),
            h('span', { key: 'chev' }, IconChevronDown(14)),
          ])),
          h('div', { key: 'msgs', className: 'pm-msgs' }, rows),
          h('div', { key: 'foot', className: 'pm-pmo-foot' }, [
            h('div', { key: 'composer', className: 'pm-composer' }, [
              h('textarea', {
                key: 'input',
                className: 'pm-composer-input',
                rows: 2,
                placeholder: t('placeholder'),
                value: draft,
                onChange: (event) => onDraft(event.target.value),
                onKeyDown: (event) => {
                  if (event.key === 'Enter' && (!event.shiftKey || event.ctrlKey || event.metaKey)) {
                    event.preventDefault()
                    onSend()
                  }
                },
              }),
              h('div', { key: 'bar', className: 'pm-composer-bar' }, [
                showExtras ? h('button', { key: 'add', type: 'button', className: 'pm-cbtn round', title: t('add'), 'aria-label': t('add') }, IconPlus(13)) : null,
                showExtras ? h('span', { key: 'perm', className: 'pm-cbtn', title: t('permission') }, [
                  h('span', { key: 'shield', className: 'shield' }, IconShield(13)),
                  t('permission'),
                  h('span', { key: 'chev', className: 'chev' }, IconChevronDown(11)),
                ]) : null,
                h('span', { key: 'spacer', className: 'pm-cspacer' }),
                h('span', { key: 'model', className: 'pm-cmodel' }, [
                  'DeepSeek-V4.1-Flash ',
                  h('span', { key: 'ver', className: 'pm-cver' }, '1017'),
                ]),
                h('button', { key: 'think', type: 'button', className: 'pm-cbtn', title: t('thinking') }, [
                  t('thinking'),
                  h('span', { key: 'chev', className: 'chev' }, IconChevronDown(11)),
                ]),
                h('button', {
                  key: 'send',
                  type: 'button',
                  className: 'pm-csend',
                  title: t('send'),
                  'aria-label': t('send'),
                  disabled: sending || draft.trim().length === 0,
                  onClick: onSend,
                }, IconSend(15)),
              ]),
            ]),
            h('div', { key: 'stats', className: 'pm-pmo-stats' }, [
              h('span', { key: 'turn', className: 'g' }, [IconClock(12), `${stats.turns} 轮 ${stats.steps} 步 · ${stats.tps} tok/s`]),
              h('span', { key: 'token', className: 'g' }, [IconDb(12), `${tokenText(stats.tokens)} tok · 缓存命中 ${stats.cacheRate}%`]),
              h('span', { key: 'ring', className: 'g' }, [
                h('span', { key: 'r', className: 'pm-ring', style: { '--p': `${contextPct}%` } }),
                `${contextPct}%`,
              ]),
            ]),
          ]),
        ]),
      ])
    }

    /** Settings section: storage root + automatic nightly dispatch. */
    function SettingsSection({ ctx, t }) {
      const [state, setState] = React.useState({ status: 'loading' })
      const [root, setRoot] = React.useState('')
      const [autoRun, setAutoRun] = React.useState(true)
      const [status, setStatus] = React.useState(null)
      const [busy, setBusy] = React.useState(false)
      const alive = React.useRef(true)
      const findNamespace = (value) => {
        const namespaces = value?.namespaces ?? []
        return namespaces.find((item) => item.ns === NS) ?? namespaces.find((item) => String(item.ns ?? '').endsWith(`:${NS}`)) ?? namespaces.find((item) => String(item.ns ?? '').endsWith(NS))
      }
      const load = React.useCallback(async () => {
        try {
          const response = await ctx.remote.settings.describe()
          if (!alive.current) return
          const entry = findNamespace(response?.value)
          if (entry === undefined) {
            setState({ status: 'error' })
            return
          }
          setRoot(String(entry.value?.dataRoot ?? ''))
          setAutoRun(entry.value?.autoRun !== false)
          setState({ status: 'ready', revision: entry.revision, ns: entry.ns })
        } catch (_unavailable) {
          if (alive.current) setState({ status: 'error' })
        }
      }, [ctx])
      React.useEffect(() => {
        alive.current = true
        void load()
        let off
        try {
          off = ctx.remote.$on('settings/document-updated', () => { if (alive.current) void load() })
        } catch (_noEvents) {
          off = undefined
        }
        return () => {
          alive.current = false
          if (typeof off === 'function') off()
        }
      }, [load])
      const save = async () => {
        if (busy || state.status !== 'ready') return
        setBusy(true)
        setStatus(null)
        try {
          const response = await ctx.remote.settings.update(state.ns, { dataRoot: root, autoRun }, state.revision)
          if (response?.ok === false && response.error?.code === 'settings/conflict') {
            setStatus({ kind: 'error', text: t('saveFailed') })
            await load()
            return
          }
          setStatus({ kind: 'saved', text: t('saved') })
          await load()
        } catch (_failed) {
          setStatus({ kind: 'error', text: t('saveFailed') })
        } finally {
          setBusy(false)
        }
      }
      const styleCard = {
        background: 'var(--dsw-alias-bg-layer-1)',
        border: '1px solid var(--dsw-alias-border-l1)',
        borderRadius: 10,
        overflow: 'hidden',
        maxWidth: 760,
      }
      const styleRow = { display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px' }
      const styleLabel = { fontSize: 13, color: 'var(--dsw-alias-label-secondary)', flex: '0 0 96px' }
      const styleInput = {
        flex: '1 1 240px',
        minWidth: 0,
        height: 30,
        padding: '0 10px',
        border: '1px solid var(--dsw-alias-border-l1)',
        borderRadius: 6,
        background: 'var(--dsw-alias-bg-base)',
        color: 'var(--dsw-alias-label-primary)',
        font: 'inherit',
        fontSize: 13,
        outline: 'none',
      }
      if (state.status === 'loading') return h('div', { style: { padding: '4px 0', fontSize: 12, color: 'var(--dsw-alias-label-secondary)' } }, t('loading'))
      if (state.status === 'error') return h('div', { style: { display: 'flex', gap: 10, alignItems: 'center', fontSize: 12, color: 'var(--dsw-alias-state-error-primary)' } }, [
        t('loadFailed'),
        h('button', { key: 'retry', type: 'button', onClick: () => { void load() }, style: { fontSize: 12, cursor: 'pointer', border: '1px solid var(--dsw-alias-border-l1)', background: 'transparent', color: 'inherit', borderRadius: 6, padding: '2px 8px' } }, t('retry')),
      ])
      return h('div', { style: { padding: '4px 0 48px', display: 'flex', flexDirection: 'column', gap: 14 } }, [
        h('div', { key: 'card', style: styleCard }, [
          h('div', { key: 'root', style: styleRow }, [
            h('span', { key: 'label', style: styleLabel }, t('dataRoot')),
            h('input', {
              key: 'input',
              type: 'text',
              value: root,
              spellCheck: false,
              style: styleInput,
              onChange: (event) => { setRoot(event.target.value); setStatus(null) },
            }),
          ]),
          h('div', { key: 'auto', style: { ...styleRow, borderTop: '1px solid var(--dsw-alias-border-l1)' } }, [
            h('span', { key: 'label', style: styleLabel }, t('autoRun')),
            h('label', { key: 'check', style: { display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13 } }, [
              h('input', { key: 'i', type: 'checkbox', checked: autoRun, onChange: (event) => { setAutoRun(event.target.checked); setStatus(null) } }),
              t('autoRun'),
            ]),
          ]),
          h('div', { key: 'foot', style: { ...styleRow, borderTop: '1px solid var(--dsw-alias-border-l1)', justifyContent: 'flex-end' } }, [
            status === null ? null : h('span', { key: 'status', style: { marginRight: 'auto', fontSize: 12, color: status.kind === 'error' ? 'var(--dsw-alias-state-error-primary)' : 'var(--dsw-alias-state-success-primary)' } }, status.text),
            h('button', {
              key: 'save',
              type: 'button',
              disabled: busy,
              onClick: () => { void save() },
              style: {
                height: 30,
                padding: '0 12px',
                borderRadius: 6,
                border: '1px solid transparent',
                background: 'var(--dsw-alias-label-primary)',
                color: 'var(--dsw-alias-bg-base)',
                fontSize: 13,
                cursor: busy ? 'default' : 'pointer',
                opacity: busy ? 0.5 : 1,
              },
            }, t('save')),
          ]),
        ]),
      ])
    }

    // --------------------------------------------------------------------- App

    function App({ ctx, t, props }) {
      const workspaceHook = props.useWorkspaces
      const workspaces = typeof workspaceHook === 'function'
        ? workspaceHook((snapshot) => (snapshot && snapshot.items) || [])
        : []
      const workspaceKey = JSON.stringify(workspaces.map((item) => `${item.path}|${item.title ?? ''}`))

      const [data, setData] = React.useState(null)
      const [cards, setCards] = React.useState([])
      const [error, setError] = React.useState('')
      const [filter, setFilter] = React.useState('all')
      const [detailId, setDetailId] = React.useState(null)
      const [form, setForm] = React.useState(null)
      const [stateOpen, setStateOpen] = React.useState(false)
      const [report, setReport] = React.useState(null)
      const [settingsOpen, setSettingsOpen] = React.useState(false)
      const [menu, setMenu] = React.useState(null)
      const [toast, setToast] = React.useState({ text: '', on: false })
      const [collapsed, setCollapsed] = React.useState(false)
      const [pmoWidth, setPmoWidth] = React.useState(() => {
        const stored = Number(readStored(LS_PMO_W, 400))
        return Number.isFinite(stored) && stored >= 360 && stored <= 720 ? stored : 400
      })
      const [conversationId, setConversationId] = React.useState('')
      const [draft, setDraft] = React.useState('')
      const [sending, setSending] = React.useState(false)

      const versionRef = React.useRef(0)
      const projectRef = React.useRef('')
      const conversationRef = React.useRef('')
      const toastTimer = React.useRef(undefined)
      const rootRef = React.useRef(null)
      const sublineRef = React.useRef(null)
      const subtextRef = React.useRef(null)
      const [sublineClass, setSublineClass] = React.useState('')
      const [compact, setCompact] = React.useState(false)

      const notify = React.useCallback((text) => {
        if (typeof toastTimer.current !== 'undefined') clearTimeout(toastTimer.current)
        setToast({ text, on: true })
        toastTimer.current = setTimeout(() => setToast({ text: '', on: false }), 1600)
      }, [])

      const load = React.useCallback(async (project, convId) => {
        const result = await api({ op: 'snapshot', project, convId: convId || undefined })
        if (result.ok !== true) {
          setError(result.error || t('loadFailed'))
          return result
        }
        setError('')
        setData(result)
        versionRef.current = result.board.version
        const nextConv = result.pmo.currentId ?? ''
        if (nextConv !== '' && nextConv !== conversationRef.current) {
          conversationRef.current = nextConv
          setConversationId(nextConv)
          store(`${LS_CONV}${result.project.key}`, nextConv)
        }
        return result
      }, [t])

      const sync = React.useCallback(async (preferred) => {
        const payload = {
          op: 'sync',
          workspaces: workspaces.map((item) => ({ path: item.path, title: item.title ?? baseName(item.path) })),
        }
        const result = await api(payload)
        if (result.ok !== true) {
          setError(result.error || t('loadFailed'))
          return false
        }
        const list = result.projects ?? []
        setCards(list)
        const wanted = preferred || projectRef.current || readStored(LS_PROJECT, '')
        const chosen = list.find((item) => item.key === wanted)
          ?? list.find((item) => item.path === workspaces[0]?.path)
          ?? list[0]
        if (chosen === undefined) {
          setError('no-project')
          return false
        }
        projectRef.current = chosen.key
        store(LS_PROJECT, chosen.key)
        const savedConv = readStored(`${LS_CONV}${chosen.key}`, '')
        conversationRef.current = savedConv
        setConversationId(savedConv)
        await load(chosen.key, savedConv)
        return true
      }, [workspaces, load, t])

      React.useEffect(() => {
        if (workspaces.length === 0) return undefined
        void sync(undefined)
        return undefined
      }, [workspaceKey])

      // Server push via long-poll: board version changes wake the page up.
      React.useEffect(() => {
        let alive = true
        const loop = async () => {
          while (alive) {
            if (projectRef.current === '') {
              await sleep(600)
              continue
            }
            const result = await api({
              op: 'watch',
              project: projectRef.current,
              version: versionRef.current,
              timeoutMs: 12_000,
            })
            if (!alive) return
            if (result.ok === true && result.changed === true) {
              await load(projectRef.current, conversationRef.current)
            } else if (result.ok !== true) {
              await sleep(1500)
            }
          }
        }
        void loop()
        return () => { alive = false }
      }, [load])

      // Top bar subline: fade at its right edge, fade out entirely when narrow.
      React.useLayoutEffect(() => {
        const measure = () => {
          const container = sublineRef.current
          const text = subtextRef.current
          const root = rootRef.current
          if (root !== null) setCompact(root.clientWidth < 860)
          if (container === null || text === null) return
          const available = container.clientWidth
          const needed = text.scrollWidth
          const overflow = needed > available + 1
          if (overflow && available < 84) setSublineClass('narrow')
          else if (overflow) setSublineClass('fade')
          else setSublineClass('')
        }
        measure()
        if (typeof ResizeObserver !== 'function') return undefined
        const observer = new ResizeObserver(measure)
        if (rootRef.current !== null) observer.observe(rootRef.current)
        return () => observer.disconnect()
      }, [data])

      React.useEffect(() => {
        const onDown = (event) => {
          const target = event.target
          if (menu !== null && target instanceof Node && !target.closest('.pm-menu')) setMenu(null)
        }
        const onKey = (event) => {
          if (event.key !== 'Escape') return
          if (menu !== null) { setMenu(null); return }
          if (form !== null) { setForm(null); return }
          if (detailId !== null) { setDetailId(null); return }
          if (stateOpen) { setStateOpen(false); return }
          if (report !== null) { setReport(null); return }
          if (settingsOpen) { setSettingsOpen(false); return }
        }
        document.addEventListener('mousedown', onDown)
        document.addEventListener('keydown', onKey)
        return () => {
          document.removeEventListener('mousedown', onDown)
          document.removeEventListener('keydown', onKey)
        }
      }, [menu, form, detailId, stateOpen, report, settingsOpen])

      const board = data?.board
      const tasks = board?.tasks ?? []
      const counts = React.useMemo(() => {
        const value = { all: tasks.length }
        for (const key of Object.keys(STATUS)) value[key] = 0
        for (const task of tasks) if (value[task.status] !== undefined) value[task.status] += 1
        return value
      }, [tasks])
      const filtered = filter === 'all' ? tasks : tasks.filter((task) => task.status === filter)
      const detailTask = detailId === null ? undefined : tasks.find((task) => task.id === detailId)

      const refresh = async () => {
        if (projectRef.current !== '') await load(projectRef.current, conversationRef.current)
      }
      const openMenu = (event, sections) => {
        const rect = event.currentTarget.getBoundingClientRect()
        setMenu({ rect, sections, onClose: () => setMenu(null) })
      }
      const switchProject = async (key) => {
        setMenu(null)
        setFilter('all')
        setDetailId(null)
        projectRef.current = key
        store(LS_PROJECT, key)
        const savedConv = readStored(`${LS_CONV}${key}`, '')
        conversationRef.current = savedConv
        setConversationId(savedConv)
        await load(key, savedConv)
      }
      const openSession = (sessionId) => {
        if (typeof sessionId !== 'string' || sessionId.length === 0) return
        try {
          ctx.uiWorkspace?.openSession?.(sessionId)
        } catch (_unavailable) {
          notify(t('loadFailed'))
        }
      }
      const projectMenu = (event) => {
        const items = cards.length > 0
          ? cards.map((card) => ({
            icon: IconFolder(15),
            label: card.name,
            meta: card.key === (data?.project.key ?? projectRef.current) ? t('current') : '',
            on: card.key === (data?.project.key ?? projectRef.current),
            onClick: () => { void switchProject(card.key) },
          }))
          : workspaces.map((item) => ({
            icon: IconFolder(15),
            label: item.title ?? baseName(item.path),
            meta: '',
            on: projectRef.current === '',
            onClick: () => {},
          }))
        openMenu(event, [
          { label: t('projectMenu'), items },
          {
            items: [{
              icon: IconPlus(15),
              label: t('openOther'),
              onClick: () => { notify(t('switchInSidebar')) },
            }],
          },
        ])
      }
      const conversationMenu = (event) => {
        const items = (data?.pmo.conversations ?? []).map((conversation) => ({
          icon: IconChat(15),
          label: conversation.title,
          meta: conversation.date,
          on: conversation.id === data?.pmo.currentId,
          onClick: () => {
            conversationRef.current = conversation.id
            setConversationId(conversation.id)
            store(`${LS_CONV}${data?.project.key ?? ''}`, conversation.id)
            void load(projectRef.current, conversation.id)
          },
        }))
        openMenu(event, [
          { label: t('conv'), items },
          {
            items: [{
              icon: IconPlus(15),
              label: t('newConv'),
              onClick: () => { void newConversation() },
            }],
          },
        ])
      }
      const moreMenu = (event) => {
        openMenu(event, [
          {
            label: '看板',
            items: [
              { icon: IconReport(15), label: t('report'), onClick: () => { void openReport() } },
              { icon: IconSliders(15), label: t('settings'), onClick: () => setSettingsOpen(true) },
            ],
          },
          {
            items: [
              { icon: IconTrash(15), label: t('archiveDone'), onClick: () => { void archiveDone() } },
            ],
          },
        ])
      }
      const run = async () => {
        const result = await api({ op: 'run.start', project: projectRef.current })
        if (result.ok !== true) notify(result.error || t('runNoTask'))
        else notify(t('runStarted'))
        await refresh()
      }
      const togglePause = async () => {
        if (board === undefined) return
        const paused = !board.paused
        const result = await api({ op: 'pause.set', project: projectRef.current, paused })
        if (result.ok !== true) { notify(result.error || t('saveFailed')); return }
        notify(paused ? t('pausedToast') : t('resumedToast'))
        await refresh()
      }
      const saveTask = async (values) => {
        const editing = form?.mode === 'edit'
        const result = editing
          ? await api({ op: 'task.update', project: projectRef.current, id: form.task.id, patch: values, revision: form.task.revision })
          : await api({ op: 'task.create', project: projectRef.current, task: values })
        if (result.ok !== true) {
          notify(result.error === 'conflict' ? t('conflict') : (result.error || t('saveFailed')))
          if (editing) await refresh()
          return
        }
        setForm(null)
        notify(editing ? t('saved') : `${t('saved')}`)
        await refresh()
      }
      const setStatus = async (to) => {
        if (detailTask === undefined) return
        const result = await api({ op: 'task.status', project: projectRef.current, id: detailTask.id, to, revision: detailTask.revision })
        if (result.ok !== true) {
          if (result.error === 'conflict') notify(t('conflict'))
          else if (result.error === 'illegal-transition') notify(`${t('illegal')}：${result.fromLabel ?? ''}`)
          else notify(result.error || t('saveFailed'))
          await refresh()
          return
        }
        notify(`${t('status')}：${STATUS[to]?.label ?? to}`)
        await refresh()
      }
      const archiveTask = async () => {
        if (detailTask === undefined) return
        const result = await api({ op: 'task.archive', project: projectRef.current, id: detailTask.id })
        if (result.ok !== true) { notify(result.error || t('saveFailed')); return }
        setDetailId(null)
        notify(t('archivedToast'))
        await refresh()
      }
      const archiveDone = async () => {
        const result = await api({ op: 'board.archiveDone', project: projectRef.current })
        if (result.ok !== true) { notify(result.error || t('saveFailed')); return }
        notify(`${t('archiveDoneToast')} ${result.count ?? 0}`)
        await refresh()
      }
      const openReport = async () => {
        const list = await api({ op: 'report.list', project: projectRef.current })
        if (list.ok !== true || !Array.isArray(list.dates) || list.dates.length === 0) {
          setReport({ text: '', date: '' })
          return
        }
        const date = list.dates[0]
        const got = await api({ op: 'report.get', project: projectRef.current, date })
        setReport({ text: got.ok === true ? (got.text ?? '') : '', date })
      }
      const saveSettings = async (values) => {
        const result = await api({ op: 'settings.update', project: projectRef.current, settings: values, revision: board?.version })
        if (result.ok !== true) { notify(result.error || t('saveFailed')); return }
        setSettingsOpen(false)
        notify(t('settingsSaved'))
        await refresh()
      }
      const newConversation = async () => {
        const result = await api({ op: 'pmo.new', project: projectRef.current })
        if (result.ok !== true) { notify(result.error || t('saveFailed')); return }
        conversationRef.current = result.conversation.id
        setConversationId(result.conversation.id)
        store(`${LS_CONV}${data?.project.key ?? ''}`, result.conversation.id)
        await refresh()
      }
      const send = async () => {
        const text = draft.trim()
        if (text.length === 0 || sending) return
        setDraft('')
        setSending(true)
        setData((previous) => previous === null ? previous : {
          ...previous,
          pmo: { ...previous.pmo, messages: [...previous.pmo.messages, { role: 'user', text }] },
        })
        const result = await api({
          op: 'pmo.send',
          project: projectRef.current,
          convId: conversationRef.current,
          text,
          requestId: (window.crypto && typeof window.crypto.randomUUID === 'function') ? window.crypto.randomUUID() : `dsh-pm-${Date.now()}-${Math.random()}`,
        })
        if (result.ok !== true) {
          notify(result.error || t('saveFailed'))
          setSending(false)
          await refresh()
          return
        }
        if (result.conversationId !== undefined && result.conversationId !== conversationRef.current) {
          conversationRef.current = result.conversationId
          setConversationId(result.conversationId)
        }
        for (let attempt = 0; attempt < 20; attempt += 1) {
          await sleep(1200)
          const snapshot = await load(projectRef.current, conversationRef.current)
          if (snapshot === undefined || snapshot.ok !== true) break
          const messages = snapshot.pmo.messages ?? []
          const last = messages[messages.length - 1]
          if (messages.length > 0 && last !== undefined && last.role !== 'user' && last.text !== text) break
        }
        setSending(false)
      }
      const beginResize = (event) => {
        event.preventDefault()
        const panel = event.currentTarget.parentElement
        if (panel === null) return
        const startResize = () => {}
        startResize()
        const onMove = (moveEvent) => {
          const rect = panel.parentElement?.getBoundingClientRect()
          const right = rect === undefined ? window.innerWidth : rect.right
          const next = Math.max(360, Math.min(720, right - moveEvent.clientX))
          setPmoWidth(next)
        }
        const onUp = () => {
          window.removeEventListener('mousemove', onMove)
          window.removeEventListener('mouseup', onUp)
          document.body.style.cursor = ''
          document.body.style.userSelect = ''
          const rect = panel.parentElement?.getBoundingClientRect()
          const right = rect === undefined ? window.innerWidth : rect.right
          setPmoWidth((currentWidth) => {
            store(LS_PMO_W, currentWidth)
            return currentWidth
          })
        }
        window.addEventListener('mousemove', onMove)
        window.addEventListener('mouseup', onUp)
        document.body.style.cursor = 'col-resize'
        document.body.style.userSelect = 'none'
      }

      const nav = (direction) => {
        if (filtered.length < 2) return
        const index = filtered.findIndex((task) => task.id === detailId)
        const nextIndex = ((index < 0 ? 0 : index) + direction + filtered.length) % filtered.length
        setDetailId(filtered[nextIndex].id)
      }

      const renderTabs = () => h('div', { className: 'pm-tabs' }, TABS.map(([key, label]) => {
        if (key !== 'all' && counts[key] === 0) return null
        return h('button', {
          key,
          type: 'button',
          className: `pm-tab${filter === key ? ' active' : ''}`,
          onClick: () => setFilter(key),
        }, [label, h('b', { key: 'b' }, String(counts[key] ?? 0))])
      }))

      if (error === 'no-project') {
        return h('div', { className: 'pm-root', ref: rootRef }, [
          h('style', { key: 'css', 'data-plugin': '@local/dsh-pm' }, CSS),
          h('div', { key: 'page', className: 'pm-page' },
            h('div', { className: 'pm-empty', style: { flex: 1, display: 'grid', placeContent: 'center' } }, h('div', { className: 'big' }, t('noProject')))),
        ])
      }
      if (data === null) {
        return h('div', { className: 'pm-root', ref: rootRef }, [
          h('style', { key: 'css', 'data-plugin': '@local/dsh-pm' }, CSS),
          h('div', { key: 'page', className: 'pm-page' },
            h('div', { className: 'pm-empty', style: { flex: 1, display: 'grid', placeContent: 'center' } },
              error.length > 0 ? `${t('loadFailed')}：${error}` : t('loading'))),
        ])
      }

      const project = data.project
      const subline = data.subline
      const pmo = data.pmo

      return h('div', { className: `pm-root${compact ? ' pm-compact' : ''}`, ref: rootRef }, [
        h('style', { key: 'css', 'data-plugin': '@local/dsh-pm' }, CSS),
        h('div', { key: 'page', className: 'pm-page' }, [
          h('div', { key: 'head', className: 'pm-head' }, [
            h('button', { key: 'proj', type: 'button', className: 'pm-proj', onClick: projectMenu }, [
              h('span', { key: 'name' }, project.name),
              IconChevronDown(15),
            ]),
            h('div', { key: 'subline', ref: sublineRef, className: `pm-subline ${sublineClass}`.trim() }, [
              h('span', { key: 'text', ref: subtextRef, className: 'pm-subtext' }, subline),
            ]),
            h('div', { key: 'actions', className: 'pm-actions' }, [
              h('button', { key: 'run', type: 'button', className: 'pm-btn pm-btn-primary', onClick: () => { void run() } }, [
                IconPlay(14), h('span', { key: 'l', className: 'pm-btn-label' }, t('run')),
              ]),
              h('button', { key: 'pause', type: 'button', className: 'pm-btn pm-btn-secondary', onClick: () => { void togglePause() } }, [
                board.paused ? IconPlay(14) : IconPause(14),
                h('span', { key: 'l', className: 'pm-btn-label' }, board.paused ? t('resume') : t('pause')),
              ]),
              h('button', { key: 'new', type: 'button', className: 'pm-btn pm-btn-secondary', onClick: () => setForm({ mode: 'new' }) }, [
                IconPlus(14), h('span', { key: 'l', className: 'pm-btn-label' }, t('newTask')),
              ]),
              h('button', {
                key: 'pmo',
                type: 'button',
                className: 'pm-btn pm-btn-secondary',
                onClick: () => setCollapsed(false),
              }, [IconTrace(14), h('span', { key: 'l', className: 'pm-btn-label' }, t('pmo'))]),
              h('button', { key: 'more', type: 'button', className: 'pm-btn pm-btn-secondary pm-btn-icon', title: t('more'), 'aria-label': t('more'), onClick: moreMenu }, IconMore(15)),
            ]),
          ]),
          board.paused
            ? h('div', { key: 'paused', className: 'pm-body', style: { flex: '0 0 auto', padding: '0 26px' } }, h('div', { className: 'pm-paused-banner' }, [
              IconPause(15),
              h('span', { key: 'text' }, t('pausedBanner')),
              h('span', { key: 'sp', className: 'sp' }),
              h('button', { key: 'resume', type: 'button', className: 'pm-btn pm-btn-secondary', onClick: () => { void togglePause() } }, t('resume')),
            ]))
            : null,
          h('div', { key: 'tabs', style: { flex: '0 0 40px' } }, renderTabs()),
          h('div', { key: 'body', className: 'pm-body' }, filtered.length === 0
            ? h('div', { className: 'pm-empty' }, [
              h('div', { key: 'big', className: 'big' }, tasks.length === 0 ? t('empty') : t('emptyFilter')),
              tasks.length === 0
                ? h('button', { key: 'new', type: 'button', className: 'pm-btn pm-btn-secondary', onClick: () => setForm({ mode: 'new' }) }, t('newTask'))
                : null,
            ])
            : h('div', { className: 'pm-rows' }, filtered.map((task) => h(Row, {
              key: task.id,
              task,
              t,
              onOpen: () => setDetailId(task.id),
            })))),
          detailTask === undefined ? null : h(DetailModal, {
            key: 'detail',
            task: detailTask,
            t,
            onClose: () => setDetailId(null),
            onPrev: () => nav(-1),
            onNext: () => nav(1),
            onOpenSession: openSession,
            onArchive: () => { void archiveTask() },
            onEdit: () => setForm({ mode: 'edit', task: detailTask }),
            onStatus: (to) => { void setStatus(to) },
          }),
          form === null ? null : h(TaskFormModal, {
            key: 'form',
            mode: form.mode,
            task: form.task,
            tasks,
            t,
            onClose: () => setForm(null),
            onSave: (values) => { void saveTask(values) },
          }),
          stateOpen ? h(StateModal, {
            key: 'state',
            text: data.state.text,
            updatedAt: data.now,
            t,
            onClose: () => setStateOpen(false),
          }) : null,
          report === null ? null : h(ReportModal, {
            key: 'report',
            text: report.text,
            date: report.date,
            t,
            onClose: () => setReport(null),
          }),
          settingsOpen ? h(SettingsPopover, {
            key: 'settings',
            settings: board.settings,
            t,
            onClose: () => setSettingsOpen(false),
            onSave: (values) => { void saveSettings(values) },
          }) : null,
        ]),
        h(PmoPanel, {
          key: 'pmo',
          pmo,
          collapsed,
          width: pmoWidth,
          draft,
          sending,
          t,
          onCollapse: () => setCollapsed(true),
          onExpand: () => setCollapsed(false),
          onNewConversation: () => { void newConversation() },
          onState: () => setStateOpen(true),
          onConversationMenu: conversationMenu,
          onWidth: setPmoWidth,
          onDraft: setDraft,
          onSend: () => { void send() },
          onResizeStart: beginResize,
        }),
        menu === null ? null : h(MenuSurface, { key: 'menu', spec: menu }),
        h(Toast, { key: 'toast', value: toast }),
      ])
    }

    // --------------------------------------------------------------- register

    return {
      inject: ['slots', 'locale', 'sessions', 'uiWorkspace'],
      apply(ctx) {
        ctx.effect(() => ctx.locale.register(NS, { zh: ZH, en: EN }), 'dsh-pm: copy dictionaries')
        const t = ctx.locale.bind(NS)

        ctx.slots.inject('main', () => ctx.slots.register({
          name: 'main',
          key: PANEL_ID,
          locale: NS,
        }, (slotProps) => h(App, { ctx, t, props: slotProps ?? {} })))

        ctx.slots.inject('sidebar.panellist', () => ctx.slots.register({
          name: 'sidebar.panellist',
          id: PANEL_ID,
          order: 20,
          locale: NS,
          label: () => t('panel'),
        }, PanellistIcon))

        ctx.slots.inject('settings.section', () => ctx.slots.register({
          name: 'settings.section',
          id: 'dsh-pm',
          order: 13,
          label: () => t('panel'),
          locale: NS,
        }, (slotProps) => h(SettingsSection, { ctx, t, props: slotProps ?? {} })))
      },
    }
  },
})
