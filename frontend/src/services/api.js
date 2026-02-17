import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
});

// Интерцептор для добавления API ключа
api.interceptors.request.use(
  (config) => {
    const apiKey = localStorage.getItem('api_key');
    if (apiKey) {
      config.headers['X-API-Key'] = apiKey;
    }
    
    // Для эндпоинтов аутентификации не добавляем заголовки
    if (config.url.includes('/auth/')) {
      delete config.headers['X-API-Key'];
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Интерцептор для обработки ошибок
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response) {
      // Обработка HTTP ошибок
      const { status, data } = error.response;
      
      switch (status) {
        case 401:
          console.error('Ошибка аутентификации:', data.error);
          localStorage.removeItem('api_key');
          window.location.reload();
          break;
        case 403:
          console.error('Доступ запрещен:', data.error);
          break;
        case 404:
          console.error('Ресурс не найден:', data.error);
          break;
        case 429:
          console.error('Слишком много запросов:', data.error);
          break;
        case 500:
          console.error('Внутренняя ошибка сервера:', data.error);
          break;
        default:
          console.error('Ошибка API:', data.error);
      }
    } else if (error.request) {
      console.error('Нет ответа от сервера');
    } else {
      console.error('Ошибка настройки запроса:', error.message);
    }
    
    return Promise.reject(error);
  }
);

// Вспомогательные функции API
export const moderationApi = {
  // Отправка на модерацию
  submit: (data) => api.post('/moderation/submit', data),
  
  // Получение очереди
  getQueue: (params) => api.get('/moderation/queue', { params }),
  
  // Изменение статуса
  moderate: (id, data) => api.put(`/moderation/${id}/moderate`, data),
  
  // Получение статуса
  getStatus: (uuid) => api.get(`/moderation/status/${uuid}`),
  
  // Поиск
  search: (params) => api.get('/moderation/search', { params }),
  
  // Статистика
  getStats: () => api.get('/moderation/stats'),
  
  // Логи
  getLogs: (id) => api.get(`/moderation/${id}/logs`),
};

export const settingsApi = {
  // Настройки
  getAll: () => api.get('/settings'),
  update: (key, data) => api.put(`/settings/${key}`, data),
  
  // API ключи
  getApiKeys: () => api.get('/settings/api-keys'),
  createApiKey: (data) => api.post('/settings/api-keys', data),
  deleteApiKey: (id) => api.delete(`/settings/api-keys/${id}`),
  
  // Telegram чаты
  getTelegramChats: () => api.get('/settings/telegram-chats'),
  addTelegramChat: (data) => api.post('/settings/telegram-chats', data),
  updateTelegramChat: (chatId, data) => api.put(`/settings/telegram-chats/${chatId}/settings`, data),
  
  // Пользователи
  getUsers: (params) => api.get('/settings/users', { params }),
  updateUserRole: (id, role) => api.put(`/settings/users/${id}/role`, { role }),
  getUserStats: () => api.get('/settings/users/stats'),
  
  // Уведомления
  getNotifications: () => api.get('/settings/notifications'),
  
  // Загрузка
  getUploadSettings: () => api.get('/settings/upload'),
};

export const authApi = {
  // Аутентификация по API ключу
  loginWithApiKey: (apiKey) => api.post('/auth/api-key', { api_key: apiKey }),
  
  // Проверка токена
  validateToken: (token) => api.post('/auth/validate', { token }),
  
  // Информация о текущем пользователе
  getMe: () => api.get('/auth/me'),
  
  // Обновление токена
  refreshToken: (token) => api.post('/auth/refresh', { token }),
  
  // Выход
  logout: (token) => api.post('/auth/logout', { token }),
};

export default api;