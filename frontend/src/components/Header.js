import React from 'react';
import { Layout, Dropdown, Avatar, Button, Space, Badge } from 'antd';
import {
  UserOutlined,
  BellOutlined,
  LogoutOutlined,
  SettingOutlined,
} from '@ant-design/icons';
import { useAuthStore } from '../store/auth';
import { useQuery } from 'react-query';
import { moderationApi } from '../services/api';

const { Header } = Layout;

const AppHeader = () => {
  const { user, logout } = useAuthStore();

  // Получение количества модераций в очереди
  const { data: queueData } = useQuery(
    'queue-count',
    () => moderationApi.getQueue({ limit: 1 }),
    {
      refetchInterval: 30000, // Обновление каждые 30 секунд
    }
  );

  const queueCount = queueData?.data?.data?.length || 0;

  const userMenuItems = [
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: 'Профиль',
      disabled: true,
    },
    {
      key: 'settings',
      icon: <SettingOutlined />,
      label: 'Настройки',
      onClick: () => window.location.href = '/settings',
    },
    {
      type: 'divider',
    },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: 'Выйти',
      onClick: logout,
    },
  ];

  const notificationsMenuItems = [
    {
      key: 'queue',
      label: `Модераций в очереди: ${queueCount}`,
      onClick: () => window.location.href = '/queue',
    },
    {
      type: 'divider',
    },
    {
      key: 'mark-all',
      label: 'Отметить все как прочитанные',
      disabled: true,
    },
  ];

  return (
    <Header
      style={{
        padding: '0 24px',
        background: '#fff',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        boxShadow: '0 1px 4px rgba(0,21,41,.08)',
        zIndex: 1,
        marginLeft: 250, // Отступ для сайдбара
      }}
    >
      <div style={{ flex: 1 }}>
        {/* Здесь может быть breadcrumb или заголовок страницы */}
      </div>

      <Space size="large">
        {/* Уведомления */}
        <Dropdown
          menu={{ items: notificationsMenuItems }}
          placement="bottomRight"
          trigger={['click']}
        >
          <Badge count={queueCount} overflowCount={99}>
            <Button
              type="text"
              icon={<BellOutlined />}
              style={{ fontSize: '16px' }}
            />
          </Badge>
        </Dropdown>

        {/* Пользователь */}
        <Dropdown
          menu={{ items: userMenuItems }}
          placement="bottomRight"
          trigger={['click']}
        >
          <Space>
            <Avatar
              icon={<UserOutlined />}
              style={{ backgroundColor: user?.role === 'admin' ? '#f5222d' : '#1890ff' }}
            />
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontWeight: 'bold' }}>
                {user?.username || 'Пользователь'}
              </span>
              <span style={{ fontSize: '12px', color: '#666' }}>
                {user?.role === 'admin' ? 'Администратор' : 'Модератор'}
              </span>
            </div>
          </Space>
        </Dropdown>
      </Space>
    </Header>
  );
};

export default AppHeader;