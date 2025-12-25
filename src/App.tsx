import { useEffect } from 'react';
import { Toaster } from 'react-hot-toast';
import { checkUpdate, installUpdate } from '@tauri-apps/api/updater';
import { LoginPage } from './pages/LoginPage';
import { CheckInPage } from './pages/CheckInPage';
import { useAuthStore } from './store/authStore';
import { useUIStore } from './store/uiStore';
import './styles/globals.css';

function App() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const currentPage = useUIStore((state) => state.currentPage);
  const setCurrentPage = useUIStore((state) => state.setCurrentPage);

  useEffect(() => {
    if (isAuthenticated && currentPage === 'login') {
      setCurrentPage('checkin');
    } else if (!isAuthenticated) {
      setCurrentPage('login');
    }
  }, [isAuthenticated]);

  // 检查更新
  useEffect(() => {
    const checkForUpdates = async () => {
      try {
        const { shouldUpdate, manifest } = await checkUpdate();
        if (shouldUpdate) {
          const confirmed = window.confirm(
            `发现新版本 ${manifest?.version}！\n\n更新内容：${manifest?.body || '暂无说明'}\n\n是否立即更新？`
          );
          if (confirmed) {
            await installUpdate();
            window.location.reload();
          }
        }
      } catch (error) {
        // 静默失败，不影响应用使用
        console.log('检查更新失败:', error);
      }
    };

    // 应用启动后延迟3秒检查更新，避免影响启动速度
    const timer = setTimeout(checkForUpdates, 3000);
    return () => clearTimeout(timer);
  }, []);

  const renderPage = () => {
    if (!isAuthenticated) {
      return <LoginPage />;
    }

    return <CheckInPage />;
  };

  return (
    <>
      {renderPage()}
      <Toaster
        position="top-center"
        toastOptions={{
          duration: 3000,
          style: {
            background: '#333',
            color: '#fff',
          },
        }}
      />
    </>
  );
}

export default App;
