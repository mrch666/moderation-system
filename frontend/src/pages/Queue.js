import React, { useState } from 'react';
import {
  Card,
  Table,
  Button,
  Space,
  Tag,
  Image,
  Modal,
  Form,
  Input,
  Select,
  DatePicker,
  Row,
  Col,
  Statistic,
  message,
} from 'antd';
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  EyeOutlined,
  FilterOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import dayjs from 'dayjs';
import { moderationApi } from '../services/api';

const { RangePicker } = DatePicker;
const { Option } = Select;

const Queue = () => {
  const [filters, setFilters] = useState({
    status: 'pending',
    product_id: '',
    dateRange: null,
  });
  const [selectedModeration, setSelectedModeration] = useState(null);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const queryClient = useQueryClient();

  // Получение очереди
  const {
    data: queueData,
    isLoading,
    refetch,
  } = useQuery(
    ['queue', filters],
    () =>
      moderationApi.getQueue({
        limit: 50,
        ...filters,
        start_date: filters.dateRange?.[0]?.format('YYYY-MM-DD'),
        end_date: filters.dateRange?.[1]?.format('YYYY-MM-DD'),
      }),
    {
      keepPreviousData: true,
    }
  );

  // Мутация для модерации
  const moderateMutation = useMutation(
    ({ id, status, reason }) => moderationApi.moderate(id, { status, reason }),
    {
      onSuccess: () => {
        message.success('Статус модерации обновлен');
        queryClient.invalidateQueries('queue');
        queryClient.invalidateQueries('dashboard-stats');
        setSelectedModeration(null);
      },
      onError: (error) => {
        message.error('Ошибка при обновлении статуса: ' + error.message);
      },
    }
  );

  const queue = queueData?.data?.data || [];
  const total = queueData?.data?.pagination?.total || 0;

  const columns = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 80,
      sorter: (a, b) => a.id - b.id,
    },
    {
      title: 'Товар',
      dataIndex: 'product_id',
      key: 'product_id',
      sorter: (a, b) => a.product_id.localeCompare(b.product_id),
    },
    {
      title: 'Изображение',
      dataIndex: 'image_url',
      key: 'image_url',
      render: (url, record) => (
        <Space>
          <Button
            type="link"
            icon={<EyeOutlined />}
            onClick={() => {
              setSelectedModeration(record);
              setPreviewVisible(true);
            }}
          >
            Просмотр
          </Button>
          <a href={url} target="_blank" rel="noopener noreferrer">
            Ссылка
          </a>
        </Space>
      ),
    },
    {
      title: 'Загрузка',
      dataIndex: 'download_url',
      key: 'download_url',
      render: (url) => (
        <a href={url} target="_blank" rel="noopener noreferrer">
          Скачать
        </a>
      ),
    },
    {
      title: 'Статус',
      dataIndex: 'status',
      key: 'status',
      render: (status) => {
        const statusConfig = {
          pending: { color: 'orange', text: 'В ожидании' },
          approved: { color: 'green', text: 'Одобрено' },
          rejected: { color: 'red', text: 'Отклонено' },
          processing: { color: 'blue', text: 'В обработке' },
        };
        const config = statusConfig[status] || { color: 'default', text: status };
        return <Tag color={config.color}>{config.text}</Tag>;
      },
      filters: [
        { text: 'В ожидании', value: 'pending' },
        { text: 'Одобрено', value: 'approved' },
        { text: 'Отклонено', value: 'rejected' },
      ],
      onFilter: (value, record) => record.status === value,
    },
    {
      title: 'Отправлено',
      dataIndex: 'submitted_at',
      key: 'submitted_at',
      render: (date) => dayjs(date).format('DD.MM.YYYY HH:mm'),
      sorter: (a, b) => dayjs(a.submitted_at).unix() - dayjs(b.submitted_at).unix(),
    },
    {
      title: 'Модерировано',
      dataIndex: 'moderated_at',
      key: 'moderated_at',
      render: (date) => (date ? dayjs(date).format('DD.MM.YYYY HH:mm') : '-'),
    },
    {
      title: 'Модератор',
      dataIndex: 'moderator_username',
      key: 'moderator_username',
      render: (username) => username || '-',
    },
    {
      title: 'Действия',
      key: 'actions',
      render: (_, record) => (
        <Space>
          {record.status === 'pending' && (
            <>
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
            </>
          )}
          <Button
            size="small"
            onClick={() => {
              setSelectedModeration(record);
              setPreviewVisible(true);
            }}
          >
            Детали
          </Button>
        </Space>
      ),
    },
  ];

  const handleModerate = (id, status) => {
    Modal.confirm({
      title: `Вы уверены, что хотите ${status === 'approved' ? 'одобрить' : 'отклонить'} эту модерацию?`,
      content: (
        <Form layout="vertical">
          <Form.Item label="Причина (опционально)" name="reason">
            <Input.TextArea rows={3} placeholder="Укажите причину решения..." />
          </Form.Item>
        </Form>
      ),
      onOk: (_, form) => {
        const reason = form?.getFieldValue?.('reason');
        moderateMutation.mutate({ id, status, reason });
      },
      okText: 'Подтвердить',
      cancelText: 'Отмена',
    });
  };

  const handleFilterSubmit = (values) => {
    setFilters({
      ...filters,
      ...values,
    });
    setFilterModalVisible(false);
  };

  const resetFilters = () => {
    setFilters({
      status: 'pending',
      product_id: '',
      dateRange: null,
    });
  };

  return (
    <div>
      <Card
        title="Очередь модерации"
        extra={
          <Space>
            <Button
              icon={<FilterOutlined />}
              onClick={() => setFilterModalVisible(true)}
            >
              Фильтры
            </Button>
            <Button icon={<ReloadOutlined />} onClick={() => refetch()}>
              Обновить
            </Button>
          </Space>
        }
      >
        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          <Col span={24}>
            <Space>
              <Statistic
                title="Всего в очереди"
                value={total}
                valueStyle={{ color: '#1890ff' }}
              />
              <Statistic
                title="В ожидании"
                value={queue.filter((q) => q.status === 'pending').length}
                valueStyle={{ color: '#fa8c16' }}
              />
              <Statistic
                title="Обработано сегодня"
                value={
                  queue.filter(
                    (q) =>
                      q.moderated_at &&
                      dayjs(q.moderated_at).isSame(dayjs(), 'day')
                  ).length
                }
                valueStyle={{ color: '#52c41a' }}
              />
            </Space>
          </Col>
        </Row>

        <Table
          columns={columns}
          dataSource={queue}
          loading={isLoading}
          rowKey="id"
          pagination={{
            pageSize: 20,
            showSizeChanger: true,
            showTotal: (total) => `Всего ${total} записей`,
          }}
          scroll={{ x: 1200 }}
        />
      </Card>

      {/* Модальное окно предпросмотра */}
      <Modal
        title={`Модерация #${selectedModeration?.id}`}
        open={previewVisible}
        onCancel={() => setPreviewVisible(false)}
        width={800}
        footer={[
          <Button key="close" onClick={() => setPreviewVisible(false)}>
            Закрыть
          </Button>,
          selectedModeration?.status === 'pending' && (
            <Space key="actions">
              <Button
                type="primary"
                icon={<CheckCircleOutlined />}
                onClick={() => handleModerate(selectedModeration.id, 'approved')}
              >
                Одобрить
              </Button>
              <Button
                danger
                icon={<CloseCircleOutlined />}
                onClick={() => handleModerate(selectedModeration.id, 'rejected')}
              >
                Отклонить
              </Button>
            </Space>
          ),
        ]}
      >
        {selectedModeration && (
          <Row gutter={[16, 16]}>
            <Col span={12}>
              <Card title="Информация" size="small">
                <p>
                  <strong>ID товара:</strong> {selectedModeration.product_id}
                </p>
                <p>
                  <strong>Статус:</strong>{' '}
                  <Tag
                    color={
                      selectedModeration.status === 'pending'
                        ? 'orange'
                        : selectedModeration.status === 'approved'
                        ? 'green'
                        : 'red'
                    }
                  >
                    {selectedModeration.status}
                  </Tag>
                </p>
                <p>
                  <strong>Отправлено:</strong>{' '}
                  {dayjs(selectedModeration.submitted_at).format(
                    'DD.MM.YYYY HH:mm:ss'
                  )}
                </p>
                {selectedModeration.moderated_at && (
                  <p>
                    <strong>Модерировано:</strong>{' '}
                    {dayjs(selectedModeration.moderated_at).format(
                      'DD.MM.YYYY HH:mm:ss'
                    )}
                  </p>
                )}
                {selectedModeration.moderator_username && (
                  <p>
                    <strong>Модератор:</strong>{' '}
                    {selectedModeration.moderator_username}
                  </p>
                )}
              </Card>
            </Col>
            <Col span={12}>
              <Card title="Изображение" size="small">
                <Image
                  src={selectedModeration.image_url}
                  alt="Изображение товара"
                  style={{ maxWidth: '100%', maxHeight: '300px' }}
                  preview={{
                    mask: <EyeOutlined />,
                  }}
                />
                <div style={{ marginTop: 16 }}>
                  <Button
                    type="link"
                    href={selectedModeration.download_url}
                    target="_blank"
                  >
                    Скачать оригинал
                  </Button>
                </div>
              </Card>
            </Col>
            {selectedModeration.metadata && (
              <Col span={24}>
                <Card title="Метаданные" size="small">
                  <pre style={{ background: '#f5f5f5', padding: 16 }}>
                    {JSON.stringify(selectedModeration.metadata, null, 2)}
                  </pre>
                </Card>
              </Col>
            )}
          </Row>
        )}
      </Modal>

      {/* Модальное окно фильтров */}
      <Modal
        title="Фильтры"
        open={filterModalVisible}
        onCancel={() => setFilterModalVisible(false)}
        onOk={() => document.getElementById('filterForm').submit()}
      >
        <Form
          id="filterForm"
          layout="vertical"
          initialValues={filters}
          onFinish={handleFilterSubmit}
        >
          <Form.Item label="Статус" name="status">
            <Select>
              <Option value="pending">В ожидании</Option>
              <Option value="approved">Одобрено</Option>
              <Option value="rejected">Отклонено</Option>
              <Option value="">Все статусы</Option>
            </Select>
          </Form.Item>
          <Form.Item label="ID товара" name="product_id">
            <Input placeholder="Введите ID товара..." />
          </Form.Item>
          <Form.Item label="Дата отправки" name="dateRange">
            <RangePicker style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default Queue;