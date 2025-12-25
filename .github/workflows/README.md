# GitHub Actions 自动打包说明

## 工作流程

1. **触发方式**：
   - 推送 tag：`git tag v1.0.1 && git push origin v1.0.1`
   - 手动触发：在 GitHub 网页的 Actions 标签页点击 "Run workflow"

2. **自动执行**：
   - 在 macOS 虚拟机上打包 macOS 版本
   - 在 Windows 虚拟机上打包 Windows 版本
   - 自动创建 GitHub Release
   - 自动上传两个平台的安装包

3. **用户收到更新**：
   - 应用启动时自动检查更新
   - 发现新版本时提示用户
   - 用户确认后自动下载并安装

## 配置要求

需要在 GitHub 仓库设置中添加 Secret：
- `TAURI_PRIVATE_KEY`: 你的 Tauri 私钥（从 ~/.tauri/checkin-system.key 复制）

## 使用步骤

1. 修改代码
2. 更新版本号（tauri.conf.json 和 Cargo.toml）
3. 提交并推送代码
4. 创建并推送 tag：`git tag v1.0.1 && git push origin v1.0.1`
5. GitHub Actions 自动打包并发布
