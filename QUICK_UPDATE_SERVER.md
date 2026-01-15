# Быстрое обновление сервера

## Выполните эти команды на сервере:

```bash
# 1. Перейдите в корневую директорию проекта
cd /ssd/www/bigo-mvp

# 2. Получите последние изменения из Git
git pull origin master

# 3. Обновите фронтенд
cd frontend/web
pm2 stop nio-frontend
rm -rf .next
npm run build
pm2 restart nio-frontend

# 4. Обновите бэкенд (если были изменения в backend)
cd ../../backend
pm2 restart bigo-backend --update-env

# 5. Проверьте статус
pm2 status

# 6. Проверьте логи фронтенда
pm2 logs nio-frontend --lines 20
```

## Если есть конфликты при git pull:

```bash
cd /ssd/www/bigo-mvp

# Отмените локальные изменения (если они не важны)
git checkout -- .

# Или сохраните их
git stash

# Затем повторите git pull
git pull origin master

# Если использовали stash, восстановите изменения
git stash pop
```

## Если сборка не удалась:

```bash
cd /ssd/www/bigo-mvp/frontend/web

# Остановите PM2
pm2 stop nio-frontend

# Удалите старую сборку и зависимости
rm -rf .next node_modules package-lock.json

# Переустановите зависимости
npm install

# Пересоберите проект
npm run build

# Запустите PM2
pm2 restart nio-frontend

# Проверьте логи
pm2 logs nio-frontend --lines 30
```

## Проверка после обновления:

1. Откройте сайт в браузере: https://bigo.1tlt.ru
2. Проверьте, что изменения видны (например, overlay с ID должен быть скрыт)
3. Проверьте логи: `pm2 logs nio-frontend --lines 30`

Подробная инструкция: `UPDATE_SERVER.md`

