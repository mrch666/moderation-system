# Технические требования

## REST API
### Эндпоинты:
1. `POST /api/submit` - отправка на модерацию
   - Параметры: image_url, product_id, download_url
   - Возвращает: moderation_id, status

2. `GET /api/status/:id` - проверка статуса
3. `GET /api/queue` - получение очереди (для админов)
4. `PUT /api/moderate/:id` - изменение статуса модерации

## Веб-интерфейс
### Страницы:
1. **Настройки**:
   - API ключи
   - Адреса серверов
   - Пользователи Telegram (ID чатов)
   - Настройки уведомлений

2. **Очередь модерации**:
   - Список изображений на модерации
   - Фильтры по статусу
   - Быстрое подтверждение/отклонение
   - Превью изображений

3. **Статистика**:
   - Количество модераций
   - Время обработки
   - Активность модераторов

## Интеграция с Telegram
### Функции:
1. Уведомления о новых модерациях
2. Команды для быстрой модерации
3. Статус системы
4. Административные команды

### Команды бота:
- `/start` - регистрация пользователя
- `/queue` - просмотр очереди
- `/moderate <id> <status>` - модерация
- `/stats` - статистика
- `/settings` - настройки (для админов)

## База данных
### Таблицы:
1. `moderations`
   - id, image_url, product_id, download_url
   - status (pending, approved, rejected)
   - created_at, moderated_at, moderator_id

2. `settings`
   - api_keys, server_urls, telegram_chat_ids
   - notification_settings

3. `users`
   - telegram_id, role (admin, moderator)
   - created_at, last_active

4. `moderation_logs`
   - moderation_id, action, user_id, timestamp

## Безопасность
- JWT аутентификация для API
- Валидация входных данных
- Логирование действий
- Ролевая модель доступа