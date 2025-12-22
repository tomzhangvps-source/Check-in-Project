use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TimeRule {
    pub id: i32,
    pub rule_name: String,
    pub action_type_id: i32,
    pub expected_start_time: Option<String>,  // 仅用于主进程
    pub expected_end_time: Option<String>,    // 仅用于主进程
    pub max_duration_minutes: Option<i32>,    // 仅用于临时事件
    pub timezone: String,
    pub is_active: bool,
    pub created_at: String,
}

#[derive(Debug, Deserialize)]
pub struct CreateTimeRuleRequest {
    pub rule_name: String,
    pub action_type_id: i32,
    pub expected_start_time: Option<String>,
    pub expected_end_time: Option<String>,
    pub max_duration_minutes: Option<i32>,
    pub timezone: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateTimeRuleRequest {
    pub id: i32,
    pub rule_name: Option<String>,
    pub expected_start_time: Option<String>,
    pub expected_end_time: Option<String>,
    pub max_duration_minutes: Option<i32>,
    pub is_active: Option<bool>,
}
