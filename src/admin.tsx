import React from 'react';
import ReactDOM from 'react-dom/client';
import { Toaster } from 'react-hot-toast';
import { AdminPage } from './pages/AdminPage';
import './styles/globals.css';

// 管理窗口独立入口
ReactDOM.createRoot(document.getElementById('admin-root')!).render(
  <React.StrictMode>
    <AdminPage isOpen={true} onClose={() => {}} isStandaloneWindow={true} />
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
  </React.StrictMode>
);
