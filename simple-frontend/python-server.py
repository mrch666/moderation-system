#!/usr/bin/env python3
"""
🚀 СУПЕР-ПРОСТОЙ Python HTTP сервер для frontend
Работает на порту 8082
"""

import http.server
import socketserver
import os
import json
from datetime import datetime

PORT = 8082
DIRECTORY = os.path.dirname(os.path.abspath(__file__))

# Конфигурация
CONFIG_JS = """// 🚀 Конфигурация системы модерации
window.MODERATION_CONFIG = {
  "API_URL": "http://localhost:3000/api",
  "API_KEY": "test_api_key_123456",
  "DEBUG": true
};"""

class CustomHandler(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        print(f"[{datetime.now()}] GET {self.path}")
        
        # CORS заголовки
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, X-API-Key')
        
        if self.path == '/':
            self.path = '/simple-index.html'
        
        if self.path == '/config.js':
            self.send_response(200)
            self.send_header('Content-type', 'application/javascript')
            self.send_header('Cache-Control', 'no-cache')
            self.end_headers()
            self.wfile.write(CONFIG_JS.encode())
            return
            
        elif self.path == '/health':
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            response = {
                "status": "OK",
                "service": "Python Frontend Server",
                "port": PORT,
                "timestamp": datetime.now().isoformat()
            }
            self.wfile.write(json.dumps(response).encode())
            return
            
        elif self.path == '/test-simple.html':
            try:
                with open(os.path.join(DIRECTORY, 'test-simple.html'), 'rb') as f:
                    content = f.read()
                self.send_response(200)
                self.send_header('Content-type', 'text/html')
                self.end_headers()
                self.wfile.write(content)
                return
            except:
                pass
        
        # Пробуем найти файл
        file_path = os.path.join(DIRECTORY, self.path[1:])
        if os.path.exists(file_path) and os.path.isfile(file_path):
            return http.server.SimpleHTTPRequestHandler.do_GET(self)
        
        # Если файл не найден
        self.send_response(404)
        self.send_header('Content-type', 'text/plain')
        self.end_headers()
        self.wfile.write(b'Not Found')
    
    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, X-API-Key')
        self.end_headers()

# Меняем рабочую директорию
os.chdir(DIRECTORY)

print(f"🚀 Запуск Python HTTP сервера на порту {PORT}")
print(f"📁 Директория: {DIRECTORY}")
print(f"🌐 Доступ по:")
print(f"   http://localhost:{PORT}")
print(f"   http://127.0.0.1:{PORT}")
print(f"   http://192.168.1.189:{PORT}")
print(f"📋 Endpoints:")
print(f"   /              - Главная страница")
print(f"   /config.js     - Конфигурация")
print(f"   /health        - Проверка здоровья")
print(f"   /test-simple.html - Тестовая страница")

try:
    with socketserver.TCPServer(("0.0.0.0", PORT), CustomHandler) as httpd:
        print(f"✅ Сервер запущен!")
        print("🛑 Для остановки нажмите Ctrl+C")
        httpd.serve_forever()
except OSError as e:
    print(f"❌ Ошибка: {e}")
    print(f"⚠️ Порт {PORT} занят. Пробую порт {PORT + 1}...")
    PORT += 1
    with socketserver.TCPServer(("0.0.0.0", PORT), CustomHandler) as httpd:
        print(f"✅ Сервер запущен на порту {PORT}!")
        print(f"🌐 Откройте: http://192.168.1.189:{PORT}")
        httpd.serve_forever()