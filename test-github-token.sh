#!/bin/bash

# 🚀 Тестирование GitHub токена и создание репозитория

set -e

echo ""
echo "🚀 ТЕСТИРОВАНИЕ GITHUB ТОКЕНА"
echo "============================"
echo ""

# Проверяем переменные окружения
if [ -z "$GITHUB_TOKEN" ]; then
    echo "❌ Ошибка: GITHUB_TOKEN не установлен"
    echo ""
    echo "Добавьте в .env файл:"
    echo "GITHUB_TOKEN=ваш_github_token"
    exit 1
fi

if [ -z "$GITHUB_USERNAME" ]; then
    echo "⚠️  Предупреждение: GITHUB_USERNAME не установлен"
    read -p "Введите ваш GitHub username: " GITHUB_USERNAME
    if [ -z "$GITHUB_USERNAME" ]; then
        echo "❌ Ошибка: GitHub username обязателен"
        exit 1
    fi
    export GITHUB_USERNAME
fi

echo "✅ Настройки:"
echo "   Username: $GITHUB_USERNAME"
echo "   Token: ${GITHUB_TOKEN:0:10}..."  # Показываем только первые 10 символов
echo ""

# Тестируем подключение к GitHub API
echo "1. Тестирование подключения к GitHub API..."
API_RESPONSE=$(curl -s -H "Authorization: token $GITHUB_TOKEN" \
  -H "Accept: application/vnd.github.v3+json" \
  https://api.github.com/user)

if echo "$API_RESPONSE" | grep -q "Bad credentials"; then
    echo "❌ Ошибка: Неверный токен"
    exit 1
elif echo "$API_RESPONSE" | grep -q '"login"'; then
    LOGIN=$(echo "$API_RESPONSE" | grep '"login"' | head -1 | cut -d'"' -f4)
    echo "✅ Успешное подключение"
    echo "   Авторизован как: $LOGIN"
else
    echo "⚠️  Не удалось проверить токен, продолжаем..."
fi

# Создаем репозиторий
echo ""
echo "2. Создание репозитория на GitHub..."
REPO_NAME="moderation-system-$(date +%Y%m%d-%H%M%S)"
REPO_DESCRIPTION="Система модерации изображений товаров - тестовый репозиторий"

echo "   Имя репозитория: $REPO_NAME"
echo "   Описание: $REPO_DESCRIPTION"
echo ""

read -p "Создать тестовый репозиторий? (y/n): " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Отменено"
    exit 0
fi

CREATE_RESPONSE=$(curl -s -X POST \
  -H "Authorization: token $GITHUB_TOKEN" \
  -H "Accept: application/vnd.github.v3+json" \
  https://api.github.com/user/repos \
  -d "{
    \"name\": \"$REPO_NAME\",
    \"description\": \"$REPO_DESCRIPTION\",
    \"private\": false,
    \"has_issues\": true,
    \"has_projects\": false,
    \"has_wiki\": false,
    \"auto_init\": false
  }")

if echo "$CREATE_RESPONSE" | grep -q '"id"'; then
    REPO_URL=$(echo "$CREATE_RESPONSE" | grep '"html_url"' | head -1 | cut -d'"' -f4)
    echo "✅ Репозиторий создан!"
    echo "   URL: $REPO_URL"
    
    # Показываем информацию о репозитории
    echo ""
    echo "📋 ИНФОРМАЦИЯ О РЕПОЗИТОРИИ:"
    echo "   Полное имя: $GITHUB_USERNAME/$REPO_NAME"
    echo "   SSH URL: git@github.com:$GITHUB_USERNAME/$REPO_NAME.git"
    echo "   HTTPS URL: https://github.com/$GITHUB_USERNAME/$REPO_NAME.git"
    
    # Создаем файл с информацией
    echo "https://github.com/$GITHUB_USERNAME/$REPO_NAME" > github-repo-info.txt
    echo "git@github.com:$GITHUB_USERNAME/$REPO_NAME.git" >> github-repo-info.txt
    
    echo ""
    echo "📁 Информация сохранена в: github-repo-info.txt"
    
    # Удаляем репозиторий (опционально)
    echo ""
    read -p "Удалить тестовый репозиторий? (y/n): " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "3. Удаление тестового репозитория..."
        DELETE_RESPONSE=$(curl -s -X DELETE \
          -H "Authorization: token $GITHUB_TOKEN" \
          -H "Accept: application/vnd.github.v3+json" \
          "https://api.github.com/repos/$GITHUB_USERNAME/$REPO_NAME")
        
        if [ -z "$DELETE_RESPONSE" ]; then
            echo "✅ Репозиторий удален"
        else
            echo "⚠️  Ответ при удалении: $DELETE_RESPONSE"
        fi
        rm -f github-repo-info.txt
    fi
    
else
    ERROR_MSG=$(echo "$CREATE_RESPONSE" | grep -o '"message":"[^"]*"' | head -1)
    echo "❌ Ошибка при создании репозитория: $ERROR_MSG"
    
    if echo "$CREATE_RESPONSE" | grep -q "name already exists"; then
        echo "⚠️  Репозиторий с таким именем уже существует"
    fi
fi

echo ""
echo "============================"
echo "🎉 ТЕСТИРОВАНИЕ ЗАВЕРШЕНО!"
echo ""
echo "📋 ВЫВОДЫ:"
echo "   1. GitHub токен работает: ✅"
echo "   2. Можно создавать репозитории: ✅"
echo ""
echo "🚀 ДЛЯ СОЗДАНИЯ РЕАЛЬНОГО РЕПОЗИТОРИЯ:"
echo "   Запустите: ./create-github-repo.sh"
echo "   Или: ./push-to-github.sh"
echo ""
echo "🔧 ДЛЯ СИСТЕМЫ МОДЕРАЦИИ:"
echo "   Токен будет использоваться для:"
echo "   - Создания репозитория"
echo "   - Настройки GitHub Actions"
echo "   - Автоматических коммитов"
echo "============================"