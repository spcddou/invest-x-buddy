# 官方协议核验 / 2026-10-30 UTC

本轮直接抓取官方文档并核对 SDK 请求，不注册账号、不使用文档示例值作为生产数据。

## 扶摇

入口 https://fuyao.aicubes.cn/docs/；权威聚合 https://fuyao.aicubes.cn/llms-full.txt。
- Base URL `https://fuyao.aicubes.cn`，头 `X-api-key`，业务 `code=0` 才是成功（HTTP 200 亦可为业务失败）。
- `GET /api/a-share/prices/snapshot?thscodes=600519.SH` → `data.item[]`，行情时间 `data.timestamp` 毫秒。
- `GET /api/a-share/prices/historical?thscode=600519.SH&interval=1d&start=<ms>&end=<ms>&adjust=none`。
- `GET /api/a-share/financials/income-statements?thscode=600519.SH&period=quarterly&limit=8`。不得同时传 limit 与 start/end；金额原币元，period_end_ms / report_date_ms 分开。
- `GET /api/a-share/valuations/snapshot?thscodes=600519.SH` → pe_ttm / pe_mrq / pb_mrq 等；不混同 Eastmoney 的动态 PE。
- 官方 MCP 对应工具 `get_a_share_prices_snapshot`、`get_a_share_prices_historical`、`get_a_share_financials_income_statements`、`get_a_share_valuations_snapshot`；本应用使用 REST。
- 开通步骤：登录同花顺账号 → https://fuyao.aicubes.cn/admin/ → 创建具名 API Key → 将密钥写入 Vercel `FUYAO_API_KEY`。本轮已使用配置密钥真实验证，结果见 ENDPOINT_PROBES。

## iFinD MCP

入口 https://mcp.51ifind.com/。根路径 llms-full.txt 实测 404；页面 `<link rel=alternate>` 指向的官方 CDN 可访问：
https://s.thsi.cn/cd/ifind-java-ds-bff-web-container/ifind-mcp-web/llms-full.txt 。
又核读官方公开安装包内 `call-node.js` 与 `references/news_notices.md`：
https://s.thsi.cn/cd/ifind-java-ds-bff-web-container/ifind-mcp-web/skills/ifind-finance-data-1.5.0.zip 。仅在临时目录阅读协议，没有安装或执行包内脚本。
- 官方新闻服务 URL `https://api-mcp.51ifind.com:8643/ds-mcp-servers/hexin-ifind-ds-news-mcp`；以个人中心生成配置为准，可用环境变量 `IFIND_MCP_URL` 覆盖；仅配置 IFIND_TOKEN 时即默认该新闻公告服务 URL。
- Streamable HTTP，`Authorization: <原始MCP密钥>`，不自行增加 Bearer。SDK 执行 initialize → listTools → callTool，并自动协商 MCP session / Accept。
- 公告 `search_notice`，参数 `{query: "证券名称 证券代码 最新定期报告 主营业务 非经常损益"}`。实测必须同时提供 `time_start`、`time_end`（YYYY-MM-DD）及 `size`；省略日期返回 -32602。正常直接 callTool，工具权益由服务端校验。
- 财务工具为 `get_stock_financials`，当日行情 `stock_highfreq_quotes`，综合市场指标 `get_security_indicators`；本版只接公告查询，不冒充全部服务覆盖。
- 开通步骤：官网右上登录（同花顺 APP 或 iFinD 账号）→ 新用户试用 → 个人中心 / 密钥获取 MCP 密钥 → MCP 页面选择新闻公告或综合服务 → 生成配置 → URL 与 Authorization 分别写入 `IFIND_MCP_URL`、`IFIND_TOKEN`。本轮已使用配置密钥真实调用，结果见 ENDPOINT_PROBES。

## 证据语义

默认扶摇 / iFinD 主源；Eastmoney / CNINFO 是标注的补充 / 回退。工具按端点取数，扶摇数值独立生成证据。iFinD MCP content.text 为 JSON `{code:1,data:"[公告片段数组]"}`，须解析两层 JSON；与扶摇 `code=0` 不同。片段保留标题、日期、原文，不进入数值允许集。公开财务同比保持原来源；不同统计口径或报告期不得覆盖。`primary` 仅标识原始披露属性，调用优先级由主源先取、公开分列的路由实现。

本轮 SDK 连接曾出现瞬时 fetch failed；补充完整请求超时和一次重试。扶摇 HTTP 429 / code 4001 不立即重试，遵守官网限流要求。除原有重试、实际观察到的信封/参数/时点校验外，未增加低概率防御框架。

## 本地生产传输修复（BYOK / CLI 续跑）

同一 iFinD 参数独立 Node 成功，但 Next 生产路由 fetch 连续 connect timeout（UND_ERR_CONNECT_TIMEOUT）。本轮对该 MCP 使用 Node 原生 HTTPS 流作 SDK fetch transport，避免 Next fetch 包装路径；保留 SDK 初始化 / 会话 / Accept、18s 完整请求超时和一次重试、原始 Authorization、不把公告片段当全文。生产路由已现场返回成功证据。错误诊断只保存阶段、错误类型、传输代码及公开 endpoint host，不含 headers / 错误 message。
