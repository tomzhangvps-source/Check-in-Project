import { create } from 'zustand';
import type { CheckIn, ActionType, TimeRule } from '../types';

interface CheckInState {
  todayCheckIns: CheckIn[];
  actionTypes: ActionType[];
  timeRules: TimeRule[];
  setTodayCheckIns: (checkIns: CheckIn[]) => void;
  addCheckIn: (checkIn: CheckIn) => void;
  setActionTypes: (actionTypes: ActionType[]) => void;
  setTimeRules: (timeRules: TimeRule[]) => void;
}

export const useCheckInStore = create<CheckInState>((set) => ({
  todayCheckIns: [],
  actionTypes: [],
  timeRules: [],
  setTodayCheckIns: (checkIns) => set({ todayCheckIns: checkIns }),
  addCheckIn: (checkIn) =>
    set((state) => ({
      todayCheckIns: [checkIn, ...state.todayCheckIns],
    })),
  setActionTypes: (actionTypes) => set({ actionTypes }),
  setTimeRules: (timeRules) => set({ timeRules }),
}));
