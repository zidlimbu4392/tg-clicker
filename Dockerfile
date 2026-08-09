FROM node:20-alpine

# Устанавливаем зависимости для сборки better-sqlite3 (C++ компилятор и Python)
RUN apk add --no-cache python3 make g++

WORKDIR /app

# Копируем package.json и устанавливаем зависимости
COPY package*.json ./
RUN npm install

# Копируем остальной исходный код
COPY . .

# Собираем Next.js приложение
RUN npm run build

# Создаем папку для базы данных SQLite, чтобы она была доступна для монтирования томов
RUN mkdir -p /app/data

# Настраиваем окружение
ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

# Запускаем приложение
CMD ["npm", "start"]
