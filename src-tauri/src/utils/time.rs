use chrono::{DateTime, NaiveDateTime, NaiveTime, TimeZone, Utc, Datelike, Timelike, Duration};
use chrono_tz::Tz;

/// Get current time in company timezone
pub fn get_company_time(timezone: &str) -> DateTime<Tz> {
    let tz: Tz = timezone.parse().unwrap_or(chrono_tz::Asia::Shanghai);
    Utc::now().with_timezone(&tz)
}

/// Format datetime to string
pub fn format_time(dt: &DateTime<Tz>) -> String {
    dt.format("%Y-%m-%d %H:%M:%S").to_string()
}

/// Parse time string to datetime
pub fn parse_time(time_str: &str, timezone: &str) -> Option<DateTime<Tz>> {
    let tz: Tz = timezone.parse().ok()?;
    NaiveDateTime::parse_from_str(time_str, "%Y-%m-%d %H:%M:%S")
        .ok()
        .and_then(|naive| tz.from_local_datetime(&naive).single())
}

/// Check if time is late (strict - no grace period)
pub fn is_late_strict(
    check_time: &DateTime<Tz>,
    expected_start_time: &str,
    timezone: &str,
) -> bool {
    if let Ok(expected) = NaiveTime::parse_from_str(expected_start_time, "%H:%M:%S") {
        let check_naive_time = check_time.time();
        let expected_seconds = expected.num_seconds_from_midnight();
        let check_seconds = check_naive_time.num_seconds_from_midnight();
        
        // Strict: any time after expected is late
        return check_seconds > expected_seconds;
    }
    false
}

/// Check if early leave (before expected end time)
/// Automatically detects cross-day scenarios
pub fn is_early_leave(
    start_time: &DateTime<Tz>,
    end_time: &DateTime<Tz>,
    expected_end_time: &str,
    timezone: &str,
) -> bool {
    if let Ok(expected_end) = NaiveTime::parse_from_str(expected_end_time, "%H:%M:%S") {
        let tz: Tz = timezone.parse().unwrap_or(chrono_tz::Asia::Shanghai);
        
        // Calculate expected end datetime
        let mut expected_end_dt = tz
            .with_ymd_and_hms(
                end_time.year(),
                end_time.month(),
                end_time.day(),
                expected_end.hour(),
                expected_end.minute(),
                expected_end.second(),
            )
            .single()
            .unwrap();

        // Auto-detect cross-day: if expected_end_time < start_time, add one day
        let start_naive = start_time.time();
        if expected_end < start_naive {
            expected_end_dt = expected_end_dt + Duration::days(1);
        }

        // Early leave if checked out before expected end time
        return end_time < &expected_end_dt;
    }
    false
}

/// Calculate duration between two datetimes in minutes
pub fn calculate_duration(start: &DateTime<Tz>, end: &DateTime<Tz>) -> i32 {
    let duration = end.signed_duration_since(*start);
    duration.num_minutes() as i32
}
