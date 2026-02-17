#!/bin/bash

echo "🧪 Тестирование пагинации"
echo "========================"

API_URL="http://localhost:3000"
API_KEY="test_api_key_123456"

echo ""
echo "1. Добавляем 25 тестовых товаров для пагинации..."

for i in {1..25}; do
    curl -s -X POST "$API_URL/api/moderation/submit" \
        -H "X-API-Key: $API_KEY" \
        -H "Content-Type: application/json" \
        -d "{
            \"image_url\": \"https://via.placeholder.com/400x300?text=Product+$i\",
            \"product_id\": \"PAGINATION-TEST-$i\",
            \"download_url\": \"https://via.placeholder.com/400x300?text=Product+$i\",
            \"metadata\": {
                \"name\": \"Тестовый товар для пагинации #$i\",
                \"category\": \"Тест\"
            }
        }" > /dev/null &
    
    echo -n "."
    sleep 0.05
done

wait
echo ""
echo "✅ 25 тестовых товаров добавлено"

echo ""
echo "2. Проверяем API пагинации:"

echo "   Страница 1 (10 товаров):"
curl -s -H "X-API-Key: $API_KEY" "$API_URL/api/moderation/queue?limit=10&page=1" | \
  python3 -c "
import json, sys
data = json.loads(sys.stdin.read())
if data.get('success'):
    pagination = data.get('pagination', {})
    print(f'   ✅ Успешно!')
    print(f'   Товаров на странице: {len(data[\"data\"])}')
    print(f'   Всего товаров: {pagination.get(\"total\", 0)}')
    print(f'   Всего страниц: {pagination.get(\"totalPages\", 0)}')
    print(f'   Текущая страница: {pagination.get(\"page\", 0)}')
else:
    print(f'   ❌ Ошибка: {data.get(\"error\")}')
"

echo ""
echo "   Страница 2 (10 товаров):"
curl -s -H "X-API-Key: $API_KEY" "$API_URL/api/moderation/queue?limit=10&page=2" | \
  python3 -c "
import json, sys
data = json.loads(sys.stdin.read())
if data.get('success'):
    pagination = data.get('pagination', {})
    print(f'   ✅ Успешно!')
    print(f'   Товаров на странице: {len(data[\"data\"])}')
    print(f'   Текущая страница: {pagination.get(\"page\", 0)}')
else:
    print(f'   ❌ Ошибка: {data.get(\"error\")}')
"

echo ""
echo "   Страница 3 (5 товаров на странице):"
curl -s -H "X-API-Key: $API_KEY" "$API_URL/api/moderation/queue?limit=5&page=3" | \
  python3 -c "
import json, sys
data = json.loads(sys.stdin.read())
if data.get('success'):
    pagination = data.get('pagination', {})
    print(f'   ✅ Успешно!')
    print(f'   Товаров на странице: {len(data[\"data\"])}')
    print(f'   Текущая страница: {pagination.get(\"page\", 0)}')
else:
    print(f'   ❌ Ошибка: {data.get(\"error\")}')
"

echo ""
echo "3. Веб-интерфейс с пагинацией доступен по:"
echo "   🌐 http://192.168.1.189:8080"
echo "   📋 Перейдите на вкладку 'Очередь модерации'"
echo ""
echo "4. Ожидаемые элементы на странице:"
echo "   - 📄 Список товаров (по 10 на страницу)"
echo "   - 🔢 Пагинация с номерами страниц"
echo "   - ◀️ ▶️ Кнопки 'Назад' и 'Вперед'"
echo "   - 📊 Информация о странице"
echo "   - 📏 Выбор количества товаров на страницу"
