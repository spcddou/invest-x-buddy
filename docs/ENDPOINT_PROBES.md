# 真实授权端点探测 / 2026-10-30 UTC

本节为最新状态，覆盖旧轮次“无密钥”的结论。探测截止 2026-10-30T02:56:08.508Z（北京时间约 10:54–10:56；纽约 10 月 29 日约 22:54–22:56）。通过 `node scripts/probe-providers.mjs` 调用应用同一 toolSources 路由；不输出请求头、密钥或 env 文件内容。截断样本及完整逐源状态在 [provider-probe-results.json](provider-probe-results.json)。以下均是当时真实响应，不代表固定现值。

| 证券 | 扶摇行情 | 利润表 | TTM/MRQ | 不复权日线 | iFinD 公告片段 | 公开回退 |
|---|---|---|---|---|---|---|
| 贵州茅台 600519 | ok | ok | ok | ok | ok | 行情/财务/CNINFO ok；Eastmoney 日线 error |
| 宁德时代 300750 | ok | ok | ok | ok | ok | 行情/财务/CNINFO ok；Eastmoney 日线 error |
| 比亚迪 002594 | ok | ok | ok | ok | error | 行情/财务/CNINFO ok；Eastmoney 日线 error |

扶摇 12/12 逐工具端点 HTTP 200、ApiResponse code=0。iFinD 2/3 成功；比亚迪连接/调用失败，重试一次后仍失败，保留错误并使用 CNINFO 入口，没有改写为成功。三只证券的证据数字核对均通过。

## 截断响应样本

- 600519：`last_price=1369.99` 元；`fiscal_period=Q2`，`operating_income=90703260964.48` 元，`parent_holder_net_profit=44516880421.86` 元；`pe_ttm=21.02776` 倍。仅列首条；data.timestamp、披露日和报告期毫秒原字段见 JSON。
- 300750：`last_price=232.54` 元；`fiscal_period=Q3`，`operating_income=442137424000` 元，`parent_holder_net_profit=64530063000` 元；`pe_ttm=12.267611` 倍。仅列首条；data.timestamp、披露日和报告期毫秒原字段见 JSON。
- 002594：`last_price=82.18` 元；`fiscal_period=Q3`，`operating_income=566303672000` 元，`parent_holder_net_profit=22344978000` 元；`pe_ttm=23.681611` 倍。仅列首条；data.timestamp、披露日和报告期毫秒原字段见 JSON。

## 已纠正的失败与口径

- 初次 iFinD `search_notice` 省略日期返回 JSON-RPC -32602，提示缺少 time_start。现显式传入 time_start/time_end（过去一年）、size=3；不依赖文档中“看似可选”的参数。
- 官方 call-node.js 与 SDK 均拿到真实结果；SDK 曾出现 fetch failed 网络波动，增加完整传输超时与一次重试后保留最终结果，不记录请求异常正文。比亚迪本次仍失败。
- iFinD 外层 MCP content.text 内是 `{code:1,data:"[片段数组]"}`。公告片段可包含生成摘要、截断文本或母公司/合并表混排；只作原文核读线索，不提取为数值事实。日期可落在较早报告期，“最新”自然语言检索不保证最新报告。
- 茅台最新扶摇利润表为 2026-06-30，宁德时代/比亚迪为 2026-09-30。`quarterly` 表示季度末记录，金额为年初至报告期末累计，不是单季。
- 营业收入与营业总收入、不同报告期、TTM/MRQ 与动态 PE 不自动合并。冲突面板保留两条 evidence ID 及待核事项。按各自行情时点展示，抓取时间不是行情时间。
- Eastmoney 日线三只均失败且重试一次；扶摇对应日线均成功。公开行情部分未给有效行情时间，明确降级为未知时点。公开财务与 CNINFO 此次成功不保证永久可用。
- 扶摇 HTTP 429 / code 4001 按官网不立即重试。其他原有一次重试保留。原始披露材料属性 `primary` 与主源路由优先级分开。

## AI Gateway 单独探测

`npx vercel env pull .env.gateway.local --yes` 成功刷新开发 OIDC；临时文件诊断后已删除。官方模型列表包含 `openai/gpt-5-mini`。SDK 请求返回 **403**，明确说明 “requires a valid credit card on file”。因此不是推测的模型 ID 错误，也不能通过换 token 证明开通。按用户要求停止尝试；保留标注的规则回退。账号所有者需在 [AI Gateway 添加信用卡](https://vercel.com/d?to=%2F%5Bteam%5D%2F%7E%2Fai%3Fmodal%3Dadd-credit-card) 为正确团队添加有效信用卡以解锁额度；完成后再验证真实推理。没有替用户更改账单。

依据：[扶摇完整协议](https://fuyao.aicubes.cn/llms-full.txt)、已安装 iFinD 技能 references/news_notices.md 与 call-node.js、[Vercel 认证文档](https://vercel.com/docs/ai-gateway/authentication-and-byok)、[模型页面](https://vercel.com/ai-gateway/models/gpt-5-mini)。

---

以下是旧轮次公开源探测记录，历史状态不代表本轮授权状态。

# Public endpoint probes

Probe time: 2026-10-30 01:57 UTC (America/New_York 2026-10-29 evening). All requests made from the shell with Python urllib, no API keys.

| Endpoint | Actual result | Production decision |
| --- | --- | --- |
| push2.eastmoney.com/api/qt/stock/get | HTTP 200, data.f43/f162/f167 populated for 600519 | quote + dynamic PE/PB; use fltt=2 to return decimal values |
| push2his.eastmoney.com/api/qt/stock/kline/get | HTTP 200, real dated OHLC rows | 90 daily bars, fqt=0 unadjusted; background only |
| datacenter-web.eastmoney.com/api/data/v1/get reportName=RPT_DMSK_FN_MAIN | HTTP 200 but success=false, code 9501, 报表配置不存在 | not used |
| same endpoint, RPT_F10_FINANCE_MAINFINADATA | HTTP 200, result.data contains report period, revenue/profit/adjusted profit growth | verified replacement for failed MAIN report |
| same endpoint, RPT_DMSK_FN_INCOME | HTTP 200, result.data contains report period, DPN_RATIO, DEDUCT_PARENT_NETPROFIT | cross-check against main indicators; same vendor, not independent |
| same endpoint, RPT_DMSK_FN_CASHFLOW | HTTP 200 | probe only; main indicators already provide NETCASH_OPERATE_PK |
| cninfo.com.cn/new/hisAnnouncement/query (POST) | HTTP 200, announcements with title, date, PDF path | verified; fulltextSearch route selected for production |
| cninfo.com.cn/new/fulltextSearch/full (GET) | HTTP 200, matching secCode and adjunctUrl | exact code filtering; title only, PDF body not parsed |
| hq.sinajs.cn/list=sh600519 | HTTP 200, GBK quote string | alternative verified but not needed |

Raw representative financial probe responses with exact URLs and fetchedAt are in `RPT_*.probe.json`. These files are verification artifacts, never imported into production code. Production has no stored financial fallback.

AI Gateway `/v1/models`: `openai/gpt-5-mini` verified present; model supports the chosen text/structured-output flow. Authentication is tested separately after deployment.
