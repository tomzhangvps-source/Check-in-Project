// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod commands;
mod database;
mod models;
mod utils;

use database::SupabaseClient;
use tauri::{CustomMenuItem, Menu, MenuItem, Submenu};

fn create_menu() -> Menu {
    // 应用菜单
    let app_menu = Submenu::new("员工打卡系统", Menu::new()
        .add_native_item(MenuItem::About("员工打卡系统".to_string(), Default::default()))
        .add_native_item(MenuItem::Separator)
        .add_native_item(MenuItem::Services)
        .add_native_item(MenuItem::Separator)
        .add_native_item(MenuItem::Hide)
        .add_native_item(MenuItem::HideOthers)
        .add_native_item(MenuItem::ShowAll)
        .add_native_item(MenuItem::Separator)
        .add_native_item(MenuItem::Quit)
    );

    // 文件菜单
    let file_menu = Submenu::new("文件", Menu::new()
        .add_item(CustomMenuItem::new("refresh".to_string(), "刷新").accelerator("CmdOrCtrl+R"))
        .add_native_item(MenuItem::Separator)
        .add_item(CustomMenuItem::new("close".to_string(), "关闭窗口").accelerator("CmdOrCtrl+W"))
    );

    // 编辑菜单
    let edit_menu = Submenu::new("编辑", Menu::new()
        .add_native_item(MenuItem::Undo)
        .add_native_item(MenuItem::Redo)
        .add_native_item(MenuItem::Separator)
        .add_native_item(MenuItem::Cut)
        .add_native_item(MenuItem::Copy)
        .add_native_item(MenuItem::Paste)
        .add_native_item(MenuItem::SelectAll)
    );

    // 视图菜单
    let view_menu = Submenu::new("视图", Menu::new()
        .add_item(CustomMenuItem::new("reload".to_string(), "重新加载").accelerator("CmdOrCtrl+Shift+R"))
        .add_native_item(MenuItem::Separator)
        .add_item(CustomMenuItem::new("fullscreen".to_string(), "全屏").accelerator("Ctrl+CmdOrCtrl+F"))
    );

    // 窗口菜单
    let window_menu = Submenu::new("窗口", Menu::new()
        .add_native_item(MenuItem::Minimize)
        .add_native_item(MenuItem::Zoom)
        .add_native_item(MenuItem::Separator)
        .add_item(CustomMenuItem::new("front".to_string(), "全部置于顶层"))
    );

    // 帮助菜单
    let help_menu = Submenu::new("帮助", Menu::new()
        .add_item(CustomMenuItem::new("docs".to_string(), "使用文档"))
        .add_item(CustomMenuItem::new("support".to_string(), "技术支持"))
    );

    Menu::new()
        .add_submenu(app_menu)
        .add_submenu(file_menu)
        .add_submenu(edit_menu)
        .add_submenu(view_menu)
        .add_submenu(window_menu)
        .add_submenu(help_menu)
}

fn main() {
    // Load environment variables from .env file
    dotenvy::dotenv().ok();
    
    // Initialize Supabase client
    let supabase_url = std::env::var("SUPABASE_URL")
        .expect("SUPABASE_URL must be set in .env file");
    let supabase_key = std::env::var("SUPABASE_KEY")
        .expect("SUPABASE_KEY must be set in .env file");
    
    let db = SupabaseClient::new(supabase_url, supabase_key);

    // 创建中文菜单
    let menu = create_menu();

    tauri::Builder::default()
        .menu(menu)
        .on_menu_event(|event| {
            match event.menu_item_id() {
                "refresh" => {
                    event.window().emit("menu-refresh", ()).unwrap();
                }
                "close" => {
                    event.window().close().unwrap();
                }
                "reload" => {
                    event.window().eval("location.reload()").unwrap();
                }
                "fullscreen" => {
                    let window = event.window();
                    if window.is_fullscreen().unwrap() {
                        window.set_fullscreen(false).unwrap();
                    } else {
                        window.set_fullscreen(true).unwrap();
                    }
                }
                "front" => {
                    event.window().set_always_on_top(true).unwrap();
                }
                "docs" => {
                    // 可以打开文档链接
                    let _ = event.window().emit("open-docs", ());
                }
                "support" => {
                    // 可以打开支持页面
                    let _ = event.window().emit("open-support", ());
                }
                _ => {}
            }
        })
        .manage(db)
        .invoke_handler(tauri::generate_handler![
            // Auth commands
            commands::login,
            commands::register,
            commands::get_current_user,
            // Check-in commands
            commands::create_check_in,
            commands::create_manual_check_in,
            commands::get_today_check_ins,
            commands::get_action_types,
            commands::get_time_rules,
            commands::update_check_in,
            // Admin commands
            commands::get_all_users,
            commands::update_user_admin_status,
            commands::delete_user,
            commands::get_all_action_types,
            commands::create_action_type,
            commands::update_action_type,
            commands::delete_action_type,
            commands::get_all_time_rules,
            commands::create_time_rule,
            commands::update_time_rule,
            commands::delete_time_rule,
            // Statistics commands
            commands::get_user_statistics,
            commands::get_all_check_ins,
            commands::get_paginated_check_ins,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
