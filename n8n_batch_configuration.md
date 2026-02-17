# 🚀 КОНФИГУРАЦИЯ n8n С BATCH PROCESSING

## ✅ ПРОБЛЕМА РЕШЕНА
Rate limiting отключен для API ключа `test_api_key_123456`. Теперь можно отправлять много запросов.

## 🔧 РЕКОМЕНДУЕМЫЕ НАСТРОЙКИ ДЛЯ n8n

### 1. Использовать Batch Processing (пакетную обработку)

#### В настройках HTTP Request node:
```
Batch Size: 10-50 items
Batch Interval: 100-500 ms
Pause Between Batches: 1000 ms (1 секунда)
```

### 2. Добавить Wait Node между запросами

```javascript
// Пример Wait node configuration
{
  "mode": "timer",
  "timer": {
    "waitTime": 100, // 100ms между запросами
    "randomize": true, // Случайная задержка ±50ms
    "randomDifference": 50
  }
}
```

### 3. Обработка ошибок в workflow

```javascript
// Добавить Error Trigger node
// Настроить retry логику:
{
  "maxTries": 3,
  "waitBetweenTries": 1000 // 1 секунда между попытками
}
```

## 📋 ПРИМЕР WORKFLOW ДЛЯ n8n

### Структура workflow:
```
[Start] → [Read Data] → [Split Items] → [Wait 100ms] → [HTTP Request] → [Error Handler] → [Save Results]
```

### Настройки HTTP Request node:
```json
{
  "method": "POST",
  "url": "http://192.168.1.189:3000/api/moderation/submit",
  "authentication": "genericCredentialType",
  "genericAuthType": "httpHeaderAuth",
  "sendHeaders": true,
  "headerParameters": {
    "parameters": [
      {
        "name": "X-API-Key",
        "value": "test_api_key_123456"
      },
      {
        "name": "Content-Type", 
        "value": "application/json"
      }
    ]
  },
  "sendBody": true,
  "bodyParameters": {
    "parameters": [
      {
        "name": "image_url",
        "value": "={{$json.image_url}}"
      },
      {
        "name": "product_id",
        "value": "={{$json.product_id}}"
      },
      {
        "name": "download_url",
        "value": "={{$json.download_url}}"
      },
      {
        "name": "metadata",
        "value": "={{$json.metadata}}"
      }
    ]
  },
  "options": {
    "timeout": 10000, // 10 секунд
    "maxRedirects": 5,
    "followRedirect": true,
    "responseFormat": "json",
    "batchSize": 20, // 20 items за раз
    "batchInterval": 200 // 200ms между батчами
  }
}
```

## 🧪 ТЕСТОВЫЙ СКРИПТ ДЛЯ МАССОВОЙ ОТПРАВКИ

### Bash скрипт для тестирования:
```bash
#!/bin/bash
API_URL="http://192.168.1.189:3000"
API_KEY="test_api_key_123456"

for i in {1..100}; do
  curl -X POST "$API_URL/api/moderation/submit" \
    -H "X-API-Key: $API_KEY" \
    -H "Content-Type: application/json" \
    -d "{
      \"image_url\": \"https://example.com/image_$i.jpg\",
      \"product_id\": \"BATCH-TEST-$i\",
      \"download_url\": \"https://example.com/image_$i.jpg\",
      \"metadata\": {\"name\": \"Тестовый товар $i\"}
    }" &
  
  # Задержка 50ms между запросами
  sleep 0.05
done

wait
echo "✅ 100 запросов отправлено"
```

## 📊 МОНИТОРИНГ ПРОИЗВОДИТЕЛЬНОСТИ

### Проверка логов при массовой отправке:
```bash
# Счетчик успешных запросов
grep "✅ Быстрый ответ отправлен" backend/backend.log | wc -l

# Счетчик ошибок
grep "❌" backend/backend.log | wc -l

# Время обработки
grep "общее время:" backend/backend.log | tail -5
```

### Оптимальные параметры:
- **10-50 запросов в секунду** - безопасная нагрузка
- **Задержка 50-200ms** между запросами
- **Batch size 20-100** для пакетной обработки
- **Таймаут 10 секунд** на запрос

## 🚀 БЫСТРЫЙ СТАРТ

### Минимальная конфигурация для n8n:
1. **Timeout**: 10000 (10 секунд)
2. **Batch Size**: 20
3. **Wait Between Items**: 100ms
4. **Max Retries**: 3
5. **Retry Delay**: 1000ms

### Пример данных для теста:
```json
[
  {
    "image_url": "https://basket-22.wbbasket.ru/vol3898/part389814/389814587/images/big/1.webp",
    "product_id": "000001002Tu9",
    "download_url": "https://basket-22.wbbasket.ru/vol3898/part389814/389814587/images/big/1.webp",
    "metadata": {
      "name": "Сверло по металлу 5,5 мм"
    }
  },
  // ... больше товаров
]
```

## 🆘 ТРОУБЛШУТИНГ

### Если все еще получаете 429 ошибки:
1. **Проверьте API ключ**: `test_api_key_123456`
2. **Увеличьте задержки**: 200ms вместо 100ms
3. **Уменьшите batch size**: 10 вместо 20
4. **Проверьте логи сервера**: `tail -f backend/backend.log`

### Контакты для поддержки:
- **Сервер**: http://192.168.1.189:3000
- **Веб-интерфейс**: http://192.168.1.189:8080
- **Статистика**: http://192.168.1.189:3000/api/moderation/stats

## 🎉 РЕЗУЛЬТАТ

После настройки n8n с batch processing:
1. ✅ **Massive data import** - тысячи товаров за раз
2. ✅ **No rate limiting** - для тестового API ключа
3. ✅ **Fast processing** - 0-10ms на запрос
4. ✅ **Reliable** - с обработкой ошибок и retry

**Система готова к массовой загрузке товаров через n8n!** 🚀
