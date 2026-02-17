# Используем официальный Node.js образ
FROM node:18-alpine AS builder

# Устанавливаем рабочую директорию
WORKDIR /app

# Копируем package.json и package-lock.json
COPY package*.json ./

# Устанавливаем зависимости
RUN npm ci --only=production

# Копируем исходный код
COPY . .

# Создаем пользователя node для безопасности
RUN addgroup -g 1001 -S nodejs
RUN adduser -S node -u 1001

# Меняем владельца файлов
RUN chown -R node:node /app
USER node

# Экспортируем порт
EXPOSE 3000

# Запускаем приложение
CMD ["node", "src/index.js"]