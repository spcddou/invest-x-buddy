# AI 使用与验证记录

日期：2026-10-29 America/New_York / 2026-10-30 UTC。

## 构建过程

用户提供完整题目 13、上一轮 prompt 和已有代码。Codex 阅读上一轮 prompt、现有 engine / provider / tests、当前 Next 16.4.3 随包 route handler 与 server/client 文档。图谱工具返回本项目未索引，按 AGENTS.md 的回退规则读取本地源文件；未使用其他项目图谱。

使用 brainstorming / product-scope 收紧设计，writing-plans 记录执行顺序；遵循用户一次完成与不执行 git 的授权。TDD / karpathy-guidelines 用于计划、预算、恢复、数字和审批逻辑；systematic-debugging 用于开发服务器残留进程与浏览器定位器故障；frontend-design 用于三栏研究桌面；Playwright 用于真实网页验证和录像。未使用并行子代理。

Codex 实现了 Harness、持久化和界面，复用并改进上一轮真实公开 provider、证据与数字核对。没有手工录入生产财务数值。Neon 由用户已登录 Vercel CLI 直接创建和连接，无需提供额外密钥。没有读取工作目录以外的 env / credential 文件；无 git init / commit / push / repo 创建。

## 产品内的 AI

- Vercel AI SDK `generateText` + `Output.object` + Zod，Gateway 模型 `openai/gpt-5-mini`。
- 计划生成需通过合法工具、依赖、步骤预算与末尾唯一 verifier 的规则校验。
- 模型审阅只能引用已获取证据，分类不能超出保守规则边界；不能用扣非指标证明主营因果，不能用价格下跌证明 PE 回落。
- memo / follow-up 的数字、引用与合规规则在展示前检查。拒绝输出之后，展示已核验的规则模板，并标明回退。
- Vercel SDK 源码确认通过 `@vercel/oidc.getVercelOidcToken()` 在运行时取 OIDC；本实现允许 Vercel runtime 调用，不仅检测静态 env token。

## 真实验证与观察

1. 单测先观察缺少 lib/harness 时失败，再实现；补充源重试、检查点筛选、上下文压缩、审批权限、空/过期/停牌线索、冲突和合规边界。
2. 扶摇官网聚合文档与 iFinD 官方 CDN 全文 / 公开安装包只读核验：正确头名、路径、工具名、参数。未执行第三方安装脚本，未注册账号，未调用无密钥付费服务。
3. 公开取数使用实时接口；供应商返回空或失败会留下状态。探测产物在 docs，但生产代码从不 import 这些 JSON。
4. 浏览器真正编辑计划、批准澄清、取证、审阅、生成 memo、打开 raw、批准写记忆、清除本地副本后从 Neon 读取。记录并修复测试定位器与 Next route announcer 的歧义，不隐藏失败。
5. `?simulateCrash=step3` 实测刷新恢复，后续请求没有调用完成的步骤；模拟 503 保留真实其他来源与降级状态。
6. **模型状态实测**：本地和生产 SDK 均返回 AI Gateway HTTP 403。生产 OIDC 路径已调用，但账号 Gateway 授权 / 额度配置未能通过。本轮实际成功的研究产物来自规则计划与模板 memo，界面诚实标注；不能声称模型推理已验证成功。
7. 五目标生产 eval 原始结果见 `eval-results.json`；34 单测与浏览器主流程结果见 TESTING。现场视频来自生产 URL，未拦截 / 伪造 API 响应。

## 数字核对的能力与局限

允许集仅来自当前句子引用的 Evidence.values。日期、代码及 raw 中其他字段不是允许集。正负号与显示精度保留，拒绝未引用数字、生成的目标价、中文量词数字。核对只能追溯数字出处，不能自动证明因果、单位搭配、原始转录正确或缺失反证已被排除。

## 人工提交前仍需核对

Peichen 查看真实视频与部署，确认 README 中的限制适合 take-home；上传源码仓库并填链接。若开通 AI Gateway 或官方源，重新执行 eval / e2e，不能仅凭配置存在改写本日志为“验证成功”。

## 续跑：真实授权源接入（2026-10-30 UTC）

- 按用户要求先读 FINAL_STATUS、README、PROVIDER_SPECS 与完整两轮 brief；图谱仍未索引本项目，回退本地文件发现。使用 iFinD 官方技能、brainstorming / writing-plans（沿用已授权设计）、systematic-debugging、TDD、karpathy-guidelines 与 verification-before-completion；未使用子代理或 git。核读当前 Next 环境变量指南。
- 主路由改为扶摇逐工具取数，iFinD 公告服务默认 URL；公开数据分列回退 / 核验。扶摇信封必须 code=0，iFinD content.text 内信封则 code=1 且 data 是 JSON 字符串，二者没有混用。金额累计、披露日、报告期、原始字段和来源独立保留；TTM/MRQ 与动态 PE 不混用。
- 先运行 6 项新回归测试观察全部失败，再实现并通过；再补 iFinD 瞬时失败重试测试，观察失败后实现一次重试。共 42 单测。未创建镜像实现的低价值测试或额外防御框架。
- 实测纠错：旧公告参数遗漏 time_start/time_end，服务返回 -32602；补齐日期。iFinD 原生 Node 脚本成功后，SDK 首次出现 fetch failed，后续同协议成功，记录为网络波动而非错误断言密钥失效；加入完整传输超时与一次重试。按官网扶摇 429/code4001 不立即重试。
- 探测脚本最初假设项目使用 src/ 路径，纠正到 lib/；Gateway 诊断脚本尝试未安装的 dotenv，改用 Node 内置 loadEnvFile，未增加依赖。TypeScript 指出 DataProvider.fetch 第二参数类型不兼容，将工具选择移至第三参数后通过。
- `vercel env pull` 拉取新的开发 OIDC 到受忽略临时 env 文件，在进程内加载、不输出内容，诊断后删除临时文件；`openai/gpt-5-mini` 在 Gateway 模型列表存在。一次真实 SDK 调用明确返回 403，原因是账号没有有效信用卡；已停止开通尝试，未添加卡、未改计费、未轮换模型。当前规则回退有明确标记。
- 授权值只在服务端请求头中使用；未输出、记录或复制密钥到文档、截图、trace 或浏览器。真实源探测保存有限字段与截断公告，不保存请求头。生产验证与最终视频结果以 FINAL_STATUS / TESTING 为准。

- 视频视觉 QA 发现 iFinD 长片段使证据卡过高、自动滚动定位到列底部，首录截图出现大量空白。中止该录制，为卡片增加五行摘要（原始字段仍完整可查），把演示滚动改为面板顶部后重新部署与重录，未改动源数据。

- 逐字段单位复核发现旧公开估值卡的 values 混入价格（元），以及利润表扣非同比单位未标为 %。新增失败回归后改为价格独立证据、PE/PB 仅倍数、扣非同比为 %；单测合计 42。

- 最终生产 eval 5/5（24/24 工具步骤 ok/partial）及 Playwright 4/4。新版现场录制 13 张截图、约 124 秒；系统 PATH 没有 ffmpeg，默认转码报 ENOENT，使用前轮已有临时虚拟环境中的 ffmpeg 完成 MP4 转码，不安装新依赖。
