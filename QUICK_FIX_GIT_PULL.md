# Быстрое исправление конфликта git pull

## Выполните на сервере:

```bash
# 1. Перейдите в корневую директорию
cd /ssd/www/bigo-mvp

# 2. Отмените локальные изменения (если они не важны)
git checkout -- backend/scripts/setup-turn.sh

# 3. Обновите код из репозитория
git pull origin master

# 4. Перейдите в директорию фронтенда
cd frontend/web

# 5. Остановите PM2
pm2 stop nio-frontend

# 6. Удалите старую сборку
rm -rf .next

# 7. Пересоберите Next.js
npm run build

# 8. Запустите PM2 снова
pm2 restart nio-frontend

# 9. Проверьте логи (не должно быть ошибок SEO is not defined)
pm2 logs nio-frontend --lines 30
```

## Если нужно сохранить локальные изменения:

```bash
cd /ssd/www/bigo-mvp
git stash
git pull origin master
git stash pop
# Разрешите конфликты, если есть
cd frontend/web
pm2 stop nio-frontend
rm -rf .next
npm run build
pm2 restart nio-frontend
```

Подробная инструкция: `FIX_GIT_PULL_CONFLICT.md`



