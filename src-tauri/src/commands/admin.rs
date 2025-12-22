use crate::database::SupabaseClient;
use crate::models::{User, ActionType, TimeRule, CreateActionTypeRequest, CreateTimeRuleRequest, UpdateActionTypeRequest, UpdateTimeRuleRequest};
use tauri::State;
use serde_json::json;

// User management

#[tauri::command]
pub async fn get_all_users(
    db: State<'_, SupabaseClient>,
) -> Result<Vec<User>, String> {
    let users: Vec<User> = db
        .get("users", Some(vec![("order", "id.asc")]))
        .await
        .map_err(|e| format!("Failed to get users: {}", e))?;

    Ok(users)
}

#[tauri::command]
pub async fn update_user_admin_status(
    user_id: i32,
    is_admin: bool,
    db: State<'_, SupabaseClient>,
) -> Result<(), String> {
    let update_data = json!({
        "is_admin": is_admin,
    });

    db.patch(
        "users",
        vec![("id", &format!("eq.{}", user_id))],
        &update_data,
    )
    .await
    .map_err(|e| format!("Failed to update user: {}", e))?;

    Ok(())
}

#[tauri::command]
pub async fn delete_user(
    user_id: i32,
    db: State<'_, SupabaseClient>,
) -> Result<(), String> {
    db.delete("users", vec![("id", &format!("eq.{}", user_id))])
        .await
        .map_err(|e| format!("Failed to delete user: {}", e))?;

    Ok(())
}

// Action type management

#[tauri::command]
pub async fn get_all_action_types(
    db: State<'_, SupabaseClient>,
) -> Result<Vec<ActionType>, String> {
    let action_types: Vec<ActionType> = db
        .get("action_types", Some(vec![("order", "display_order.asc")]))
        .await
        .map_err(|e| format!("Failed to get action types: {}", e))?;

    Ok(action_types)
}

#[tauri::command]
pub async fn create_action_type(
    request: CreateActionTypeRequest,
    db: State<'_, SupabaseClient>,
) -> Result<ActionType, String> {
    let new_action_type = json!({
        "name": request.name,
        "button_text": request.button_text,
        "button_color": request.button_color,
        "display_order": request.display_order.unwrap_or(100),
        "action_role": request.action_role,
        "requires_pair": request.requires_pair,
        "pair_action_id": request.pair_action_id,
        "is_active": true,
    });

    let action_type: ActionType = db
        .post("action_types", &new_action_type)
        .await
        .map_err(|e| format!("Failed to create action type: {}", e))?;

    Ok(action_type)
}

#[tauri::command]
pub async fn update_action_type(
    request: UpdateActionTypeRequest,
    db: State<'_, SupabaseClient>,
) -> Result<(), String> {
    let mut update_data = json!({});

    if let Some(text) = request.button_text {
        update_data["button_text"] = json!(text);
    }
    if let Some(color) = request.button_color {
        update_data["button_color"] = json!(color);
    }
    if let Some(order) = request.display_order {
        update_data["display_order"] = json!(order);
    }
    if let Some(active) = request.is_active {
        update_data["is_active"] = json!(active);
    }

    db.patch(
        "action_types",
        vec![("id", &format!("eq.{}", request.id))],
        &update_data,
    )
    .await
    .map_err(|e| format!("Failed to update action type: {}", e))?;

    Ok(())
}

#[tauri::command]
pub async fn delete_action_type(
    action_type_id: i32,
    db: State<'_, SupabaseClient>,
) -> Result<(), String> {
    db.delete("action_types", vec![("id", &format!("eq.{}", action_type_id))])
        .await
        .map_err(|e| format!("Failed to delete action type: {}", e))?;

    Ok(())
}

// Time rule management

#[tauri::command]
pub async fn get_all_time_rules(
    db: State<'_, SupabaseClient>,
) -> Result<Vec<TimeRule>, String> {
    let rules: Vec<TimeRule> = db
        .get("time_rules", Some(vec![("order", "id.asc")]))
        .await
        .map_err(|e| format!("Failed to get time rules: {}", e))?;

    Ok(rules)
}

#[tauri::command]
pub async fn create_time_rule(
    request: CreateTimeRuleRequest,
    db: State<'_, SupabaseClient>,
) -> Result<TimeRule, String> {
    let mut new_rule = json!({
        "rule_name": request.rule_name,
        "action_type_id": request.action_type_id,
        "timezone": request.timezone.unwrap_or_else(|| "Asia/Phnom_Penh".to_string()),
        "is_active": true,
    });

    // 添加可选字段
    if let Some(start_time) = request.expected_start_time {
        new_rule["expected_start_time"] = json!(start_time);
    }
    if let Some(end_time) = request.expected_end_time {
        new_rule["expected_end_time"] = json!(end_time);
    }
    if let Some(max_duration) = request.max_duration_minutes {
        new_rule["max_duration_minutes"] = json!(max_duration);
    }

    let rule: TimeRule = db
        .post("time_rules", &new_rule)
        .await
        .map_err(|e| format!("Failed to create time rule: {}", e))?;

    Ok(rule)
}

#[tauri::command]
pub async fn update_time_rule(
    request: UpdateTimeRuleRequest,
    db: State<'_, SupabaseClient>,
) -> Result<(), String> {
    let mut update_data = json!({});

    if let Some(name) = request.rule_name {
        update_data["rule_name"] = json!(name);
    }
    if let Some(start_time) = request.expected_start_time {
        update_data["expected_start_time"] = json!(start_time);
    }
    if let Some(end_time) = request.expected_end_time {
        update_data["expected_end_time"] = json!(end_time);
    }
    if let Some(max_duration) = request.max_duration_minutes {
        update_data["max_duration_minutes"] = json!(max_duration);
    }
    if let Some(active) = request.is_active {
        update_data["is_active"] = json!(active);
    }

    db.patch(
        "time_rules",
        vec![("id", &format!("eq.{}", request.id))],
        &update_data,
    )
    .await
    .map_err(|e| format!("Failed to update time rule: {}", e))?;

    Ok(())
}

#[tauri::command]
pub async fn delete_time_rule(
    rule_id: i32,
    db: State<'_, SupabaseClient>,
) -> Result<(), String> {
    db.delete("time_rules", vec![("id", &format!("eq.{}", rule_id))])
        .await
        .map_err(|e| format!("Failed to delete time rule: {}", e))?;

    Ok(())
}
