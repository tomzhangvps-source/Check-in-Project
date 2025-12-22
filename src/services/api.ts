import { invoke } from '@tauri-apps/api/tauri';
import type {
  LoginRequest,
  RegisterRequest,
  LoginResponse,
  User,
  ActionType,
  CheckIn,
  CheckInRequest,
  TimeRule,
  CheckInStatistics,
} from '../types';

// Auth APIs
export const authAPI = {
  login: (credentials: LoginRequest) => 
    invoke<LoginResponse>('login', { credentials }),
  
  register: (data: RegisterRequest) => 
    invoke<User>('register', { data }),
  
  getCurrentUser: (userId: number) => 
    invoke<User>('get_current_user', { userId }),
};

// Check-in APIs
export const checkinAPI = {
  createCheckIn: (request: CheckInRequest) => 
    invoke<CheckIn>('create_check_in', { request }),
  
  createManualCheckIn: (request: any) => 
    invoke<CheckIn>('create_manual_check_in', { request }),
  
  updateCheckIn: (request: { check_in_id: number; is_late?: boolean; is_early_leave?: boolean; note?: string }) =>
    invoke('update_check_in', { request }),
  
  getTodayCheckIns: (userId: number) => 
    invoke<CheckIn[]>('get_today_check_ins', { userId }),
  
  getActionTypes: () => 
    invoke<ActionType[]>('get_action_types'),
  
  getTimeRules: () => 
    invoke<TimeRule[]>('get_time_rules'),
};

// Admin APIs
export const adminAPI = {
  // Users
  getAllUsers: () => 
    invoke<User[]>('get_all_users'),
  
  updateUserAdminStatus: (userId: number, isAdmin: boolean) => 
    invoke('update_user_admin_status', { userId, isAdmin }),
  
  deleteUser: (userId: number) => 
    invoke('delete_user', { userId }),
  
  // Action types
  getAllActionTypes: () => 
    invoke<ActionType[]>('get_all_action_types'),
  
  createActionType: (request: any) => 
    invoke<ActionType>('create_action_type', { request }),
  
  updateActionType: (request: any) => 
    invoke('update_action_type', { request }),
  
  deleteActionType: (actionTypeId: number) => 
    invoke('delete_action_type', { actionTypeId }),
  
  // Time rules
  getAllTimeRules: () => 
    invoke<TimeRule[]>('get_all_time_rules'),
  
  createTimeRule: (request: any) => 
    invoke<TimeRule>('create_time_rule', { request }),
  
  updateTimeRule: (request: any) => 
    invoke('update_time_rule', { request }),
  
  deleteTimeRule: (ruleId: number) => 
    invoke('delete_time_rule', { ruleId }),
};

// Statistics APIs
export const statisticsAPI = {
  getUserStatistics: (userId: number, startDate: string, endDate: string) => 
    invoke<CheckInStatistics>('get_user_statistics', { userId, startDate, endDate }),
  
  getAllCheckIns: (startDate?: string, endDate?: string) => 
    invoke<CheckIn[]>('get_all_check_ins', { startDate, endDate }),
};
