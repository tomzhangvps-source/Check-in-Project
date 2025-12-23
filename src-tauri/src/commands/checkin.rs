use crate::database::SupabaseClient;
use crate::models::{CheckIn, CheckInRequest, ManualCheckInRequest, ActionType, TimeRule};
use crate::utils::time::{get_company_time, format_time, is_late_strict, calculate_duration, parse_time, is_early_leave};
use tauri::State;
use serde_json::json;
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct UpdateCheckInRequest {
    pub check_in_id: i32,
    pub is_late: Option<bool>,
    pub is_early_leave: Option<bool>,
    pub note: Option<String>,
}

#[tauri::command]
pub async fn create_check_in(
    request: CheckInRequest,
    db: State<'_, SupabaseClient>,
) -> Result<CheckIn, String> {
    // Get action type
    let action_types: Vec<ActionType> = db
        .get(
            "action_types",
            Some(vec![("id", &format!("eq.{}", request.action_type_id))]),
        )
        .await
        .map_err(|e| format!("Failed to get action type: {}", e))?;

    let action_type = action_types
        .into_iter()
        .next()
        .ok_or_else(|| "Action type not found".to_string())?;

    // Get timezone (default to Asia/Phnom_Penh)
    let timezone = "Asia/Phnom_Penh";
    let check_time = get_company_time(timezone);
    let check_time_str = format_time(&check_time);

    // Get time rules for this action type
    let time_rules: Vec<TimeRule> = db
        .get(
            "time_rules",
            Some(vec![
                ("action_type_id", &format!("eq.{}", request.action_type_id)),
                ("is_active", "eq.true"),
            ]),
        )
        .await
        .unwrap_or_default();

    let time_rule = time_rules.first();

    // Check for ongoing check-ins
    let ongoing: Vec<CheckIn> = db
        .get(
            "check_ins",
            Some(vec![
                ("user_id", &format!("eq.{}", request.user_id)),
                ("status", "eq.ongoing"),
                ("order", "check_time.desc"),
            ]),
        )
        .await
        .unwrap_or_default();

    // Get today's completed main process (上班) check-ins
    let today_start = check_time
        .date_naive()
        .and_hms_opt(0, 0, 0)
        .unwrap()
        .format("%Y-%m-%dT%H:%M:%S")
        .to_string();
    let today_end = check_time
        .date_naive()
        .and_hms_opt(23, 59, 59)
        .unwrap()
        .format("%Y-%m-%dT%H:%M:%S")
        .to_string();

    let all_action_types: Vec<ActionType> = db
        .get("action_types", None)
        .await
        .unwrap_or_default();

    let main_start_action_ids: Vec<i32> = all_action_types
        .iter()
        .filter(|at| at.action_role == 1)
        .map(|at| at.id)
        .collect();

    let main_end_action_ids: Vec<i32> = all_action_types
        .iter()
        .filter(|at| at.action_role == 2)
        .map(|at| at.id)
        .collect();

    let today_main_checkins: Vec<CheckIn> = db
        .get(
            "check_ins",
            Some(vec![
                ("user_id", &format!("eq.{}", request.user_id)),
                ("check_time", &format!("gte.{}", today_start)),
                ("check_time", &format!("lte.{}", today_end)),
            ]),
        )
        .await
        .unwrap_or_default();

    let has_main_start = today_main_checkins
        .iter()
        .any(|c| main_start_action_ids.contains(&c.action_type_id));

    let has_main_end = today_main_checkins
        .iter()
        .any(|c| main_end_action_ids.contains(&c.action_type_id));

    // ============== 进程控制逻辑 ==============
    match action_type.action_role {
        1 => {
            // 主进程开始（上班）
            // 只检查是否有未完成的任务，允许一天内多次上班
            if !ongoing.is_empty() {
                return Err("检测到有未完成的打卡记录，请先完成当前任务".to_string());
            }
        }
        2 => {
            // 主进程结束（下班）
            // 支持跨日班次:检查是否有ongoing状态的上班记录,而不是只检查今天的记录
            let has_main_ongoing = ongoing.iter().any(|c| {
                all_action_types
                    .iter()
                    .any(|at| at.id == c.action_type_id && at.action_role == 1)
            });
            
            if !has_main_ongoing {
                return Err("未找到进行中的上班记录，请先打上班卡".to_string());
            }
            
            if !ongoing.is_empty() {
                // 检查是否有临时事件未完成
                let ongoing_action_ids: Vec<i32> = ongoing.iter().map(|c| c.action_type_id).collect();
                let has_temp_ongoing = all_action_types
                    .iter()
                    .any(|at| at.action_role == 3 && ongoing_action_ids.contains(&at.id));
                
                if has_temp_ongoing {
                    return Err("检测到有未完成的临时事件（如上厕所、午餐等），请先打回座".to_string());
                }
            }
        }
        3 => {
            // 临时事件开始（上厕所、午餐等）
            // 必须有ongoing的主进程（上班），不管今天是否打过下班
            let has_main_ongoing = ongoing.iter().any(|c| {
                all_action_types
                    .iter()
                    .any(|at| at.id == c.action_type_id && at.action_role == 1)
            });
            
            if !has_main_ongoing {
                return Err("请先打上班卡再进行其他操作".to_string());
            }
            
            // 检查是否有其他ongoing的临时事件
            let has_temp_ongoing = ongoing.iter().any(|c| {
                all_action_types
                    .iter()
                    .any(|at| at.id == c.action_type_id && at.action_role == 3)
            });
            
            if has_temp_ongoing {
                return Err("检测到有未完成的任务，请先打回座".to_string());
            }
        }
        4 => {
            // 临时事件结束（回座）
            if ongoing.is_empty() {
                return Err("未找到对应的开始记录".to_string());
            }
            // 检查ongoing的是否是临时事件
            let ongoing_action = &ongoing[0];
            let ongoing_action_type = all_action_types
                .iter()
                .find(|at| at.id == ongoing_action.action_type_id)
                .ok_or_else(|| "无法找到对应的打卡类型".to_string())?;
            
            if ongoing_action_type.action_role != 3 {
                return Err("当前没有进行中的临时事件".to_string());
            }
        }
        _ => {
            return Err("未知的打卡类型".to_string());
        }
    }

    // Determine if this is a start or end action
    let is_start_action = action_type.action_role == 1 || action_type.action_role == 3;
    let is_end_action = action_type.action_role == 2 || action_type.action_role == 4;

    // Check if late (strict - no grace period)
    let mut is_late_flag = false;
    if action_type.action_role == 1 {
        // 主进程开始（上班）：检查是否迟到
        if let Some(rule) = time_rule {
            if let Some(ref expected_start) = rule.expected_start_time {
                is_late_flag = is_late_strict(&check_time, expected_start, timezone);
            }
        }
    }

    // Determine status based on action_role
    let status = match action_type.action_role {
        1 | 3 => "ongoing",  // Start actions
        2 | 4 => "completed", // End actions
        _ => "ongoing",
    };

    // 预先查询所有可能需要的未配对的开始记录(支持跨日班次)
    let all_unpaired_starts: Vec<CheckIn> = if is_end_action {
        db.get(
            "check_ins",
            Some(vec![
                ("user_id", &format!("eq.{}", request.user_id)),
                ("status", "eq.ongoing"),
                ("check_time", &format!("lt.{}", check_time_str)),
                ("order", "check_time.desc"),
            ]),
        )
        .await
        .unwrap_or_default()
    } else {
        Vec::new()
    };

    // Check for pair
    let mut pair_check_in_id = None;
    let mut duration_minutes_value = None;
    let mut is_early_leave_flag = false;
    
    if is_end_action {
        // 查找配对的开始记录
        let mut start_checkin_opt: Option<&CheckIn> = None;
        
        // 首先从ongoing记录中查找
        if !ongoing.is_empty() {
            start_checkin_opt = Some(&ongoing[0]);
        } else if !all_unpaired_starts.is_empty() {
            // 如果没有ongoing记录，从查询到的所有历史记录中查找最近的未配对的开始记录
            // 支持跨日班次:不限于今天,查找所有未完成的记录
            let target_start_role = if action_type.action_role == 2 {
                1 // 下班对应上班
            } else if action_type.action_role == 4 {
                3 // 回座对应临时事件开始
            } else {
                0
            };
            
            if target_start_role > 0 {
                // 查找最近的符合条件的记录
                for checkin in all_unpaired_starts.iter() {
                    if let Some(at) = all_action_types.iter().find(|at| at.id == checkin.action_type_id) {
                        if at.action_role == target_start_role && checkin.pair_check_in_id.is_none() {
                            start_checkin_opt = Some(checkin);
                            break;
                        }
                    }
                }
            }
        }
        
        // 如果找到了配对的开始记录，计算时长
        if let Some(start_checkin) = start_checkin_opt {
            pair_check_in_id = Some(start_checkin.id);

            // Calculate duration
            println!("DEBUG: Parsing start_checkin.check_time: {}", start_checkin.check_time);
            if let Some(start_time) = parse_time(&start_checkin.check_time, timezone) {
                let duration = calculate_duration(&start_time, &check_time);
                duration_minutes_value = Some(duration);
                println!("DEBUG: Calculated duration: {} minutes", duration);

                // 检查是否早退或超时
                if action_type.action_role == 2 {
                    // 主进程结束（下班）：检查是否早退
                    if let Some(rule) = time_rule {
                        if let Some(ref expected_end) = rule.expected_end_time {
                            is_early_leave_flag = is_early_leave(&start_time, &check_time, expected_end, timezone);
                        }
                    }
                } else if action_type.action_role == 4 {
                    // 临时事件结束（回座）：检查是否超时
                    // 需要获取临时事件开始时的time_rule
                    let temp_event_time_rules: Vec<TimeRule> = db
                        .get(
                            "time_rules",
                            Some(vec![
                                ("action_type_id", &format!("eq.{}", start_checkin.action_type_id)),
                                ("is_active", "eq.true"),
                            ]),
                        )
                        .await
                        .unwrap_or_default();

                    if let Some(temp_rule) = temp_event_time_rules.first() {
                        if let Some(max_duration) = temp_rule.max_duration_minutes {
                            // 超过最大允许时长，标记为迟到（超时）
                            if duration > max_duration {
                                is_late_flag = true;
                            }
                        }
                    }
                }
            } else {
                println!("ERROR: Failed to parse start_time: {}", start_checkin.check_time);
            }
        }
    }

    // Create check-in
    let new_checkin = json!({
        "user_id": request.user_id,
        "action_type_id": request.action_type_id,
        "check_time": check_time_str,
        "status": status,
        "is_late": is_late_flag,
        "is_early_leave": is_early_leave_flag,
        "is_manual": false,
        "pair_check_in_id": pair_check_in_id,
        "duration_minutes": duration_minutes_value,
    });

    let checkin: CheckIn = db
        .post("check_ins", &new_checkin)
        .await
        .map_err(|e| format!("Failed to create check-in: {}", e))?;

    // If this is an end action, update the start action
    if let Some(start_id) = pair_check_in_id {
        let update_data = json!({
            "status": "completed",
            "pair_check_in_id": checkin.id,
            "duration_minutes": duration_minutes_value,
        });

        let _ = db
            .patch(
                "check_ins",
                vec![("id", &format!("eq.{}", start_id))],
                &update_data,
            )
            .await;
    }

    Ok(checkin)
}

#[tauri::command]
pub async fn get_today_check_ins(
    user_id: i32,
    db: State<'_, SupabaseClient>,
) -> Result<Vec<CheckIn>, String> {
    let timezone = "Asia/Phnom_Penh";
    let today_start = get_company_time(timezone)
        .date_naive()
        .and_hms_opt(0, 0, 0)
        .unwrap()
        .format("%Y-%m-%d %H:%M:%S")
        .to_string();

    // 获取今天的所有打卡记录
    let today_check_ins: Vec<CheckIn> = db
        .get(
            "check_ins",
            Some(vec![
                ("user_id", &format!("eq.{}", user_id)),
                ("check_time", &format!("gte.{}", today_start)),
                ("order", "check_time.desc"),
            ]),
        )
        .await
        .map_err(|e| format!("Failed to get today's check-ins: {}", e))?;

    // 获取今天之前的所有ongoing记录（支持跨日班次）
    let ongoing_check_ins: Vec<CheckIn> = db
        .get(
            "check_ins",
            Some(vec![
                ("user_id", &format!("eq.{}", user_id)),
                ("status", "eq.ongoing"),
                ("check_time", &format!("lt.{}", today_start)),
                ("order", "check_time.desc"),
            ]),
        )
        .await
        .map_err(|e| format!("Failed to get ongoing check-ins: {}", e))?;

    // 合并两个列表，ongoing记录排在前面（因为可能是昨天的上班记录）
    let mut all_check_ins = Vec::new();
    all_check_ins.extend(ongoing_check_ins);
    all_check_ins.extend(today_check_ins);

    Ok(all_check_ins)
}

#[tauri::command]
pub async fn create_manual_check_in(
    request: ManualCheckInRequest,
    db: State<'_, SupabaseClient>,
) -> Result<CheckIn, String> {
    // Get action type
    let action_types: Vec<ActionType> = db
        .get(
            "action_types",
            Some(vec![("id", &format!("eq.{}", request.action_type_id))]),
        )
        .await
        .map_err(|e| format!("Failed to get action type: {}", e))?;

    let action_type = action_types
        .into_iter()
        .next()
        .ok_or_else(|| "Action type not found".to_string())?;

    let timezone = "Asia/Phnom_Penh";
    
    // Parse the manual check time
    let check_time = parse_time(&request.check_time, timezone)
        .ok_or_else(|| "Invalid check time format".to_string())?;

    // Get time rules
    let time_rules: Vec<TimeRule> = db
        .get(
            "time_rules",
            Some(vec![
                ("action_type_id", &format!("eq.{}", request.action_type_id)),
                ("is_active", "eq.true"),
            ]),
        )
        .await
        .unwrap_or_default();

    let time_rule = time_rules.first();

    // Check for ongoing check-ins
    let ongoing: Vec<CheckIn> = db
        .get(
            "check_ins",
            Some(vec![
                ("user_id", &format!("eq.{}", request.user_id)),
                ("status", "eq.ongoing"),
                ("order", "check_time.desc"),
            ]),
        )
        .await
        .unwrap_or_default();

    // Get today's check-ins for validation (使用补卡的日期)
    let check_date = &request.check_time[..10]; // Extract date from ISO format
    let today_start = format!("{}T00:00:00", check_date);
    let today_end = format!("{}T23:59:59", check_date);

    let all_action_types: Vec<ActionType> = db
        .get("action_types", None)
        .await
        .unwrap_or_default();

    let main_start_action_ids: Vec<i32> = all_action_types
        .iter()
        .filter(|at| at.action_role == 1)
        .map(|at| at.id)
        .collect();

    let main_end_action_ids: Vec<i32> = all_action_types
        .iter()
        .filter(|at| at.action_role == 2)
        .map(|at| at.id)
        .collect();

    let today_main_checkins: Vec<CheckIn> = db
        .get(
            "check_ins",
            Some(vec![
                ("user_id", &format!("eq.{}", request.user_id)),
                ("check_time", &format!("gte.{}", today_start)),
                ("check_time", &format!("lte.{}", today_end)),
            ]),
        )
        .await
        .unwrap_or_default();

    let has_main_start = today_main_checkins
        .iter()
        .any(|c| main_start_action_ids.contains(&c.action_type_id));

    let has_main_end = today_main_checkins
        .iter()
        .any(|c| main_end_action_ids.contains(&c.action_type_id));

    // ============== 补卡时也需要验证进程控制逻辑 ==============
    match action_type.action_role {
        1 => {
            // 主进程开始（上班）- 补卡时只是警告，不阻止
        }
        2 => {
            // 主进程结束（下班）- 必须先有上班记录
            if !has_main_start {
                return Err("未找到当日上班记录，请先补上班卡".to_string());
            }
        }
        3 => {
            // 临时事件开始（上厕所、午餐等）- 必须先有上班记录
            if !has_main_start {
                return Err("未找到当日上班记录，请先补上班卡再补临时事件".to_string());
            }
        }
        4 => {
            // 临时事件结束（回座）- 需要有对应的临时事件开始记录
            // 这个在后面配对时检查
        }
        _ => {
            return Err("未知的打卡类型".to_string());
        }
    }

    let is_start_action = action_type.action_role == 1 || action_type.action_role == 3;
    let is_end_action = action_type.action_role == 2 || action_type.action_role == 4;

    // Check if late (strict)
    let mut is_late_flag = false;
    if action_type.action_role == 1 {
        // 主进程开始（上班）：检查是否迟到
        if let Some(rule) = time_rule {
            if let Some(ref expected_start) = rule.expected_start_time {
                is_late_flag = is_late_strict(&check_time, expected_start, timezone);
            }
        }
    }

    let status = match action_type.action_role {
        1 | 3 => "ongoing",
        2 | 4 => "completed",
        _ => "ongoing",
    };

    let mut pair_check_in_id = None;
    let mut duration_minutes_value = None;
    let mut is_early_leave_flag = false;
    
    if is_end_action && !ongoing.is_empty() {
        let start_checkin = &ongoing[0];
        pair_check_in_id = Some(start_checkin.id);

        if let Some(start_time) = parse_time(&start_checkin.check_time, timezone) {
            let duration = calculate_duration(&start_time, &check_time);
            duration_minutes_value = Some(duration);

            // 检查是否早退
            if action_type.action_role == 2 {
                // 主进程结束（下班）：检查是否早退
                if let Some(rule) = time_rule {
                    if let Some(ref expected_end) = rule.expected_end_time {
                        is_early_leave_flag = is_early_leave(&start_time, &check_time, expected_end, timezone);
                    }
                }
            }
        }
    }

    // Create manual check-in
    let new_checkin = json!({
        "user_id": request.user_id,
        "action_type_id": request.action_type_id,
        "check_time": request.check_time,
        "status": status,
        "is_late": is_late_flag,
        "is_early_leave": is_early_leave_flag,
        "is_manual": true,
        "note": request.note,
        "pair_check_in_id": pair_check_in_id,
        "duration_minutes": duration_minutes_value,
    });

    let checkin: CheckIn = db
        .post("check_ins", &new_checkin)
        .await
        .map_err(|e| format!("Failed to create manual check-in: {}", e))?;

    // Update paired check-in if exists
    if let Some(start_id) = pair_check_in_id {
        let update_data = json!({
            "status": "completed",
            "pair_check_in_id": checkin.id,
            "duration_minutes": duration_minutes_value,
        });

        let _ = db
            .patch(
                "check_ins",
                vec![("id", &format!("eq.{}", start_id))],
                &update_data,
            )
            .await;
    }

    Ok(checkin)
}

#[tauri::command]
pub async fn get_action_types(
    db: State<'_, SupabaseClient>,
) -> Result<Vec<ActionType>, String> {
    let action_types: Vec<ActionType> = db
        .get(
            "action_types",
            Some(vec![
                ("is_active", "eq.true"),
                ("order", "display_order.asc"),
            ]),
        )
        .await
        .map_err(|e| format!("Failed to get action types: {}", e))?;

    Ok(action_types)
}

#[tauri::command]
pub async fn get_time_rules(
    db: State<'_, SupabaseClient>,
) -> Result<Vec<TimeRule>, String> {
    let rules: Vec<TimeRule> = db
        .get("time_rules", Some(vec![("is_active", "eq.true")]))
        .await
        .map_err(|e| format!("Failed to get time rules: {}", e))?;

    Ok(rules)
}

#[tauri::command]
pub async fn update_check_in(
    request: UpdateCheckInRequest,
    db: State<'_, SupabaseClient>,
) -> Result<(), String> {
    let mut update_data = json!({});

    if let Some(is_late) = request.is_late {
        update_data["is_late"] = json!(is_late);
    }
    if let Some(is_early_leave) = request.is_early_leave {
        update_data["is_early_leave"] = json!(is_early_leave);
    }
    if let Some(note) = request.note {
        update_data["note"] = json!(note);
    }

    db.patch(
        "check_ins",
        vec![("id", &format!("eq.{}", request.check_in_id))],
        &update_data,
    )
    .await
    .map_err(|e| format!("Failed to update check-in: {}", e))?;

    Ok(())
}
