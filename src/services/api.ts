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
  PaginatedCheckIns,
} from '../types';
import { useCacheStore } from '../store/cacheStore';

// Cache-aware API wrapper
const cachedInvoke = async <T>(
  command: string,
  args?: any,
  cacheKey?: 'actionTypes' | 'timeRules' | 'users'
): Promise<T> => {
  // 如果有缓存键，尝试从缓存获取
  if (cacheKey) {
    const cache = useCacheStore.getState();
    const getCacheMethod = `get${cacheKey.charAt(0).toUpperCase() + cacheKey.slice(1)}` as keyof typeof cache;
    const cachedData = (cache[getCacheMethod] as Function)();
    
    if (cachedData) {
      return cachedData as T;
    }
  }

  // 从 API 获取数据
  const data = await invoke<T>(command, args);

  // 如果有缓存键，保存到缓存
  if (cacheKey) {
    const cache = useCacheStore.getState();
    const setCacheMethod = `set${cacheKey.charAt(0).toUpperCase() + cacheKey.slice(1)}` as keyof typeof cache;
    (cache[setCacheMethod] as Function)(data);
  }

  return data;
};

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
    cachedInvoke<ActionType[]>('get_action_types', undefined, 'actionTypes'),
  
  getTimeRules: () => 
    cachedInvoke<TimeRule[]>('get_time_rules', undefined, 'timeRules'),
};

// Admin APIs
export const adminAPI = {
  // Users
  getAllUsers: () => 
    cachedInvoke<User[]>('get_all_users', undefined, 'users'),
  
  updateUserAdminStatus: (userId: number, isAdmin: boolean) => {
    useCacheStore.getState().invalidateUsers();
    return invoke('update_user_admin_status', { userId, isAdmin });
  },
  
  deleteUser: (userId: number) => {
    useCacheStore.getState().invalidateUsers();
    return invoke('delete_user', { userId });
  },
  
  // Action types
  getAllActionTypes: () => 
    cachedInvoke<ActionType[]>('get_all_action_types', undefined, 'actionTypes'),
  
  createActionType: (request: any) => {
    useCacheStore.getState().invalidateActionTypes();
    return invoke<ActionType>('create_action_type', { request });
  },
  
  updateActionType: (request: any) => {
    useCacheStore.getState().invalidateActionTypes();
    return invoke('update_action_type', { request });
  },
  
  deleteActionType: (actionTypeId: number) => {
    useCacheStore.getState().invalidateActionTypes();
    return invoke('delete_action_type', { actionTypeId });
  },
  
  // Time rules
  getAllTimeRules: () => 
    cachedInvoke<TimeRule[]>('get_all_time_rules', undefined, 'timeRules'),
  
  createTimeRule: (request: any) => {
    useCacheStore.getState().invalidateTimeRules();
    return invoke<TimeRule>('create_time_rule', { request });
  },
  
  updateTimeRule: (request: any) => {
    useCacheStore.getState().invalidateTimeRules();
    return invoke('update_time_rule', { request });
  },
  
  deleteTimeRule: (ruleId: number) => {
    useCacheStore.getState().invalidateTimeRules();
    return invoke('delete_time_rule', { ruleId });
  },
};

// Statistics APIs
export const statisticsAPI = {
  getUserStatistics: (userId: number, startDate: string, endDate: string) => 
    invoke<CheckInStatistics>('get_user_statistics', { userId, startDate, endDate }),
  
  getAllCheckIns: (startDate?: string, endDate?: string) => 
    invoke<CheckIn[]>('get_all_check_ins', { startDate, endDate }),
  
  getPaginatedCheckIns: (
    startDate: string | undefined,
    endDate: string | undefined,
    page: number,
    pageSize: number,
    userId?: number
  ) => 
    invoke<PaginatedCheckIns>('get_paginated_check_ins', { 
      startDate, 
      endDate, 
      page, 
      pageSize,
      userId 
    }),
};
