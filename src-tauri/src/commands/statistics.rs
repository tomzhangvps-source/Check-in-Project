use crate::database::SupabaseClient;
use crate::models::CheckIn;
use tauri::State;
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct CheckInStatistics {
    pub total_days: i32,
    pub late_count: i32,
    pub on_time_count: i32,
    pub total_work_minutes: i32,
    pub average_work_minutes: i32,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct PaginatedCheckIns {
    pub data: Vec<CheckIn>,
    pub total: usize,
    pub page: i32,
    pub page_size: i32,
    pub total_pages: i32,
}

#[tauri::command]
pub async fn get_user_statistics(
    user_id: i32,
    start_date: String,
    end_date: String,
    db: State<'_, SupabaseClient>,
) -> Result<CheckInStatistics, String> {
    let check_ins: Vec<CheckIn> = db
        .get(
            "check_ins",
            Some(vec![
                ("user_id", &format!("eq.{}", user_id)),
                ("check_time", &format!("gte.{}", start_date)),
                ("check_time", &format!("lte.{}", end_date)),
            ]),
        )
        .await
        .map_err(|e| format!("Failed to get check-ins: {}", e))?;

    let late_count = check_ins.iter().filter(|c| c.is_late).count() as i32;
    let on_time_count = check_ins.len() as i32 - late_count;
    
    let total_work_minutes: i32 = check_ins
        .iter()
        .filter_map(|c| c.duration_minutes)
        .sum();
    
    let completed_days = check_ins
        .iter()
        .filter(|c| c.status == "completed" && c.duration_minutes.is_some())
        .count() as i32;
    
    let average_work_minutes = if completed_days > 0 {
        total_work_minutes / completed_days
    } else {
        0
    };

    Ok(CheckInStatistics {
        total_days: completed_days,
        late_count,
        on_time_count,
        total_work_minutes,
        average_work_minutes,
    })
}

#[tauri::command]
pub async fn get_all_check_ins(
    start_date: Option<String>,
    end_date: Option<String>,
    db: State<'_, SupabaseClient>,
) -> Result<Vec<CheckIn>, String> {
    let mut params = vec![("order", "check_time.desc")];
    
    let start_filter;
    let end_filter;
    
    if let Some(start) = &start_date {
        // Add T00:00:00 to start date to match beginning of day
        start_filter = format!("gte.{}T00:00:00", start);
        params.push(("check_time", &start_filter));
    }
    
    if let Some(end) = &end_date {
        // Add T23:59:59 to end date to match end of day
        end_filter = format!("lte.{}T23:59:59", end);
        params.push(("check_time", &end_filter));
    }

    let check_ins: Vec<CheckIn> = db
        .get("check_ins", Some(params))
        .await
        .map_err(|e| format!("Failed to get check-ins: {}", e))?;

    Ok(check_ins)
}

#[tauri::command]
pub async fn get_paginated_check_ins(
    start_date: Option<String>,
    end_date: Option<String>,
    page: i32,
    page_size: i32,
    user_id: Option<i32>,
    db: State<'_, SupabaseClient>,
) -> Result<PaginatedCheckIns, String> {
    let mut params = vec![("order", "check_time.desc")];
    
    let start_filter;
    let end_filter;
    let user_filter;
    
    if let Some(start) = &start_date {
        start_filter = format!("gte.{}T00:00:00", start);
        params.push(("check_time", &start_filter));
    }
    
    if let Some(end) = &end_date {
        end_filter = format!("lte.{}T23:59:59", end);
        params.push(("check_time", &end_filter));
    }
    
    if let Some(uid) = user_id {
        user_filter = format!("eq.{}", uid);
        params.push(("user_id", &user_filter));
    }

    // 先获取总数
    let all_check_ins: Vec<CheckIn> = db
        .get("check_ins", Some(params.clone()))
        .await
        .map_err(|e| format!("Failed to get check-ins: {}", e))?;
    
    let total = all_check_ins.len();
    let total_pages = ((total as f32) / (page_size as f32)).ceil() as i32;
    
    // 计算偏移量
    let offset = (page - 1) * page_size;
    let limit = page_size;
    
    // 手动分页（因为 Supabase REST API 的分页参数）
    let data: Vec<CheckIn> = all_check_ins
        .into_iter()
        .skip(offset as usize)
        .take(limit as usize)
        .collect();

    Ok(PaginatedCheckIns {
        data,
        total,
        page,
        page_size,
        total_pages,
    })
}
