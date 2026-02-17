import React from 'react';
import { Row, Col, Card, Statistic, Table, Button, Space, Alert } from 'antd';
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  ClockCircleOutlined,
  UploadOutlined,
  BarChartOutlined,
} from '@ant-design/icons';
import { useQuery } from 'react-query';
import { useNavigate } from 'react-router-dom';
import { moderationApi, settingsApi } from '../services/api';
import dayjs from 'dayjs';

const Dashboard = () => {
  const navigate = useNavigate();

  // Получение статистики
  const { data: statsData, isLoading: statsLoading } = useQuery(
    'dashboard-stats',
    () => moderationApi.getStats()
  );

  // Получение очереди
  const { data: queueData, isLoading: queueLoading } = useQuery(
    'dashboard-queue',
    () => moderationApi.getQueue({ limit: 5 })
  );

  // Получение статистики пользователей
  const { data: userStatsData, isLoading: userStatsLoading } = useQuery(
    'user-stats',
    () => settingsApi.getUserStats(),
    {
      enabled: localStorage.getItem('user_role') === 'admin',
    }
  );

  const stats = statsData?.data?.data || [];
  const queue = queueData?.data?.data || [];
  const userStats = userStatsData?.data?.data || [];

  // Подсчет статистики
  const approvedCount = stats.find(s => s.status === 'approved')?.count || 0;
  const rejectedCount = stats.find(s => s.status === 'rejected')?.count || 0;
  const pendingCount = queue.length;
  const totalCount = approvedCount + rejectedCount + pendingCount;

  // Колонки для таблицы очереди
  const queueColumns = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 80,
    },
    {
      title: 'Товар',
      dataIndex: 'product_id',
      key: 'product_id',
    },
    {
      title: 'Изображение',
      dataIndex: 'image_url',
      key: 'image_url',
      render: (url) => (
        <a href={url} target="_blank" rel="noopener noreferrer">
          Просмотр
        </a>
      ),
    },
    {
      title: 'Отправлено',
      dataIndex: 'submitted_at',
      key: 'submitted_at',
      render: (date) => dayjs(date).format('DD.MM.YYYY HH:mm'),
    },
    {
      title: 'Действия',
      key: 'actions',
      render: (_, record) => (
        <Space>
          <Button
            type="primary"
            size="small"
            icon={<CheckCircleOutlined />}
            onClick={() => handleModerate(record.id, 'approved')}
          >
            Одобрить
          </Button>
          <Button
            danger
            size="small"
            icon={<CloseCircleOutlined />}
            onClick={() => handleModerate(record.id, 'rejected')}
          >
            Отклонить
          </Button>
        </Space>
      ),
    },
  ];

  const handleModerate = async (id, status) => {
    try {
      await moderationApi.moderate(id, { status });
      // Обновляем данные
      queryClient.invalidateQueries('dashboard-stats');
      queryClient.invalidateQueries('dashboard-queue');
    } catch (error) {
      console.error('Moderation error:', error);
    }
  };

  const quickActions = [
    {
      title: 'Перейти в очередь',
      description: 'Просмотр и модерация изображений',
      icon: <UnorderedListOutlined />,
      action: () => navigate('/queue'),
      color: '#1890ff',
    },
    {
      title: 'Добавить API ключ',
      description: 'Создать новый ключ для интеграций',
      icon: <KeyOutlined />,
      action: () => navigate('/api-keys'),
      color: '#52c41a',
    },
    {
      title: 'Настройки Telegram',
      description: 'Управление уведомлениями в чатах',
      icon: <MessageOutlined />,
      action: () => navigate('/telegram-chats'),
      color: '#722ed1',
    },
    {
      title: 'Подробная статистика',
      description: 'Аналитика и отчеты',
      icon: <BarChartOutlined />,
      action: () => navigate('/statistics'),
      color: '#fa8c16',
    },
  ];

  return (
    <div>
      <Alert
        message="Добро пожаловать в систему модерации"
        description="Здесь вы можете управлять очередью модерации, настраивать систему и просматривать статистику."
        type="info"
        showIcon
        style={{ marginBottom: 24 }}
      />

      {/* Статистика */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Всего модераций"
              value={totalCount}
              valueStyle={{ color: '#1890ff' }}
              prefix={<BarChartOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Одобрено"
              value={approvedCount}
              valueStyle={{ color: '#52c41a' }}
              prefix={<CheckCircleOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Отклонено"
              value={rejectedCount}
              valueStyle={{ color: '#f5222d' }}
              prefix={<CloseCircleOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="В очереди"
              value={pendingCount}
              valueStyle={{ color: '#fa8c16' }}
              prefix={<ClockCircleOutlined />}
            />
          </Card>
        </Col>
      </Row>

      {/* Быстрые действия */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        {quickActions.map((action, index) => (
          <Col xs={24} sm={12} md={6} key={index}>
            <Card
              hoverable
              onClick={action.action}
              style={{ textAlign: 'center', cursor: 'pointer' }}
            >
              <div style={{ fontSize: '32px', color: action.color, marginBottom: 16 }}>
                {action.icon}
              </div>
              <h3>{action.title}</h3>
              <p style={{ color: '#666', fontSize: '12px' }}>{action.description}</p>
            </Card>
          </Col>
        ))}
      </Row>

      {/* Очередь модерации */}
      <Card
        title="Последние модерации в очереди"
        extra={
          <Button type="primary" onClick={() => navigate('/queue')}>
            Вся очередь
          </Button>
        }
        style={{ marginBottom: 24 }}
      >
        <Table
          columns={queueColumns}
          dataSource={queue}
          loading={queueLoading}
          pagination={false}
          size="small"
          rowKey="id"
        />
      </Card>

      {/* Статистика пользователей (только для админов) */}
      {localStorage.getItem('user_role') === 'admin' && (
        <Card title="Статистика пользователей">
          <Row gutter={[16, 16]}>
            {userStats.map((stat, index) => (
              <Col xs={24} sm={8} key={index}>
                <Card size="small">
                  <Statistic
                    title={stat.role === 'admin' ? 'Администраторы' : 
                           stat.role === 'moderator' ? 'Модераторы' : 'Пользователи'}
                    value={stat.count}
                    suffix={`/ ${stat.active_last_week} активны`}
                  />
                </Card>
              </Col>
            ))}
          </Row>
        </Card>
      )}
    </div>
  );
};

export default Dashboard;