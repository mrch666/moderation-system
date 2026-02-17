#!/bin/bash

echo "🌐 Создание тестового сервера для файлов"
echo "======================================="

# Создаем простой HTTP сервер на Python
cat > test_file_server.py << 'PYTHON'
from http.server import HTTPServer, BaseHTTPRequestHandler
import time

class TestFileHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        if self.path == '/img/test_image.jpg':
            # Возвращаем тестовое изображение
            self.send_response(200)
            self.send_header('Content-Type', 'image/jpeg')
            self.send_header('Content-Length', '12345')
            self.end_headers()
            # Отправляем заглушку (в реальности здесь был бы файл)
            self.wfile.write(b'FAKE_IMAGE_DATA_' * 1000)
        else:
            self.send_response(404)
            self.end_headers()
            self.wfile.write(b'File not found')
    
    def log_message(self, format, *args):
        print(f"[{time.strftime('%Y-%m-%d %H:%M:%S')}] {format % args}")

if __name__ == '__main__':
    server = HTTPServer(('localhost', 5001), TestFileHandler)
    print(f"🚀 Тестовый файловый сервер запущен на http://localhost:5001")
    print(f"   Доступные файлы:")
    print(f"   - http://localhost:5001/img/test_image.jpg")
    server.serve_forever()
PYTHON

echo "📄 Создан тестовый сервер: test_file_server.py"
echo ""
echo "📋 Для запуска сервера:"
echo "   python3 test_file_server.py"
echo ""
echo "📦 Добавим товар с тестовым файлом:"

API_URL="http://localhost:3000/api"
API_KEY="test_api_key_123456"

TEST_ITEM='{
    "image_url": "https://via.placeholder.com/400x300?text=Test+Product",
    "product_id": "LOCAL-FILE-TEST",
    "download_url": "http://localhost:5001/img/test_image.jpg",
    "metadata": {
        "name": "Тестовый товар с локальным файлом",
        "category": "локальный-тест"
    }
}'

RESPONSE=$(curl -s -X POST "$API_URL/moderation/submit" \
    -H "X-API-Key: $API_KEY" \
    -H "Content-Type: application/json" \
    -d "$TEST_ITEM")

if echo "$RESPONSE" | grep -q "success"; then
    ITEM_ID=$(echo "$RESPONSE" | grep -o '"moderation_id":"[^"]*"' | cut -d'"' -f4)
    echo "   ✅ Товар добавлен, ID: $ITEM_ID"
    
    # Находим числовой ID
    NUMERIC_ID=$(curl -s -H "X-API-Key: $API_KEY" "$API_URL/moderation/queue" | \
      python3 -c "
import json, sys
try:
    data = json.loads(sys.stdin.read())
    for item in data.get('data', []):
        if item.get('product_id') == 'LOCAL-FILE-TEST':
            print(item['id'])
            break
except:
    print('')
" 2>/dev/null)
    
    if [ -n "$NUMERIC_ID" ]; then
        echo "   🔢 Числовой ID: $NUMERIC_ID"
        
        echo ""
        echo "🧪 Тестовая команда (после запуска сервера):"
        echo "   curl -X PUT $API_URL/moderation/$NUMERIC_ID/moderate \\"
        echo "        -H 'X-API-Key: $API_KEY' \\"
        echo "        -H 'Content-Type: application/json' \\"
        echo "        -d '{\"status\": \"approved\", \"reason\": \"Тест локального файла\"}'"
    fi
else
    echo "   ❌ Ошибка добавления товара"
fi

echo ""
echo "📋 Полный тест:"
echo "   1. Запустите сервер: python3 test_file_server.py"
echo "   2. В другом терминале выполните тестовую команду"
echo "   3. Проверьте логи backend"
echo "   4. Убедитесь, что файл скачивается и загружается"
