# Исправление конфликта git pull

## Проблема:
```
error: Your local changes to the following files would be overwritten by merge:
        frontend/web/ecosystem.config.js
```

## Решение - выполните на сервере:

```bash
# 1. Вы находитесь в корневой директории - это правильно
# Убедитесь, что вы в /ssd/www/bigo-mvp
pwd

# 2. Отмените локальные изменения в файле ecosystem.config.js
git checkout -- frontend/web/ecosystem.config.js

# 3. Теперь получите изменения из Git
git pull origin master

# 4. Проверьте, что изменения получены
git log --oneline -1
# Должен показать новый коммит

# 5. Перейдите в директорию фронтенда
cd frontend/web

# 6. Остановите PM2
pm2 stop nio-frontend

# 7. Удалите старую сборку
rm -rf .next

# 8. Пересоберите проект
npm run build

# 9. Запустите PM2 снова
pm2 restart nio-frontend

# 10. Проверьте статус
pm2 status

# 11. Проверьте логи
pm2 logs nio-frontend --lines 30
```

## Альтернативный способ (если нужно сохранить изменения):

```bash
# Сохраните изменения
git stash

# Получите изменения
git pull origin master

# Восстановите изменения (если нужно)
git stash pop

# Затем выполните шаги 5-11 выше
```

## После обновления:

1. Проверьте сайт: https://bigo.1tlt.ru
2. Overlay с ID должен исчезнуть
3. Проверьте логи PM2 - не должно быть ошибок

