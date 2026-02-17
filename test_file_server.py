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
