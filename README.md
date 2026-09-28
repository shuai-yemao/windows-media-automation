# Windows Media Automation

一个本地优先、监督式的 Codex 媒体插件最小实现。

## 已实现

- MCP/stdio 服务：`scripts/media-service.mjs`
- PowerShell/Node CLI：`scripts/media-cli.mjs`
- 项目状态目录：`.media-automation/`
- Vlog、产品宣传片、课程视频的基础 Taste Profile
- GitHub Style Source Ledger，以及 `DISCOVERED → HARVESTED → VALIDATED → ACTIVE` 生命周期
- GitHub Raw Skill 文本采集到项目本地参考库，但不自动激活
- 外部来源的 Star、许可证、Windows smoke test 和回归状态门禁
- 素材扫描、FFprobe 元数据读取、确定性剪辑计划生成
- 1920×1080、16:9 输出检查
- 不依赖第三方 npm 包；插件不内置 LLM，Codex 负责理解和编排

## 快速开始

在插件根目录执行：

```powershell
node .\scripts\media-cli.mjs init --project C:\path\to\my-video-project
node .\scripts\media-cli.mjs scan --project C:\path\to\my-video-project --input C:\path\to\raw-assets
node .\scripts\media-cli.mjs profile-create --project C:\path\to\my-video-project --id vlog-default --type vlog
node .\scripts\media-cli.mjs plan --project C:\path\to\my-video-project --profile vlog-default --title "周末 Vlog"
node .\scripts\media-cli.mjs validate-output --project C:\path\to\my-video-project --output C:\path\to\preview.mp4
node .\scripts\media-cli.mjs profile-activate --project C:\path\to\my-video-project --id vlog-candidate --confirm true

# 无网络主机侧 smoke test
node .\scripts\smoke-test.mjs
```

也可以直接启动 MCP 服务：

```powershell
node .\scripts\media-service.mjs
```

服务使用逐行 JSON-RPC over stdio，支持 `initialize`、`tools/list` 和 `tools/call`。

## 项目目录

插件不会改写原始素材。首次调用项目工具后，会创建：

```text
<project>/
└── .media-automation/
    ├── project.json
    ├── style-source-ledger.json
    ├── taste-profiles.json
    ├── media-manifest.json
    └── runs/
```

所有输出都带有时间戳、Profile 版本和输入摘要；重新运行同一任务时可以比较历史结果。

## 外部风格来源策略

默认登记以下高可信来源，但状态保持为 `HARVESTED`，不会自动成为运行时依赖：

- Remotion：`https://github.com/remotion-dev/remotion`
- Remotion Agent Skills：`https://github.com/remotion-dev/skills`
- HeyGen Skills：`https://github.com/heygen-com/skills`
- HyperFrames：`https://github.com/heygen-com/hyperframes`

只有许可证、Windows 状态和固定样片回归均通过，来源才可以进入 `VALIDATED`；用户明确确认后才会进入 `ACTIVE`。

## 边界

- 剪映专业版 GUI 自动化和 Photoshop 自动化尚未在此最小切片中实现。
- 网络素材下载尚未自动执行；本切片先维护来源和候选状态，避免把版权不确定素材直接纳入项目。
- 视觉审美仍需人工验收，机器检查只输出 `PASS/WARN/NOT_VERIFIED`。
