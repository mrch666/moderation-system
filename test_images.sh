#!/bin/bash

echo "🖼️ Тестирование отображения картинок"
echo "==================================="

API_URL="http://localhost:3000/api"
API_KEY="test_api_key_123456"

echo ""
echo "1. Проверка нового endpoint для деталей модерации:"

# Тестируем endpoint для получения деталей
ITEM_ID=11  # ID товара "Колесо аппаратное поворотное"
DETAILS_RESPONSE=$(curl -s -H "X-API-Key: $API_KEY" "$API_URL/moderation/$ITEM_ID")

if echo "$DETAILS_RESPONSE" | grep -q "success"; then
    echo "   ✅ Endpoint работает"
    echo ""
    echo "   📋 Детали товара #$ITEM_ID:"
    echo "$DETAILS_RESPONSE" | python3 -c "
import json, sys
try:
    data = json.loads(sys.stdin.read())
    if data.get('success'):
        item = data['data']
        print(f'   ID: {item[\"id\"]}')
        print(f'   Товар: {item[\"product_id\"]}')
        print(f'   Статус: {item[\"status\"]}')
        print(f'   URL изображения: {item[\"image_url\"]}')
        print(f'   URL загрузки: {item[\"download_url\"]}')
        if item.get('metadata'):
            try:
                meta = json.loads(item['metadata'])
                print(f'   Название: {meta.get(\"name\", \"нет\")}')
                print(f'   Категория: {meta.get(\"category\", \"нет\")}')
            except:
                print('   Метаданные: есть (ошибка парсинга)')
except Exception as e:
    print(f'Ошибка: {e}')
" 2>/dev/null
else
    echo "   ❌ Ошибка: $DETAILS_RESPONSE"
fi

echo ""
echo "2. Проверка очереди с картинками:"

QUEUE_RESPONSE=$(curl -s -H "X-API-Key: $API_KEY" "$API_URL/moderation/queue?limit=3")

if echo "$QUEUE_RESPONSE" | grep -q "success"; then
    echo "   ✅ Очередь доступна"
    TOTAL=$(echo "$QUEUE_RESPONSE" | grep -o '"total":[0-9]*' | cut -d: -f2)
    echo "   📋 Всего в очереди: $TOTAL товаров"
    
    echo ""
    echo "3. Создание тестовой HTML страницы с картинками:"
    
    cat > /tmp/test_images.html << 'HTML'
<!DOCTYPE html>
<html>
<head>
    <title>Тест картинок в очереди</title>
    <style>
        body { font-family: Arial, sans-serif; padding: 20px; }
        .item { 
            border: 1px solid #ddd; 
            padding: 15px; 
            margin: 10px 0; 
            border-radius: 5px;
            display: flex;
            gap: 20px;
        }
        .item-image img { 
            width: 200px; 
            height: 150px; 
            object-fit: cover;
            border-radius: 5px;
        }
        .item-info { flex: 1; }
        .status { 
            padding: 3px 8px; 
            border-radius: 3px; 
            font-size: 0.9em;
        }
        .pending { background: #fff3cd; color: #856404; }
        .approved { background: #d4edda; color: #155724; }
        .rejected { background: #f8d7da; color: #721c24; }
    </style>
</head>
<body>
    <h1>Тест отображения картинок</h1>
    <div id="queue"></div>
    
    <script>
        const API_URL = 'http://localhost:3000/api';
        const API_KEY = 'test_api_key_123456';
        
        async function loadQueue() {
            try {
                const response = await fetch(API_URL + '/moderation/queue?limit=5', {
                    headers: { 'X-API-Key': API_KEY }
                });
                const data = await response.json();
                
                if (data.success) {
                    let html = '';
                    data.data.forEach(item => {
                        let metadata = {};
                        try {
                            if (item.metadata) {
                                metadata = JSON.parse(item.metadata);
                            }
                        } catch(e) {}
                        
                        const statusClass = {
                            'pending': 'pending',
                            'approved': 'approved', 
                            'rejected': 'rejected'
                        }[item.status] || '';
                        
                        html += \`
                        <div class="item">
                            <div class="item-image">
                                <img src="\${item.image_url || 'https://via.placeholder.com/200x150?text=No+Image'}" 
                                     alt="\${metadata.name || item.product_id}"
                                     onerror="this.src='https://via.placeholder.com/200x150?text=Image+Error'">
                            </div>
                            <div class="item-info">
                                <h3>\${metadata.name || item.product_id}</h3>
                                <p><strong>ID:</strong> \${item.id} | <strong>Товар:</strong> \${item.product_id}</p>
                                <p><strong>Статус:</strong> 
                                    <span class="status \${statusClass}">
                                        \${item.status === 'pending' ? '⏳ Ожидает' : 
                                          item.status === 'approved' ? '✅ Одобрено' : '❌ Отклонено'}
                                    </span>
                                </p>
                                <p><strong>Отправлено:</strong> \${new Date(item.submitted_at).toLocaleString('ru-RU')}</p>
                                \${metadata.category ? \`<p><strong>Категория:</strong> \${metadata.category}</p>\` : ''}
                            </div>
                        </div>
                        \`;
                    });
                    
                    document.getElementById('queue').innerHTML = html || '<p>Очередь пуста</p>';
                }
            } catch (error) {
                document.getElementById('queue').innerHTML = \`<div style="color: red;">Ошибка: \${error.message}</div>\`;
            }
        }
        
        loadQueue();
    </script>
</body>
</html>
HTML
    
    echo "   📄 Тестовая страница создана: /tmp/test_images.html"
    echo "   🌐 Откройте в браузере: file:///tmp/test_images.html"
else
    echo "   ❌ Ошибка получения очереди"
fi

echo ""
echo "🌐 Основной веб-интерфейс с картинками:"
echo "   http://192.168.1.189:8080"
echo ""
echo "📋 Инструкция:"
echo "   1. Откройте веб-интерфейс"
echo "   2. Перейдите во вкладку '📋 Очередь'"
echo "   3. Теперь вы должны видеть превью картинок"
echo "   4. Нажмите '🔍 Подробнее' для детальной информации"
