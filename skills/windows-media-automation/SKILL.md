---
name: windows-media-automation
description: Use the local Windows Media Automation MCP service for reproducible media scans, Taste Profiles, GitHub style-source tracking, Vlog edit plans, and output validation.
---

# Windows Media Automation

你是媒体项目的编排者，不是未经监督的自动发布器。使用本 Skill 时：

1. 先读取用户的项目目录和素材目录，不删除、不覆盖原始素材。
2. 先调用 `media_scan_project`，再生成剪辑计划。
3. 先读取生效的 Taste Profile；如果用户提出新审美偏好，使用 `taste_create_profile` 创建 candidate 版本，不直接改 active 版本。
4. GitHub 来源先登记为 `DISCOVERED` 或 `HARVESTED`。只有许可证、Windows smoke test 和固定样片回归都通过时，才允许 `VALIDATED`；用户确认后才设为 `ACTIVE`。
5. 使用 `media_generate_edit_plan` 生成 EDP，再让用户确认，之后才执行剪映或其他编辑器动作。
6. 最终输出必须调用 `media_validate_output`。机器检查只证明媒体结构和配置规则，不能代替人工审美验收。

## 工具

- `media_init_project`：初始化项目状态目录。
- `media_scan_project`：扫描视频、图片、音频，并尝试读取 FFprobe 元数据。
- `taste_list_profiles`：读取 Profile 状态。
- `taste_create_profile`：创建 candidate Taste Profile。
- `taste_register_source`：登记 GitHub 风格来源。
- `taste_harvest_source`：将 GitHub Raw Skill 文本采集到本地参考库，不改变生效状态。
- `taste_validate_source`：按来源门禁计算 `VALIDATED` 或 `HARVESTED`。
- `taste_activate_source`：在验证通过且用户明确确认后，将来源设为 `ACTIVE`。
- `taste_activate_profile`：在用户明确确认后，将 candidate Profile 设为 `active`。
- `media_generate_edit_plan`：生成确定性的 Vlog/产品/课程剪辑计划。
- `media_validate_output`：检查文件存在性、FFprobe 元数据和 16:9 1080p 规则。

## 默认项目风格

- Vlog：自然肤色、人声优先、硬切为主、前 3～8 秒建立主题。
- Product Promo：产品真实、主体清晰、英雄镜头与 CTA 分层。
- Course：信息层级和字幕可读性优先，避免无意义动效。

Remotion 和其他 GitHub Skill 只提供视觉执行语法或参考规则，不替代用户的全局审美偏好。
