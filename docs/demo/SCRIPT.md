# 真实模型演示与复现

`demo.mp4` 使用本地 `next start` 生产构建，模型来自已登录 ChatGPT 订阅的 Codex CLI（不是公网 Gateway / BYOK 成功演示）。公开站点评审需在「模型设置」输入自己的 OpenAI API key，或使用明确标注的规则回退。所有者不购买 API key、不添加信用卡。

## 本地运行

需 `~/.local/bin/codex` 已登录（先执行 `codex login`）、Node 22+、已配置的扶摇 / iFinD 授权。不要把凭证复制到文档。

```bash
npm ci
LLM_PROVIDER=codex-cli npm run dev
```

录制要求生产构建。先停止 dev，然后在终端一运行：

```bash
npm run build
LLM_PROVIDER=codex-cli npm run start -- --hostname 127.0.0.1 --port 3000
```

终端二：

```bash
npx playwright install chromium
BASE_URL=http://127.0.0.1:3000 npm run demo:llm
# ffmpeg 不在 PATH 时加 FFMPEG_PATH=/absolute/path/to/ffmpeg
```

脚本实际访问本机生产服务，直接录制 1280×800 浏览器，无 API 拦截、HAR 或 Playwright trace；断言计划和 memo 都为真实 Codex CLI 模型、扶摇和 iFinD 有成功证据、记忆批准完成。失败不覆盖旧成功视频。输出 `docs/demo/demo.mp4`、metadata.json 与新版截图，ffmpeg 完整解码验证。录制 60–180 秒，CLI 单次超时 60 秒；网络或订阅限流可能使录制失败，失败不能算模型成功。

## 镜头顺序

1. 模型设置、真实源说明与模型设置说明。
2. 真实模型生成计划，展示工具与依赖，批准研究口径。
3. 扶摇 / iFinD 真实取证；实际缺失 / 来源降级保持标注。
4. 审阅冲突与缺口，批准后展示通过守卫的真实模型 memo。
5. 点击引用看原始字段、来源与时点，查看含 planner / memo 的时延瀑布。
6. 单独批准记忆写入，并在长期记忆页确认。
7. 输入无效格式的 BYOK 占位符，展示明确规则回退，再清除；不会请求付费 API。

Codex CLI 的“本地”指调用进程在本机；推理仍经登录的 Codex 服务，研究上下文会发给 OpenAI，不是离线模型。使用订阅配额，单次 token 和费用未知。BYOK 仍是公开路径，key 默认 sessionStorage、可选 localStorage，经本站 API 的请求头转发到 OpenAI，仅该请求使用。录屏不需要任何 OpenAI API key。
