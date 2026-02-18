#!/bin/bash

# 🚀 Проверка GitHub репозитория системы модерации

set -e

echo ""
echo "🚀 ПРОВЕРКА GITHUB РЕПОЗИТОРИЯ"
echo "============================="
echo ""

# Цвета
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Проверка переменных окружения
if [ -z "$GITHUB_USERNAME" ]; then
    if [ -f "/home/mrch/.openclaw/.env" ]; then
        source /home/mrch/.openclaw/.env
    fi
fi

if [ -z "$GITHUB_USERNAME" ]; then
    echo -e "${RED}❌ GITHUB_USERNAME не установлен${NC}"
    echo "Установите: export GITHUB_USERNAME=ваш_username"
    exit 1
fi

REPO_NAME="moderation-system"
REPO_URL="https://github.com/$GITHUB_USERNAME/$REPO_NAME"

echo -e "${BLUE}🔍 Проверяю репозиторий:${NC}"
echo "   Владелец: $GITHUB_USERNAME"
echo "   Репозиторий: $REPO_NAME"
echo "   URL: $REPO_URL"
echo ""

# Проверка доступности репозитория
echo "1. Проверка доступности репозитория..."
if curl -s -I "$REPO_URL" | grep -q "200 OK"; then
    echo -e "${GREEN}✅ Репозиторий доступен${NC}"
else
    echo -e "${RED}❌ Репозиторий не доступен${NC}"
    exit 1
fi

# Проверка через GitHub API
echo ""
echo "2. Проверка через GitHub API..."
API_RESPONSE=$(curl -s "https://api.github.com/repos/$GITHUB_USERNAME/$REPO_NAME")

if echo "$API_RESPONSE" | grep -q '"name"'; then
    echo -e "${GREEN}✅ Репозиторий существует на GitHub${NC}"
    
    # Извлекаем информацию
    DESCRIPTION=$(echo "$API_RESPONSE" | grep '"description"' | head -1 | cut -d'"' -f4)
    CREATED_AT=$(echo "$API_RESPONSE" | grep '"created_at"' | head -1 | cut -d'"' -f4)
    UPDATED_AT=$(echo "$API_RESPONSE" | grep '"updated_at"' | head -1 | cut -d'"' -f4)
    STARGAZERS=$(echo "$API_RESPONSE" | grep '"stargazers_count"' | head -1 | cut -d':' -f2 | tr -d ' ,')
    WATCHERS=$(echo "$API_RESPONSE" | grep '"watchers_count"' | head -1 | cut -d':' -f2 | tr -d ' ,')
    FORKS=$(echo "$API_RESPONSE" | grep '"forks_count"' | head -1 | cut -d':' -f2 | tr -d ' ,')
    
    echo -e "${BLUE}📋 Информация о репозитории:${NC}"
    echo "   Описание: $DESCRIPTION"
    echo "   Создан: $CREATED_AT"
    echo "   Обновлен: $UPDATED_AT"
    echo "   Звезды: $STARGAZERS"
    echo "   Наблюдатели: $WATCHERS"
    echo "   Форки: $FORKS"
else
    echo -e "${RED}❌ Не удалось получить информацию о репозитории${NC}"
fi

# Проверка веток
echo ""
echo "3. Проверка веток..."
BRANCHES_RESPONSE=$(curl -s "https://api.github.com/repos/$GITHUB_USERNAME/$REPO_NAME/branches")

if echo "$BRANCHES_RESPONSE" | grep -q '"name"'; then
    echo -e "${GREEN}✅ Ветки доступны${NC}"
    
    # Список веток
    echo -e "${BLUE}📋 Ветки репозитория:${NC}"
    echo "$BRANCHES_RESPONSE" | grep '"name"' | cut -d'"' -f4 | while read -r BRANCH; do
        echo "   - $BRANCH"
    done
else
    echo -e "${YELLOW}⚠️  Не удалось получить список веток${NC}"
fi

# Проверка тегов
echo ""
echo "4. Проверка тегов..."
TAGS_RESPONSE=$(curl -s "https://api.github.com/repos/$GITHUB_USERNAME/$REPO_NAME/tags")

if echo "$TAGS_RESPONSE" | grep -q '"name"'; then
    echo -e "${GREEN}✅ Теги доступны${NC}"
    
    # Список тегов
    echo -e "${BLUE}📋 Теги репозитория:${NC}"
    echo "$TAGS_RESPONSE" | grep '"name"' | cut -d'"' -f4 | head -5 | while read -r TAG; do
        echo "   - $TAG"
    done
else
    echo -e "${YELLOW}⚠️  Нет тегов или не удалось получить список${NC}"
fi

# Проверка локального Git
echo ""
echo "5. Проверка локального Git..."
if [ -d ".git" ]; then
    CURRENT_BRANCH=$(git branch --show-current 2>/dev/null || echo "неизвестно")
    LAST_COMMIT=$(git log -1 --pretty=format:"%h - %s" 2>/dev/null || echo "неизвестно")
    
    echo -e "${GREEN}✅ Локальный Git репозиторий${NC}"
    echo -e "${BLUE}📋 Локальная информация:${NC}"
    echo "   Текущая ветка: $CURRENT_BRANCH"
    echo "   Последний коммит: $LAST_COMMIT"
    
    # Проверка связи с remote
    if git remote -v | grep -q "origin"; then
        REMOTE_URL=$(git remote get-url origin)
        echo "   Remote URL: $REMOTE_URL"
        
        # Проверка синхронизации
        echo ""
        echo "6. Проверка синхронизации с GitHub..."
        git fetch origin --quiet
        
        LOCAL_HASH=$(git rev-parse main 2>/dev/null || echo "")
        REMOTE_HASH=$(git rev-parse origin/main 2>/dev/null || echo "")
        
        if [ "$LOCAL_HASH" = "$REMOTE_HASH" ]; then
            echo -e "${GREEN}✅ Локальная и удаленная ветки синхронизированы${NC}"
        else
            echo -e "${YELLOW}⚠️  Локальная и удаленная ветки различаются${NC}"
            echo "   Локальный хэш: ${LOCAL_HASH:0:8}"
            echo "   Удаленный хэш: ${REMOTE_HASH:0:8}"
        fi
    else
        echo -e "${YELLOW}⚠️  Remote не настроен${NC}"
    fi
else
    echo -e "${RED}❌ Не локальный Git репозиторий${NC}"
fi

# Ссылки
echo ""
echo -e "${BLUE}🌐 ПОЛЕЗНЫЕ ССЫЛКИ:${NC}"
echo "   Репозиторий: $REPO_URL"
echo "   Код: $REPO_URL/tree/main"
echo "   Issues: $REPO_URL/issues"
echo "   Actions: $REPO_URL/actions"
echo "   Settings: $REPO_URL/settings"
echo "   Secrets: $REPO_URL/settings/secrets/actions"
echo ""

# Рекомендации
echo -e "${YELLOW}🚀 РЕКОМЕНДАЦИИ:${NC}"
echo "   1. Настройте секреты GitHub Actions"
echo "   2. Включите GitHub Actions"
echo "   3. Настройте защиту веток"
echo "   4. Создайте проект для управления задачами"
echo "   5. Пригласите соавторов (если нужно)"
echo ""

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}🎉 ПРОВЕРКА ЗАВЕРШЕНА!${NC}"
echo -e "${GREEN}========================================${NC}"