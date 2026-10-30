# 投资 X Buddy Implementation Plan

**Goal:** 在本轮完成真实数据驱动、可恢复且可审计的个人投资研究工作台与部署材料。
**Architecture:** 保留现有证据引擎，Zod 注册工具。浏览器执行有界顺序计划；每步 checkpoint 同步 Neon，匿名 session 隔离。原始工具结果留在 trace，工作上下文压缩并引用 trace。用户在澄清、超预算、冲突及记忆写入前审批。
**Tech Stack:** Next.js App Router / React / Zod / AI SDK Gateway / Neon / Vitest / Playwright。

位置：take-home → 投资研究工作台 → 实现、生产验证和录像。
输入：上一轮 prompt、现有 engine、扶摇 llms-full、iFinD 官方 CDN 聚合文档、Eastmoney / CNINFO 实时响应。
边界：不注册数据账号、不使用真实持仓、不执行 git 操作；不将 PDF 标题升格正文，不生成缺失财务数值。
最小完成：可编辑计划 → 澄清审批 → 实时取证 → 冲突审批 → 逐句分类并引用的 memo → 保存审批 → 条件复查；失败、停止和刷新恢复可见。
验收门槛：单测、e2e、五目标 eval、typecheck/build、生产端点、100–160秒真实站点录像。

1. RED：运行已有 harness 测试并补 checkpoint、stop、retry、permission 测试。
2. GREEN：实现 lib/harness.ts 与 registry，改进 provider 元数据和真实官方适配器。
3. 实现 /api/agent、/api/workspace，Neon session cookie 隔离；工具只读，记忆需批准。
4. 以三栏工作台替换 UI。石墨蓝侧栏、白色工作纸、蓝色执行线、琥珀审批提示。统一中文系统字体；证据和运行状态按任务顺序组织。
5. 通过 meaningful tests、实时 provider probes、五目标 eval；build 后部署现有 thesis-lab 项目。
6. LIVE e2e、截图、录像、ffmpeg 转换；README、AI_LOG、TESTING、EVALS、FINAL_STATUS 如实记录验证与缺口。

User 已给定全部规格并要求一次执行，故不插入设计确认或 git commit。
