import React, { useState, useEffect, useCallback } from 'react';
import { adminAPI, statisticsAPI, checkinAPI } from '../services/api';
import { Button } from '../components/common/Button';
import { Card } from '../components/common/Card';
import { Modal } from '../components/common/Modal';
import { Input } from '../components/common/Input';
import { Pagination } from '../components/common/Pagination';
import { X, Plus, RefreshCw, Copy, FileText } from 'lucide-react';
import toast from 'react-hot-toast';
import type { User, ActionType, TimeRule, CheckIn } from '../types';

interface AdminPageProps {
  isOpen: boolean;
  onClose: () => void;
  isStandaloneWindow?: boolean; // 是否为独立窗口模式
}

export const AdminPage: React.FC<AdminPageProps> = ({ isOpen, onClose, isStandaloneWindow = false }) => {
  const [activeTab, setActiveTab] = useState<'actionTypes' | 'timeRules' | 'users' | 'checkIns' | 'reports'>('actionTypes');

  // Users
  const [users, setUsers] = useState<User[]>([]);
  
  // Action Types
  const [actionTypes, setActionTypes] = useState<ActionType[]>([]);
  const [isActionTypeModalOpen, setIsActionTypeModalOpen] = useState(false);
  const [editingActionType, setEditingActionType] = useState<ActionType | null>(null);
  const [actionTypeForm, setActionTypeForm] = useState({
    name: '',
    button_text: '',
    button_color: '#4CAF50',
    display_order: 0,
    action_role: 3,
    requires_pair: false,
  });
  
  // Time Rules
  const [timeRules, setTimeRules] = useState<TimeRule[]>([]);
  const [isTimeRuleModalOpen, setIsTimeRuleModalOpen] = useState(false);
  const [editingTimeRule, setEditingTimeRule] = useState<TimeRule | null>(null);
  const [timeRuleForm, setTimeRuleForm] = useState({
    rule_name: '',
    action_type_id: 0,
    expected_start_time: '09:00',
    expected_end_time: '18:00',
    max_duration_minutes: 15,
  });

  // Check-ins with pagination
  const [checkIns, setCheckIns] = useState<CheckIn[]>([]);
  const [paginationInfo, setPaginationInfo] = useState({
    currentPage: 1,
    pageSize: 20,
    totalItems: 0,
    totalPages: 0,
  });
  const [checkInFilters, setCheckInFilters] = useState({
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    userId: 'all',
  });

  // Manual Check-in (补卡)
  const [isManualCheckInModalOpen, setIsManualCheckInModalOpen] = useState(false);
  const [manualCheckInForm, setManualCheckInForm] = useState({
    user_id: 0,
    action_type_id: 0,
    check_date: new Date().toISOString().split('T')[0],
    check_time: '09:00',
    note: '',
  });

  // Edit Check-in (编辑打卡记录)
  const [isEditCheckInModalOpen, setIsEditCheckInModalOpen] = useState(false);
  const [editingCheckIn, setEditingCheckIn] = useState<CheckIn | null>(null);
  const [editCheckInForm, setEditCheckInForm] = useState({
    is_late: false,
    is_early_leave: false,
    note: '',
  });

  // Reports
  const [reportMonth, setReportMonth] = useState(new Date().toISOString().slice(0, 7));
  const [reportData, setReportData] = useState<any[]>([]);
  const [isLoadingReport, setIsLoadingReport] = useState(false);

  useEffect(() => {
    // 切换到打卡记录标签时，自动更新日期为今天
    if (activeTab === 'checkIns') {
      const today = new Date().toISOString().split('T')[0];
      setCheckInFilters(prev => ({
        ...prev,
        startDate: today,
        endDate: today,
      }));
      setPaginationInfo(prev => ({ ...prev, currentPage: 1 }));
    }
    // 切换到报表标签时，加载该月份的数据
    if (activeTab === 'reports') {
      loadReportData();
    } else {
      loadData();
    }
  }, [activeTab]);

  // 监听报表月份变化，自动加载数据
  useEffect(() => {
    if (activeTab === 'reports') {
      loadReportData();
    }
  }, [reportMonth]);

  // 监听筛选条件变化，重置页码
  useEffect(() => {
    if (activeTab === 'checkIns') {
      setPaginationInfo(prev => ({ ...prev, currentPage: 1 }));
      loadData();
    }
  }, [checkInFilters.startDate, checkInFilters.endDate, checkInFilters.userId]);

  // 监听分页变化
  useEffect(() => {
    if (activeTab === 'checkIns' && paginationInfo.currentPage > 1) {
      loadData();
    }
  }, [paginationInfo.currentPage, paginationInfo.pageSize]);

  const loadData = useCallback(async () => {
    try {
      if (activeTab === 'users') {
        const data = await adminAPI.getAllUsers();
        setUsers(data);
      } else if (activeTab === 'actionTypes') {
        const data = await adminAPI.getAllActionTypes();
        setActionTypes(data);
      } else if (activeTab === 'timeRules') {
        const [rulesData, typesData] = await Promise.all([
          adminAPI.getAllTimeRules(),
          adminAPI.getAllActionTypes(),
        ]);
        setTimeRules(rulesData);
        setActionTypes(typesData);
      } else if (activeTab === 'checkIns') {
        const [paginatedData, usersData] = await Promise.all([
          statisticsAPI.getPaginatedCheckIns(
            checkInFilters.startDate,
            checkInFilters.endDate,
            paginationInfo.currentPage,
            paginationInfo.pageSize,
            checkInFilters.userId === 'all' ? undefined : parseInt(checkInFilters.userId)
          ),
          adminAPI.getAllUsers(),
        ]);
        setCheckIns(paginatedData.data);
        setPaginationInfo(prev => ({
          ...prev,
          totalItems: paginatedData.total,
          totalPages: paginatedData.total_pages,
        }));
        setUsers(usersData);
      }
    } catch (error: any) {
      toast.error('加载数据失败');
    }
  }, [activeTab, checkInFilters, paginationInfo.currentPage, paginationInfo.pageSize]);

  // 生成月度报表数据（不依赖状态，直接使用传入的数据）
  const generateMonthlyReportData = (usersList: User[], checkInsList: CheckIn[]) => {
    return usersList.map(user => {
      const userCheckIns = checkInsList.filter(c => c.user_id === user.id);
      const workDays = new Set(userCheckIns.filter(c => c.action_type_id === 1).map(c => c.check_time.split('T')[0])).size;
      const lateCount = userCheckIns.filter(c => c.is_late).length;
      
      return {
        name: user.full_name,
        workDays,
        lateCount,
        onTimeCount: workDays - lateCount,
      };
    });
  };

  // 加载报表数据
  const loadReportData = useCallback(async () => {
    setIsLoadingReport(true);
    try {
      // 计算该月份的开始和结束日期
      const [year, month] = reportMonth.split('-').map(Number);
      const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
      const lastDay = new Date(year, month, 0).getDate();
      const endDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
      
      // 更新筛选条件用于显示
      setCheckInFilters(prev => ({
        ...prev,
        startDate,
        endDate,
      }));

      // 加载该月份的所有打卡记录和用户数据
      const [allCheckInsData, usersData] = await Promise.all([
        statisticsAPI.getPaginatedCheckIns(startDate, endDate, 1, 10000), // 获取该月所有数据
        adminAPI.getAllUsers(),
      ]);
      
      setCheckIns(allCheckInsData.data);
      setUsers(usersData);
      
      // 生成报表数据
      const report = generateMonthlyReportData(usersData, allCheckInsData.data);
      setReportData(report);
    } catch (error: any) {
      toast.error('加载报表数据失败: ' + (error.message || error));
      console.error('加载报表数据失败:', error);
    } finally {
      setIsLoadingReport(false);
    }
  }, [reportMonth]);

  const handleDeleteUser = async (userId: number) => {
    if (!confirm('确定要删除该用户吗？')) return;
    
    try {
      await adminAPI.deleteUser(userId);
      toast.success('删除成功');
      loadData();
    } catch (error: any) {
      toast.error(error || '删除失败');
    }
  };

  const handleToggleAdmin = async (userId: number, currentStatus: boolean) => {
    try {
      await adminAPI.updateUserAdminStatus(userId, !currentStatus);
      toast.success('更新成功');
      loadData();
    } catch (error: any) {
      toast.error(error || '更新失败');
    }
  };

  const handleDeleteActionType = async (id: number) => {
    if (!confirm('确定要删除该打卡类型吗？')) return;
    
    try {
      await adminAPI.deleteActionType(id);
      toast.success('删除成功');
      loadData();
    } catch (error: any) {
      toast.error(error || '删除失败');
    }
  };

  const handleDeleteTimeRule = async (id: number) => {
    if (!confirm('确定要删除该时间规则吗？')) return;
    
    try {
      await adminAPI.deleteTimeRule(id);
      toast.success('删除成功');
      loadData();
    } catch (error: any) {
      toast.error(error || '删除失败');
    }
  };

  // Action Type handlers
  const openActionTypeModal = (actionType?: ActionType) => {
    if (actionType) {
      setEditingActionType(actionType);
      setActionTypeForm({
        name: actionType.name,
        button_text: actionType.button_text,
        button_color: actionType.button_color,
        display_order: actionType.display_order,
        action_role: actionType.action_role,
        requires_pair: actionType.requires_pair,
      });
    } else {
      setEditingActionType(null);
      setActionTypeForm({
        name: '',
        button_text: '',
        button_color: '#4CAF50',
        display_order: Math.max(...actionTypes.map(t => t.display_order), 0) + 1,
        action_role: 3,
        requires_pair: false,
      });
    }
    setIsActionTypeModalOpen(true);
  };

  const handleSaveActionType = async () => {
    try {
      if (editingActionType) {
        await adminAPI.updateActionType({
          id: editingActionType.id,
          ...actionTypeForm,
        });
        toast.success('更新成功');
      } else {
        await adminAPI.createActionType(actionTypeForm);
        toast.success('添加成功');
      }
      setIsActionTypeModalOpen(false);
      loadData();
    } catch (error: any) {
      toast.error(error || '保存失败');
    }
  };

  // Time Rule handlers
  const openTimeRuleModal = (timeRule?: TimeRule) => {
    if (timeRule) {
      setEditingTimeRule(timeRule);
      setTimeRuleForm({
        rule_name: timeRule.rule_name,
        action_type_id: timeRule.action_type_id,
        expected_start_time: timeRule.expected_start_time || '09:00',
        expected_end_time: timeRule.expected_end_time || '18:00',
        max_duration_minutes: timeRule.max_duration_minutes || 15,
      });
    } else {
      setEditingTimeRule(null);
      setTimeRuleForm({
        rule_name: '',
        action_type_id: actionTypes[0]?.id || 0,
        expected_start_time: '09:00',
        expected_end_time: '18:00',
        max_duration_minutes: 15,
      });
    }
    setIsTimeRuleModalOpen(true);
  };

  const handleSaveTimeRule = async () => {
    try {
      // 获取当前选择的打卡类型
      const selectedActionType = actionTypes.find(t => t.id === timeRuleForm.action_type_id);
      if (!selectedActionType) {
        toast.error('请选择打卡类型');
        return;
      }

      // 根据action_role验证不同的字段
      if (selectedActionType.action_role === 1 || selectedActionType.action_role === 2) {
        // 主进程（上班/下班）：验证时间格式
        const timeRegex = /^([01]\d|2[0-3]):[0-5]\d$/;
        if (!timeRegex.test(timeRuleForm.expected_start_time)) {
          toast.error('上班时间格式错误！请使用24小时制（例如：09:00）');
          return;
        }
        if (!timeRegex.test(timeRuleForm.expected_end_time)) {
          toast.error('下班时间格式错误！请使用24小时制（例如：18:00）');
          return;
        }
      } else if (selectedActionType.action_role === 3) {
        // 临时事件：验证时长
        if (!timeRuleForm.max_duration_minutes || timeRuleForm.max_duration_minutes <= 0) {
          toast.error('请输入有效的最大允许时长（大于0的整数）');
          return;
        }
      } else if (selectedActionType.action_role === 4) {
        // 回座：不需要时间规则
        toast.error('回座操作不需要设置时间规则');
        return;
      }

      // 检查是否已存在同一打卡类型的规则
      const existingRule = timeRules.find(
        rule => rule.action_type_id === timeRuleForm.action_type_id 
                && (!editingTimeRule || rule.id !== editingTimeRule.id)
      );
      
      if (existingRule) {
        const actionTypeName = actionTypes.find(t => t.id === timeRuleForm.action_type_id)?.button_text || '该打卡类型';
        toast.error(`${actionTypeName} 已存在时间规则，请编辑现有规则或先删除旧规则`);
        return;
      }

      // 构建payload，根据action_role包含不同字段
      let payload: any = {
        rule_name: timeRuleForm.rule_name,
        action_type_id: timeRuleForm.action_type_id,
      };

      if (selectedActionType.action_role === 1 || selectedActionType.action_role === 2) {
        payload.expected_start_time = timeRuleForm.expected_start_time;
        payload.expected_end_time = timeRuleForm.expected_end_time;
      } else if (selectedActionType.action_role === 3) {
        payload.max_duration_minutes = timeRuleForm.max_duration_minutes;
      }

      if (editingTimeRule) {
        await adminAPI.updateTimeRule({
          id: editingTimeRule.id,
          ...payload,
        });
        toast.success('更新成功');
      } else {
        await adminAPI.createTimeRule(payload);
        toast.success('添加成功');
      }
      setIsTimeRuleModalOpen(false);
      loadData();
    } catch (error: any) {
      toast.error(error || '保存失败');
    }
  };

  const handleManualCheckIn = useCallback(async () => {
    try {
      const checkTime = `${manualCheckInForm.check_date} ${manualCheckInForm.check_time}:00`;
      await checkinAPI.createManualCheckIn({
        user_id: manualCheckInForm.user_id,
        action_type_id: manualCheckInForm.action_type_id,
        check_time: checkTime,
        note: manualCheckInForm.note || null,
      });
      toast.success('补卡成功');
      setIsManualCheckInModalOpen(false);
      loadData();
    } catch (error: any) {
      toast.error(error || '补卡失败');
    }
  }, [manualCheckInForm, loadData]);

  const handleEditCheckIn = (checkIn: CheckIn) => {
    setEditingCheckIn(checkIn);
    setEditCheckInForm({
      is_late: checkIn.is_late || false,
      is_early_leave: checkIn.is_early_leave || false,
      note: checkIn.note || '',
    });
    setIsEditCheckInModalOpen(true);
  };

  const handleSaveEditCheckIn = useCallback(async () => {
    if (!editingCheckIn) return;
    
    try {
      await checkinAPI.updateCheckIn({
        check_in_id: editingCheckIn.id,
        is_late: editCheckInForm.is_late,
        is_early_leave: editCheckInForm.is_early_leave,
        note: editCheckInForm.note || undefined,
      });
      toast.success('修改成功');
      setIsEditCheckInModalOpen(false);
      setEditingCheckIn(null);
      loadData();
    } catch (error: any) {
      toast.error(error || '修改失败');
    }
  }, [editingCheckIn, editCheckInForm, loadData]);

  // 使用 useMemo 缓存计算结果，避免不必要的重新计算
  const getUserName = useCallback((userId: number) => {
    return users.find(u => u.id === userId)?.full_name || '未知';
  }, [users]);

  const getActionTypeName = useCallback((actionTypeId: number) => {
    return actionTypes.find(t => t.id === actionTypeId)?.button_text || '未知';
  }, [actionTypes]);

  // 分页相关回调
  const handlePageChange = useCallback((page: number) => {
    setPaginationInfo(prev => ({ ...prev, currentPage: page }));
  }, []);

  const handlePageSizeChange = useCallback((pageSize: number) => {
    setPaginationInfo(prev => ({ ...prev, pageSize, currentPage: 1 }));
  }, []);

  // 生成报表（用于显示）
  const generateMonthlyReport = () => {
    if (reportData.length > 0) {
      return reportData;
    }
    // 如果没有报表数据，使用当前状态生成
    return generateMonthlyReportData(users, checkIns);
  };

  // 生成并下载报表
  const generateReport = async () => {
    try {
      // 先确保数据已加载
      if (reportData.length === 0 || checkIns.length === 0) {
        await loadReportData();
      }
      // 使用最新的报表数据下载
      const currentReport = reportData.length > 0 ? reportData : generateMonthlyReport();
      downloadReport(currentReport);
    } catch (error: any) {
      toast.error('生成报表失败: ' + (error.message || error));
    }
  };

  const downloadReport = (reportData: any[]) => {
    const text = `📊 考勤统计报表\n统计月份: ${reportMonth}\n统计时间: ${checkInFilters.startDate} 至 ${checkInFilters.endDate}\n\n` +
      reportData.map((data, idx) => 
        `${idx + 1}. ${data.name}\n   出勤天数: ${data.workDays} 天\n   总工作时长: 0 小时 0 分钟\n   迟到次数: ${data.lateCount} 次\n   早退次数: 0 次\n   旷工次数: 0 次`
      ).join('\n\n');

    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `考勤报表_${reportMonth}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('报表已下载');
  };

  const copyReport = () => {
    try {
      const currentReport = reportData.length > 0 ? reportData : generateMonthlyReport();
      const text = `📊 考勤统计报表\n统计月份: ${reportMonth}\n统计时间: ${checkInFilters.startDate} 至 ${checkInFilters.endDate}\n\n` +
        currentReport.map((data, idx) => 
          `${idx + 1}. ${data.name}\n   出勤天数: ${data.workDays} 天\n   总工作时长: 0 小时 0 分钟\n   迟到次数: ${data.lateCount} 次\n   早退次数: 0 次\n   旷工次数: 0 次`
        ).join('\n\n');
      
      navigator.clipboard.writeText(text);
      toast.success('报表已复制到剪贴板！');
    } catch (error: any) {
      console.error('复制失败:', error);
      toast.error('复制失败: ' + (error.message || error));
    }
  };

  if (!isOpen) return null;

  // 独立窗口模式 - 全屏布局
  if (isStandaloneWindow) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="h-screen flex flex-col w-full">
          {/* Custom Title Bar */}
          <div 
            data-tauri-drag-region
            className="flex items-center justify-between px-4 py-2 border-b dark:border-gray-700 bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-gray-900 dark:to-indigo-950 w-full select-none"
          >
            <h1 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
              🔧 系统管理面板
            </h1>
            <div className="flex items-center gap-1">
              <button
                onClick={async () => {
                  const { appWindow } = await import('@tauri-apps/api/window');
                  appWindow.minimize();
                }}
                className="w-8 h-8 flex items-center justify-center hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
              >
                <span className="text-gray-600 dark:text-gray-300 text-xl leading-none">−</span>
              </button>
              <button
                onClick={async () => {
                  const { appWindow } = await import('@tauri-apps/api/window');
                  const isMaximized = await appWindow.isMaximized();
                  if (isMaximized) {
                    appWindow.unmaximize();
                  } else {
                    appWindow.maximize();
                  }
                }}
                className="w-8 h-8 flex items-center justify-center hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
              >
                <span className="text-gray-600 dark:text-gray-300 text-lg leading-none">□</span>
              </button>
              <button
                onClick={async () => {
                  const { appWindow } = await import('@tauri-apps/api/window');
                  appWindow.close();
                }}
                className="w-8 h-8 flex items-center justify-center hover:bg-red-500 hover:text-white rounded transition-colors"
              >
                <X size={16} className="text-gray-600 dark:text-gray-300 hover:text-white" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-auto px-6 py-4 w-full">
            {/* Tabs */}
            <div className="flex space-x-1 mb-6 border-b dark:border-gray-700 w-full">
          <button
            className={`px-4 py-2.5 font-medium flex items-center gap-2 transition-all duration-200 ${
              activeTab === 'actionTypes'
                ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50 dark:bg-blue-900/20'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800'
            }`}
            onClick={() => setActiveTab('actionTypes')}
          >
            <span className="text-lg">👥</span>
            <span className="text-sm">打卡类型</span>
          </button>
          <button
            className={`px-4 py-2.5 font-medium flex items-center gap-2 transition-all duration-200 ${
              activeTab === 'timeRules'
                ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50 dark:bg-blue-900/20'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800'
            }`}
            onClick={() => setActiveTab('timeRules')}
          >
            <span className="text-lg">⏰</span>
            <span className="text-sm">时间规则</span>
          </button>
          <button
            className={`px-4 py-2.5 font-medium flex items-center gap-2 transition-all duration-200 ${
              activeTab === 'users'
                ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50 dark:bg-blue-900/20'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800'
            }`}
            onClick={() => setActiveTab('users')}
          >
            <span className="text-lg">👤</span>
            <span className="text-sm">员工管理</span>
          </button>
          <button
            className={`px-4 py-2.5 font-medium flex items-center gap-2 transition-all duration-200 ${
              activeTab === 'checkIns'
                ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50 dark:bg-blue-900/20'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800'
            }`}
            onClick={() => setActiveTab('checkIns')}
          >
            <span className="text-lg">📋</span>
            <span className="text-sm">打卡记录</span>
          </button>
          <button
            className={`px-4 py-2.5 font-medium flex items-center gap-2 transition-all duration-200 ${
              activeTab === 'reports'
                ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50 dark:bg-blue-900/20'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800'
            }`}
            onClick={() => setActiveTab('reports')}
          >
            <span className="text-lg">📊</span>
            <span className="text-sm">统计报表</span>
            </button>
            </div>

            {/* Content */}
            <Card className="w-full">
          {activeTab === 'actionTypes' && (
            <div>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">打卡类型管理</h2>
                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={loadData}
                  >
                    <RefreshCw size={16} />
                    <span>刷新</span>
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => openActionTypeModal()}
                  >
                    <Plus size={16} />
                    <span>添加打卡类型</span>
                  </Button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th className="px-4 py-2 text-left text-sm font-medium text-gray-700 dark:text-gray-300">ID</th>
                      <th className="px-4 py-2 text-left text-sm font-medium text-gray-700 dark:text-gray-300">按钮文字</th>
                      <th className="px-4 py-2 text-left text-sm font-medium text-gray-700 dark:text-gray-300">颜色</th>
                      <th className="px-4 py-2 text-left text-sm font-medium text-gray-700 dark:text-gray-300">排序(分钟)</th>
                      <th className="px-4 py-2 text-left text-sm font-medium text-gray-700 dark:text-gray-300">状态</th>
                      <th className="px-4 py-2 text-left text-sm font-medium text-gray-700 dark:text-gray-300">操作</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y dark:divide-gray-700">
                    {actionTypes.map((actionType) => (
                      <tr key={actionType.id}>
                        <td className="px-4 py-2 text-sm text-gray-900 dark:text-white">{actionType.id}</td>
                        <td className="px-4 py-2 text-sm text-gray-900 dark:text-white">{actionType.button_text}</td>
                        <td className="px-4 py-2">
                          <div className="flex items-center space-x-2">
                            <div
                              className="w-12 h-6 rounded"
                              style={{ backgroundColor: actionType.button_color }}
                            />
                          </div>
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-900 dark:text-white">
                          {actionType.display_order}
                        </td>
                        <td className="px-4 py-2">
                          <span className={`px-2 py-1 rounded text-sm ${
                            actionType.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {actionType.is_active ? '✅ 启用' : '❌ 禁用'}
                          </span>
                        </td>
                        <td className="px-4 py-2 space-x-2">
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => openActionTypeModal(actionType)}
                          >
                            编辑
                          </Button>
                          {!['clock_in', 'clock_out', 'back_to_seat'].includes(actionType.name) && (
                            <Button
                              variant="danger"
                              size="sm"
                              onClick={() => handleDeleteActionType(actionType.id)}
                            >
                              删除
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mt-4 text-sm text-gray-500 dark:text-gray-400">
                提示: 系统默认的打卡类型(上班、下班、回座)不可删除
              </div>
            </div>
          )}

          {activeTab === 'timeRules' && (
            <div>
              <div className="flex justify-end items-center mb-4">
                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={loadData}
                  >
                    <RefreshCw size={16} />
                    <span>刷新</span>
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => openTimeRuleModal()}
                  >
                    <Plus size={16} />
                    <span>添加规则</span>
                  </Button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th className="px-4 py-2 text-left text-sm font-medium text-gray-700 dark:text-gray-300">规则名称</th>
                      <th className="px-4 py-2 text-left text-sm font-medium text-gray-700 dark:text-gray-300">打卡类型</th>
                      <th className="px-4 py-2 text-left text-sm font-medium text-gray-700 dark:text-gray-300">时间配置</th>
                      <th className="px-4 py-2 text-left text-sm font-medium text-gray-700 dark:text-gray-300">操作</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y dark:divide-gray-700">
                    {timeRules.map((rule) => {
                      const actionType = actionTypes.find(t => t.id === rule.action_type_id);
                      
                      // 根据action_role显示不同的配置信息
                      let timeConfig = '';
                      if (actionType?.action_role === 1 || actionType?.action_role === 2) {
                        // 主进程：显示上下班时间
                        const isCrossDay = rule.expected_end_time && rule.expected_start_time && rule.expected_end_time < rule.expected_start_time;
                        timeConfig = `${rule.expected_start_time || '--'} → ${rule.expected_end_time || '--'}`;
                        if (isCrossDay) {
                          timeConfig += ' (跨日)';
                        }
                      } else if (actionType?.action_role === 3) {
                        // 临时事件：显示最大时长
                        timeConfig = `最多 ${rule.max_duration_minutes || 0} 分钟`;
                      } else if (actionType?.action_role === 4) {
                        timeConfig = '立即结束';
                      }
                      
                      return (
                        <tr key={rule.id}>
                          <td className="px-4 py-2 text-sm text-gray-900 dark:text-white">{rule.rule_name}</td>
                          <td className="px-4 py-2 text-sm text-gray-900 dark:text-white">
                            {actionType?.button_text || '未知'}
                          </td>
                          <td className="px-4 py-2 text-sm text-gray-900 dark:text-white font-mono">
                            {timeConfig}
                          </td>
                          <td className="px-4 py-2 space-x-2">
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => openTimeRuleModal(rule)}
                            >
                              编辑
                            </Button>
                            <Button
                              variant="danger"
                              size="sm"
                              onClick={() => handleDeleteTimeRule(rule.id)}
                            >
                              删除
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'users' && (
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">员工管理</h2>
              
              <div className="mb-4 flex gap-2">
                <Button 
                  variant="secondary" 
                  size="sm" 
                  onClick={loadData}
                >
                  <RefreshCw size={16} />
                  <span>刷新</span>
                </Button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th className="px-4 py-2 text-left text-sm font-medium text-gray-700 dark:text-gray-300">ID</th>
                      <th className="px-4 py-2 text-left text-sm font-medium text-gray-700 dark:text-gray-300">用户名</th>
                      <th className="px-4 py-2 text-left text-sm font-medium text-gray-700 dark:text-gray-300">姓名</th>
                      <th className="px-4 py-2 text-left text-sm font-medium text-gray-700 dark:text-gray-300">管理员</th>
                      <th className="px-4 py-2 text-left text-sm font-medium text-gray-700 dark:text-gray-300">操作</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y dark:divide-gray-700">
                    {users.map((user) => (
                      <tr key={user.id}>
                        <td className="px-4 py-2 text-sm text-gray-900 dark:text-white">{user.id}</td>
                        <td className="px-4 py-2 text-sm text-gray-900 dark:text-white">{user.username}</td>
                        <td className="px-4 py-2 text-sm text-gray-900 dark:text-white">{user.full_name}</td>
                        <td className="px-4 py-2">
                          <span className={`px-2 py-1 rounded text-sm ${
                            user.is_admin ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'
                          }`}>
                            {user.is_admin ? '✅ 是' : '❌ 否'}
                          </span>
                        </td>
                        <td className="px-4 py-2 space-x-2">
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => handleToggleAdmin(user.id, user.is_admin)}
                          >
                            {user.is_admin ? '设为管理员' : '取消管理员'}
                          </Button>
                          <Button
                            variant="danger"
                            size="sm"
                            onClick={() => handleDeleteUser(user.id)}
                          >
                            删除
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'checkIns' && (
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">查询条件</h2>
              
              <div className="flex items-center space-x-4 mb-6">
                <div className="flex items-center space-x-2">
                  <label className="text-sm text-gray-700 dark:text-gray-300">日期范围:</label>
                  <input
                    type="date"
                    value={checkInFilters.startDate}
                    onChange={(e) => setCheckInFilters({ ...checkInFilters, startDate: e.target.value })}
                    className="px-3 py-1 border border-gray-300 rounded text-gray-900 bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  />
                  <span className="text-gray-500 dark:text-gray-400">至</span>
                  <input
                    type="date"
                    value={checkInFilters.endDate}
                    onChange={(e) => setCheckInFilters({ ...checkInFilters, endDate: e.target.value })}
                    className="px-3 py-1 border border-gray-300 rounded text-gray-900 bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  />
                </div>
                
                <div className="flex items-center space-x-2">
                  <label className="text-sm text-gray-700 dark:text-gray-300">员工:</label>
                  <select
                    value={checkInFilters.userId}
                    onChange={(e) => setCheckInFilters({ ...checkInFilters, userId: e.target.value })}
                    className="px-3 py-1 border border-gray-300 rounded text-gray-900 bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  >
                    <option value="all">全部员工</option>
                    {users.map(user => (
                      <option key={user.id} value={user.id}>{user.full_name}</option>
                    ))}
                  </select>
                </div>

                <Button 
                  variant="secondary" 
                  size="sm" 
                  onClick={() => {
                  setManualCheckInForm({
                    user_id: users[0]?.id || 0,
                    action_type_id: actionTypes[0]?.id || 0,
                    check_date: new Date().toISOString().split('T')[0],
                    check_time: '09:00',
                    note: '',
                  });
                  setIsManualCheckInModalOpen(true);
                }}
                >
                  <span className="text-base">➕</span>
                  <span>补卡</span>
                </Button>

                <Button 
                  variant="secondary" 
                  size="sm" 
                  onClick={loadData}
                >
                  <RefreshCw size={16} />
                  <span>刷新</span>
                </Button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th className="px-4 py-2 text-left text-sm font-medium text-gray-700 dark:text-gray-300">员工</th>
                      <th className="px-4 py-2 text-left text-sm font-medium text-gray-700 dark:text-gray-300">打卡类型</th>
                      <th className="px-4 py-2 text-left text-sm font-medium text-gray-700 dark:text-gray-300">打卡时间</th>
                      <th className="px-4 py-2 text-left text-sm font-medium text-gray-700 dark:text-gray-300">状态</th>
                      <th className="px-4 py-2 text-left text-sm font-medium text-gray-700 dark:text-gray-300">时长(分钟)</th>
                      <th className="px-4 py-2 text-left text-sm font-medium text-gray-700 dark:text-gray-300">迟到</th>
                      <th className="px-4 py-2 text-left text-sm font-medium text-gray-700 dark:text-gray-300">早退</th>
                      <th className="px-4 py-2 text-left text-sm font-medium text-gray-700 dark:text-gray-300">补卡</th>
                      <th className="px-4 py-2 text-left text-sm font-medium text-gray-700 dark:text-gray-300">备注</th>
                      <th className="px-4 py-2 text-left text-sm font-medium text-gray-700 dark:text-gray-300">操作</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y dark:divide-gray-700">
                    {checkIns.map((checkIn) => (
                      <tr key={checkIn.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                        <td className="px-4 py-2 text-sm text-gray-900 dark:text-white">
                          {getUserName(checkIn.user_id)}
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-900 dark:text-white">
                          {getActionTypeName(checkIn.action_type_id)}
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-900 dark:text-white">
                          {new Date(checkIn.check_time).toLocaleString('zh-CN')}
                        </td>
                        <td className="px-4 py-2">
                          <span className={`px-2 py-1 rounded text-sm ${
                            checkIn.status === 'completed' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' :
                            checkIn.status === 'overtime' ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' :
                            'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                          }`}>
                            {checkIn.status === 'completed' ? '已完成' :
                             checkIn.status === 'overtime' ? '超时' : '进行中'}
                          </span>
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-900 dark:text-white">
                          {checkIn.duration_minutes || '-'}
                        </td>
                        <td className="px-4 py-2 text-center">
                          <span className={checkIn.is_late ? 'text-red-500' : 'text-green-500'}>
                            {checkIn.is_late ? '❌' : '✅'}
                          </span>
                        </td>
                        <td className="px-4 py-2 text-center">
                          <span className={checkIn.is_early_leave ? 'text-red-500' : 'text-green-500'}>
                            {checkIn.is_early_leave ? '❌' : '✅'}
                          </span>
                        </td>
                        <td className="px-4 py-2 text-center">
                          {checkIn.is_manual ? '📝' : '-'}
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 max-w-xs truncate" title={checkIn.note || ''}>
                          {checkIn.note || '-'}
                        </td>
                        <td className="px-4 py-2">
                          <button
                            onClick={() => handleEditCheckIn(checkIn)}
                            className="px-3 py-1 text-sm bg-blue-500 hover:bg-blue-600 text-white rounded transition-colors"
                          >
                            编辑
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* 分页组件 */}
              <Pagination
                currentPage={paginationInfo.currentPage}
                totalPages={paginationInfo.totalPages}
                pageSize={paginationInfo.pageSize}
                totalItems={paginationInfo.totalItems}
                onPageChange={handlePageChange}
                onPageSizeChange={handlePageSizeChange}
                pageSizeOptions={[10, 20, 50, 100]}
              />
            </div>
          )}

          {activeTab === 'reports' && (
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">统计周期</h2>
              
              <div className="flex items-center space-x-4 mb-6">
                <div className="flex items-center space-x-2">
                  <label className="text-sm text-gray-700 dark:text-gray-300">选择月份:</label>
                  <input
                    type="month"
                    value={reportMonth}
                    onChange={(e) => setReportMonth(e.target.value)}
                    className="px-3 py-1 border border-gray-300 rounded text-gray-900 bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  />
                </div>

                <Button 
                  variant="primary" 
                  size="sm" 
                  onClick={generateReport}
                  disabled={isLoadingReport}
                >
                  <FileText size={16} />
                  <span>{isLoadingReport ? '生成中...' : '生成报表'}</span>
                </Button>

                <Button 
                  variant="secondary" 
                  size="sm" 
                  onClick={copyReport}
                  disabled={isLoadingReport || reportData.length === 0}
                >
                  <Copy size={16} />
                  <span>复制报表</span>
                </Button>

                <Button 
                  variant="secondary" 
                  size="sm" 
                  onClick={loadReportData}
                  disabled={isLoadingReport}
                >
                  <RefreshCw size={16} className={isLoadingReport ? 'animate-spin' : ''} />
                  <span>刷新</span>
                </Button>
              </div>

              {isLoadingReport ? (
                <div className="bg-gray-50 dark:bg-gray-700 p-6 rounded-lg text-center">
                  <RefreshCw size={24} className="animate-spin mx-auto text-gray-500 dark:text-gray-400" />
                  <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">正在加载报表数据...</p>
                </div>
              ) : (
                <div className="bg-gray-50 dark:bg-gray-700 p-6 rounded-lg">
                  <pre className="whitespace-pre-wrap text-sm text-gray-800 dark:text-gray-200">
                    {`📊 考勤统计报表
统计月份: ${reportMonth}
统计时间: ${checkInFilters.startDate} 至 ${checkInFilters.endDate}

` + generateMonthlyReport().map((data, idx) => 
  `${idx + 1}. ${data.name}
   出勤天数: ${data.workDays} 天
   总工作时长: 0 小时 0 分钟
   迟到次数: ${data.lateCount} 次
   早退次数: 0 次
   旷工次数: 0 次`
).join('\n\n')}
                  </pre>
                </div>
              )}
            </div>
          )}
        </Card>

        {/* Action Type Modal */}
        <Modal
          isOpen={isActionTypeModalOpen}
          onClose={() => setIsActionTypeModalOpen(false)}
          title={editingActionType ? '编辑打卡类型' : '添加打卡类型'}
        >
          <div className="space-y-4">
            <Input
              label="内部名称"
              value={actionTypeForm.name}
              onChange={(e) => setActionTypeForm({ ...actionTypeForm, name: e.target.value })}
              placeholder="例如: coffee_break"
            />
            <Input
              label="按钮文字"
              value={actionTypeForm.button_text}
              onChange={(e) => setActionTypeForm({ ...actionTypeForm, button_text: e.target.value })}
              placeholder="例如: 咖啡休息"
            />
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                按钮颜色
              </label>
              <div className="flex items-center space-x-2">
                <input
                  type="color"
                  value={actionTypeForm.button_color}
                  onChange={(e) => setActionTypeForm({ ...actionTypeForm, button_color: e.target.value })}
                  className="h-10 w-20 rounded cursor-pointer"
                />
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {actionTypeForm.button_color}
                </span>
              </div>
            </div>
            <Input
              label="显示顺序"
              type="number"
              value={actionTypeForm.display_order}
              onChange={(e) => setActionTypeForm({ ...actionTypeForm, display_order: parseInt(e.target.value) })}
            />
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                动作角色
              </label>
              <select
                value={actionTypeForm.action_role}
                onChange={(e) => setActionTypeForm({ ...actionTypeForm, action_role: parseInt(e.target.value) })}
                className="w-full px-3 py-2 border rounded text-gray-900 bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              >
                <option value={1}>进程开始</option>
                <option value={2}>进程结束</option>
                <option value={3}>事件开始</option>
                <option value={4}>事件结束</option>
              </select>
            </div>
            <div className="flex items-center">
              <input
                type="checkbox"
                checked={actionTypeForm.requires_pair}
                onChange={(e) => setActionTypeForm({ ...actionTypeForm, requires_pair: e.target.checked })}
                className="mr-2"
              />
              <label className="text-sm text-gray-700 dark:text-gray-300">需要配对操作</label>
            </div>
            <div className="flex justify-end space-x-2 mt-6">
              <Button variant="secondary" onClick={() => setIsActionTypeModalOpen(false)}>
                取消
              </Button>
              <Button variant="primary" onClick={handleSaveActionType}>
                保存
              </Button>
            </div>
          </div>
        </Modal>

            {/* Time Rule Modal */}
            <Modal
          isOpen={isTimeRuleModalOpen}
          onClose={() => setIsTimeRuleModalOpen(false)}
          title={editingTimeRule ? '编辑时间规则' : '添加时间规则'}
        >
          <div className="space-y-4">
            {/* 重要提示 */}
            <div className="bg-amber-50 dark:bg-amber-900/20 border-2 border-amber-400 dark:border-amber-600 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <span className="text-2xl">⚠️</span>
                <div className="flex-1">
                  <h4 className="font-semibold text-amber-800 dark:text-amber-300 mb-2">重要说明</h4>
                  <ul className="text-sm text-amber-700 dark:text-amber-400 space-y-1">
                    <li>• 每个打卡类型只能有一个时间规则</li>
                    <li>• <strong>上班和下班应使用相同的工作时间段</strong></li>
                    <li>• 系统根据打卡类型自动判断迟到/早退</li>
                  </ul>
                </div>
              </div>
            </div>

            <Input
              label="规则名称"
              value={timeRuleForm.rule_name}
              onChange={(e) => setTimeRuleForm({ ...timeRuleForm, rule_name: e.target.value })}
              placeholder="例如: 上班时间规则"
            />
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                打卡类型
              </label>
              <select
                value={timeRuleForm.action_type_id}
                onChange={(e) => setTimeRuleForm({ ...timeRuleForm, action_type_id: parseInt(e.target.value) })}
                className="w-full px-3 py-2 border rounded text-gray-900 bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              >
                {actionTypes.map(type => (
                  <option key={type.id} value={type.id}>{type.button_text}</option>
                ))}
              </select>
            </div>
            
            {/* 根据打卡类型显示不同的时间设置 */}
            {(() => {
              const selectedActionType = actionTypes.find(t => t.id === timeRuleForm.action_type_id);
              const actionRole = selectedActionType?.action_role;

              // action_role = 1 或 2（上班/下班）：显示期望上下班时间
              if (actionRole === 1 || actionRole === 2) {
                return (<>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      期望上班时间
                    </label>
                    <input
                      type="text"
                      value={timeRuleForm.expected_start_time}
                      onChange={(e) => setTimeRuleForm({ ...timeRuleForm, expected_start_time: e.target.value })}
                      pattern="([01]\d|2[0-3]):[0-5]\d"
                      placeholder="09:00"
                      maxLength={5}
                      className="w-full px-4 py-3 border-2 rounded-lg text-lg font-mono text-gray-900 bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:border-blue-500 dark:focus:border-blue-400 focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-900"
                    />
                    <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                      💡 24小时制格式：00:00 ~ 23:59（例如：09:00、12:00、20:00）
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      期望下班时间
                    </label>
                    <input
                      type="text"
                      value={timeRuleForm.expected_end_time}
                      onChange={(e) => setTimeRuleForm({ ...timeRuleForm, expected_end_time: e.target.value })}
                      pattern="([01]\d|2[0-3]):[0-5]\d"
                      placeholder="18:00"
                      maxLength={5}
                      className="w-full px-4 py-3 border-2 rounded-lg text-lg font-mono text-gray-900 bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:border-blue-500 dark:focus:border-blue-400 focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-900"
                    />
                    <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                      💡 下班时间早于上班 = 跨日班次（例：12:00 → 03:00 = 15小时夜班）
                    </p>
                  </div>
                </>);
              }

              // action_role = 3（临时事件如上厕所、午餐）：显示最大允许时长
              if (actionRole === 3) {
                return (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      最大允许时长（分钟）
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={timeRuleForm.max_duration_minutes}
                      onChange={(e) => setTimeRuleForm({ ...timeRuleForm, max_duration_minutes: parseInt(e.target.value) || 0 })}
                      placeholder="15"
                      className="w-full px-4 py-3 border-2 rounded-lg text-lg font-mono text-gray-900 bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:border-blue-500 dark:focus:border-blue-400 focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-900"
                    />
                    <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                      ⏱️ 临时事件超过此时长将被标记为超时（例如：上厕所最多15分钟，午餐最多60分钟）
                    </p>
                  </div>
                );
              }

              // action_role = 4（回座）：不需要时间设置
              if (actionRole === 4) {
                return (
                  <div className="bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-400 dark:border-blue-600 rounded-lg p-4">
                    <div className="flex items-start space-x-3">
                      <span className="text-2xl">ℹ️</span>
                      <div className="flex-1">
                        <h4 className="font-semibold text-blue-800 dark:text-blue-300 mb-1">自动操作</h4>
                        <p className="text-sm text-blue-700 dark:text-blue-400">
                          "回座"操作会立即结束当前的临时事件，无需设置时间规则。
                        </p>
                      </div>
                    </div>
                  </div>
                );
              }

              return null;
            })()}
            
            <div className="flex justify-end space-x-2 mt-6">
              <Button variant="secondary" onClick={() => setIsTimeRuleModalOpen(false)}>
                取消
              </Button>
              <Button variant="primary" onClick={handleSaveTimeRule}>
                保存
              </Button>
            </div>
          </div>
        </Modal>

        {/* 补卡模态框 */}
        <Modal
          isOpen={isManualCheckInModalOpen}
          onClose={() => setIsManualCheckInModalOpen(false)}
          title="补卡"
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                选择员工
              </label>
              <select
                value={manualCheckInForm.user_id}
                onChange={(e) => setManualCheckInForm({ ...manualCheckInForm, user_id: parseInt(e.target.value) })}
                className="w-full px-3 py-2 border rounded text-gray-900 bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              >
                {users.map(user => (
                  <option key={user.id} value={user.id}>{user.full_name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                打卡类型
              </label>
              <select
                value={manualCheckInForm.action_type_id}
                onChange={(e) => setManualCheckInForm({ ...manualCheckInForm, action_type_id: parseInt(e.target.value) })}
                className="w-full px-3 py-2 border rounded text-gray-900 bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              >
                {actionTypes.map(type => (
                  <option key={type.id} value={type.id}>{type.button_text}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                日期
              </label>
              <input
                type="date"
                value={manualCheckInForm.check_date}
                onChange={(e) => setManualCheckInForm({ ...manualCheckInForm, check_date: e.target.value })}
                className="w-full px-3 py-2 border rounded text-gray-900 bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                时间
              </label>
              <input
                type="text"
                value={manualCheckInForm.check_time}
                onChange={(e) => setManualCheckInForm({ ...manualCheckInForm, check_time: e.target.value })}
                pattern="([01]\d|2[0-3]):[0-5]\d"
                placeholder="09:00"
                maxLength={5}
                className="w-full px-4 py-3 border-2 rounded-lg text-lg font-mono text-gray-900 bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:border-blue-500 dark:focus:border-blue-400 focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-900"
              />
              <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                💡 24小时制格式：00:00 ~ 23:59（例如：09:00、12:00、20:00）
              </p>
            </div>
            <Input
              label="备注（可选）"
              type="text"
              placeholder="补卡原因..."
              value={manualCheckInForm.note}
              onChange={(e) => setManualCheckInForm({ ...manualCheckInForm, note: e.target.value })}
            />
            <div className="flex justify-end space-x-2 mt-6">
              <Button variant="secondary" onClick={() => setIsManualCheckInModalOpen(false)}>
                取消
              </Button>
              <Button variant="primary" onClick={handleManualCheckIn}>
                确认补卡
              </Button>
            </div>
          </div>
        </Modal>

        {/* 编辑打卡记录模态框 */}
        <Modal
          isOpen={isEditCheckInModalOpen}
          onClose={() => {
            setIsEditCheckInModalOpen(false);
            setEditingCheckIn(null);
          }}
          title="编辑打卡记录"
        >
          <div className="space-y-4">
            {editingCheckIn && (
              <>
                {/* 显示打卡信息 */}
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                  <h4 className="font-semibold text-blue-900 dark:text-blue-300 mb-2">打卡信息</h4>
                  <div className="text-sm text-blue-800 dark:text-blue-400 space-y-1">
                    <p><strong>员工：</strong>{getUserName(editingCheckIn.user_id)}</p>
                    <p><strong>打卡类型：</strong>{getActionTypeName(editingCheckIn.action_type_id)}</p>
                    <p><strong>打卡时间：</strong>{new Date(editingCheckIn.check_time).toLocaleString('zh-CN')}</p>
                  </div>
                </div>

                {/* 编辑状态 */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 border border-gray-300 dark:border-gray-600 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <span className="text-2xl">{editCheckInForm.is_late ? '❌' : '✅'}</span>
                      <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        迟到
                      </label>
                    </div>
                    <button
                      onClick={() => setEditCheckInForm({ ...editCheckInForm, is_late: !editCheckInForm.is_late })}
                      className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                        editCheckInForm.is_late
                          ? 'bg-red-500 hover:bg-red-600 text-white'
                          : 'bg-green-500 hover:bg-green-600 text-white'
                      }`}
                    >
                      {editCheckInForm.is_late ? '标记为正常' : '标记为迟到'}
                    </button>
                  </div>

                  <div className="flex items-center justify-between p-3 border border-gray-300 dark:border-gray-600 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <span className="text-2xl">{editCheckInForm.is_early_leave ? '❌' : '✅'}</span>
                      <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        早退
                      </label>
                    </div>
                    <button
                      onClick={() => setEditCheckInForm({ ...editCheckInForm, is_early_leave: !editCheckInForm.is_early_leave })}
                      className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                        editCheckInForm.is_early_leave
                          ? 'bg-red-500 hover:bg-red-600 text-white'
                          : 'bg-green-500 hover:bg-green-600 text-white'
                      }`}
                    >
                      {editCheckInForm.is_early_leave ? '标记为正常' : '标记为早退'}
                    </button>
                  </div>
                </div>

                {/* 备注 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    备注
                  </label>
                  <textarea
                    value={editCheckInForm.note}
                    onChange={(e) => setEditCheckInForm({ ...editCheckInForm, note: e.target.value })}
                    placeholder="例如：员工报备了原因，批准为正常..."
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white bg-white dark:bg-gray-700 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-900"
                  />
                </div>

                <div className="flex justify-end space-x-2 mt-6">
                  <Button 
                    variant="secondary" 
                    onClick={() => {
                      setIsEditCheckInModalOpen(false);
                      setEditingCheckIn(null);
                    }}
                  >
                    取消
                  </Button>
                  <Button variant="primary" onClick={handleSaveEditCheckIn}>
                    保存修改
                  </Button>
                </div>
              </>
            )}
          </div>
        </Modal>
          </div>
        </div>
      </div>
    );
  }

  // 弹窗模式 - 在主窗口中显示
  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose}></div>
      
      {/* Panel */}
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="relative w-full max-w-7xl max-h-[95vh] bg-white dark:bg-gray-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b dark:border-gray-700 bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-gray-900 dark:to-indigo-950">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              🔧 系统管理面板
            </h1>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/50 dark:hover:bg-gray-700/50 rounded-lg transition-colors"
            >
              <X size={24} className="text-gray-600 dark:text-gray-300" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-auto px-6 py-4">
        {/* Content is same as standalone mode, we'll add a ref here later */}
        <p className="text-gray-500">弹窗模式暂不支持，请使用独立窗口</p>
          </div>
        </div>
      </div>
    </div>
  );
};
