#!/bin/bash

# 🆔 Скрипт для получения Chat ID Telegram группы

set -e

echo ""
echo "🆔 ПОЛУЧЕНИЕ CHAT ID TELEGRAM ГРУППЫ"
echo "===================================="
echo ""

# Цвета
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Проверка токена
if [ -z "$TELEGRAM_BOT_TOKEN" ]; then
    if [ -f ".env.development" ]; then
        echo -e "${BLUE}🔍 Ищу токен в .env.development...${NC}"
        TELEGRAM_BOT_TOKEN=$(grep TELEGRAM_BOT_TOKEN .env.development | cut -d= -f2)
    fi
    
    if [ -z "$TELEGRAM_BOT_TOKEN" ]; then
        echo -e "${YELLOW}⚠️  TELEGRAM_BOT_TOKEN не найден${NC}"
        read -p "Введите токен Telegram бота: " TELEGRAM_BOT_TOKEN
        
        if [ -z "$TELEGRAM_BOT_TOKEN" ]; then
            echo -e "${RED}❌ Ошибка: Токен обязателен${NC}"
            exit 1
        fi
    fi
fi

echo -e "${GREEN}✅ Токен найден${NC}"
echo "   Токен: ${TELEGRAM_BOT_TOKEN:0:15}..."
echo ""

# Метод 1: Через getUpdates API
echo -e "${BLUE}🔍 МЕТОД 1: Через Telegram API${NC}"
echo ""
echo "1. Отправьте любое сообщение в группу"
echo "2. Нажмите Enter здесь, чтобы продолжить..."
read

echo "Запрашиваю обновления от Telegram API..."
API_RESPONSE=$(curl -s "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/getUpdates")

if echo "$API_RESPONSE" | grep -q '"ok":true'; then
    echo -e "${GREEN}✅ Подключение к API успешно${NC}"
    
    # Извлекаем информацию о чатах
    echo ""
    echo -e "${YELLOW}📋 НАЙДЕННЫЕ ЧАТЫ:${NC}"
    
    # Используем jq если установлен, иначе grep
    if command -v jq &> /dev/null; then
        echo "$API_RESPONSE" | jq -r '.result[] | select(.message.chat.type == "group" or .message.chat.type == "supergroup") | "Chat ID: \(.message.chat.id) | Тип: \(.message.chat.type) | Название: \(.message.chat.title // "Без названия")"' | sort -u
    else
        # Простой парсинг через grep
        echo "$API_RESPONSE" | grep -o '"chat":{"id":[^,]*,"title":"[^"]*"' | \
            sed 's/"chat":{"id":\([^,]*\),"title":"\([^"]*\)"/Chat ID: \1 | Название: \2/' | \
            sort -u
    fi
    
    # Показываем последний chat
    LAST_CHAT=$(echo "$API_RESPONSE" | grep -o '"chat":{"id":[^,]*' | tail -1 | cut -d: -f3 | tr -d ' ')
    if [ -n "$LAST_CHAT" ]; then
        echo ""
        echo -e "${GREEN}📌 ПОСЛЕДНИЙ ОБНАРУЖЕННЫЙ CHAT ID:${NC}"
        echo "   $LAST_CHAT"
        
        # Предлагаем использовать его
        echo ""
        read -p "Использовать этот Chat ID? (y/n): " -n 1 -r
        echo ""
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            echo "TELEGRAM_CHAT_ID=$LAST_CHAT" >> .env.development
            echo -e "${GREEN}✅ Chat ID добавлен в .env.development${NC}"
        fi
    fi
    
else
    echo -e "${RED}❌ Ошибка при подключении к API${NC}"
    echo "Ответ API:"
    echo "$API_RESPONSE" | head -5
fi

echo ""

# Метод 2: Через бота @userinfobot
echo -e "${BLUE}🔍 МЕТОД 2: Через @userinfobot (рекомендуется)${NC}"
echo ""
echo "1. Добавьте @userinfobot в вашу группу"
echo "2. Отправьте команду: /start"
echo "3. Бот покажет:"
echo "   👥 Chat info:"
echo "   ID: -1001234567890  ← ЭТО Chat ID!"
echo "4. Скопируйте число после 'ID:'"
echo ""

# Метод 3: Ручной ввод
echo -e "${BLUE}🔍 МЕТОД 3: Ручной ввод${NC}"
echo ""
read -p "Введите Chat ID вручную (или нажмите Enter чтобы пропустить): " MANUAL_CHAT_ID

if [ -n "$MANUAL_CHAT_ID" ]; then
    # Проверяем формат
    if [[ "$MANUAL_CHAT_ID" =~ ^-100[0-9]{10}$ ]] || [[ "$MANUAL_CHAT_ID" =~ ^-[0-9]{9,}$ ]]; then
        echo -e "${GREEN}✅ Корректный формат Chat ID${NC}"
        
        # Обновляем .env.development
        if [ -f ".env.development" ]; then
            if grep -q "TELEGRAM_CHAT_ID=" .env.development; then
                sed -i "s/TELEGRAM_CHAT_ID=.*/TELEGRAM_CHAT_ID=$MANUAL_CHAT_ID/" .env.development
            else
                echo "TELEGRAM_CHAT_ID=$MANUAL_CHAT_ID" >> .env.development
            fi
            echo -e "${GREEN}✅ Chat ID сохранен в .env.development${NC}"
        else
            echo -e "${YELLOW}⚠️  Файл .env.development не найден${NC}"
            echo "Создайте его: cp .env.example .env.development"
        fi
    else
        echo -e "${YELLOW}⚠️  Нестандартный формат Chat ID${NC}"
        echo "Обычно Chat ID групп:"
        echo "   - Начинается с -100 (супергруппы)"
        echo "   - Или с - (обычные группы)"
        echo ""
        read -p "Все равно использовать? (y/n): " -n 1 -r
        echo ""
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            echo "TELEGRAM_CHAT_ID=$MANUAL_CHAT_ID" >> .env.development
            echo -e "${GREEN}✅ Chat ID сохранен${NC}"
        fi
    fi
fi

echo ""
echo -e "${BLUE}📋 ЧТО ТАКОЕ CHAT ID:${NC}"
echo "   • Уникальный идентификатор чата/группы"
echo "   • Отрицательное число (например: -1001234567890)"
echo "   • Нужен для отправки сообщений в конкретную группу"
echo ""

echo -e "${BLUE}🔧 КАК ПРОВЕРИТЬ ЧТО CHAT ID РАБОТАЕТ:${NC}"
echo "   После настройки отправьте тестовое сообщение:"
echo "   curl -s -X POST \\"
echo "     https://api.telegram.org/bot\$TELEGRAM_BOT_TOKEN/sendMessage \\"
echo "     -d chat_id=\$TELEGRAM_CHAT_ID \\"
echo "     -d text=\"Тестовое сообщение от системы модерации\""
echo ""

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}🎉 ПОЛУЧЕНИЕ CHAT ID ЗАВЕРШЕНО!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "${YELLOW}🚀 СЛЕДУЮЩИЕ ШАГИ:${NC}"
echo "   1. Проверьте настройки в .env.development:"
echo "      grep TELEGRAM .env.development"
echo "   2. Запустите систему: ./manage.sh start"
echo "   3. Протестируйте бота в группе"
echo ""