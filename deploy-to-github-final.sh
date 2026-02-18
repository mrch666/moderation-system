#!/bin/bash

# 🚀 Финальный деплой системы модерации на GitHub

set -e

echo ""
echo "🚀 ФИНАЛЬНЫЙ ДЕПЛОЙ НА GITHUB"
echo "============================"
echo ""

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Проверка предварительных условий
check_prerequisites() {
    echo "🔍 ПРОВЕРКА ПРЕДВАРИТЕЛЬНЫХ УСЛОВИЙ..."
    echo ""
    
    # 1. Проверка Git
    if ! command -v git &> /dev/null; then
        echo -e "${RED}❌ Ошибка: Git не установлен${NC}"
        exit 1
    fi
    echo -e "${GREEN}✅ Git установлен${NC}"
    
    # 2. Проверка Git репозитория
    if [ ! -d ".git" ]; then
        echo -e "${RED}❌ Ошибка: Не Git репозиторий${NC}"
        exit 1
    fi
    echo -e "${GREEN}✅ Git репозиторий инициализирован${NC}"
    
    # 3. Проверка коммитов
    if ! git log --oneline -1 &>/dev/null; then
        echo -e "${RED}❌ Ошибка: Нет коммитов${NC}"
        exit 1
    fi
    echo -e "${GREEN}✅ Есть коммиты${NC}"
    
    # 4. Проверка GitHub токена
    if [ -z "$GITHUB_TOKEN" ]; then
        echo -e "${YELLOW}⚠️  Предупреждение: GITHUB_TOKEN не установлен${NC}"
        echo "   Установите переменную окружения:"
        echo "   export GITHUB_TOKEN=ваш_токен"
        echo ""
        read -p "Введите GitHub Personal Access Token: " GITHUB_TOKEN
        if [ -z "$GITHUB_TOKEN" ]; then
            echo -e "${RED}❌ Ошибка: Токен обязателен${NC}"
            exit 1
        fi
        export GITHUB_TOKEN
    else
        echo -e "${GREEN}✅ GitHub токен найден${NC}"
    fi
    
    # 5. Проверка GitHub username
    if [ -z "$GITHUB_USERNAME" ]; then
        echo -e "${YELLOW}⚠️  Предупреждение: GITHUB_USERNAME не установлен${NC}"
        read -p "Введите ваш GitHub username: " GITHUB_USERNAME
        if [ -z "$GITHUB_USERNAME" ]; then
            echo -e "${RED}❌ Ошибка: Username обязателен${NC}"
            exit 1
        fi
        export GITHUB_USERNAME
    else
        echo -e "${GREEN}✅ GitHub username: $GITHUB_USERNAME${NC}"
    fi
    
    echo ""
}

# Тестирование GitHub токена
test_github_token() {
    echo "🔐 ТЕСТИРОВАНИЕ GITHUB ТОКЕНА..."
    echo ""
    
    API_RESPONSE=$(curl -s -H "Authorization: token $GITHUB_TOKEN" \
      -H "Accept: application/vnd.github.v3+json" \
      https://api.github.com/user)
    
    if echo "$API_RESPONSE" | grep -q "Bad credentials"; then
        echo -e "${RED}❌ Ошибка: Неверный GitHub токен${NC}"
        exit 1
    elif echo "$API_RESPONSE" | grep -q '"login"'; then
        LOGIN=$(echo "$API_RESPONSE" | grep '"login"' | head -1 | cut -d'"' -f4)
        echo -e "${GREEN}✅ Токен работает${NC}"
        echo -e "${BLUE}   Авторизован как: $LOGIN${NC}"
        
        # Обновляем username, если он отличается
        if [ "$LOGIN" != "$GITHUB_USERNAME" ]; then
            echo -e "${YELLOW}⚠️  Username в токене ($LOGIN) отличается от указанного ($GITHUB_USERNAME)${NC}"
            read -p "Использовать $LOGIN? (y/n): " -n 1 -r
            echo ""
            if [[ $REPLY =~ ^[Yy]$ ]]; then
                GITHUB_USERNAME="$LOGIN"
                export GITHUB_USERNAME
                echo -e "${GREEN}✅ Username обновлен: $GITHUB_USERNAME${NC}"
            fi
        fi
    else
        echo -e "${YELLOW}⚠️  Не удалось проверить токен, продолжаем...${NC}"
    fi
    
    echo ""
}

# Создание репозитория на GitHub
create_github_repo() {
    echo "📦 СОЗДАНИЕ РЕПОЗИТОРИЯ НА GITHUB..."
    echo ""
    
    REPO_NAME="moderation-system"
    REPO_DESCRIPTION="Система модерации изображений товаров с REST API, веб-интерфейсом и интеграцией с Telegram"
    
    echo -e "${BLUE}📋 Параметры репозитория:${NC}"
    echo "   Имя: $REPO_NAME"
    echo "   Описание: $REPO_DESCRIPTION"
    echo "   Владелец: $GITHUB_USERNAME"
    echo ""
    
    # Проверяем, существует ли уже репозиторий
    CHECK_RESPONSE=$(curl -s -H "Authorization: token $GITHUB_TOKEN" \
      -H "Accept: application/vnd.github.v3+json" \
      "https://api.github.com/repos/$GITHUB_USERNAME/$REPO_NAME")
    
    if echo "$CHECK_RESPONSE" | grep -q '"id"'; then
        echo -e "${YELLOW}⚠️  Репозиторий уже существует${NC}"
        REPO_URL="https://github.com/$GITHUB_USERNAME/$REPO_NAME"
        echo -e "${BLUE}   URL: $REPO_URL${NC}"
        return 0
    fi
    
    # Создаем репозиторий
    echo "Создаем репозиторий..."
    CREATE_RESPONSE=$(curl -s -X POST \
      -H "Authorization: token $GITHUB_TOKEN" \
      -H "Accept: application/vnd.github.v3+json" \
      https://api.github.com/user/repos \
      -d "{
        \"name\": \"$REPO_NAME\",
        \"description\": \"$REPO_DESCRIPTION\",
        \"private\": false,
        \"has_issues\": true,
        \"has_projects\": true,
        \"has_wiki\": true,
        \"auto_init\": false
      }")
    
    if echo "$CREATE_RESPONSE" | grep -q '"id"'; then
        REPO_URL=$(echo "$CREATE_RESPONSE" | grep '"html_url"' | head -1 | cut -d'"' -f4)
        echo -e "${GREEN}✅ Репозиторий создан!${NC}"
        echo -e "${BLUE}   URL: $REPO_URL${NC}"
    else
        ERROR_MSG=$(echo "$CREATE_RESPONSE" | grep -o '"message":"[^"]*"' | head -1)
        echo -e "${RED}❌ Ошибка при создании репозитория: $ERROR_MSG${NC}"
        
        if echo "$CREATE_RESPONSE" | grep -q "name already exists"; then
            echo -e "${YELLOW}⚠️  Репозиторий с таким именем уже существует${NC}"
            REPO_URL="https://github.com/$GITHUB_USERNAME/$REPO_NAME"
            echo -e "${BLUE}   Используем существующий: $REPO_URL${NC}"
        else
            echo -e "${YELLOW}⚠️  Создайте репозиторий вручную: https://github.com/new${NC}"
            echo "   Имя: $REPO_NAME"
            echo "   Public repository"
            echo "   Без README/.gitignore/license"
            echo ""
            read -p "Нажмите Enter после создания репозитория..." -r
            REPO_URL="https://github.com/$GITHUB_USERNAME/$REPO_NAME"
        fi
    fi
    
    echo ""
}

# Отправка кода на GitHub
push_to_github() {
    echo "📤 ОТПРАВКА КОДА НА GITHUB..."
    echo ""
    
    # Настраиваем remote
    if git remote -v | grep -q "origin"; then
        CURRENT_REMOTE=$(git remote get-url origin)
        echo -e "${BLUE}Текущий remote: $CURRENT_REMOTE${NC}"
        
        read -p "Использовать текущий remote? (y/n): " -n 1 -r
        echo ""
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            git remote remove origin
            echo -e "${GREEN}✅ Старый remote удален${NC}"
        fi
    fi
    
    if ! git remote -v | grep -q "origin"; then
        GITHUB_URL="https://github.com/$GITHUB_USERNAME/moderation-system.git"
        echo "Добавляем remote: $GITHUB_URL"
        git remote add origin "$GITHUB_URL"
        echo -e "${GREEN}✅ Remote добавлен${NC}"
    fi
    
    # Отправляем код
    CURRENT_BRANCH=$(git branch --show-current)
    echo "Отправляем ветку $CURRENT_BRANCH..."
    
    if git push -u origin "$CURRENT_BRANCH"; then
        echo -e "${GREEN}✅ Код успешно отправлен${NC}"
    else
        echo -e "${RED}❌ Ошибка при отправке кода${NC}"
        echo ""
        echo "Возможные решения:"
        echo "1. Проверьте права доступа"
        echo "2. Убедитесь, что репозиторий существует"
        echo "3. Попробуйте с SSH: git@github.com:$GITHUB_USERNAME/moderation-system.git"
        exit 1
    fi
    
    echo ""
}

# Создание тега версии
create_version_tag() {
    echo "🏷️  СОЗДАНИЕ ТЕГА ВЕРСИИ..."
    echo ""
    
    read -p "Создать тег версии? (y/n): " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        VERSION="v1.0.0"
        read -p "Версия [$VERSION]: " INPUT_VERSION
        VERSION=${INPUT_VERSION:-$VERSION}
        
        echo "Создаем тег $VERSION..."
        git tag -a "$VERSION" -m "Release $VERSION: Система модерации изображений"
        git push origin --tags
        echo -e "${GREEN}✅ Тег создан и отправлен${NC}"
    fi
    
    echo ""
}

# Настройка GitHub Actions
setup_github_actions() {
    echo "⚙️  НАСТРОЙКА GITHUB ACTIONS..."
    echo ""
    
    echo -e "${BLUE}📋 Необходимые секреты:${NC}"
    echo "   1. API_KEY - Ключ API для продакшена"
    echo "   2. TARGET_SERVER_URL - URL целевого сервера"
    echo "   3. TELEGRAM_BOT_TOKEN - Токен бота (опционально)"
    echo "   4. TELEGRAM_CHAT_ID - ID чата (опционально)"
    echo ""
    
    echo -e "${YELLOW}⚠️  Настройте секреты вручную:${NC}"
    echo "   https://github.com/$GITHUB_USERNAME/moderation-system/settings/secrets/actions"
    echo ""
    
    echo -e "${GREEN}✅ CI/CD конфигурация готова${NC}"
    echo "   Файл: .github/workflows/ci-cd.yml"
    echo ""
}

# Основная функция
main() {
    echo -e "${BLUE}🚀 ЗАПУСК ФИНАЛЬНОГО ДЕПЛОЯ${NC}"
    echo ""
    
    # Проверка предварительных условий
    check_prerequisites
    
    # Тестирование токена
    test_github_token
    
    # Создание репозитория
    create_github_repo
    
    # Подтверждение
    echo -e "${YELLOW}📋 ВСЕ ПРОВЕРКИ ПРОЙДЕНЫ${NC}"
    echo ""
    echo "Репозиторий будет создан/использован:"
    echo "   https://github.com/$GITHUB_USERNAME/moderation-system"
    echo ""
    echo "Код будет отправлен из текущей директории."
    echo ""
    
    read -p "Продолжить деплой? (y/n): " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo -e "${YELLOW}❌ Деплой отменен${NC}"
        exit 0
    fi
    
    # Отправка кода
    push_to_github
    
    # Создание тега
    create_version_tag
    
    # Настройка GitHub Actions
    setup_github_actions
    
    # Финальный отчет
    echo ""
    echo -e "${GREEN}========================================${NC}"
    echo -e "${GREEN}🎉 ФИНАЛЬНЫЙ ДЕПЛОЙ ЗАВЕРШЕН!${NC}"
    echo -e "${GREEN}========================================${NC}"
    echo ""
    echo -e "${BLUE}🌐 ССЫЛКИ:${NC}"
    echo "   Репозиторий: https://github.com/$GITHUB_USERNAME/moderation-system"
    echo "   Код: https://github.com/$GITHUB_USERNAME/moderation-system/tree/main"
    echo "   Actions: https://github.com/$GITHUB_USERNAME/moderation-system/actions"
    echo "   Issues: https://github.com/$GITHUB_USERNAME/moderation-system/issues"
    echo ""
    echo -e "${BLUE}🚀 СЛЕДУЮЩИЕ ШАГИ:${NC}"
    echo "   1. Настройте секреты GitHub Actions"
    echo "   2. Включите GitHub Actions в репозитории"
    echo "   3. Настройте окружение: cp .env.example .env.development"
    echo "   4. Запустите систему: ./start_all.sh"
    echo ""
    echo -e "${BLUE}🔧 КОМАНДЫ ДЛЯ РАБОТЫ:${NC}"
    echo "   git pull origin main          # Обновить код"
    echo "   git push origin main          # Отправить изменения"
    echo "   ./manage.sh start             # Запустить систему"
    echo "   ./test_simple.sh              # Тестирование API"
    echo ""
    echo -e "${GREEN}========================================${NC}"
}

# Запуск основной функции
main