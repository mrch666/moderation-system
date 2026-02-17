const { Telegraf, Markup } = require('telegraf');
const axios = require('axios');
const dotenv = require('dotenv');
const cron = require('node-cron');
const winston = require('winston');

// Загрузка переменных окружения
dotenv.config();

// Настройка логгера
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' }),
    new winston.transports.Console({
      format: winston.format.simple()
    })
  ]
});

// Инициализация бота
const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);

// Конфигурация API
const api = axios.create({
  baseURL: process.env.API_BASE_URL,
  headers: {
    'X-API-Key': process.env.API_KEY
  }
});

// Хранилище для состояний пользователей
const userStates = new Map();

// Команда /start
bot.start(async (ctx) => {
  try {
    const user = ctx.from;
    logger.info(`User started bot: ${user.id} - ${user.username}`);
    
    // Регистрация пользователя в системе
    await api.post('/settings/telegram-chats', {
      chat_id: ctx.chat.id,
      chat_type: ctx.chat.type,
      title: ctx.chat.title || `${user.first_name} ${user.last_name || ''}`.trim(),
      username: user.username
    });
    
    // Определение приветственного сообщения
    let welcomeMessage = `👋 Привет, ${user.first_name}!\n\n`;
    welcomeMessage += `Я бот для модерации изображений товаров.\n\n`;
    welcomeMessage += `Доступные команды:\n`;
    welcomeMessage += `/queue - Показать очередь модерации\n`;
    welcomeMessage += `/stats - Статистика\n`;
    
    if (user.id.toString() === process.env.BOT_ADMIN_CHAT_ID) {
      welcomeMessage += `/settings - Настройки системы\n`;
      welcomeMessage += `/users - Управление пользователями\n`;
    }
    
    await ctx.reply(welcomeMessage);
  } catch (error) {
    logger.error('Start command error:', error);
    await ctx.reply('❌ Произошла ошибка при запуске бота.');
  }
});

// Команда /queue - просмотр очереди
bot.command('queue', async (ctx) => {
  try {
    const response = await api.get('/moderation/queue', {
      params: { limit: 10 }
    });
    
    const queue = response.data.data;
    
    if (queue.length === 0) {
      await ctx.reply('✅ Очередь модерации пуста!');
      return;
    }
    
    let message = `📋 Очередь модерации (${queue.length}):\n\n`;
    
    queue.forEach((item, index) => {
      message += `${index + 1}. ID: ${item.id}\n`;
      message += `   Товар: ${item.product_id}\n`;
      message += `   Статус: ${item.status}\n`;
      message += `   Отправлено: ${new Date(item.submitted_at).toLocaleString()}\n`;
      
      // Кнопки для быстрой модерации
      const buttons = Markup.inlineKeyboard([
        [
          Markup.button.callback('✅ Одобрить', `approve_${item.id}`),
          Markup.button.callback('❌ Отклонить', `reject_${item.id}`)
        ],
        [
          Markup.button.callback('👁️ Просмотр', `view_${item.id}`)
        ]
      ]);
      
      ctx.reply(message, buttons);
      message = ''; // Сбрасываем сообщение для следующего элемента
    });
  } catch (error) {
    logger.error('Queue command error:', error);
    await ctx.reply('❌ Ошибка при получении очереди.');
  }
});

// Команда /stats - статистика
bot.command('stats', async (ctx) => {
  try {
    const response = await api.get('/moderation/stats');
    const stats = response.data.data;
    
    let message = '📊 Статистика модерации:\n\n';
    
    stats.forEach(stat => {
      message += `${stat.status.toUpperCase()}:\n`;
      message += `  Количество: ${stat.count}\n`;
      if (stat.avg_processing_time) {
        const avgMinutes = Math.round(stat.avg_processing_time / 60);
        message += `  Среднее время: ${avgMinutes} мин\n`;
      }
      message += '\n';
    });
    
    await ctx.reply(message);
  } catch (error) {
    logger.error('Stats command error:', error);
    await ctx.reply('❌ Ошибка при получении статистики.');
  }
});

// Команда /settings - настройки (только для админов)
bot.command('settings', async (ctx) => {
  try {
    if (ctx.from.id.toString() !== process.env.BOT_ADMIN_CHAT_ID) {
      await ctx.reply('❌ Эта команда доступна только администраторам.');
      return;
    }
    
    const response = await api.get('/settings');
    const settings = response.data.data;
    
    let message = '⚙️ Настройки системы:\n\n';
    
    Object.keys(settings).forEach(category => {
      message += `${category.toUpperCase()}:\n`;
      Object.keys(settings[category]).forEach(key => {
        message += `  ${key}: ${settings[category][key]}\n`;
      });
      message += '\n';
    });
    
    const buttons = Markup.inlineKeyboard([
      [
        Markup.button.callback('🔄 Обновить настройки', 'refresh_settings'),
        Markup.button.callback('📝 Изменить', 'edit_settings')
      ]
    ]);
    
    await ctx.reply(message, buttons);
  } catch (error) {
    logger.error('Settings command error:', error);
    await ctx.reply('❌ Ошибка при получении настроек.');
  }
});

// Команда /users - управление пользователями (только для админов)
bot.command('users', async (ctx) => {
  try {
    if (ctx.from.id.toString() !== process.env.BOT_ADMIN_CHAT_ID) {
      await ctx.reply('❌ Эта команда доступна только администраторам.');
      return;
    }
    
    const response = await api.get('/settings/users', {
      params: { limit: 20 }
    });
    
    const users = response.data.data;
    
    let message = '👥 Пользователи системы:\n\n';
    
    users.forEach((user, index) => {
      message += `${index + 1}. ${user.username || 'Без имени'}\n`;
      message += `   ID: ${user.id}\n`;
      message += `   Telegram: ${user.telegram_id || 'Нет'}\n`;
      message += `   Роль: ${user.role}\n`;
      message += `   Активен: ${user.is_active ? '✅' : '❌'}\n\n`;
    });
    
    const buttons = Markup.inlineKeyboard([
      [
        Markup.button.callback('🔄 Обновить', 'refresh_users'),
        Markup.button.callback('👑 Изменить роль', 'edit_user_role')
      ]
    ]);
    
    await ctx.reply(message, buttons);
  } catch (error) {
    logger.error('Users command error:', error);
    await ctx.reply('❌ Ошибка при получении списка пользователей.');
  }
});

// Обработка callback-запросов (кнопки)
bot.on('callback_query', async (ctx) => {
  try {
    const data = ctx.callbackQuery.data;
    
    // Обработка одобрения
    if (data.startsWith('approve_')) {
      const moderationId = data.split('_')[1];
      
      await api.put(`/moderation/${moderationId}/moderate`, {
        status: 'approved'
      });
      
      await ctx.answerCbQuery('✅ Изображение одобрено!');
      await ctx.editMessageText(`✅ Модерация #${moderationId} одобрена.`);
    }
    
    // Обработка отклонения
    else if (data.startsWith('reject_')) {
      const moderationId = data.split('_')[1];
      
      await api.put(`/moderation/${moderationId}/moderate`, {
        status: 'rejected'
      });
      
      await ctx.answerCbQuery('❌ Изображение отклонено!');
      await ctx.editMessageText(`❌ Модерация #${moderationId} отклонена.`);
    }
    
    // Обработка просмотра
    else if (data.startsWith('view_')) {
      const moderationId = data.split('_')[1];
      
      const response = await api.get(`/moderation/status/${moderationId}`);
      const moderation = response.data.data;
      
      let message = `👁️ Просмотр модерации #${moderationId}:\n\n`;
      message += `Товар: ${moderation.product_id}\n`;
      message += `Статус: ${moderation.status}\n`;
      message += `Отправлено: ${new Date(moderation.submitted_at).toLocaleString()}\n`;
      
      if (moderation.moderated_at) {
        message += `Модерировано: ${new Date(moderation.moderated_at).toLocaleString()}\n`;
      }
      
      await ctx.answerCbQuery();
      await ctx.reply(message);
    }
    
    // Обновление настроек
    else if (data === 'refresh_settings') {
      await ctx.answerCbQuery('🔄 Обновляем настройки...');
      await ctx.deleteMessage();
      await ctx.reply('/settings');
    }
    
    // Обновление пользователей
    else if (data === 'refresh_users') {
      await ctx.answerCbQuery('🔄 Обновляем список пользователей...');
      await ctx.deleteMessage();
      await ctx.reply('/users');
    }
    
  } catch (error) {
    logger.error('Callback query error:', error);
    await ctx.answerCbQuery('❌ Произошла ошибка!');
  }
});

// Функция для отправки уведомлений о новых модерациях
async function checkNewModerations() {
  try {
    const response = await api.get('/moderation/queue', {
      params: { limit: 5 }
    });
    
    const queue = response.data.data;
    
    if (queue.length > 0) {
      // Получаем список чатов для уведомлений
      const chatsResponse = await api.get('/settings/telegram-chats');
      const chats = chatsResponse.data.data;
      
      // Отправляем уведомления в каждый чат
      for (const chat of chats) {
        if (chat.settings?.notifications) {
          try {
            await bot.telegram.sendMessage(
              chat.chat_id,
              `📢 Новые модерации в очереди: ${queue.length} шт.\nИспользуйте /queue для просмотра.`
            );
          } catch (error) {
            logger.error(`Failed to send notification to chat ${chat.chat_id}:`, error);
          }
        }
      }
    }
  } catch (error) {
    logger.error('Check new moderations error:', error);
  }
}

// Запуск периодической проверки
if (process.env.BOT_NOTIFICATION_INTERVAL) {
  const interval = parseInt(process.env.BOT_NOTIFICATION_INTERVAL);
  setInterval(checkNewModerations, interval);
  logger.info(`Notification checking started with interval: ${interval}ms`);
}

// Запуск бота
bot.launch()
  .then(() => {
    logger.info('🤖 Telegram bot started successfully');
    console.log('🤖 Telegram bot is running...');
  })
  .catch((error) => {
    logger.error('Bot launch error:', error);
    console.error('❌ Failed to start bot:', error);
  });

// Graceful shutdown
process.once('SIGINT', () => {
  bot.stop('SIGINT');
  logger.info('Bot stopped by SIGINT');
});

process.once('SIGTERM', () => {
  bot.stop('SIGTERM');
  logger.info('Bot stopped by SIGTERM');
});

module.exports = bot;