import React, { useState } from 'react';
import { authAPI } from '../services/api';
import { useAuthStore } from '../store/authStore';
import { useUIStore } from '../store/uiStore';
import { Clock, User, Lock, Sparkles } from 'lucide-react';
import toast from 'react-hot-toast';

export const LoginPage: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);

  const login = useAuthStore((state) => state.login);
  const setCurrentPage = useUIStore((state) => state.setCurrentPage);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // 表单验证
    if (!username.trim() || !password.trim()) {
      toast.error('用户名和密码不能为空');
      return;
    }
    
    if (username.length < 3) {
      toast.error('用户名至少需要3个字符');
      return;
    }
    
    if (password.length < 6) {
      toast.error('密码至少需要6个字符');
      return;
    }
    
    if (!isLogin && !fullName.trim()) {
      toast.error('姓名不能为空');
      return;
    }
    
    setLoading(true);

    try {
      if (isLogin) {
        const response = await authAPI.login({ username, password });
        login(response);
        toast.success(`欢迎回来，${response.user.full_name}！`);
        setCurrentPage('checkin');
      } else {
        await authAPI.register({ username, password, full_name: fullName });
        toast.success('注册成功！请登录');
        setIsLogin(true);
        setPassword('');
        setFullName('');
      }
    } catch (error: any) {
      console.error('Login/Register error:', error);
      const errorMessage = typeof error === 'string' ? error : error.message || '操作失败，请重试';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden flex items-center justify-center">
      {/* 动态渐变背景 */}
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIj48cGF0aCBkPSJNMzYgMzBoLTJWMThoMnYxMnptLTggNGgtMlYyMmgydjEyem0xNiA0aC0yVjI2aDJ2MTJ6bS04LThoLTJWMThoMnYxMnptOCAwaC0yVjE4aDJ2MTJ6bS04LTE2aC0yVjZoMnYxMnptOCAwaC0yVjZoMnYxMnoiLz48L2c+PC9nPjwvc3ZnPg==')] opacity-20"></div>
        <div className="absolute inset-0 backdrop-blur-3xl bg-gradient-to-tl from-blue-500/30 via-purple-500/30 to-pink-500/30"></div>
      </div>

      {/* 装饰性光晕 */}
      <div className="absolute top-0 left-0 w-96 h-96 bg-purple-400 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
      <div className="absolute top-0 right-0 w-96 h-96 bg-pink-400 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
      <div className="absolute bottom-0 left-1/2 w-96 h-96 bg-indigo-400 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-4000"></div>

      {/* 主卡片 */}
      <div className="relative z-10 w-full max-w-md mx-4">
        <div className="backdrop-blur-xl bg-white/90 dark:bg-gray-900/90 rounded-3xl shadow-2xl p-8 border border-white/20 dark:border-gray-700/50">
          {/* Logo 和标题 */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 rounded-2xl mb-4 shadow-lg transform hover:rotate-12 transition-transform duration-300">
              <Clock className="w-10 h-10 text-white" strokeWidth={2.5} />
            </div>
            <h1 className="text-4xl font-bold mb-2">
              <span className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
                员工打卡系统
              </span>
            </h1>
            <p className="text-gray-600 dark:text-gray-400 flex items-center justify-center gap-1">
              <Sparkles size={16} className="text-purple-500" />
              <span>简单高效的考勤管理</span>
            </p>
          </div>

          {/* 标签页切换 */}
          <div className="flex mb-8 p-1 bg-gray-100 dark:bg-gray-800 rounded-xl">
            <button
              className={`flex-1 py-3 font-semibold rounded-lg transition-all duration-300 ${
                isLogin
                  ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
              onClick={() => setIsLogin(true)}
            >
              登录
            </button>
            <button
              className={`flex-1 py-3 font-semibold rounded-lg transition-all duration-300 ${
                !isLogin
                  ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
              onClick={() => setIsLogin(false)}
            >
              注册
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* 用户名输入 */}
            <div className="group">
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                用户名
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-gray-400 group-focus-within:text-indigo-600 transition-colors" />
                </div>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="请输入用户名"
                  required
                  autoComplete="username"
                  className="w-full pl-12 pr-4 py-3.5 bg-gray-50 dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:border-indigo-500 focus:bg-white dark:focus:bg-gray-900 transition-all duration-300 text-gray-900 dark:text-white placeholder-gray-400"
                />
              </div>
              <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">至少3个字符</p>
            </div>

            {/* 密码输入 */}
            <div className="group">
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                密码
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400 group-focus-within:text-indigo-600 transition-colors" />
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="请输入密码"
                  required
                  autoComplete={isLogin ? 'current-password' : 'new-password'}
                  className="w-full pl-12 pr-4 py-3.5 bg-gray-50 dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:border-indigo-500 focus:bg-white dark:focus:bg-gray-900 transition-all duration-300 text-gray-900 dark:text-white placeholder-gray-400"
                />
              </div>
              <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">至少6个字符</p>
            </div>

            {/* 真实姓名输入 (仅注册时显示) */}
            {!isLogin && (
              <div className="group animate-fadeIn">
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  真实姓名
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <User className="h-5 w-5 text-gray-400 group-focus-within:text-indigo-600 transition-colors" />
                  </div>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="请输入真实姓名"
                    required
                    autoComplete="name"
                    className="w-full pl-12 pr-4 py-3.5 bg-gray-50 dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:border-indigo-500 focus:bg-white dark:focus:bg-gray-900 transition-all duration-300 text-gray-900 dark:text-white placeholder-gray-400"
                  />
                </div>
              </div>
            )}

            {/* 提交按钮 */}
            <button
              type="submit"
              disabled={loading}
              className="relative w-full mt-6 py-4 px-6 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-700 hover:via-purple-700 hover:to-pink-700 text-white font-bold rounded-xl shadow-lg hover:shadow-xl transform hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none overflow-hidden group"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-pink-600 via-purple-600 to-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              <span className="relative flex items-center justify-center gap-2">
                {loading ? (
                  <>
                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    处理中...
                  </>
                ) : (
                  <>
                    {isLogin ? '登录' : '注册'}
                    <Sparkles size={18} />
                  </>
                )}
              </span>
            </button>
          </form>
          
          {/* 底部提示 */}
          <div className="mt-6 text-center text-sm text-gray-600 dark:text-gray-400">
            {isLogin ? (
              <p>还没有账号？<button onClick={() => setIsLogin(false)} className="text-indigo-600 hover:text-purple-600 font-semibold ml-1 transition-colors">立即注册</button></p>
            ) : (
              <p>已有账号？<button onClick={() => setIsLogin(true)} className="text-indigo-600 hover:text-purple-600 font-semibold ml-1 transition-colors">立即登录</button></p>
            )}
          </div>
        </div>
      </div>

      {/* 添加动画样式 */}
      <style>{`
        @keyframes blob {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
        }
        .animate-blob {
          animation: blob 7s infinite;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        .animation-delay-4000 {
          animation-delay: 4s;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }
      `}</style>
    </div>
  );
};
