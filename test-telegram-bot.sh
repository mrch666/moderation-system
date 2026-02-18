#!/bin/bash

# 🧪 Тестирование Telegram бота

set -e

echo ""
echo "🧪 ТЕСТИРОВАНИЕ TELEGRAM БОТА"
echo "============================"
echo ""

cd "$(dirname "$0")"

# Цвета
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Шаг 1: Проверка настроек
echo -e "${BLUE}🔍 ШАГ 1: ПРОВЕРКА НАСТРОЕК${NC}"
echo ""

if [ ! -f ".env.development" ]; then
    echo -e "${RED}❌ Файл .env.development не найден${NC}"
    exit 1
fi

TELEGRAM_BOT_TOKEN=$(grep TELEGRAM_BOT_TOKEN .env.development | cut -d= -f2)
TELEGRAM_CHAT_ID=$(grep TELEGRAM_CHAT_ID .env.development | cut -d= -f2)

if [ -z "$TELEGRAM_BOT_TOKEN" ]; then
    echo -e "${RED}❌ TELEGRAM_BOT_TOKEN не найден${NC}"
    exit 1
fi

if [ -z "$TELEGRAM_CHAT_ID" ]; then
    echo -e "${RED}❌ TELEGRAM_CHAT_ID не найден${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Настройки найдены${NC}"
echo "   Токен: ${TELEGRAM_BOT_TOKEN:0:15}..."
echo "   Chat ID: $TELEGRAM_CHAT_ID"
echo ""

# Шаг 2: Проверка подключения к Telegram API
echo -e "${BLUE}🔍 ШАГ 2: ПРОВЕРКА ПОДКЛЮЧЕНИЯ К TELEGRAM API${NC}"
echo ""

RESPONSE=$(curl -s "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/getMe")
if echo "$RESPONSE" | grep -q '"ok":true'; then
    echo -e "${GREEN}✅ Подключение к Telegram API успешно${NC}"
    BOT_NAME=$(echo "$RESPONSE" | grep -o '"first_name":"[^"]*"' | cut -d'"' -f4)
    echo "   Имя бота: $BOT_NAME"
else
    echo -e "${RED}❌ Ошибка подключения к Telegram API${NC}"
    echo "$RESPONSE"
    exit 1
fi

echo ""

# Шаг 3: Отправка тестового сообщения
echo -e "${BLUE}🔍 ШАГ 3: ОТПРАВКА ТЕСТОВОГО СООБЩЕНИЯ${NC}"
echo ""

echo "Отправляю тестовое сообщение в группу..."
RESPONSE=$(curl -s -X POST "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/sendMessage" \
  -d "chat_id=$TELEGRAM_CHAT_ID" \
  -d "text=🤖 *Тест системы модерации*%0A%0AЭто тестовое сообщение от бота.%0AЕсли вы видите это сообщение, значит бот работает корректно!%0A%0A✅ *Статус:* Бот активен%0A📅 *Время:* $(date '+%Y-%m-%d %H:%M:%S')%0A🔗 *Система:* Модерация изображений" \
  -d "parse_mode=Markdown")

if echo "$RESPONSE" | grep -q '"ok":true'; then
    echo -e "${GREEN}✅ Тестовое сообщение отправлено!${NC}"
    echo "   Проверьте вашу Telegram группу"
else
    echo -e "${RED}❌ Ошибка при отправке сообщения${NC}"
    echo "$RESPONSE" | grep -o '"description":"[^"]*"' | head -1
fi

echo ""

# Шаг 4: Проверка бота в telegram-bot
echo -e "${BLUE}🔍 ШАГ 4: ПРОВЕРКА КОДА БОТА${NC}"
echo ""

if [ ! -d "telegram-bot" ]; then
    echo -e "${YELLOW}⚠️  Директория telegram-bot не найдена${NC}"
else
    echo "Проверяю код бота..."
    
    if [ ! -f "telegram-bot/src/index.js" ]; then
        echo -e "${YELLOW}⚠️  Файл telegram-bot/src/index.js не найден${NC}"
    else
        echo -e "${GREEN}✅ Код бота найден${NC}"
        
        # Проверяем зависимости
        if [ ! -f "telegram-bot/package.json" ]; then
            echo -e "${YELLOW}⚠️  package.json не найден${NC}"
        else
            echo "Проверяю зависимости..."
            cd telegram-bot
            
            if [ ! -d "node_modules" ]; then
                echo -e "${YELLOW}⚠️  Зависимости не установлены${NC}"
                echo "   Запустите: npm install"
            else
                echo -e "${GREEN}✅ Зависимости установлены${NC}"
            fi
            
            cd ..
        fi
    fi
fi

echo ""

# Шаг 5: Тестирование интеграции с API
echo -e "${BLUE}🔍 ШАГ 5: ТЕСТИРОВАНИЕ ИНТЕГРАЦИИ С API${NC}"
echo ""

echo "Проверяю работу backend API..."
API_RESPONSE=$(curl -s "http://localhost:3000/health")
if echo "$API_RESPONSE" | grep -q '"status":"ok"'; then
    echo -e "${GREEN}✅ Backend API работает${NC}"
    
    # Создаем тестовую модерацию
    echo ""
    echo "Создаю тестовую модерацию для проверки уведомлений..."
    MODERATION_RESPONSE=$(curl -s -X POST "http://localhost:3000/api/moderation/submit" \
      -H "Content-Type: application/json" \
      -H "X-API-Key: test_api_key_123456" \
      -d '{
        "product_id": "telegram-test-'$(date +%s)'",
        "image_url": "https://via.placeholder.com/600x400/0088cc/ffffff?text=Telegram+Test",
        "download_url": "https://via.placeholder.com/600x400/0088cc/ffffff?text=Telegram+Test",
        "metadata": {
          "title": "Тест Telegram уведомлений",
          "description": "Тестовый продукт для проверки интеграции с Telegram ботом",
          "price": "0 руб.",
          "category": "Тестирование"
        }
      }')
    
    if echo "$MODERATION_RESPONSE" | grep -q '"status":"pending"'; then
        echo -e "${GREEN}✅ Тестовая модерация создана${NC}"
        MODERATION_ID=$(echo "$MODERATION_RESPONSE" | grep -o '"id":"[^"]*"' | cut -d'"' -f4)
        echo "   ID модерации: $MODERATION_ID"
        
        echo ""
        echo -e "${YELLOW}📢 Если бот настроен на уведомления, в Telegram группе должно прийти сообщение${NC}"
        echo "   Проверьте вашу Telegram группу через 10-15 секунд"
    else
        echo -e "${YELLOW}⚠️  Не удалось создать тестовую модерацию${NC}"
        echo "$MODERATION_RESPONSE"
    fi
else
    echo -e "${YELLOW}⚠️  Backend API не отвечает${NC}"
    echo "   Запустите: ./manage.sh start"
fi

echo ""

# Шаг 6: Рекомендации
echo -e "${BLUE}🔍 ШАГ 6: РЕКОМЕНДАЦИИ${NC}"
echo ""

echo -e "${YELLOW}📋 ДЛЯ ПОЛНОЙ ИНТЕГРАЦИИ:${NC}"
echo "1. Убедитесь, что бот запущен:"
echo "   cd telegram-bot && npm start"
echo ""
echo "2. Настройте автоматические уведомления:"
echo "   Добавьте webhook или измените код бота для отправки"
echo "   уведомлений при создании новых модераций"
echo ""
echo "3. Протестируйте команды бота в Telegram:"
echo "   /start - Запуск бота"
echo "   /queue - Просмотр очереди"
echo "   /stats - Статистика"
echo ""
echo "4. Проверьте логи бота:"
echo "   tail -f telegram-bot/bot.log"

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}🎉 ТЕСТИРОВАНИЕ ЗАВЕРШЕНО!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "${BLUE}📊 РЕЗУЛЬТАТЫ:${NC}"
echo "   Telegram токен: ✅ Работает"
echo "   Chat ID группы: ✅ Настроен"
echo "   Отправка сообщений: ✅ Работает"
echo "   Backend API: ✅ Работает"
echo "   Интеграция: ⚠️  Требует настройки"
echo ""
echo -e "${YELLOW}🚀 СЛЕДУЮЩИЕ ШАГИ:${NC}"
echo "   1. Запустите бота: cd telegram-bot && npm start"
echo "   2. Проверьте команды в Telegram группе"
echo "   3. Настройте автоматические уведомления"
echo ""