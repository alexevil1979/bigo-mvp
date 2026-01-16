# Полная пересборка Backend на удаленном сервере

## Шаги для полной пересборки

### 1. Подключитесь к серверу

```bash
ssh root@ваш_сервер
```

### 2. Остановите процесс backend

```bash
pm2 stop bigo-backend
```

### 3. Перейдите в директорию backend

```bash
cd /ssd/www/bigo-mvp/backend
```

### 4. Удалите node_modules и package-lock.json

```bash
rm -rf node_modules
rm -f package-lock.json
```

### 5. Очистите кэш npm

```bash
npm cache clean --force
```

### 6. Установите зависимости заново

```bash
npm install
```

### 7. Запустите процесс backend

```bash
pm2 start bigo-backend
# или если процесс не существует:
pm2 start server.js --name bigo-backend
```

### 8. Проверьте статус

```bash
pm2 status bigo-backend
pm2 logs bigo-backend --lines 50
```

## Все команды одной строкой

```bash
cd /ssd/www/bigo-mvp/backend && pm2 stop bigo-backend && rm -rf node_modules package-lock.json && npm cache clean --force && npm install && pm2 start bigo-backend && pm2 status bigo-backend
```

## Если процесс не существует

Если процесс `bigo-backend` не существует в PM2, создайте его:

```bash
cd /ssd/www/bigo-mvp/backend
pm2 start server.js --name bigo-backend
pm2 save  # Сохранить список процессов
```

## Проверка работы

После пересборки проверьте:

```bash
# Статус процесса
pm2 status bigo-backend

# Логи
pm2 logs bigo-backend --lines 100

# Проверка API
curl http://localhost:5000/api/health
```
