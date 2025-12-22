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
    pub is_early_leave: bool,
    pub is_manual: bool,
    pub created_at: String,
}

#[derive(Debug, Deserialize)]
pub struct CheckInRequest {
    pub user_id: i32,
    pub action_type_id: i32,
}

#[derive(Debug, Deserialize)]
pub struct ManualCheckInRequest {
    pub user_id: i32,
    pub action_type_id: i32,
    pub check_time: String,
    pub note: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CheckInWithType {
    #[serde(flatten)]
    pub check_in: CheckIn,
    pub action_type: Option<ActionType>,
}

use super::ActionType;
