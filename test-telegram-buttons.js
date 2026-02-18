#!/usr/bin/env node

/**
 * Тест отправки сообщений с кнопками в Telegram
 */

const axios = require('axios');

// Читаем настройки из .env.development
const fs = require('fs');
const path = require('path');

let envVars = {};
try {
    const envPath = path.join(__dirname, '.env.development');
    if (fs.existsSync(envPath)) {
        const envContent = fs.readFileSync(envPath, 'utf8');
        envContent.split('\n').forEach(line => {
            const match = line.match(/^([^=]+)=(.*)$/);
            if (match) {
                envVars[match[1]] = match[2];
            }
        });
    }
} catch (error) {
    console.log('⚠️ Не удалось прочитать .env файл');
}

const telegramBotToken = envVars.TELEGRAM_BOT_TOKEN || process.env.TELEGRAM_BOT_TOKEN;
const telegramChatId = envVars.TELEGRAM_CHAT_ID || process.env.TELEGRAM_CHAT_ID;

if (!telegramBotToken || !telegramChatId) {
    console.error('❌ TELEGRAM_BOT_TOKEN или TELEGRAM_CHAT_ID не установлены');
    process.exit(1);
}

console.log('🔧 Настройки Telegram:');
console.log(`   Bot Token: ${telegramBotToken.substring(0, 10)}...`);
console.log(`   Chat ID: ${telegramChatId}`);
console.log('');

async function testSimpleMessage() {
    console.log('🧪 Тест 1: Простое сообщение без кнопок');
    try {
        const response = await axios.post(
            `https://api.telegram.org/bot${telegramBotToken}/sendMessage`,
            {
                chat_id: telegramChatId,
                text: '🧪 Тестовое сообщение без кнопок',
                disable_web_page_preview: false
            },
            { timeout: 10000 }
        );
        console.log('✅ Успешно! Message ID:', response.data.result.message_id);
        return response.data.result.message_id;
    } catch (error) {
        console.error('❌ Ошибка:', error.response?.data || error.message);
        return null;
    }
}

async function testButtonsWithSimpleText() {
    console.log('\n🧪 Тест 2: Сообщение с кнопками (простой текст)');
    try {
        const response = await axios.post(
            `https://api.telegram.org/bot${telegramBotToken}/sendMessage`,
            {
                chat_id: telegramChatId,
                text: '🧪 Тест с кнопками\nНажмите кнопку ниже:',
                disable_web_page_preview: false,
                reply_markup: {
                    inline_keyboard: [
                        [
                            { text: "✅ Тестовая кнопка 1", callback_data: "test_1" },
                            { text: "❌ Тестовая кнопка 2", callback_data: "test_2" }
                        ]
                    ]
                }
            },
            { timeout: 10000 }
        );
        console.log('✅ Успешно! Message ID:', response.data.result.message_id);
        return response.data.result.message_id;
    } catch (error) {
        console.error('❌ Ошибка:', error.response?.data || error.message);
        return null;
    }
}

async function testButtonsWithRealData() {
    console.log('\n🧪 Тест 3: Сообщение с кнопками (реальные данные)');
    const moderationId = 'test-uuid-1234567890';
    const productId = '000001002Tuz';
    const title = 'Замок накладной Зенит ЗН-1-2.1 (медь)';
    
    const message = `📢 НОВАЯ МОДЕРАЦИЯ!\n\n` +
                   `🆔 ID: ${moderationId}\n` +
                   `📦 Товар: ${productId}\n` +
                   `🏷️ Название: ${title}\n\n` +
                   `⚡ Действия:`;
    
    try {
        const response = await axios.post(
            `https://api.telegram.org/bot${telegramBotToken}/sendMessage`,
            {
                chat_id: telegramChatId,
                text: message,
                disable_web_page_preview: false,
                reply_markup: {
                    inline_keyboard: [
                        [
                            { text: "✅ Одобрить", callback_data: `a_${moderationId}` },
                            { text: "❌ Отклонить", callback_data: `r_${moderationId}` }
                        ]
                    ]
                }
            },
            { timeout: 10000 }
        );
        console.log('✅ Успешно! Message ID:', response.data.result.message_id);
        return response.data.result.message_id;
    } catch (error) {
        console.error('❌ Ошибка:', error.response?.data || error.message);
        return null;
    }
}

async function testButtonsWithShortCallback() {
    console.log('\n🧪 Тест 4: Кнопки с коротким callback_data');
    const moderationId = 'test123'; // Короткий ID для теста
    
    const message = `📢 Тест с коротким callback_data\n\n` +
                   `ID: ${moderationId}`;
    
    try {
        const response = await axios.post(
            `https://api.telegram.org/bot${telegramBotToken}/sendMessage`,
            {
                chat_id: telegramChatId,
                text: message,
                disable_web_page_preview: false,
                reply_markup: {
                    inline_keyboard: [
                        [
                            { text: "✅ Одобрить", callback_data: `a_${moderationId}` },
                            { text: "❌ Отклонить", callback_data: `r_${moderationId}` }
                        ]
                    ]
                }
            },
            { timeout: 10000 }
        );
        console.log('✅ Успешно! Message ID:', response.data.result.message_id);
        console.log('📝 callback_data для кнопок:');
        console.log('   - Одобрить: a_test123');
        console.log('   - Отклонить: r_test123');
        return response.data.result.message_id;
    } catch (error) {
        console.error('❌ Ошибка:', error.response?.data || error.message);
        return null;
    }
}

async function testParseMode() {
    console.log('\n🧪 Тест 5: Разные parse_mode');
    const tests = [
        { name: 'HTML', parse_mode: 'HTML' },
        { name: 'Markdown', parse_mode: 'Markdown' },
        { name: 'MarkdownV2', parse_mode: 'MarkdownV2' },
        { name: 'Без parse_mode', parse_mode: undefined }
    ];
    
    for (const test of tests) {
        console.log(`   Тестирую: ${test.name}`);
        try {
            const response = await axios.post(
                `https://api.telegram.org/bot${telegramBotToken}/sendMessage`,
                {
                    chat_id: telegramChatId,
                    text: `Тест parse_mode: ${test.name || 'нет'}`,
                    parse_mode: test.parse_mode,
                    disable_web_page_preview: false,
                    reply_markup: test.parse_mode ? undefined : {
                        inline_keyboard: [[
                            { text: "✅ Тест", callback_data: "test" }
                        ]]
                    }
                },
                { timeout: 5000 }
            );
            console.log(`   ✅ ${test.name}: успешно`);
        } catch (error) {
            console.log(`   ❌ ${test.name}: ${error.response?.data?.description || error.message}`);
        }
        await new Promise(resolve => setTimeout(resolve, 1000)); // Задержка между запросами
    }
}

async function runTests() {
    console.log('🚀 Запуск тестов Telegram API с кнопками\n');
    
    // Тест 1: Простое сообщение
    await testSimpleMessage();
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Тест 2: Кнопки с простым текстом
    await testButtonsWithSimpleText();
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Тест 3: Кнопки с реальными данными
    await testButtonsWithRealData();
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Тест 4: Короткий callback_data
    await testButtonsWithShortCallback();
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Тест 5: Разные parse_mode
    await testParseMode();
    
    console.log('\n🎉 Все тесты завершены!');
    console.log('\n📋 РЕЗУЛЬТАТЫ:');
    console.log('1. Если тест 1 работает, но тест 2 нет - проблема с кнопками');
    console.log('2. Если тест 4 работает, но тест 3 нет - проблема с длиной callback_data');
    console.log('3. Если тест 5 показывает ошибки - проблема с parse_mode');
}

runTests().catch(console.error);