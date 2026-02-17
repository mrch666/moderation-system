# Примеры использования API системы модерации

## Базовый URL
```
http://localhost:3000/api
```

## Аутентификация

### 1. Использование API ключа
Добавьте заголовок `X-API-Key` к каждому запросу:
```bash
curl -H "X-API-Key: ваш_api_ключ" http://localhost:3000/api/moderation/queue
```

### 2. Получение JWT токена
```bash
curl -X POST http://localhost:3000/api/auth/api-key \
  -H "Content-Type: application/json" \
  -d '{"api_key": "ваш_api_ключ"}'
```

Ответ:
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expires_in": "24h",
    "permissions": ["read", "submit", "moderate"]
  }
}
```

### 3. Использование JWT токена
```bash
curl -H "Authorization: Bearer ваш_jwt_токен" \
  http://localhost:3000/api/moderation/queue
```

## Модерация

### 1. Отправка изображения на модерацию
```bash
curl -X POST http://localhost:3000/api/moderation/submit \
  -H "X-API-Key: ваш_api_ключ" \
  -H "Content-Type: application/json" \
  -d '{
    "image_url": "https://example.com/products/123/image.jpg",
    "product_id": "PROD-12345",
    "download_url": "https://cdn.example.com/products/123/original.jpg",
    "metadata": {
      "category": "electronics",
      "price": 29999,
      "vendor": "Apple"
    }
  }'
```

Ответ:
```json
{
  "success": true,
  "data": {
    "moderation_id": "550e8400-e29b-41d4-a716-446655440000",
    "status": "pending",
    "submitted_at": "2024-01-15T10:30:00Z"
  }
}
```

### 2. Проверка статуса модерации
```bash
curl http://localhost:3000/api/moderation/status/550e8400-e29b-41d4-a716-446655440000
```

Ответ:
```json
{
  "success": true,
  "data": {
    "status": "approved",
    "submitted_at": "2024-01-15T10:30:00Z",
    "moderated_at": "2024-01-15T10:35:00Z",
    "product_id": "PROD-12345"
  }
}
```

### 3. Получение очереди модерации
```bash
curl -H "X-API-Key: ваш_api_ключ" \
  "http://localhost:3000/api/moderation/queue?limit=10&offset=0"
```

Ответ:
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "moderation_uuid": "550e8400-e29b-41d4-a716-446655440000",
      "image_url": "https://example.com/image1.jpg",
      "product_id": "PROD-123",
      "download_url": "https://cdn.example.com/image1.jpg",
      "status": "pending",
      "submitted_at": "2024-01-15T10:30:00Z",
      "moderator_username": null
    }
  ],
  "pagination": {
    "limit": 10,
    "offset": 0,
    "total": 1
  }
}
```

### 4. Изменение статуса модерации
```bash
curl -X PUT http://localhost:3000/api/moderation/1/moderate \
  -H "X-API-Key: ваш_api_ключ" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "approved",
    "reason": "Изображение соответствует требованиям"
  }'
```

Ответ:
```json
{
  "success": true,
  "data": {
    "id": 1,
    "status": "approved",
    "moderated_at": "2024-01-15T10:35:00Z",
    "moderator_id": 1
  }
}
```

### 5. Поиск модераций
```bash
curl -H "X-API-Key: ваш_api_ключ" \
  "http://localhost:3000/api/moderation/search?status=approved&product_id=PROD-123&limit=50"
```

### 6. Получение статистики
```bash
curl -H "X-API-Key: ваш_api_ключ" \
  http://localhost:3000/api/moderation/stats
```

Ответ:
```json
{
  "success": true,
  "data": [
    {
      "status": "approved",
      "count": 150,
      "avg_processing_time": 300.5
    },
    {
      "status": "rejected",
      "count": 25,
      "avg_processing_time": 280.2
    }
  ]
}
```

## Настройки

### 1. Получение всех настроек (только для админов)
```bash
curl -H "X-API-Key: ваш_api_ключ" \
  http://localhost:3000/api/settings
```

### 2. Обновление настройки
```bash
curl -X PUT http://localhost:3000/api/settings/max_file_size \
  -H "X-API-Key: ваш_api_ключ" \
  -H "Content-Type: application/json" \
  -d '{
    "value": "20971520",
    "description": "Максимальный размер файла увеличен до 20MB"
  }'
```

### 3. Управление API ключами

#### Создание нового ключа:
```bash
curl -X POST http://localhost:3000/api/settings/api-keys \
  -H "X-API-Key: ваш_api_ключ" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Ключ для интеграции с магазином",
    "permissions": ["read", "submit"],
    "expires_at": "2024-12-31T23:59:59Z"
  }'
```

#### Получение списка ключей:
```bash
curl -H "X-API-Key: ваш_api_ключ" \
  http://localhost:3000/api/settings/api-keys
```

#### Деактивация ключа:
```bash
curl -X DELETE http://localhost:3000/api/settings/api-keys/1 \
  -H "X-API-Key: ваш_api_ключ"
```

### 4. Управление Telegram чатами

#### Добавление чата:
```bash
curl -X POST http://localhost:3000/api/settings/telegram-chats \
  -H "X-API-Key: ваш_api_ключ" \
  -H "Content-Type: application/json" \
  -d '{
    "chat_id": -1001234567890,
    "chat_type": "group",
    "title": "Группа модераторов",
    "username": "moderators_group",
    "settings": {
      "notifications": true,
      "language": "ru"
    }
  }'
```

#### Обновление настроек чата:
```bash
curl -X PUT http://localhost:3000/api/settings/telegram-chats/-1001234567890/settings \
  -H "X-API-Key: ваш_api_ключ" \
  -H "Content-Type: application/json" \
  -d '{
    "notifications": false
  }'
```

### 5. Управление пользователями

#### Получение списка пользователей:
```bash
curl -H "X-API-Key: ваш_api_ключ" \
  "http://localhost:3000/api/settings/users?limit=20&offset=0"
```

#### Изменение роли пользователя:
```bash
curl -X PUT http://localhost:3000/api/settings/users/1/role \
  -H "X-API-Key: ваш_api_ключ" \
  -H "Content-Type: application/json" \
  -d '{"role": "moderator"}'
```

## Интеграция с Telegram ботом

### Команды бота:
- `/start` - регистрация и приветствие
- `/queue` - просмотр очереди модерации
- `/stats` - статистика системы
- `/settings` - настройки (только для админов)
- `/users` - управление пользователями (только для админов)

### Пример взаимодействия:
```
Пользователь: /queue
Бот: 📋 Очередь модерации (3):

1. ID: 123
   Товар: PROD-456
   Статус: pending
   Отправлено: 15.01.2024 10:30

[✅ Одобрить] [❌ Отклонить] [👁️ Просмотр]
```

## Примеры кода

### Python
```python
import requests
import json

class ModerationClient:
    def __init__(self, api_key, base_url="http://localhost:3000/api"):
        self.api_key = api_key
        self.base_url = base_url
        self.headers = {"X-API-Key": api_key}
    
    def submit_moderation(self, image_url, product_id, download_url, metadata=None):
        url = f"{self.base_url}/moderation/submit"
        data = {
            "image_url": image_url,
            "product_id": product_id,
            "download_url": download_url
        }
        if metadata:
            data["metadata"] = metadata
        
        response = requests.post(url, json=data, headers=self.headers)
        return response.json()
    
    def get_queue(self, limit=50, offset=0):
        url = f"{self.base_url}/moderation/queue"
        params = {"limit": limit, "offset": offset}
        response = requests.get(url, params=params, headers=self.headers)
        return response.json()
    
    def moderate(self, moderation_id, status, reason=None):
        url = f"{self.base_url}/moderation/{moderation_id}/moderate"
        data = {"status": status}
        if reason:
            data["reason"] = reason
        
        response = requests.put(url, json=data, headers=self.headers)
        return response.json()

# Использование
client = ModerationClient(api_key="ваш_api_ключ")

# Отправка на модерацию
result = client.submit_moderation(
    image_url="https://example.com/image.jpg",
    product_id="PROD-123",
    download_url="https://cdn.example.com/image.jpg"
)
print(f"Moderation ID: {result['data']['moderation_id']}")

# Получение очереди
queue = client.get_queue(limit=10)
for item in queue['data']:
    print(f"ID: {item['id']}, Product: {item['product_id']}")
```

### JavaScript/Node.js
```javascript
const axios = require('axios');

class ModerationClient {
  constructor(apiKey, baseUrl = 'http://localhost:3000/api') {
    this.client = axios.create({
      baseURL: baseUrl,
      headers: {
        'X-API-Key': apiKey
      }
    });
  }

  async submitModeration(imageUrl, productId, downloadUrl, metadata = {}) {
    const response = await this.client.post('/moderation/submit', {
      image_url: imageUrl,
      product_id: productId,
      download_url: downloadUrl,
      metadata
    });
    return response.data;
  }

  async getQueue(limit = 50, offset = 0) {
    const response = await this.client.get('/moderation/queue', {
      params: { limit, offset }
    });
    return response.data;
  }

  async moderate(moderationId, status, reason = null) {
    const data = { status };
    if (reason) data.reason = reason;
    
    const response = await this.client.put(`/moderation/${moderationId}/moderate`, data);
    return response.data;
  }

  async getStats() {
    const response = await this.client.get('/moderation/stats');
    return response.data;
  }
}

// Использование
async function main() {
  const client = new ModerationClient('ваш_api_ключ');
  
  try {
    // Отправка на модерацию
    const submission = await client.submitModeration(
      'https://example.com/image.jpg',
      'PROD-123',
      'https://cdn.example.com/image.jpg'
    );
    console.log('Submitted:', submission.data.moderation_id);
    
    // Получение очереди
    const queue = await client.getQueue(10);
    console.log('Queue:', queue.data.length, 'items');
    
    // Получение статистики
    const stats = await client.getStats();
    console.log('Stats:', stats.data);
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
  }
}

main();
```

### PHP
```php
<?php

class ModerationClient {
    private $apiKey;
    private $baseUrl;
    
    public function __construct($apiKey, $baseUrl = 'http://localhost:3000/api') {
        $this->apiKey = $apiKey;
        $this->baseUrl = $baseUrl;
    }
    
    public function submitModeration($imageUrl, $productId, $downloadUrl, $metadata = []) {
        $url = $this->baseUrl . '/moderation/submit';
        $data = [
            'image_url' => $imageUrl,
            'product_id' => $productId,
            'download_url' => $downloadUrl
        ];
        
        if (!empty($metadata)) {
            $data['metadata'] = $metadata;
        }
        
        return $this->makeRequest('POST', $url, $data);
    }
    
    public function getQueue($limit = 50, $offset = 0) {
        $url = $this->baseUrl . '/moderation/queue';
        $params = http_build_query(['limit' => $limit, 'offset' => $offset]);
        
        return $this->makeRequest('GET', $url . '?' . $params);
    }
    
    private function makeRequest($method, $url, $data = null) {
        $ch = curl_init();
        
        $headers = [
            'X-API-Key: ' . $this->apiKey,
            'Content-Type: application/json'
        ];
        
        curl_setopt($ch, CURLOPT_URL, $url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
        
        if ($method === 'POST') {
            curl_setopt($ch, CURLOPT_POST, true);
            curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
        } elseif ($method === 'PUT') {
            curl_setopt($ch, CURLOPT_CUSTOMREQUEST, 'PUT');
            curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
        }
        
        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        
        curl_close($ch);
        
        return [
            'status' => $httpCode,
            'data' => json_decode($response, true)
        ];
    }
}

// Использование
$client = new ModerationClient('ваш_api_ключ');

// Отправка на модерацию
$result = $client->submitModeration(
    'https://example.com/image.jpg',
    'PROD-123',
    'https://cdn.example.com/image.jpg'
);

if ($result['status'] === 201) {
    echo 'Moderation ID: ' . $result['data']['data']['moderation_id'] . "\n";
}

// Получение очереди
$queue = $client->getQueue(10);
if ($queue['status'] === 200) {
    echo 'Queue items: ' . count($queue['data']['data']) . "\n";
}
?>
```

## Обработка ошибок

### Пример ошибки аутентификации:
```json
{
  "error": "Invalid API key"
}
```

### Пример ошибки валидации:
```json
{
  "error": "\"image_url\" must be a valid uri"
}
```

### Пример ошибки прав доступа:
```json
{
  "error": "Permission denied. Required: moderate"
}
```

## Webhook уведомления (планируется)

Система поддерживает отправку webhook уведомлений при изменении статуса модерации.

### Конфигурация webhook:
```bash
curl -X PUT http://localhost:3000/api/settings/webhook_url \
  -H "X-API-Key: ваш_api_ключ" \
  -H "Content-Type: application/json" \
  -d '{
    "value": "https://your-server.com/webhooks/moderation",
    "description": "URL для webhook уведомлений"
  }'
```

### Пример webhook payload:
```json
{
  "event": "moderation_status_changed",
  "data": {
    "moderation_id": "550e8400-e29b-41d4-a716-446655440000",
    "product_id": "PROD-12345",
    "old_status": "pending",
    "new_status": "approved",
    "changed_at": "2024-01-15T10:35:00Z",
    "moderator_id": 1