import { useEffect } from 'react';
import { Toaster } from 'react-hot-toast';
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
