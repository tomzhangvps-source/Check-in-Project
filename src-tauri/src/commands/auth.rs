use crate::database::SupabaseClient;
use crate::models::{User, LoginRequest, RegisterRequest, LoginResponse};
use crate::utils::crypto::{hash_password, verify_password};
use tauri::State;
use serde_json::json;

#[tauri::command]
pub async fn login(
    credentials: LoginRequest,
    db: State<'_, SupabaseClient>,
) -> Result<LoginResponse, String> {
    // Get user by username
    let users: Vec<User> = db
        .get(
            "users",
            Some(vec![("username", &format!("eq.{}", credentials.username))]),
        )
        .await
        .map_err(|e| format!("Database error: {}", e))?;

    if users.is_empty() {
        return Err("用户名或密码错误".to_string());
    }

    let user = users[0].clone();

    // Verify password
    if !verify_password(&credentials.password, &user.password_hash) {
        return Err("用户名或密码错误".to_string());
    }

    // Generate simple token (in production, use JWT)
    let token = format!("{}_{}", user.id, user.username);

    Ok(LoginResponse { user, token })
}

#[tauri::command]
pub async fn register(
    data: RegisterRequest,
    db: State<'_, SupabaseClient>,
) -> Result<User, String> {
    // Check if username exists
    let existing: Vec<User> = db
        .get(
            "users",
            Some(vec![("username", &format!("eq.{}", data.username))]),
        )
        .await
        .map_err(|e| format!("Database error: {}", e))?;

    if !existing.is_empty() {
        return Err("用户名已存在".to_string());
    }

    // Hash password
    let password_hash = hash_password(&data.password);

    // Create user
    let new_user = json!({
        "username": data.username,
        "password_hash": password_hash,
        "full_name": data.full_name,
        "is_admin": false,
    });

    let user: User = db
        .post("users", &new_user)
        .await
        .map_err(|e| format!("Failed to create user: {}", e))?;

    Ok(user)
}

#[tauri::command]
pub async fn get_current_user(
    user_id: i32,
    db: State<'_, SupabaseClient>,
) -> Result<User, String> {
    let users: Vec<User> = db
        .get("users", Some(vec![("id", &format!("eq.{}", user_id))]))
        .await
        .map_err(|e| format!("Database error: {}", e))?;

    users
        .into_iter()
        .next()
        .ok_or_else(|| "User not found".to_string())
}
