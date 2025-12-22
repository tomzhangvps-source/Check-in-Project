// Common types
export interface User {
  id: number;
  username: string;
  full_name: string;
  is_admin: boolean;
  created_at: string;
}

export interface ActionType {
  id: number;
  name: string;
  button_text: string;
  button_color: string;
  display_order: number;
  action_role: number; // 1=进程开始, 2=进程结束, 3=事件开始, 4=事件结束
  requires_pair: boolean;
  pair_action_id: number | null;
  is_active: boolean;
  created_at: string;
}

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
  is_early_leave: boolean;
  is_manual: boolean;
  created_at: string;
}

export interface TimeRule {
  id: number;
  rule_name: string;
  action_type_id: number;
  expected_start_time?: string;      // 仅用于主进程（上班/下班）
  expected_end_time?: string;        // 仅用于主进程（上班/下班）
  max_duration_minutes?: number;     // 仅用于临时事件（上厕所/午餐等）
  timezone: string;
  is_active: boolean;
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

export interface LoginResponse {
  user: User;
  token: string;
}

export interface CheckInRequest {
  user_id: number;
  action_type_id: number;
}

export interface CheckInStatistics {
  total_days: number;
  late_count: number;
  on_time_count: number;
  total_work_minutes: number;
  average_work_minutes: number;
}
