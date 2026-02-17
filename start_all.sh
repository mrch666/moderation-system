#!/bin/bash

# 🚀 Скрипт для запуска всей системы модерации

set -e

echo ""
echo "=========================================="
echo "🖼️  Запуск системы модерации изображений"
echo "=========================================="
echo ""

# Цвета для вывода
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Проверка зависимостей
print_info "Проверка зависимостей..."
if ! command -v node &> /dev/null; then
    print_error "Node.js не установлен"
    exit 1
fi

if ! command -v npm &> /dev/null; then
    print_error "npm не установлен"
    exit 1
fi

print_success "Node.js $(node --version) и npm $(npm --version) установлены"

# Очистка предыдущих процессов
cleanup() {
    print_info "Остановка системы..."
    
    if [ -n "$BACKEND_PID" ]; then
        kill $BACKEND_PID 2>/dev/null || true
    fi
    
    if [ -n "$FRONTEND_PID" ]; then
        kill $FRONTEND_PID 2>/dev/null || true
    fi
    
    print_success "Система остановлена"
    exit 0
}

trap cleanup INT TERM

# Запуск Backend
print_info "Запуск Backend API..."
cd backend
npm start &
BACKEND_PID=$!
cd ..

sleep 5

# Проверка Backend
if curl -s http://localhost:3000/health > /dev/null; then
    print_success "Backend запущен на http://localhost:3000"
else
    print_error "Backend не запустился"
    cleanup
    exit 1
fi

# Запуск простого фронтенда
print_info "Запуск веб-интерфейса..."
cd simple-frontend
node server.js &
FRONTEND_PID=$!
cd ..

sleep 3

# Проверка фронтенда
if curl -s http://localhost:8080 > /dev/null; then
    print_success "Веб-интерфейс запущен на http://localhost:8080"
else
    print_warning "Веб-интерфейс не запустился"
fi

echo ""
echo "=========================================="
echo "🎉 Система успешно запущена!"
echo "=========================================="
echo ""
echo "🌐 Доступные сервисы:"
echo "   📊 Веб-интерфейс:  ${GREEN}http://localhost:8080${NC}"
echo "   🔧 Backend API:    ${GREEN}http://localhost:3000${NC}"
echo "   🩺 Health check:   ${GREEN}http://localhost:3000/health${NC}"
echo ""
echo "🔑 API ключ по умолчанию: ${YELLOW}test_api_key_123456${NC}"
echo ""
echo "📋 Быстрый старт:"
echo "   1. Откройте ${GREEN}http://localhost:8080${NC} в браузере"
echo "   2. API ключ уже введен"
echo "   3. Для отправки на модерацию:"
echo "      - Вкладка 'Отправить на модерацию'"
echo "      - Заполните форму"
echo "      - Нажмите 'Отправить на модерацию'"
echo "   4. Для модерации:"
echo "      - Вкладка 'Очередь модерации'"
echo "      - Нажмите ✅ для одобрения"
echo "      - Нажмите ❌ для отклонения"
echo ""
echo "🧪 Тестирование API:"
echo "   curl -H 'X-API-Key: test_api_key_123456' \\"
echo "        http://localhost:3000/api/moderation/queue"
echo ""
echo "   curl -X POST http://localhost:3000/api/moderation/submit \\"
echo "        -H 'X-API-Key: test_api_key_123456' \\"
echo "        -H 'Content-Type: application/json' \\"
echo "        -d '{\"image_url\":\"https://picsum.photos/800/600\",\"product_id\":\"TEST-001\",\"download_url\":\"https://picsum.photos/800/600\"}'"
echo ""
echo "=========================================="
echo "🛑 Для остановки системы нажмите ${RED}Ctrl+C${NC}"
echo "=========================================="
echo ""

# Бесконечное ожидание
while true; do
    sleep 1
done