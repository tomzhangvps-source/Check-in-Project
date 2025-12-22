import { create } from 'zustand';
import type { ActionType, TimeRule, User } from '../types';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresIn: number; // 毫秒
}

interface CacheState {
  actionTypes: CacheEntry<ActionType[]> | null;
  timeRules: CacheEntry<TimeRule[]> | null;
  users: CacheEntry<User[]> | null;
  
  // 缓存操作
  setActionTypes: (data: ActionType[], expiresIn?: number) => void;
  setTimeRules: (data: TimeRule[], expiresIn?: number) => void;
  setUsers: (data: User[], expiresIn?: number) => void;
  
  // 获取缓存（如果过期返回 null）
  getActionTypes: () => ActionType[] | null;
  getTimeRules: () => TimeRule[] | null;
  getUsers: () => User[] | null;
  
  // 清除缓存
  clearCache: () => void;
  invalidateActionTypes: () => void;
  invalidateTimeRules: () => void;
  invalidateUsers: () => void;
}

const DEFAULT_CACHE_TIME = 5 * 60 * 1000; // 5分钟

const isExpired = <T>(entry: CacheEntry<T> | null): boolean => {
  if (!entry) return true;
  return Date.now() - entry.timestamp > entry.expiresIn;
};

export const useCacheStore = create<CacheState>((set, get) => ({
  actionTypes: null,
  timeRules: null,
  users: null,

  setActionTypes: (data, expiresIn = DEFAULT_CACHE_TIME) => {
    set({
      actionTypes: {
        data,
        timestamp: Date.now(),
        expiresIn,
      },
    });
  },

  setTimeRules: (data, expiresIn = DEFAULT_CACHE_TIME) => {
    set({
      timeRules: {
        data,
        timestamp: Date.now(),
        expiresIn,
      },
    });
  },

  setUsers: (data, expiresIn = DEFAULT_CACHE_TIME) => {
    set({
      users: {
        data,
        timestamp: Date.now(),
        expiresIn,
      },
    });
  },

  getActionTypes: () => {
    const entry = get().actionTypes;
    return isExpired(entry) ? null : entry!.data;
  },

  getTimeRules: () => {
    const entry = get().timeRules;
    return isExpired(entry) ? null : entry!.data;
  },

  getUsers: () => {
    const entry = get().users;
    return isExpired(entry) ? null : entry!.data;
  },

  clearCache: () => {
    set({
      actionTypes: null,
      timeRules: null,
      users: null,
    });
  },

  invalidateActionTypes: () => {
    set({ actionTypes: null });
  },

  invalidateTimeRules: () => {
    set({ timeRules: null });
  },

  invalidateUsers: () => {
    set({ users: null });
  },
}));
