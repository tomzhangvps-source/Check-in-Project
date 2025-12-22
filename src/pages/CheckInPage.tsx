import React, { useEffect, useState } from 'react';
import { useAuthStore } from '../store/authStore';
import { useCheckInStore } from '../store/checkinStore';
import { useUIStore } from '../store/uiStore';
import { checkinAPI } from '../services/api';
import { Button } from '../components/common/Button';
import { LogOut, RefreshCw, Settings, Clock, Calendar, Coffee, Briefcase, Moon, Sun } from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { utcToZonedTime } from 'date-fns-tz';
import { zhCN } from 'date-fns/locale';
import type { ActionType } from '../types';
import { WebviewWindow } from '@tauri-apps/api/window';

export const CheckInPage: React.FC = () => {
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const setCurrentPage = useUIStore((state) => state.setCurrentPage);
  
  const { todayCheckIns, actionTypes, setTodayCheckIns, setActionTypes, addCheckIn } = useCheckInStore();
  
  const [loading, setLoading] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  
  // 金边时区常量
  const PHNOM_PENH_TIMEZONE = 'Asia/Phnom_Penh';
  
  // 获取金边时间
  const getPhnomPenhTime = () => {
    return utcToZonedTime(new Date(), PHNOM_PENH_TIMEZONE);
  };

  useEffect(() => {
    loadData();
    const timer = setInterval(() => setCurrentTime(getPhnomPenhTime()), 1000);
    return () => clearInterval(timer);
  }, []);

  const loadData = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const [checkIns, types] = await Promise.all([
        checkinAPI.getTodayCheckIns(user.id),
        checkinAPI.getActionTypes(),
      ]);
      setTodayCheckIns(checkIns);
      setActionTypes(types);
    } catch (error: any) {
      toast.error('加载数据失败');
    } finally {
      setLoading(false);
    }
  };

  const handleCheckIn = async (actionTypeId: number) => {
    if (!user) return;
    
    try {
      const checkIn = await checkinAPI.createCheckIn({
        user_id: user.id,
        action_type_id: actionTypeId,
      });
      
      addCheckIn(checkIn);
      
      const actionType = actionTypes.find(t => t.id === actionTypeId);
      toast.success(`✓ ${actionType?.button_text || '打卡'}成功！`);
      
      await loadData();
    } catch (error: any) {
      toast.error(error || '打卡失败');
    }
  };

  const handleLogout = () => {
    logout();
    setCurrentPage('login');
  };

  const openAdminWindow = async () => {
    try {
      const adminWindow = new WebviewWindow('admin', {
        url: 'admin.html',
        title: '系统管理 - 员工打卡系统',
        width: 1200,
        height: 800,
        center: true,
        resizable: true,
        decorations: false,
        transparent: false,
      });

      // 监听窗口加载完成
      adminWindow.once('tauri://created', () => {
        console.log('管理窗口已创建');
      });

      // 监听窗口错误
      adminWindow.once('tauri://error', (e) => {
        console.error('管理窗口错误:', e);
        toast.error('打开管理窗口失败');
      });
    } catch (error) {
      console.error('打开管理窗口失败:', error);
      toast.error('打开管理窗口失败');
    }
  };

  const getActionTypesByRole = (role: number): ActionType[] => {
    return actionTypes.filter(t => t.action_role === role);
  };

  const getCurrentStatus = (): { text: string; color: string; icon: React.ReactNode } => {
    const ongoing = todayCheckIns.filter(c => c.status === 'ongoing');
    if (ongoing.length === 0) {
      return { text: '待上班', color: 'text-gray-500', icon: <Moon size={20} /> };
    }
    
    const statusNames = ongoing.map(c => {
      const actionType = actionTypes.find(t => t.id === c.action_type_id);
      return actionType?.button_text || '';
    }).join(' · ');
    
    return { text: statusNames, color: 'text-green-600', icon: <Briefcase size={20} /> };
  };

  const getTimeOfDay = () => {
    const hour = currentTime.getHours();
    if (hour < 6) return { greeting: '夜深了', icon: <Moon size={24} /> };
    if (hour < 12) return { greeting: '早上好', icon: <Sun size={24} /> };
    if (hour < 18) return { greeting: '下午好', icon: <Coffee size={24} /> };
    return { greeting: '晚上好', icon: <Moon size={24} /> };
  };

  const status = getCurrentStatus();
  const timeOfDay = getTimeOfDay();

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-indigo-950">
      {/* Modern Header */}
      <header className="backdrop-blur-lg bg-white/80 dark:bg-gray-900/80 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            {/* 左侧：头像和用户信息（横向排列） */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold shadow-lg">
                {user?.full_name?.charAt(0) || 'U'}
              </div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold text-gray-900 dark:text-white">
                  {user?.full_name}
                </h1>
                <span className="text-gray-300 dark:text-gray-600">|</span>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {timeOfDay.greeting}
                </p>
              </div>
            </div>
            
            {/* 右侧：按钮组 */}
            <div className="flex items-center gap-2">
              {user?.is_admin && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={openAdminWindow}
                >
                  <Settings size={14} />
                  <span>管理</span>
                </Button>
              )}
              <Button variant="secondary" size="sm" onClick={loadData} disabled={loading}>
                <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              </Button>
              <Button variant="danger" size="sm" onClick={handleLogout}>
                <LogOut size={14} />
                <span>退出</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-3 space-y-3">
        {/* Hero Section with Clock */}
        <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 p-3 shadow-lg">
          <div className="absolute inset-0 bg-black/10"></div>
          <div className="relative z-10">
            <div className="grid grid-cols-2 gap-3 items-center">
              {/* Time Display */}
              <div className="text-white">
                <div className="flex items-center gap-1.5 mb-2 opacity-90">
                  <Calendar size={14} />
                  <span className="text-sm font-medium">{format(currentTime, 'yyyy年MM月dd日 EEEE', { locale: zhCN })}</span>
                </div>
                <div className="flex items-baseline gap-2 mb-2">
                  <Clock size={18} className="opacity-90" />
                  <div className="font-mono">
                    <div className="text-4xl font-bold tracking-tight">
                      {format(currentTime, 'HH:mm')}
                    </div>
                    <div className="text-xl opacity-75 mt-0.5">
                      {format(currentTime, 'ss')}
                    </div>
                  </div>
                </div>
                <div className="text-xs opacity-75">金边时间</div>
              </div>

              {/* Status Display */}
              <div className="bg-white/10 backdrop-blur-md rounded-xl p-3 border border-white/20">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-white/80 text-xs font-medium">当前状态</span>
                  <div className={`flex items-center gap-1.5 ${status.color === 'text-green-600' ? 'text-green-300' : 'text-gray-300'}`}>
                    {status.icon}
                  </div>
                </div>
                <div className="text-xl font-bold text-white mb-2">
                  {status.text}
                </div>
                <div className="flex items-center gap-1.5">
                  <div className={`w-1.5 h-1.5 rounded-full ${status.color === 'text-green-600' ? 'bg-green-400 animate-pulse' : 'bg-gray-400'}`}></div>
                  <span className="text-white/70 text-xs">
                    {todayCheckIns.length > 0 ? `今日已打卡 ${todayCheckIns.length} 次` : '今日尚未打卡'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Check-in Actions */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4">
          <h2 className="text-base font-bold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
            <div className="w-1 h-5 bg-gradient-to-b from-indigo-600 to-purple-600 rounded-full"></div>
            快速打卡
          </h2>
          
          <div className="space-y-4">
            {/* 主要操作 - 横向排列：上班、下班、回座 */}
            <div>
              <div className="flex items-center gap-1.5 mb-2">
                <div className="w-0.5 h-4 bg-green-500 rounded-full"></div>
                <h3 className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">主要操作</h3>
              </div>
              <div className="flex gap-3 justify-center">
                {[...getActionTypesByRole(1), ...getActionTypesByRole(2), ...getActionTypesByRole(4)].map((actionType) => (
                  <button
                    key={actionType.id}
                    onClick={() => handleCheckIn(actionType.id)}
                    className="group w-24 relative overflow-hidden rounded-lg h-10 px-4 text-white font-bold text-sm shadow-md transition-all duration-300 hover:shadow-lg hover:scale-[1.02] active:scale-[0.98]"
                    style={{ 
                      background: `linear-gradient(135deg, ${actionType.button_color} 0%, ${actionType.button_color}dd 100%)`
                    }}
                  >
                    <div className="absolute inset-0 bg-white/0 group-hover:bg-white/10 transition-colors"></div>
                    <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    <span className="relative z-10 flex items-center justify-center h-full">
                      {actionType.button_text}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* 临时事项 - 横向排列 */}
            <div>
              <div className="flex items-center gap-1.5 mb-2">
                <div className="w-0.5 h-4 bg-purple-500 rounded-full"></div>
                <h3 className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">临时事项</h3>
              </div>
              <div className="flex gap-3 justify-center">
                {getActionTypesByRole(3).map((actionType) => (
                  <button
                    key={actionType.id}
                    onClick={() => handleCheckIn(actionType.id)}
                    className="group w-24 relative overflow-hidden rounded-lg h-10 px-4 text-white font-bold text-sm shadow-md transition-all duration-300 hover:shadow-lg hover:scale-[1.02] active:scale-[0.98]"
                    style={{ 
                      background: `linear-gradient(135deg, ${actionType.button_color} 0%, ${actionType.button_color}dd 100%)`
                    }}
                  >
                    <div className="absolute inset-0 bg-white/0 group-hover:bg-white/10 transition-colors"></div>
                    <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    <span className="relative z-10 flex items-center justify-center h-full">
                      {actionType.button_text}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Timeline Check-in Records */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4">
          <h2 className="text-base font-bold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
            <div className="w-1 h-5 bg-gradient-to-b from-indigo-600 to-purple-600 rounded-full"></div>
            今日打卡时间轴
          </h2>
          
          {todayCheckIns.length === 0 ? (
            <div className="text-center py-8">
              <div className="w-12 h-12 mx-auto mb-2 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                <Clock size={24} className="text-gray-400" />
              </div>
              <p className="text-gray-500 dark:text-gray-400 text-sm">暂无打卡记录</p>
              <p className="text-gray-400 dark:text-gray-500 text-xs mt-1">点击上方按钮开始打卡</p>
            </div>
          ) : (
            <div className="relative">
              {/* Timeline Line */}
              <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gradient-to-b from-indigo-200 via-purple-200 to-pink-200 dark:from-indigo-900 dark:via-purple-900 dark:to-pink-900"></div>
              
              <div className="space-y-3">
                {todayCheckIns.map((checkIn, index) => {
                  const actionType = actionTypes.find(t => t.id === checkIn.action_type_id);
                  return (
                    <div key={checkIn.id} className="relative flex items-start gap-3 group">
                      {/* Timeline Dot */}
                      <div className="relative z-10 flex-shrink-0">
                        <div 
                          className="w-8 h-8 rounded-full flex items-center justify-center shadow-md ring-2 ring-white dark:ring-gray-800 transition-transform group-hover:scale-110"
                          style={{ backgroundColor: actionType?.button_color }}
                        >
                          <span className="text-white font-bold text-xs">{index + 1}</span>
                        </div>
                      </div>
                      
                      {/* Content Card */}
                      <div className="flex-1 bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3 shadow-sm hover:shadow-md transition-all group-hover:translate-x-1">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-0.5">
                              {actionType?.button_text}
                            </h3>
                            <p className="text-gray-600 dark:text-gray-400 flex items-center gap-1 text-xs">
                              <Clock size={12} />
                              {format(new Date(checkIn.check_time), 'HH:mm:ss')}
                            </p>
                          </div>
                          
                          <div className="flex flex-col items-end gap-1">
                            {checkIn.is_late && (
                              <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 text-xs font-medium">
                                ⚠️ 迟到
                              </span>
                            )}
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                              checkIn.status === 'ongoing' 
                                ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                              checkIn.status === 'completed' 
                                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                                'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
                            }`}>
                              {checkIn.status === 'ongoing' ? '⏳ 进行中' :
                               checkIn.status === 'completed' ? '✅ 已完成' : '⏰ 超时'}
                            </span>
                          </div>
                        </div>
                        
                        {checkIn.duration_minutes && checkIn.duration_minutes > 0 && (
                          <div className="flex items-center gap-1.5 text-gray-600 dark:text-gray-400 text-xs mt-2 pt-2 border-t border-gray-200 dark:border-gray-600">
                            <span className="font-medium">持续:</span>
                            <span className="px-1.5 py-0.5 bg-white dark:bg-gray-600 rounded font-mono text-xs">
                              {Math.floor(checkIn.duration_minutes / 60)}h {checkIn.duration_minutes % 60}m
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};
