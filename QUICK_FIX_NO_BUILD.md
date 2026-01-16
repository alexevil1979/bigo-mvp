# Быстрое исправление: Could not find a production build

## Проблема

```
Error: Could not find a production build in the '.next' directory. 
Try building your app with 'next build' before starting the production server.
```

## Решение (выполните на сервере):

```bash
# 1. Остановите PM2
pm2 stop nio-frontend

# 2. Перейдите в директорию фронтенда
cd /ssd/www/bigo-mvp/frontend/web

# 3. Удалите старую сборку (если есть)
rm -rf .next

# 4. Выполните полную пересборку
npm run build

# 5. Дождитесь завершения сборки!
# Должно быть:
# ✓ Compiled successfully
# ✓ Collecting page data
# ✓ Generating static pages (25/25)

# 6. Проверьте, что файл BUILD_ID создан
ls -la .next/BUILD_ID

# 7. Запустите PM2 снова
pm2 restart nio-frontend

# 8. Проверьте логи (не должно быть ошибок)
pm2 logs nio-frontend --lines 30
```

## Если сборка не завершается успешно:

```bash
cd /ssd/www/bigo-mvp/frontend/web

# Полная очистка
rm -rf .next node_modules package-lock.json

# Очистка кэша
npm cache clean --force

# Переустановка зависимостей
npm install

# Пересборка
npm run build

# Проверка
ls -la .next/BUILD_ID

# Запуск
pm2 restart nio-frontend
```

## Проверка:

```bash
# 1. Проверьте статус PM2
pm2 status
# Должен быть online

# 2. Проверьте порт
sudo netstat -tulpn | grep 3000
# Должен слушаться

# 3. Проверьте локально
curl http://localhost:3000
# Должен вернуться HTML

# 4. Проверьте сайт
# Откройте https://bigo.1tlt.ru - должно работать без ошибок 503
```

## Важно:

- **Дождитесь полного завершения сборки!** Это может занять 1-3 минуты.
- **Не запускайте PM2 до завершения сборки!**
- **Проверьте, что файл `.next/BUILD_ID` существует после сборки.**



