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

#[derive(Debug, Deserialize)]
pub struct CreateActionTypeRequest {
    pub name: String,
    pub button_text: String,
    pub button_color: String,
    pub display_order: Option<i32>,
    pub action_role: i32,
    pub requires_pair: bool,
    pub pair_action_id: Option<i32>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateActionTypeRequest {
    pub id: i32,
    pub button_text: Option<String>,
    pub button_color: Option<String>,
    pub display_order: Option<i32>,
    pub is_active: Option<bool>,
}
