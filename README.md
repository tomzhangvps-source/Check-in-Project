# 员工打卡系统 (Check-In System)

基于 Tauri + React + TypeScript + Supabase 构建的桌面端员工考勤打卡管理系统。

## ✨ 功能特点

- 🖥️ **桌面应用**：跨平台支持 (Windows, macOS, Linux)
- 🎯 **快速打卡**：直观的按钮界面，一键打卡
- ⏰ **时间管理**：自动检测迟到、计算工作时长
- 🌏 **多时区支持**：支持公司时区配置 (默认金边时间)
- 👥 **用户管理**：支持多用户、管理员权限
- 📊 **数据统计**：查看个人和团队考勤数据
- 🔧 **灵活配置**：可自定义打卡类型和时间规则
- 🎨 **现代界面**：Tailwind CSS + 深色模式支持

## 🚀 快速开始

### 环境要求

- Node.js 18+
- Rust 1.70+
- npm / yarn / pnpm

### 安装步骤

1. **克隆项目**
```bash
cd checkin-system
```

2. **安装前端依赖**
```bash
npm install
```

3. **配置 Supabase**

创建 `.env` 文件并配置您的 Supabase 凭据：

```bash
cp .env.example .env
```

编辑 `.env` 文件，填入您的 Supabase URL 和 API Key：
```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-anon-key-here
```

4. **初始化数据库**

在 Supabase 控制台执行以下 SQL 创建表结构：

```sql
-- 创建用户表
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    is_admin BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 创建打卡类型表
CREATE TABLE action_types (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL,
    button_text VARCHAR(50) NOT NULL,
    button_color VARCHAR(20) NOT NULL,
    display_order INT DEFAULT 0,
    action_role INT NOT NULL,
    requires_pair BOOLEAN DEFAULT FALSE,
    pair_action_id INT REFERENCES action_types(id),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 创建时间规则表
CREATE TABLE time_rules (
    id SERIAL PRIMARY KEY,
    rule_name VARCHAR(100) NOT NULL,
    action_type_id INT REFERENCES action_types(id) ON DELETE CASCADE,
    expected_time TIME,
    allow_early_minutes INT DEFAULT 0,
    allow_late_minutes INT DEFAULT 0,
    max_duration_minutes INT,
    warning_minutes INT,
    timezone VARCHAR(50) DEFAULT 'Asia/Phnom_Penh',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 创建打卡记录表
CREATE TABLE check_ins (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    action_type_id INT REFERENCES action_types(id),
    check_time TIMESTAMP DEFAULT NOW(),
    status VARCHAR(20) DEFAULT 'ongoing',
    pair_check_in_id INT REFERENCES check_ins(id),
    duration_minutes INT,
    note TEXT,
    is_late BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 插入默认打卡类型
INSERT INTO action_types (name, button_text, button_color, display_order, action_role, requires_pair) VALUES
('clock_in', '上班', '#4CAF50', 1, 1, TRUE),
('clock_out', '下班', '#F44336', 2, 2, FALSE),
('back_to_seat', '回座', '#607D8B', 100, 4, FALSE),
('lunch', '午餐', '#FF9800', 10, 3, TRUE),
('meeting', '开会', '#9C27B0', 11, 3, TRUE),
('restroom', '上厕所', '#03A9F4', 12, 3, TRUE);

-- 更新配对关系
UPDATE action_types SET pair_action_id = (SELECT id FROM action_types WHERE name='clock_out') WHERE name='clock_in';
UPDATE action_types SET pair_action_id = (SELECT id FROM action_types WHERE name='back_to_seat') WHERE name IN ('lunch', 'meeting', 'restroom');

-- 插入默认时间规则
INSERT INTO time_rules (rule_name, action_type_id, expected_time, allow_early_minutes, allow_late_minutes) VALUES
('上班时间规则', (SELECT id FROM action_types WHERE name='clock_in'), '09:00:00', 30, 15),
('下班时间规则', (SELECT id FROM action_types WHERE name='clock_out'), '18:00:00', 0, 0);

INSERT INTO time_rules (rule_name, action_type_id, max_duration_minutes, warning_minutes) VALUES
('午餐时长限制', (SELECT id FROM action_types WHERE name='lunch'), 60, 48),
('会议时长限制', (SELECT id FROM action_types WHERE name='meeting'), 120, 96);

-- 创建索引
CREATE INDEX idx_check_ins_user_id ON check_ins(user_id);
CREATE INDEX idx_check_ins_check_time ON check_ins(check_time);
CREATE INDEX idx_check_ins_status ON check_ins(status);
```

5. **开发模式运行**
```bash
npm run tauri:dev
```

6. **构建生产版本**
```bash
npm run tauri:build
```

## 📁 项目结构

```
checkin-system/
├── src/                      # 前端代码 (React + TypeScript)
│   ├── components/          # React 组件
│   ├── pages/               # 页面组件
│   ├── services/            # API 服务
│   ├── store/               # Zustand 状态管理
│   ├── types/               # TypeScript 类型
│   ├── styles/              # 样式文件
│   ├── App.tsx              # 主应用组件
│   └── main.tsx             # 入口文件
├── src-tauri/               # Rust 后端
│   ├── src/
│   │   ├── commands/        # Tauri 命令
│   │   ├── models/          # 数据模型
│   │   ├── database/        # 数据库客户端
│   │   ├── utils/           # 工具函数
│   │   └── main.rs          # 入口文件
│   ├── Cargo.toml           # Rust 依赖
│   └── tauri.conf.json      # Tauri 配置
├── package.json
└── README.md
```

## 🎮 使用指南

### 首次使用

1. **注册账号**：启动应用后，点击"注册"标签，输入用户名、密码和真实姓名
2. **登录系统**：使用注册的账号登录
3. **开始打卡**：点击"上班"按钮开始工作

### 管理员功能

首个注册的用户需要在数据库中手动设置为管理员：

```sql
UPDATE users SET is_admin = TRUE WHERE username = 'your_username';
```

管理员可以：
- 添加/编辑/删除打卡类型
- 配置时间规则
- 管理用户权限
- 查看所有员工打卡记录

### 打卡类型说明

- **上班/下班**：标记工作日的开始和结束
- **午餐**：临时离开去吃午餐
- **开会**：参加会议
- **上厕所**：短暂离开
- **回座**：从临时事件返回工作状态

## 🛠️ 技术栈

### 前端
- **Tauri**: 桌面应用框架
- **React 18**: UI 框架
- **TypeScript**: 类型安全
- **Tailwind CSS**: 样式框架
- **Zustand**: 状态管理
- **React Hot Toast**: 消息提示
- **Lucide React**: 图标库
- **date-fns**: 日期处理

### 后端
- **Rust**: 高性能后端语言
- **Tauri**: 应用框架
- **Tokio**: 异步运行时
- **Reqwest**: HTTP 客户端
- **Chrono**: 时间处理
- **Serde**: 序列化/反序列化

### 数据库
- **Supabase**: PostgreSQL 云数据库

## 📝 开发说明

### 添加新的打卡类型

1. 在管理员面板 → 打卡类型管理
2. 点击"添加类型"
3. 填写按钮文字、选择颜色、设置角色类型
4. 保存后即可在打卡界面使用

### 配置时间规则

1. 在管理员面板 → 时间规则管理
2. 点击"添加规则"
3. 选择对应的打卡类型
4. 设置期望时间、容忍时长等参数

## 🔒 安全说明

- 密码使用 SHA-256 哈希存储
- 建议在生产环境中使用 JWT 进行身份验证
- 定期备份 Supabase 数据库

## 📄 许可证

MIT License

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📧 联系方式

如有问题，请提交 Issue。
