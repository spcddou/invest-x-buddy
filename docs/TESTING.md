# 测试说明

环境：Next.js 16.4.3、Node 26、Vitest 5、Playwright Chromium；本地与真实生产 URL 分开测试。以本轮最终 FINAL_STATUS 和 eval-results.json 为时间基准。

## 命令

```bash
npm test
npm run typecheck
npm run build
# 服务运行后
npm run test:e2e
BASE_URL=https://thesis-lab-mu.vercel.app npm run test:e2e
BASE_URL=https://thesis-lab-mu.vercel.app npm run eval
```

## 覆盖

| 类别 | 验证内容 | 方法 |
|---|---|---|
| 主链路 | 生成计划、编辑步骤、批准口径、真实工具、审阅、memo、打开原始字段、批准写记忆、回放、追问拒绝 | Playwright 主测试 |
| 长期状态 | 清空 localStorage 后同 session 从 Neon 恢复研究与笔记 | Playwright 主测试末尾 |
| 检查点 | `?simulateCrash=step3` 中断，刷新，再执行；捕获请求证明完成步骤没有重调 | Playwright 恢复测试 |
| 权限 / 审批 | 无批准不写记忆、澄清 / 预算 / 冲突 / 记忆 gating；预算拒绝后无工具调用 | 单测 + Playwright |
| 停止 | 用户 stop、步骤数、成本、活跃时间、连续失败、依赖与上下文预算 | 单测 + Playwright 用户停止 |
| 来源失败 | mock HTTP 500/503、超时、一次重试、null / 空 report；生产模拟 Eastmoney 故障并继续其他源 | 单测 + Playwright + eval |
| 无数据 | 不存在证券、未披露指标保留 unknown，不补零 | 单测；代码格式在入口校验 |
| 停牌线索 | 无有效价格/时间，不能宣称近期成交或估值回落 | 单测；不宣称具备全市场停牌状态判定 |
| 时效 | 过期报告、未知行情时点均降级，过期值不能使监测条件判为未触发 | 单测 |
| 冲突 | 营收/利润相反、主要指标/利润表不一致，保留原值不平均 | 单测 + UI 审阅 |
| 数字 | 仅标准化值、仅当前引用证据；拒绝 metadata、未知值、中文数值、无效引用 | 单测 |
| 合规 | 目标价、买卖、满仓、收益承诺、明天涨跌/涨停 | 单测 + 生产 Playwright + eval |
| 上下文 | 真正减少估算 token 数；原 trace 指针保留；窗口展示预算 | 单测 + 视频 |
| 监测 / 版本 / 对比 | 重新取数、同指标跨零、unknown != clear、指标快照差异、公司同项并列 | 单测 + 生产视频 |

## 本轮结果

- TypeScript 检查通过；生产构建通过。
- **42 单元测试通过**，5 个测试文件。
- 生产 Playwright **4 / 4 通过**（覆盖主链路、恢复与故障、合规、预算与用户停止）；清空 localStorage 后 Neon 恢复成功。旧轮次曾检查 390px 移动端，本轮以桌面生产流程为验证范围。
- 五目标生产 eval **5 / 5**，数字核对 **4 / 4**，拒绝 **1 / 1**。
- 生产公开 URL HTTP 200，无需评审登录 Vercel。

## 排查记录

最初浏览器测试连接失败：上一轮残留 Next dev 进程锁与 EPIPE，终止旧的本项目进程并重启后恢复。之后定位器误匹配 Next route announcer 的 alert，以及“写入长期记忆”和导航“长期记忆”；将定位器限制在 main / nav 后重测。未将这些失败计为通过或修改测试来跳过行为。

## 实测限制

真实上游有网络波动，e2e 验证可用性 / 明确降级，不断言某个财务数字永远相同。本轮已在三只 demo A 股真实验证扶摇和 iFinD；逐源成功/失败见 ENDPOINT_PROBES 与 provider-probe-results.json。Gateway 的失败路径已实际验证，成功模型推理未验证。真实证券暂停交易、主数据与中文公司消歧没有完整接口；测试覆盖保守处理线索，不能声称完成所有证券状态判定。未做压测、跨设备登录、并发多标签冲突测试或长期运行可靠性认证。


## 真实源续跑回归

`tests/providers.test.ts` 新增 8 项：扶摇字段/TTM/MRQ/单位/时点映射、累计财务与披露日、错误证券不混入、缺值保持 unknown、跨供应商分歧保留、逐工具优先路由、429与非法信封、iFinD 嵌套响应与日期/一次重试（其中部分断言同项组合）。先观察 6 项失败后变绿，再观察 MCP 重试测试失败后变绿。真实探测：`node scripts/probe-providers.mjs`，只在进程加载 .env.local，输出截断、无鉴权头的样本到 docs/provider-probe-results.json。

Gateway 单独刷新 OIDC 后确认模型存在，但服务明确要求有效信用卡并返回 403；成功模型推理仍未验证。无需继续尝试更换模型或认证方式。生产回归覆盖的是明确标记的规则回退。

最终生产构建：`thesis-itypqds88-peichenchen741-3307.vercel.app`，别名 `thesis-lab-mu.vercel.app`。最终 eval 生成于 2026-10-30T02:59:37.305Z，24/24 工具步骤 ok/partial；最终生产 Playwright 4/4（26.4 秒）。演示 MP4 123.08 秒、1280×800、13 张截图，完整解码通过；长公告卡片五行摘要的视觉检查通过，来源抽屉仍可查看原始内容。
