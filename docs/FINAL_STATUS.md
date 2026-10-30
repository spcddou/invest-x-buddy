# 最终交付状态 / 2026-10-30 America/New_York

生产 URL：**https://thesis-lab-mu.vercel.app**。本轮部署 `thesis-3sacnnnma-peichenchen741-3307.vercel.app`。源码在本目录，按最新授权仅只读 git status / diff，没有提交、推送或创建仓库。

## 本轮行为

- 公网「模型设置」：遮罩 key、sessionStorage 默认、可选记住到 localStorage、清除 / 忘记；AI SDK OpenAI provider，经本站 API 的请求头转发，仅当前请求使用。默认 gpt-4o-mini（官方已标弃用）、可选 gpt-5.6-terra。key 不进入数据库、研究副本、日志、trace 或导出；上游错误不回传原文。
- 优先级：用户 key → 显式启用的本地 Codex CLI → Gateway → 规则。无效 / 无配额 / 限流 / 超时 / 未通过输出守卫均明确回退；失败 BYOK 不借用所有者 Gateway。
- 所有者不购买 API key、不添加信用卡。CLI 使用已有 ChatGPT 登录，`LLM_PROVIDER=codex-cli npm run dev` 可复现；本机 `next start` 生产构建可用，但 Vercel、托管 production 与非 loopback 请求拒绝 CLI。单次 60s，进程只读 / ephemeral / 独立临时目录，输出先 JSON Schema 后 Zod，再通过原有守卫。planner、工具选择、memo、审批全部共用路径。
- CLI 推理仍发送上下文给 OpenAI，不是离线模型；使用订阅配额，token / 单次费用未知。瀑布含模型计划与 memo 实际时延，UI 标注超时与费用限制。
- 所有 LLM 路由每 IP 每分钟 120 次、每进程的简易限流；不宣称分布式防滥用。
- 扶摇 REST 与 iFinD 公告 MCP 继续真实取证，公开 Eastmoney / CNINFO / 新浪补充与回退分列；数值、口径、时点、引用、合规、冲突审批和记忆批准均保留。

## 验证

- `npm test`、`npm run typecheck`、`npm run build`：结果见 TESTING.md。
- BYOK Playwright 协议 mock **1/1**：真实 SDK → 模型选公告工具 → memo → 追问；实际 Neon 请求体、浏览器研究副本和导出无 key。仅 mock，不宣称付费 API 账号成功。
- 公网 Playwright **5/5**（最终部署 38.6s），包括新 BYOK 设置测试与原 4 项流程。公网无 key 时验证的是诚实规则回退。
- **本地生产 CLI 完整真实模型视频成功：101.92s、1280×800、9 张截图、完整解码通过**；计划与 memo 都为真实 CLI、扶摇和 iFinD 均现场成功，实际来源与解码结果见 `docs/demo/metadata.json` 和 `docs/demo/demo.mp4`。录制脚本要求计划、memo 都为真实 CLI，并断言扶摇 / iFinD 成功、显式故障与记忆批准。视频使用本机生产构建，**不是公网真实模型成功演示**。复现命令见 [SCRIPT.md](demo/SCRIPT.md)。
- 旧轮 5 目标规则 eval 与源探测见 eval-results.json、ENDPOINT_PROBES.md / provider-probe-results.json，未重新解释为本轮模型评估。

## 边界

无 PDF 全文抽取、历史同口径 PE 序列、完整主营 / 成本传导因果确认或全市场证券主数据。公告片段不等于已读全文；latest 不保证最新应披露期。匿名 cookie 工作区，无账号登录、多设备恢复或多人协作；持仓为构造数据；监测手动触发，无交易能力。

公网真实模型需要评审自己的 BYOK；本轮没有购买或验证付费 OpenAI API key。历史 Gateway 403 是可选服务的账号计费限制，不要求所有者继续开通。CLI 不能放到 Vercel 来共享订阅，临时文件清理不代表 OpenAI 服务端无数据留存。不能把数字追溯当作语义或因果正确性证明。
