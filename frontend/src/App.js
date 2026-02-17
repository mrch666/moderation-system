import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Layout, Spin, Alert } from 'antd';
import { useQuery } from 'react-query';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Dashboard from './pages/Dashboard';
import Queue from './pages/Queue';
import Settings from './pages/Settings';
import Users from './pages/Users';
import ApiKeys from './pages/ApiKeys';
import TelegramChats from './pages/TelegramChats';
import Statistics from './pages/Statistics';
import { useAuthStore } from './store/auth';
import api from './services/api';
import './App.css';

const { Content } = Layout;

function App() {
  const { isAuthenticated, login } = useAuthStore();
  
  // Проверка аутентификации при загрузке
  const { isLoading, error } = useQuery(
    'auth-check',
    () => api.get('/auth/me'),
    {
      enabled: !isAuthenticated,
      retry: false,
      onSuccess: (data) => {
        if (data.data.success) {
          login(data.data.data);
        }
      },
    }
  );

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <Spin size="large" tip="Загрузка..." />
      </div>
    );
  }

  if (error && !isAuthenticated) {
    return (
      <div style={{ padding: '20px' }}>
        <Alert
          message="Ошибка аутентификации"
          description="Пожалуйста, войдите в систему с помощью API ключа."
          type="error"
          showIcon
        />
        <div style={{ marginTop: '20px' }}>
          <p>Для входа используйте ваш API ключ:</p>
          <code style={{ background: '#f5f5f5', padding: '10px', display: 'block' }}>
            localStorage.setItem('api_key', 'ваш_api_ключ');
          </code>
          <p style={{ marginTop: '10px' }}>Затем обновите страницу.</p>
        </div>
      </div>
    );
  }

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sidebar />
      <Layout>
        <Header />
        <Content style={{ margin: '24px 16px', padding: 24, background: '#fff', minHeight: 280 }}>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/queue" element={<Queue />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/users" element={<Users />} />
            <Route path="/api-keys" element={<ApiKeys />} />
            <Route path="/telegram-chats" element={<TelegramChats />} />
            <Route path="/statistics" element={<Statistics />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Content>
      </Layout>
    </Layout>
  );
}

export default App;