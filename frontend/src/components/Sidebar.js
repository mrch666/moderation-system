import React from 'react';
import { Layout, Menu } from 'antd';
import {
  DashboardOutlined,
  UnorderedListOutlined,
  SettingOutlined,
  UserOutlined,
  KeyOutlined,
  MessageOutlined,
  BarChartOutlined,
} from '@ant-design/icons';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/auth';

const { Sider } = Layout;

const Sidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuthStore();

  const menuItems = [
    {
      key: '/',
      icon: <DashboardOutlined />,
      label: 'Дашборд',
    },
    {
      key: '/queue',
      icon: <UnorderedListOutlined />,
      label: 'Очередь модерации',
    },
    {
      key: '/statistics',
      icon: <BarChartOutlined />,
      label: 'Статистика',
    },
    {
      type: 'divider',
    },
    {
      key: 'settings',
      icon: <SettingOutlined />,
      label: 'Настройки',
      children: [
        {
          key: '/settings',
          label: 'Основные настройки',
        },
        {
          key: '/api-keys',
          label: 'API ключи',
        },
        {
          key: '/telegram-chats',
          label: 'Telegram чаты',
        },
      ],
    },
  ];

  // Добавляем пункт пользователей только для админов
  if (user?.role === 'admin') {
    menuItems.splice(3, 0, {
      key: '/users',
      icon: <UserOutlined />,
      label: 'Пользователи',
    });
  }

  const handleMenuClick = ({ key }) => {
    navigate(key);
  };

  return (
    <Sider
      breakpoint="lg"
      collapsedWidth="0"
      width={250}
      style={{
        overflow: 'auto',
        height: '100vh',
        position: 'fixed',
        left: 0,
        top: 0,
        bottom: 0,
      }}
    >
      <div style={{ padding: '16px', textAlign: 'center' }}>
        <h2 style={{ color: 'white', margin: 0 }}>Модерация</h2>
        <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: '12px', margin: 0 }}>
          Система модерации изображений
        </p>
      </div>
      <Menu
        theme="dark"
        mode="inline"
        selectedKeys={[location.pathname]}
        defaultOpenKeys={['settings']}
        items={menuItems}
        onClick={handleMenuClick}
      />
    </Sider>
  );
};

export default Sidebar;