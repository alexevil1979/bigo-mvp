# Исправление проблем на сервере

## Проблема 1: Отсутствует модуль 'whatwg-url'

**Ошибка:** `Error: Cannot find module 'whatwg-url'`

**Решение:**

На сервере выполните:

```bash
cd /ssd/www/bigo-mvp/backend
npm install whatwg-url
# или переустановите все зависимости
npm install
pm2 restart bigo-backend --update-env
```

Модуль `whatwg-url` добавлен в `package.json`, поэтому после `git pull` и `npm install` он установится автоматически.

## Проблема 2: ERR_CONNECTION_TIMED_OUT

**Причина:** Бэкенд не отвечает или недоступен извне.

**Проверка:**

1. **Проверьте статус бэкенда:**
   ```bash
   pm2 status
   pm2 logs bigo-backend --lines 20
   ```

2. **Проверьте доступность локально:**
   ```bash
   curl http://localhost:5000/api/health
   ```

3. **Проверьте доступность извне:**
   ```bash
   curl https://api.bigo.1tlt.ru/api/health
   ```

4. **Проверьте настройки Nginx/Reverse Proxy:**
   - Убедитесь, что проксирование настроено на `http://localhost:5000`
   - Проверьте SSL сертификат
   - Проверьте firewall

5. **Проверьте CORS:**
   ```bash
   # В .env должно быть:
   CORS_ORIGIN=https://bigo-mvp.vercel.app,https://bigo-mvp-sv4h.vercel.app
   ```

## Проблема 3: 404 для favicon.ico

**Решение:**

Файл `favicon.ico` должен быть в `frontend/web/public/favicon.ico`. 

Если файла нет, скопируйте его туда или создайте простой favicon.

## Быстрое исправление всех проблем:

```bash
# 1. Обновите код
cd /ssd/www/bigo-mvp
git pull origin master

# 2. Установите зависимости
cd backend
npm install

# 3. Перезапустите бэкенд
pm2 restart bigo-backend --update-env

# 4. Проверьте логи
pm2 logs bigo-backend --lines 30
```



