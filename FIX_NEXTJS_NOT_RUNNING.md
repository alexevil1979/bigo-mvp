# Исправление: Next.js не запущен на порту 3000

## Проблема

```
curl: (7) Failed to connect to localhost port 3000: Connection refused
```

Это означает, что Next.js не запущен или не слушает на порту 3000.

## Решение

### Шаг 1: Проверьте статус PM2

```bash
pm2 status
```

Если процесс `nio-frontend` отсутствует или имеет статус `stopped`/`errored`, нужно его запустить.

### Шаг 2: Проверьте, что папка .next существует

```bash
cd /ssd/www/bigo-mvp/frontend/web
ls -la .next
```

Если папки нет или она пустая, нужно пересобрать проект.

### Шаг 3: Пересоберите и запустите Next.js

```bash
cd /ssd/www/bigo-mvp/frontend/web

# Остановите PM2 (если процесс существует)
pm2 stop nio-frontend
pm2 delete nio-frontend

# Удалите старую сборку
rm -rf .next

# Пересоберите проект
npm run build

# Запустите через PM2
pm2 start ecosystem.config.js

# Или если используете старую конфигурацию:
# pm2 start npm --name "nio-frontend" -- start
```

### Шаг 4: Проверьте, что Next.js запущен

```bash
# Проверьте статус
pm2 status

# Должен быть процесс nio-frontend со статусом online

# Проверьте логи
pm2 logs nio-frontend --lines 30

# Проверьте, что порт 3000 слушается
netstat -tulpn | grep 3000
# или
ss -tulpn | grep 3000

# Проверьте доступность
curl http://localhost:3000
```

### Шаг 5: Если есть ошибки в логах

```bash
pm2 logs nio-frontend --lines 50
```

Типичные ошибки:
- **Port already in use** - порт 3000 занят другим процессом
- **Cannot find module** - отсутствуют зависимости
- **Build failed** - ошибка сборки

### Шаг 6: Если порт занят

```bash
# Найдите процесс, использующий порт 3000
lsof -i :3000
# или
netstat -tulpn | grep 3000

# Убейте процесс (замените PID на реальный)
kill -9 PID

# Или перезапустите PM2
pm2 restart nio-frontend
```

### Шаг 7: Если сборка не работает

```bash
cd /ssd/www/bigo-mvp/frontend/web

# Удалите node_modules и переустановите зависимости
rm -rf node_modules package-lock.json
npm install

# Попробуйте собрать снова
npm run build

# Если ошибка, проверьте логи
npm run build 2>&1 | tee build.log
```

## Быстрое исправление (полная переустановка)

```bash
cd /ssd/www/bigo-mvp/frontend/web

# 1. Остановите PM2
pm2 stop nio-frontend
pm2 delete nio-frontend

# 2. Очистите все
rm -rf .next node_modules package-lock.json

# 3. Переустановите зависимости
npm install

# 4. Пересоберите
npm run build

# 5. Запустите через PM2
pm2 start ecosystem.config.js

# 6. Проверьте статус
pm2 status
pm2 logs nio-frontend --lines 20

# 7. Проверьте доступность
curl http://localhost:3000
```

## Проверка после запуска

```bash
# 1. PM2 статус
pm2 status

# 2. Проверка порта
netstat -tulpn | grep 3000

# 3. Проверка доступности
curl http://localhost:3000

# 4. Проверка статических файлов
curl http://localhost:3000/_next/static/chunks/webpack.js

# 5. Логи
pm2 logs nio-frontend --lines 30
```

## Автозапуск при перезагрузке сервера

```bash
# Сохраните текущую конфигурацию PM2
pm2 save

# Настройте автозапуск
pm2 startup

# Выполните команду, которую выведет pm2 startup
```

