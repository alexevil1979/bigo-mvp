# Быстрое исправление ошибки prerender-manifest.json

## Выполните на сервере:

```bash
# 1. Остановите PM2
pm2 stop nio-frontend

# 2. Перейдите в директорию фронтенда
cd /ssd/www/bigo-mvp/frontend/web

# 3. Удалите старую сборку
rm -rf .next

# 4. Пересоберите Next.js
npm run build

# 5. Проверьте, что файл создан
ls -la .next/prerender-manifest.json

# 6. Запустите PM2 снова
pm2 restart nio-frontend

# 7. Проверьте логи (не должно быть ошибок ENOENT)
pm2 logs nio-frontend --lines 20
```

## Если сборка не работает:

```bash
cd /ssd/www/bigo-mvp/frontend/web

# Полная очистка и переустановка
rm -rf .next node_modules package-lock.json
npm cache clean --force
npm install
npm run build

# Проверка
ls -la .next/prerender-manifest.json

# Запуск
pm2 restart nio-frontend
```

## Проверка:

```bash
# Логи должны быть без ошибок
pm2 logs nio-frontend --lines 30

# Сайт должен работать
curl http://localhost:3000
```

Подробная инструкция: `FIX_PRERENDER_MANIFEST.md`



