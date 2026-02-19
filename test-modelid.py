#!/usr/bin/env python3
import requests
import sys

def test_modelid(modelid_value):
    """Тестирует загрузку с разными modelid"""
    print(f"\n📤 Тестирую modelid: '{modelid_value}'")
    
    # Создаем простой файл для теста
    files = {
        'modelid': (None, modelid_value),
        'file': ('test.jpg', b'fake_image_data', 'image/jpeg')
    }
    
    try:
        response = requests.post(
            'http://img.instrumentstore.ru:7990/api/modelgoods/image/',
            files=files,
            timeout=10
        )
        
        print(f"✅ Ответ сервера: {response.status_code}")
        print(f"   Тело ответа: {response.text[:200]}...")
        
        if response.status_code == 200 or response.status_code == 201:
            print(f"🎉 УСПЕХ! Сервер принял modelid: '{modelid_value}'")
            return True
        else:
            print(f"⚠️ Ошибка: {response.status_code}")
            return False
            
    except Exception as e:
        print(f"❌ Ошибка сети: {e}")
        return False

if __name__ == "__main__":
    print("=== ТЕСТ РАЗНЫХ modelid ДЛЯ СЕРВЕРА ===")
    
    # Тестируем разные форматы
    test_cases = [
        "12345",                    # Только цифры
        "0000010025",               # Цифры с нулями
        "0000010025sD",             # Полный product_id
        "TEST-001",                 # Буквы и цифры
        "product_123",              # С подчеркиванием
        "123-456-789",              # С дефисами
    ]
    
    results = []
    for modelid in test_cases:
        success = test_modelid(modelid)
        results.append((modelid, success))
    
    print("\n=== РЕЗУЛЬТАТЫ ===")
    for modelid, success in results:
        status = "✅ Принят" if success else "❌ Ошибка"
        print(f"{status}: '{modelid}'")
    
    print("\n🎯 ВЫВОД: Сервер должен принимать тот формат modelid,")
    print("который используется в вашей системе для связи товаров с фото.")