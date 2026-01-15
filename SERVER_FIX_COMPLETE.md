# Полное исправление проблем на сервере

## Проблема: Модуль whatwg-url все еще не найден

Хотя сервер запускается, в error.log все еще есть ошибки. Это может быть из-за:
1. Кэшированных модулей
2. Неполной установки зависимостей
3. Конфликтов версий

## Решение: Полная переустановка зависимостей

Выполните на сервере:

```bash
cd /ssd/www/bigo-mvp/backend

# 1. Остановите бэкенд
pm2 stop bigo-backend

# 2. Удалите node_modules и package-lock.json
rm -rf node_modules package-lock.json

# 3. Очистите кэш npm
npm cache clean --force

# 4. Переустановите все зависимости
npm install

# 5. Проверьте, что whatwg-url установлен
npm list whatwg-url

# 6. Запустите бэкенд
pm2 start bigo-backend --update-env

# 7. Проверьте логи (ошибок быть не должно)
pm2 logs bigo-backend --lines 20
```

## Альтернативное решение (если проблема сохраняется)

Если ошибка все еще появляется, попробуйте установить зависимость явно:

```bash
cd /ssd/www/bigo-mvp/backend
npm install whatwg-url@^11.0.0 --save
pm2 restart bigo-backend --update-env
```

## Проверка работы API

После исправления проверьте:

```bash
# Локально
curl http://localhost:5000/api/health

# Извне (если настроен домен)
curl https://api.bigo.1tlt.ru/api/health
```

Ожидаемый результат: `{"status":"ok","timestamp":"..."}`

## Если сервер работает, но ошибки в логах

Если сервер работает (видно "✅ MongoDB подключена"), но в error.log все еще есть ошибки, это могут быть старые записи. Очистите логи:

```bash
pm2 flush bigo-backend
pm2 restart bigo-backend --update-env
pm2 logs bigo-backend --lines 20
```

