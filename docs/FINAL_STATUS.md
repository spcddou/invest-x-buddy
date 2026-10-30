# 最终交付状态 / 2026-10-30 UTC

生产 URL：**https://thesis-lab-mu.vercel.app**（公开 HTTP 200，无需登录）。
源码：`~/Documents/Codex/thesis-lab`；本轮未运行任何 git 命令、未创建或上传仓库。

## 本轮已接通

- **扶摇主源**：注册工具 get_quote、get_kline、get_financials、get_valuation 实际调用对应 REST 端点。验证 HTTP / ApiResponse code=0，行情、合并利润表金额、TTM/MRQ 估值与价格背景进入独立证据卡，而非只留在 trace。
- **iFinD 主源**：search_announcements 实际调用官方 MCP search_notice，默认新闻公告服务 URL（IFIND_MCP_URL 可覆盖）。保留真实公告标题、日期与片段；不把语义摘要/截断文本自动转为财务事实或宣称读过全文。
- **公开补充 / 回退**：Eastmoney 财务同比、动态 PE/PB、行情与 CNINFO 公告 PDF 入口保留，UI/trace 明确标注。主源成功时分列核验，失败时继续公开取数；不混用 TTM、MRQ、动态 PE，不平均或覆盖分歧。
- 每项证据可追溯 provider、URL、抓取时间、数据时点、单位、报告期、口径及原始字段。跨供应商金额/报告期/口径问题进入审阅面板。
- 保留原工作台能力：可编辑计划、工具 schema、审批、预算与停止、检查点恢复、上下文压缩、Neon + 浏览器状态、数字核对、记忆、比较、追问、手动监测与确定性回放。

## 真实验证

- 本地三只 A 股：600519、300750、002594。扶摇四类端点 **12/12 成功**；iFinD 茅台/宁德时代成功，比亚迪本地重试一次后仍失败，明确记录并回退 CNINFO。三只数字核对均通过。
- Eastmoney 日线本地三只均失败，扶摇日线均成功；部分公开行情没有有效时点，保持无法验证。具体 cutoff、报告期、截断样本和错误见 [ENDPOINT_PROBES](ENDPOINT_PROBES.md) 与 [provider-probe-results.json](provider-probe-results.json)。不能把网络可用性概括为所有来源永久可用。
- `npm test`：**42/42**（5 文件）；`npm run typecheck` 通过；`npm run build` 与 Vercel 生产构建通过。
- 生产 Playwright：**4/4**，覆盖主链路/原始字段/审批记忆/Neon 恢复、故障+checkpoint恢复、合规、预算与用户停止。
- 生产 eval：**5/5**，合法计划 **4/4**、数字核对 **4/4**、拒绝 **1/1**；24 工具步骤均 ok/partial，失败来源仍保留（主源成功可部分继续），详见 [eval-results.json](eval-results.json)。此结果验证规则回退，不证明模型成功。
- 13 张新版截图及 **123.08 秒**生产演示（1280×800，完整解码检查通过）：`docs/screenshots/`、`docs/demo/demo.mp4`；时长和录制时间以 `docs/demo/metadata.json` 为准。
- `.gitignore` 排除所有 `.env*`、`.vercel/`、node_modules、构建/测试/录像中间产物。密钥特征扫描只输出匹配文件名；配置密钥精确匹配扫描和浏览器 bundle 扫描未发现泄漏。临时 Gateway env 文件已删除。没有输出或记录密钥值。

## 账号所有者需要做的动作

**AI Gateway 的 403 已确定原因，当前模型仍使用标注的规则回退。** 已执行 `vercel env pull` 刷新开发 OIDC；官方列表确认 `openai/gpt-5-mini` 有效。实际 SDK 响应明确要求账号提供有效信用卡以解锁免费额度，已按用户要求停止尝试。

Peichen 需登录本项目所属 Vercel 团队，在 **AI Gateway → Add credit card** 添加有效信用卡：[服务返回的直接入口](https://vercel.com/d?to=%2F%5Bteam%5D%2F%7E%2Fai%3Fmodal%3Dadd-credit-card)。本轮未改账单或代为添加信用卡。完成后重新部署、验证真实模型调用并重跑 eval/e2e；不要把现有规则回退验证改写成模型推理成功。不需要因为这条明确的计费错误而换模型或创建额外 API Key。

源码仓库仍由 Peichen 自行上传并填写 repo URL；不要上传 `.env*`、`.vercel/`、依赖或测试 session。

## 边界 / 未做事项

- 不做 PDF 全文自动解析、历史同口径 PE 序列、主营/分部因果自动确认或完整停牌/证券主数据引擎。iFinD 本轮只接公告服务，没有扩展到其所有股票/宏观/行业工具。
- 主源 latest 表示接口最新可得，不保证最新应披露期（茅台本次扶摇仍为半年报）。公告自然语言“最新”也不保证返回最新报告；报告期、正文范围须人工对齐。
- 手动监测，无后台定时任务。置信度为保守级别，不是校准概率。token / 费用为标注估算，失败请求计费未知。
- 匿名 cookie 的个人工作区，无账号登录、跨设备找回、多人协作或完整多轮消息历史；清 cookie 前导出 JSON。持仓为构造数据，没有交易能力或真实账户信息。
- 未添加新的低概率防御框架；只处理实际观测的响应信封、日期参数、传输失败、时点缺失和统计口径问题。
