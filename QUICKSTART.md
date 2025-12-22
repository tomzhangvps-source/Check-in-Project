# 快速开始指南

## 🚀 5分钟启动项目

### 1. 安装依赖

确保已安装：
- Node.js 18+ 
- Rust 1.70+

如果还没安装 Rust：
```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
```

### 2. 安装项目依赖

```bash
npm install
```

### 3. 配置 Supabase

#### 3.1 创建 Supabase 项目

1. 访问 [https://supabase.com](https://supabase.com)
2. 创建新项目
3. 等待项目初始化完成

#### 3.2 初始化数据库

1. 进入 Supabase 项目控制台
2. 点击左侧菜单 "SQL Editor"
3. 打开项目中的 `database_init.sql` 文件
4. 复制所有内容
5. 粘贴到 SQL Editor 并执行

#### 3.3 获取 API 凭据

1. 在 Supabase 项目中，点击左侧菜单 "Settings" → "API"
2. 复制以下信息：
   - Project URL
   - anon public key

#### 3.4 配置环境变量

1. 复制环境变量模板：
```bash
cp .env.example .env
```

2. 编辑 `.env` 文件，填入您的凭据：
```
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_KEY=your-anon-key
```

3. 编辑 `src-tauri/src/main.rs` 文件（第13-16行），同样填入凭据：
```rust
let supabase_url = std::env::var("SUPABASE_URL")
    .unwrap_or_else(|_| "https://xxxxx.supabase.co".to_string());
let supabase_key = std::env::var("SUPABASE_KEY")
    .unwrap_or_else(|_| "your-anon-key".to_string());
```

### 4. 运行项目

开发模式：
```bash
npm run tauri:dev
```

首次运行会编译 Rust 依赖，需要等待几分钟。

### 5. 使用系统

1. **注册账号**：
   - 点击"注册"标签
   - 输入用户名、密码、姓名
   - 点击"注册"

2. **设置管理员**（首个用户）：
   - 在 Supabase SQL Editor 执行：
   ```sql
   UPDATE users SET is_admin = TRUE WHERE username = 'your_username';
   ```

3. **登录系统**：
   - 使用注册的账号登录

4. **开始打卡**：
   - 点击"上班"按钮开始工作
   - 使用其他按钮记录临时事件
   - 下班时点击"下班"

## 📦 构建生产版本

```bash
npm run tauri:build
```

构建完成后，可执行文件位于：
- Windows: `src-tauri/target/release/bundle/msi/`
- macOS: `src-tauri/target/release/bundle/dmg/`
- Linux: `src-tauri/target/release/bundle/deb/` 或 `appimage/`

## ⚠️ 常见问题

### Rust 编译错误
确保已安装最新版本的 Rust：
```bash
rustup update
```

### 前端依赖安装失败
尝试清除缓存：
```bash
rm -rf node_modules package-lock.json
npm install
```

### Supabase 连接失败
检查：
1. `.env` 文件是否正确配置
2. Supabase 项目是否正常运行
3. API Key 是否正确（使用 anon public key）

### 首次打包时间过长
首次构建需要编译所有 Rust 依赖，通常需要 5-10 分钟，这是正常的。

## 🎯 下一步

- 阅读 [README.md](README.md) 了解完整功能
- 查看 [Tauri版本开发文档_技术实现指南.md](Tauri版本开发文档_技术实现指南.md) 了解技术细节
- 在管理员面板添加自定义打卡类型
- 配置您公司的上下班时间规则

## 📞 获取帮助

如遇到问题：
1. 检查控制台错误信息
2. 查看 Supabase 日志
3. 提交 GitHub Issue（如果是开源项目）
