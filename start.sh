#!/bin/bash

# Скрипт для быстрого запуска системы модерации
# Использование: ./start.sh [dev|prod|docker]

set -e

COLOR_GREEN='\033[0;32m'
COLOR_RED='\033[0;31m'
COLOR_YELLOW='\033[1;33m'
COLOR_NC='\033[0m'

print_info() {
    echo -e "${COLOR_GREEN}[INFO]${COLOR_NC} $1"
}

print_warning() {
    echo -e "${COLOR_YELLOW}[WARNING]${COLOR_NC} $1"
}

print_error() {
    echo -e "${COLOR_RED}[ERROR]${COLOR_NC} $1"
}

check_dependencies() {
    local missing_deps=()
    
    for dep in "$@"; do
        if ! command -v "$dep" &> /dev/null; then
            missing_deps+=("$dep")
        fi
    done
    
    if [ ${#missing_deps[@]} -ne 0 ]; then
        print_error "Отсутствуют зависимости: ${missing_deps[*]}"
        return 1
    fi
    return 0
}

setup_environment() {
    print_info "Настройка окружения..."
    
    # Backend
    if [ ! -f "backend/.env" ]; then
        cp backend/.env.example backend/.env
        print_warning "Создан backend/.env. Отредактируйте файл перед запуском."
    fi
    
    # Telegram bot
    if [ ! -f "telegram-bot/.env" ]; then
        cp telegram-bot/.env.example telegram-bot/.env
        print_warning "Создан telegram-bot/.env. Отредактируйте файл перед запуском."
    fi
    
    # Frontend
    if [ ! -f "frontend/.env" ]; then
        echo "REACT_APP_API_URL=http://localhost:3000/api" > frontend/.env
        print_info "Создан frontend/.env"
    fi
}

install_dependencies() {
    print_info "Установка зависимостей..."
    
    # Backend
    if [ -d "backend/node_modules" ]; then
        print_info "Зависимости backend уже установлены"
    else
        print_info "Установка зависимостей backend..."
        cd backend && npm install
        cd ..
    fi
    
    # Frontend
    if [ -d "frontend/node_modules" ]; then
        print_info "Зависимости frontend уже установлены"
    else
        print_info "Установка зависимостей frontend..."
        cd frontend && npm install
        cd ..
    fi
    
    # Telegram bot
    if [ -d "telegram-bot/node_modules" ]; then
        print_info "Зависимости telegram-bot уже установлены"
    else
        print_info "Установка зависимостей telegram-bot..."
        cd telegram-bot && npm install
        cd ..
    fi
}

run_migrations() {
    print_info "Выполнение миграций базы данных..."
    
    if ! check_dependencies psql; then
        print_warning "PostgreSQL не установлен, пропускаем миграции"
        return
    fi
    
    cd backend
    if node scripts/migrate.js; then
        print_info "Миграции успешно выполнены"
    else
        print_error "Ошибка выполнения миграций"
        exit 1
    fi
    cd ..
}

start_development() {
    print_info "Запуск в режиме разработки..."
    
    # Запуск сервисов в фоне
    print_info "Запуск backend..."
    cd backend && npm run dev &
    BACKEND_PID=$!
    cd ..
    
    print_info "Запуск frontend..."
    cd frontend && npm start &
    FRONTEND_PID=$!
    cd ..
    
    print_info "Запуск telegram bot..."
    cd telegram-bot && npm run dev &
    TELEGRAM_PID=$!
    cd ..
    
    # Информация о запущенных процессах
    print_info "Система запущена в режиме разработки"
    echo "Backend PID: $BACKEND_PID"
    echo "Frontend PID: $FRONTEND_PID"
    echo "Telegram bot PID: $TELEGRAM_PID"
    echo ""
    echo "Доступные сервисы:"
    echo "  Frontend:    http://localhost:3000"
    echo "  Backend API: http://localhost:3001"
    echo "  PostgreSQL:  localhost:5432"
    echo "  Redis:       localhost:6379"
    echo ""
    echo "Для остановки нажмите Ctrl+C"
    
    # Ожидание сигнала завершения
    trap 'kill $BACKEND_PID $FRONTEND_PID $TELEGRAM_PID 2>/dev/null; exit' INT TERM
    wait
}

start_production() {
    print_info "Запуск в production режиме..."
    
    check_dependencies pm2
    
    # Запуск через PM2
    cd backend && pm2 start src/index.js --name "moderation-backend"
    cd ../telegram-bot && pm2 start src/index.js --name "moderation-telegram"
    cd ../frontend && npm run build
    
    print_info "Сервисы запущены через PM2"
    echo "Для управления используйте:"
    echo "  pm2 status              - статус сервисов"
    echo "  pm2 logs                - просмотр логов"
    echo "  pm2 stop all            - остановка всех сервисов"
    echo "  pm2 delete all          - удаление всех сервисов"
}

start_docker() {
    print_info "Запуск через Docker Compose..."
    
    check_dependencies docker docker-compose
    
    if [ ! -f "docker/docker-compose.yml" ]; then
        print_error "Файл docker-compose.yml не найден"
        exit 1
    fi
    
    cd docker
    docker-compose up -d
    
    print_info "Docker контейнеры запущены"
    echo ""
    echo "Доступные сервисы:"
    echo "  Frontend:    http://localhost:80"
    echo "  Backend API: http://localhost:3000"
    echo "  PostgreSQL:  localhost:5432"
    echo "  Redis:       localhost:6379"
    echo ""
    echo "Команды управления:"
    echo "  docker-compose ps       - статус контейнеров"
    echo "  docker-compose logs     - просмотр логов"
    echo "  docker-compose down     - остановка контейнеров"
    echo "  docker-compose restart  - перезапуск контейнеров"
}

create_test_data() {
    print_info "Создание тестовых данных..."
    
    # Генерация API ключа
    API_KEY="test_$(openssl rand -hex 16)"
    
    # Создание тестового API ключа в базе данных
    if command -v psql &> /dev/null; then
        psql -U postgres -d moderation_system -c \
            "INSERT INTO api_keys (key, name, permissions) VALUES ('$API_KEY', 'Тестовый ключ', '[\"read\", \"submit\", \"moderate\"]');"
        
        print_info "Тестовый API ключ создан: $API_KEY"
        echo "Для использования добавьте в frontend/.env:"
        echo "REACT_APP_API_KEY=$API_KEY"
    fi
    
    # Создание тестовых модераций
    for i in {1..5}; do
        curl -X POST http://localhost:3000/api/moderation/submit \
            -H "X-API-Key: $API_KEY" \
            -H "Content-Type: application/json" \
            -d "{
                \"image_url\": \"https://picsum.photos/800/600?random=$i\",
                \"product_id\": \"TEST-$i\",
                \"download_url\": \"https://picsum.photos/800/600?random=$i\"
            }" &> /dev/null
    done
    
    print_info "Создано 5 тестовых модераций"
}

show_help() {
    echo "Использование: $0 [команда]"
    echo ""
    echo "Команды:"
    echo "  dev       - Запуск в режиме разработки"
    echo "  prod      - Запуск в production режиме (требуется PM2)"
    echo "  docker    - Запуск через Docker Compose"
    echo "  setup     - Настройка окружения и установка зависимостей"
    echo "  test      - Создание тестовых данных"
    echo "  help      - Показать эту справку"
    echo ""
    echo "Примеры:"
    echo "  $0 dev          # Запуск разработки"
    echo "  $0 docker       # Запуск через Docker"
    echo "  $0 setup        # Первоначальная настройка"
}

# Основная логика
case "${1:-dev}" in
    dev)
        check_dependencies node npm
        setup_environment
        install_dependencies
        run_migrations
        start_development
        ;;
    prod)
        check_dependencies node npm pm2
        setup_environment
        install_dependencies
        run_migrations
        start_production
        ;;
    docker)
        check_dependencies docker docker-compose
        start_docker
        ;;
    setup)
        check_dependencies node npm
        setup_environment
        install_dependencies
        run_migrations
        print_info "Настройка завершена"
        ;;
    test)
        create_test_data
        ;;
    help|--help|-h)
        show_help
        ;;
    *)
        print_error "Неизвестная команда: $1"
        show_help
        exit 1
        ;;
esac