# Tauri 版本实现指南 - 员工打卡系统

## 🚀 快速开始

### 环境准备

#### 系统要求
- **操作系统**: Windows 10+, macOS 10.13+, Linux
- **Node.js**: 18+ 
- **Rust**: 1.70+
- **包管理器**: npm / yarn / pnpm

#### 安装依赖

```bash
# 1. 安装 Rust (如果还没安装)
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# 2. 创建 Tauri 项目
npm create tauri-app@latest

# 项目配置选择：
# - Project name: checkin-system
# - Package manager: npm
# - UI template: React + TypeScript
# - UI framework: React
# - Add "@tauri-apps/api" dependency: Yes
# - Add "@tauri-apps/cli" as dev dependency: Yes

# 3. 进入项目目录
cd checkin-system

# 4. 安装前端依赖
npm install

# 5. 安装额外依赖
npm install @tanstack/react-query axios date-fns zustand
npm install -D tailwindcss postcss autoprefixer
npm install lucide-react react-hot-toast

# 6. 安装 Rust 后端依赖（在 src-tauri/Cargo.toml 中添加）
```

### 项目结构

```
checkin-system/
├── src/                          # 前端代码 (React + TypeScript)
│   ├── App.tsx
│   ├── main.tsx
│   ├── types/                    # TypeScript 类型定义
│   │   ├── index.ts
│   │   ├── User.ts
│   │   ├── ActionType.ts
│   │   ├── CheckIn.ts
│   │   └── TimeRule.ts
│   ├── components/               # React 组件
│   │   ├── common/               # 公共组件
│   │   │   ├── Button.tsx
│   │   │   ├── Input.tsx
│   │   │   ├── Modal.tsx
│   │   │   └── Card.tsx
│   │   ├── layout/               # 布局组件
│   │   │   ├── Header.tsx
│   │   │   └── Sidebar.tsx
│   │   └── features/             # 功能组件
│   │       ├── login/
│   │       ├── checkin/
│   │       └── admin/
│   ├── pages/                    # 页面组件
│   │   ├── LoginPage.tsx
│   │   ├── CheckInPage.tsx
│   │   └── AdminPage.tsx
│   ├── hooks/                    # 自定义 Hooks
│   │   ├── useAuth.ts
│   │   ├── useCheckIn.ts
│   │   ├── useActionTypes.ts
│   │   └── useTimeRules.ts
│   ├── services/                 # API 服务
│   │   ├── api.ts               # Tauri commands 封装
│   │   └── supabase.ts          # Supabase 客户端
│   ├── store/                    # 状态管理 (Zustand)
│   │   ├── authStore.ts
│   │   ├── checkinStore.ts
│   │   └── uiStore.ts
│   ├── utils/                    # 工具函数
│   │   ├── time.ts              # 时间处理
│   │   ├── validation.ts        # 表单验证
│   │   └── format.ts            # 格式化
│   └── styles/                   # 样式
│       ├── globals.css
│       └── themes.ts
│
├── src-tauri/                    # Rust 后端
│   ├── Cargo.toml               # Rust 依赖配置
│   ├── tauri.conf.json          # Tauri 配置
│   ├── build.rs
│   ├── icons/                   # 应用图标
│   └── src/
│       ├── main.rs              # 入口文件
│       ├── lib.rs               # 库文件
│       ├── commands/            # Tauri 命令
│       │   ├── mod.rs
│       │   ├── auth.rs
│       │   ├── checkin.rs
│       │   ├── admin.rs
│       │   └── statistics.rs
│       ├── models/              # 数据模型
│       │   ├── mod.rs
│       │   ├── user.rs
│       │   ├── action_type.rs
│       │   ├── check_in.rs
│       │   └── time_rule.rs
│       ├── database/            # 数据库模块
│       │   ├── mod.rs
│       │   └── supabase.rs
│       ├── utils/               # 工具模块
│       │   ├── mod.rs
│       │   ├── time.rs
│       │   ├── crypto.rs
│       │   └── validation.rs
│       └── config/              # 配置模块
│           ├── mod.rs
│           └── settings.rs
│
├── public/                       # 静态资源
├── package.json
├── tsconfig.json
├── tailwind.config.js
└── README.md
```

---

## 🔧 核心模块实现

### 1. Rust 后端实现

#### Cargo.toml 依赖配置

```toml
[package]
name = "checkin-system"
version = "1.0.0"
edition = "2021"

[dependencies]
tauri = { version = "1.5", features = ["shell-open"] }
serde = { version = "1.0", features = ["derive"] }
serde_json = "1.0"
tokio = { version = "1", features = ["full"] }
reqwest = { version = "0.11", features = ["json"] }
chrono = { version = "0.4", features = ["serde"] }
chrono-tz = "0.8"
sha2 = "0.10"
hex = "0.4"
anyhow = "1.0"
thiserror = "1.0"
single-instance = "0.3"
tauri-plugin-single-instance = "0.1"

[build-dependencies]
tauri-build = { version = "1.5", features = [] }
```

#### 1.1 数据模型定义

```rust
// src-tauri/src/models/user.rs
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct User {
    pub id: i32,
    pub username: String,
    #[serde(skip_serializing)]
    pub password_hash: String,
    pub full_name: String,
    pub is_admin: bool,
    pub created_at: String,
}

#[derive(Debug, Deserialize)]
pub struct LoginRequest {
    pub username: String,
    pub password: String,
}

#[derive(Debug, Deserialize)]
pub struct RegisterRequest {
    pub username: String,
    pub password: String,
    pub full_name: String,
}
```

```rust
// src-tauri/src/models/action_type.rs
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ActionType {
    pub id: i32,
    pub name: String,
    pub button_text: String,
    pub button_color: String,
    pub display_order: i32,
    pub action_role: i32,
    pub requires_pair: bool,
    pub pair_action_id: Option<i32>,
    pub is_active: bool,
    pub created_at: String,
}
```

```rust
// src-tauri/src/models/check_in.rs
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CheckIn {
    pub id: i32,
    pub user_id: i32,
    pub action_type_id: i32,
    pub check_time: String,
    pub status: String,
    pub pair_check_in_id: Option<i32>,
    pub duration_minutes: Option<i32>,
    pub note: Option<String>,
    pub is_late: bool,
}

#[derive(Debug, Deserialize)]
pub struct CheckInRequest {
    pub user_id: i32,
    pub action_type_id: i32,
    pub status: String,
    pub check_time: Option<String>,
}
```

```rust
// src-tauri/src/models/time_rule.rs
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TimeRule {
    pub id: i32,
    pub rule_name: String,
    pub action_type_id: i32,
    pub expected_time: Option<String>,
    pub allow_early_minutes: Option<i32>,
    pub allow_late_minutes: Option<i32>,
    pub max_duration_minutes: Option<i32>,
    pub warning_minutes: Option<i32>,
    pub timezone: String,
    pub is_active: bool,
}
```

#### 1.2 Supabase 客户端

```rust
// src-tauri/src/database/supabase.rs
use reqwest::Client;
use serde_json::Value;
use anyhow::{Result, Context};

pub struct SupabaseClient {
    base_url: String,
    api_key: String,
    client: Client,
}

impl SupabaseClient {
    pub fn new(base_url: String, api_key: String) -> Self {
        Self {
            base_url,
            api_key,
            client: Client::new(),
        }
    }

    pub async fn get<T: serde::de::DeserializeOwned>(
        &self,
        table: &str,
        params: Option<Vec<(&str, &str)>>,
    ) -> Result<Vec<T>> {
        let url = format!("{}/rest/v1/{}", self.base_url, table);
        
        let mut request = self.client
            .get(&url)
            .header("apikey", &self.api_key)
            .header("Authorization", format!("Bearer {}", self.api_key));
        
        if let Some(params) = params {
            request = request.query(&params);
        }
        
        let response = request.send().await?;
        let data = response.json::<Vec<T>>().await?;
        Ok(data)
    }

    pub async fn post<T: serde::Serialize, R: serde::de::DeserializeOwned>(
        &self,
        table: &str,
        data: &T,
    ) -> Result<R> {
        let url = format!("{}/rest/v1/{}", self.base_url, table);
        
        let response = self.client
            .post(&url)
            .header("apikey", &self.api_key)
            .header("Authorization", format!("Bearer {}", self.api_key))
            .header("Content-Type", "application/json")
            .header("Prefer", "return=representation")
            .json(data)
            .send()
            .await?;
        
        let mut results = response.json::<Vec<R>>().await?;
        results.pop().context("No data returned")
    }

    pub async fn patch<T: serde::Serialize>(
        &self,
        table: &str,
        params: Vec<(&str, &str)>,
        data: &T,
    ) -> Result<()> {
        let url = format!("{}/rest/v1/{}", self.base_url, table);
        
        self.client
            .patch(&url)
            .header("apikey", &self.api_key)
            .header("Authorization", format!("Bearer {}", self.api_key))
            .header("Content-Type", "application/json")
            .query(&params)
            .json(data)
            .send()
            .await?;
        
        Ok(())
    }

    pub async fn delete(
        &self,
        table: &str,
        params: Vec<(&str, &str)>,
    ) -> Result<()> {
        let url = format!("{}/rest/v1/{}", self.base_url, table);
        
        self.client
            .delete(&url)
            .header("apikey", &self.api_key)
            .header("Authorization", format!("Bearer {}", self.api_key))
            .query(&params)
            .send()
            .await?;
        
        Ok(())
    }
}
```

#### 1.3 工具函数

```rust
// src-tauri/src/utils/crypto.rs
use sha2::{Sha256, Digest};

pub fn hash_password(password: &str) -> String {
    let mut hasher = Sha256::new();
    hasher.update(password.as_bytes());
    hex::encode(hasher.finalize())
}
```

```rust
// src-tauri/src/utils/time.rs
use chrono::{DateTime, NaiveDateTime, TimeZone, Utc};
use chrono_tz::Tz;

pub fn get_company_time(timezone: &str) -> DateTime<Tz> {
    let tz: Tz = timezone.parse().unwrap_or(chrono_tz::Asia::Shanghai);
    Utc::now().with_timezone(&tz)
}

pub fn format_time(dt: &DateTime<Tz>) -> String {
    dt.format("%Y-%m-%d %H:%M:%S").to_string()
}

pub fn parse_time(time_str: &str, timezone: &str) -> Option<DateTime<Tz>> {
    let tz: Tz = timezone.parse().ok()?;
    NaiveDateTime::parse_from_str(time_str, "%Y-%m-%d %H:%M:%S")
        .ok()
        .map(|naive| tz.from_local_datetime(&naive).single())
        .flatten()
}
```

#### 1.4 Tauri Commands

```rust
// src-tauri/src/commands/auth.rs
use crate::database::supabase::SupabaseClient;
use crate::models::user::{User, LoginRequest, RegisterRequest};
use crate::utils::crypto::hash_password;
use tauri::State;
use std::sync::Arc;
use anyhow::Result;

#[tauri::command]
pub async fn login(
    request: LoginRequest,
    db: State<'_, Arc<SupabaseClient>>,
) -> Result<User, String> {
    let password_hash = hash_password(&request.password);
    
    let params = vec![
        ("username", request.username.as_str()),
        ("password_hash", password_hash.as_str()),
    ];
    
    let users: Vec<User> = db
        .get("users", Some(params))
        .await
        .map_err(|e| format!("Database error: {}", e))?;
    
    users.into_iter()
        .next()
        .ok_or_else(|| "用户名或密码错误".to_string())
}

#[tauri::command]
pub async fn register(
    request: RegisterRequest,
    db: State<'_, Arc<SupabaseClient>>,
) -> Result<User, String> {
    let password_hash = hash_password(&request.password);
    
    #[derive(serde::Serialize)]
    struct NewUser {
        username: String,
        password_hash: String,
        full_name: String,
        is_admin: bool,
    }
    
    let new_user = NewUser {
        username: request.username,
        password_hash,
        full_name: request.full_name,
        is_admin: false,
    };
    
    db.post::<_, User>("users", &new_user)
        .await
        .map_err(|e| {
            if e.to_string().contains("duplicate") {
                "用户名已存在".to_string()
            } else {
                format!("注册失败: {}", e)
            }
        })
}
```

```rust
// src-tauri/src/commands/checkin.rs
use crate::database::supabase::SupabaseClient;
use crate::models::{action_type::ActionType, check_in::*};
use crate::utils::time::{get_company_time, format_time};
use tauri::State;
use std::sync::Arc;
use anyhow::Result;

#[tauri::command]
pub async fn get_action_types(
    is_active: Option<bool>,
    db: State<'_, Arc<SupabaseClient>>,
) -> Result<Vec<ActionType>, String> {
    let mut params = vec![("order", "display_order.asc")];
    
    let active_str;
    if let Some(active) = is_active {
        active_str = if active { "true" } else { "false" };
        params.push(("is_active", &active_str));
    }
    
    db.get("action_types", Some(params))
        .await
        .map_err(|e| format!("Failed to fetch action types: {}", e))
}

#[tauri::command]
pub async fn add_check_in(
    request: CheckInRequest,
    timezone: String,
    db: State<'_, Arc<SupabaseClient>>,
) -> Result<CheckIn, String> {
    let check_time = request.check_time.unwrap_or_else(|| {
        let now = get_company_time(&timezone);
        format_time(&now)
    });
    
    #[derive(serde::Serialize)]
    struct NewCheckIn {
        user_id: i32,
        action_type_id: i32,
        check_time: String,
        status: String,
        is_late: bool,
    }
    
    let new_check_in = NewCheckIn {
        user_id: request.user_id,
        action_type_id: request.action_type_id,
        check_time: check_time.clone(),
        status: request.status,
        is_late: false, // 这里需要实现迟到检测逻辑
    };
    
    db.post::<_, CheckIn>("check_ins", &new_check_in)
        .await
        .map_err(|e| format!("Failed to create check-in: {}", e))
}

#[tauri::command]
pub async fn get_user_check_ins(
    user_id: i32,
    limit: Option<i32>,
    db: State<'_, Arc<SupabaseClient>>,
) -> Result<Vec<CheckIn>, String> {
    let user_id_str = user_id.to_string();
    let limit_str = limit.unwrap_or(50).to_string();
    
    let params = vec![
        ("user_id", format!("eq.{}", user_id_str).as_str()),
        ("order", "check_time.desc"),
        ("limit", limit_str.as_str()),
    ];
    
    db.get("check_ins", Some(params))
        .await
        .map_err(|e| format!("Failed to fetch check-ins: {}", e))
}
```

#### 1.5 主程序入口

```rust
// src-tauri/src/main.rs
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod commands;
mod models;
mod database;
mod utils;
mod config;

use database::supabase::SupabaseClient;
use std::sync::Arc;
use tauri::Manager;

fn main() {
    // 从环境变量或配置文件读取
    let supabase_url = std::env::var("SUPABASE_URL")
        .unwrap_or_else(|_| "https://your-project.supabase.co".to_string());
    let supabase_key = std::env::var("SUPABASE_KEY")
        .unwrap_or_else(|_| "your-anon-key".to_string());
    
    let db = Arc::new(SupabaseClient::new(supabase_url, supabase_key));
    
    tauri::Builder::default()
        .plugin(tauri_plugin_single_instance::init(|app, _argv, _cwd| {
            // 当尝试打开第二个实例时
            if let Some(window) = app.get_window("main") {
                let _ = window.set_focus();
            }
        }))
        .manage(db)
        .invoke_handler(tauri::generate_handler![
            // Auth
            commands::auth::login,
            commands::auth::register,
            
            // Check-in
            commands::checkin::get_action_types,
            commands::checkin::add_check_in,
            commands::checkin::get_user_check_ins,
            
            // Admin
            commands::admin::add_custom_action_type,
            commands::admin::update_action_type,
            commands::admin::delete_action_type,
            
            // Statistics
            commands::statistics::get_user_statistics,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

---

### 2. 前端实现 (React + TypeScript)

#### 2.1 TypeScript 类型定义

```typescript
// src/types/User.ts
export interface User {
  id: number;
  username: string;
  full_name: string;
  is_admin: boolean;
  created_at: string;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  password: string;
  full_name: string;
}
```

```typescript
// src/types/ActionType.ts
export interface ActionType {
  id: number;
  name: string;
  button_text: string;
  button_color: string;
  display_order: number;
  action_role: number; // 1=上班, 2=下班, 3=事件开始, 4=事件结束
  requires_pair: boolean;
  pair_action_id: number | null;
  is_active: boolean;
  created_at: string;
}
```

```typescript
// src/types/CheckIn.ts
export interface CheckIn {
  id: number;
  user_id: number;
  action_type_id: number;
  check_time: string;
  status: 'ongoing' | 'completed' | 'overtime';
  pair_check_in_id: number | null;
  duration_minutes: number | null;
  note: string | null;
  is_late: boolean;
}

export interface CheckInRequest {
  user_id: number;
  action_type_id: number;
  status: string;
  check_time?: string;
}
```

#### 2.2 API 服务封装

```typescript
// src/services/api.ts
import { invoke } from '@tauri-apps/api/tauri';
import type { User, LoginRequest, RegisterRequest } from '../types/User';
import type { ActionType } from '../types/ActionType';
import type { CheckIn, CheckInRequest } from '../types/CheckIn';

export const authApi = {
  login: (request: LoginRequest) => 
    invoke<User>('login', { request }),
  
  register: (request: RegisterRequest) => 
    invoke<User>('register', { request }),
};

export const checkinApi = {
  getActionTypes: (isActive?: boolean) => 
    invoke<ActionType[]>('get_action_types', { isActive }),
  
  addCheckIn: (request: CheckInRequest, timezone: string) => 
    invoke<CheckIn>('add_check_in', { request, timezone }),
  
  getUserCheckIns: (userId: number, limit?: number) => 
    invoke<CheckIn[]>('get_user_check_ins', { userId, limit }),
};

export const adminApi = {
  addCustomActionType: (data: any) => 
    invoke('add_custom_action_type', { data }),
  
  updateActionType: (id: number, data: any) => 
    invoke('update_action_type', { id, data }),
  
  deleteActionType: (id: number) => 
    invoke('delete_action_type', { id }),
};
```

#### 2.3 状态管理 (Zustand)

```typescript
// src/store/authStore.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User } from '../types/User';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  login: (user: User) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      login: (user) => set({ user, isAuthenticated: true }),
      logout: () => set({ user: null, isAuthenticated: false }),
    }),
    {
      name: 'auth-storage',
    }
  )
);
```

```typescript
// src/store/checkinStore.ts
import { create } from 'zustand';
import type { CheckIn } from '../types/CheckIn';
import type { ActionType } from '../types/ActionType';

interface CheckinState {
  records: CheckIn[];
  actionTypes: ActionType[];
  setRecords: (records: CheckIn[]) => void;
  setActionTypes: (types: ActionType[]) => void;
  addRecord: (record: CheckIn) => void;
}

export const useCheckinStore = create<CheckinState>((set) => ({
  records: [],
  actionTypes: [],
  setRecords: (records) => set({ records }),
  setActionTypes: (actionTypes) => set({ actionTypes }),
  addRecord: (record) => set((state) => ({
    records: [record, ...state.records],
  })),
}));
```

#### 2.4 自定义 Hooks

```typescript
// src/hooks/useAuth.ts
import { useMutation } from '@tanstack/react-query';
import { authApi } from '../services/api';
import { useAuthStore } from '../store/authStore';
import { toast } from 'react-hot-toast';

export const useAuth = () => {
  const { user, isAuthenticated, login, logout } = useAuthStore();

  const loginMutation = useMutation({
    mutationFn: authApi.login,
    onSuccess: (user) => {
      login(user);
      toast.success(`欢迎回来，${user.full_name}！`);
    },
    onError: (error: any) => {
      toast.error(error || '登录失败');
    },
  });

  const registerMutation = useMutation({
    mutationFn: authApi.register,
    onSuccess: () => {
      toast.success('注册成功！请登录');
    },
    onError: (error: any) => {
      toast.error(error || '注册失败');
    },
  });

  return {
    user,
    isAuthenticated,
    login: loginMutation.mutate,
    register: registerMutation.mutate,
    logout,
    isLoggingIn: loginMutation.isPending,
    isRegistering: registerMutation.isPending,
  };
};
```

```typescript
// src/hooks/useCheckIn.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { checkinApi } from '../services/api';
import { useCheckinStore } from '../store/checkinStore';
import { toast } from 'react-hot-toast';
import type { CheckInRequest } from '../types/CheckIn';

export const useCheckIn = (userId: number) => {
  const queryClient = useQueryClient();
  const { records, addRecord } = useCheckinStore();

  const { data: actionTypes } = useQuery({
    queryKey: ['actionTypes'],
    queryFn: () => checkinApi.getActionTypes(true),
  });

  const { data: checkIns } = useQuery({
    queryKey: ['checkIns', userId],
    queryFn: () => checkinApi.getUserCheckIns(userId, 50),
    enabled: !!userId,
  });

  const checkInMutation = useMutation({
    mutationFn: (request: CheckInRequest) => 
      checkinApi.addCheckIn(request, 'Asia/Phnom_Penh'),
    onMutate: async (request) => {
      // 乐观更新：立即添加到UI
      const tempRecord = {
        id: Date.now(),
        ...request,
        check_time: new Date().toISOString(),
        pair_check_in_id: null,
        duration_minutes: null,
        note: null,
        is_late: false,
      };
      addRecord(tempRecord as any);
      return { tempRecord };
    },
    onSuccess: (data, variables, context) => {
      // 替换临时记录为真实记录
      queryClient.invalidateQueries({ queryKey: ['checkIns', userId] });
      toast.success('打卡成功！');
    },
    onError: (error, variables, context) => {
      // 回滚乐观更新
      queryClient.invalidateQueries({ queryKey: ['checkIns', userId] });
      toast.error('打卡失败，请重试');
    },
  });

  return {
    actionTypes: actionTypes || [],
    records: checkIns || records,
    checkIn: checkInMutation.mutate,
    isCheckingIn: checkInMutation.isPending,
  };
};
```

#### 2.5 页面组件

```tsx
// src/pages/LoginPage.tsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Button } from '../components/common/Button';
import { Input } from '../components/common/Input';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { login, register, isLoggingIn, isRegistering } = useAuth();
  
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    full_name: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (mode === 'login') {
      login(
        { username: formData.username, password: formData.password },
        { onSuccess: () => navigate('/checkin') }
      );
    } else {
      register(formData);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="bg-white p-8 rounded-2xl shadow-2xl w-full max-w-md">
        <h1 className="text-3xl font-bold text-center mb-8 text-gray-800">
          员工打卡系统
        </h1>
        
        <div className="flex mb-6 gap-2">
          <button
            onClick={() => setMode('login')}
            className={`flex-1 py-2 rounded-lg font-semibold transition ${
              mode === 'login'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 text-gray-600'
            }`}
          >
            登录
          </button>
          <button
            onClick={() => setMode('register')}
            className={`flex-1 py-2 rounded-lg font-semibold transition ${
              mode === 'register'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 text-gray-600'
            }`}
          >
            注册
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="用户名"
            value={formData.username}
            onChange={(e) => setFormData({ ...formData, username: e.target.value })}
            required
          />
          
          <Input
            label="密码"
            type="password"
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            required
          />
          
          {mode === 'register' && (
            <Input
              label="真实姓名"
              value={formData.full_name}
              onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
              required
            />
          )}

          <Button
            type="submit"
            className="w-full"
            isLoading={isLoggingIn || isRegistering}
          >
            {mode === 'login' ? '登录' : '注册'}
          </Button>
        </form>
      </div>
    </div>
  );
};
```

```tsx
// src/pages/CheckInPage.tsx
import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import { useCheckIn } from '../hooks/useCheckIn';
import { ActionButton } from '../components/features/checkin/ActionButton';
import { RecordsList } from '../components/features/checkin/RecordsList';
import { format } from 'date-fns';

export const CheckInPage: React.FC = () => {
  const { user } = useAuthStore();
  const { actionTypes, records, checkIn } = useCheckIn(user!.id);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleCheckIn = (actionType: any) => {
    const role = actionType.action_role;
    const status = [2, 4].includes(role) ? 'completed' : 'ongoing';
    
    checkIn({
      user_id: user!.id,
      action_type_id: actionType.id,
      status,
    });
  };

  // 按 action_role 分组
  const zone1 = actionTypes.filter(t => t.action_role === 1);
  const events = actionTypes.filter(t => t.action_role === 3);
  const zone2 = actionTypes.filter(t => [2, 4].includes(t.action_role));

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold text-gray-800">
              👤 {user!.full_name}
            </h2>
            <div className="text-lg text-gray-600">
              {format(currentTime, 'yyyy-MM-dd HH:mm:ss')} 金边
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h3 className="text-xl font-semibold mb-4">快速打卡</h3>
          <div className="flex gap-6">
            {/* Zone 1 */}
            <div className="flex flex-col gap-3">
              {zone1.map(type => (
                <ActionButton
                  key={type.id}
                  actionType={type}
                  onClick={() => handleCheckIn(type)}
                />
              ))}
            </div>

            {/* Events */}
            <div className="flex-1 grid grid-cols-4 gap-3">
              {events.map(type => (
                <ActionButton
                  key={type.id}
                  actionType={type}
                  onClick={() => handleCheckIn(type)}
                />
              ))}
            </div>

            {/* Zone 2 */}
            <div className="flex flex-col gap-3">
              {zone2.map(type => (
                <ActionButton
                  key={type.id}
                  actionType={type}
                  onClick={() => handleCheckIn(type)}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Records */}
        <RecordsList records={records} actionTypes={actionTypes} />
      </div>
    </div>
  );
};
```

#### 2.6 公共组件

```tsx
// src/components/common/Button.tsx
import React from 'react';
import { Loader2 } from 'lucide-react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  isLoading?: boolean;
  variant?: 'primary' | 'secondary' | 'danger';
}

export const Button: React.FC<ButtonProps> = ({
  children,
  isLoading,
  variant = 'primary',
  className = '',
  disabled,
  ...props
}) => {
  const baseStyles = 'px-6 py-3 rounded-lg font-semibold transition flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed';
  
  const variantStyles = {
    primary: 'bg-blue-500 hover:bg-blue-600 text-white',
    secondary: 'bg-gray-200 hover:bg-gray-300 text-gray-800',
    danger: 'bg-red-500 hover:bg-red-600 text-white',
  };

  return (
    <button
      className={`${baseStyles} ${variantStyles[variant]} ${className}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading && <Loader2 className="w-5 h-5 animate-spin" />}
      {children}
    </button>
  );
};
```

```tsx
// src/components/features/checkin/ActionButton.tsx
import React from 'react';
import type { ActionType } from '../../../types/ActionType';

interface ActionButtonProps {
  actionType: ActionType;
  onClick: () => void;
  disabled?: boolean;
}

export const ActionButton: React.FC<ActionButtonProps> = ({
  actionType,
  onClick,
  disabled,
}) => {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="px-6 py-3 rounded-lg font-bold text-white transition transform hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
      style={{
        backgroundColor: actionType.button_color,
      }}
    >
      {actionType.button_text}
    </button>
  );
};
```

---

## 🎨 样式配置 (Tailwind CSS)

```javascript
// tailwind.config.js
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#eff6ff',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
        },
      },
    },
  },
  plugins: [],
}
```

---

## 🔒 配置文件

```json
// src-tauri/tauri.conf.json
{
  "build": {
    "beforeDevCommand": "npm run dev",
    "beforeBuildCommand": "npm run build",
    "devPath": "http://localhost:1420",
    "distDir": "../dist"
  },
  "package": {
    "productName": "员工打卡系统",
    "version": "1.0.0"
  },
  "tauri": {
    "allowlist": {
      "all": false,
      "shell": {
        "all": false,
        "open": true
      }
    },
    "bundle": {
      "active": true,
      "identifier": "com.checkin.system",
      "icon": [
        "icons/32x32.png",
        "icons/128x128.png",
        "icons/icon.icns",
        "icons/icon.ico"
      ]
    },
    "security": {
      "csp": null
    },
    "windows": [
      {
        "fullscreen": false,
        "resizable": true,
        "title": "员工打卡系统",
        "width": 1200,
        "height": 800,
        "minWidth": 800,
        "minHeight": 600
      }
    ]
  }
}
```

---

## 📦 打包与部署

### 开发模式

```bash
# 启动开发服务器
npm run tauri dev
```

### 构建生产版本

```bash
# 构建桌面应用
npm run tauri build

# 输出目录: src-tauri/target/release/bundle/
```

### 不同平台构建

```bash
# Windows (.exe, .msi)
npm run tauri build -- --target x86_64-pc-windows-msvc

# macOS (.dmg, .app)
npm run tauri build -- --target x86_64-apple-darwin

# Linux (.deb, .AppImage)
npm run tauri build -- --target x86_64-unknown-linux-gnu
```

---

## ✅ 完成清单

### 基础设施
- [x] 项目创建
- [x] 依赖安装
- [x] 目录结构
- [x] Tauri 配置

### 后端 (Rust)
- [x] 数据模型定义
- [x] Supabase 客户端
- [x] 工具函数（加密、时间）
- [x] Tauri Commands
- [x] 单实例检测

### 前端 (React)
- [x] TypeScript 类型
- [x] API 服务封装
- [x] 状态管理 (Zustand)
- [x] 自定义 Hooks
- [x] 登录页面
- [x] 打卡页面
- [x] 管理员页面

### 功能实现
- [ ] 迟到检测逻辑
- [ ] 跨日工作周期
- [ ] 超时检测
- [ ] Excel 导出
- [ ] 会话持久化
- [ ] 主题切换

### 优化
- [ ] 动画效果
- [ ] 错误处理
- [ ] 加载状态
- [ ] 离线支持

---

**祝开发顺利！** 🎉
