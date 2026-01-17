# Быстрое исправление 404 ошибок и пропавших превью

## Проблема
- Пропали превью стримов
- Ошибки 404 для статических файлов Next.js:
  - `_buildManifest.js 404`
  - `_ssgManifest.js 404`

## Быстрое исправление на сервере

### Шаг 1: Проверьте статус PM2

```bash
pm2 status all
```

Должен быть запущен `nio-frontend` со статусом `online`.

### Шаг 2: Пересоберите Frontend

```bash
cd /ssd/www/bigo-mvp/frontend/web

# Остановите frontend
pm2 stop nio-frontend

# Удалите старую сборку
rm -rf .next

# Пересоберите
npm run build

# Запустите frontend
pm2 start ecosystem.config.js

# Проверьте статус
pm2 status nio-frontend
```

### Шаг 3: Проверьте, что Next.js отвечает локально

```bash
# Проверьте, что Next.js работает на порту 3000
curl http://localhost:3000

# Проверьте статические файлы
curl -I http://localhost:3000/_next/static/chunks/webpack.js
```

### Шаг 4: Проверьте конфигурацию Apache

```bash
sudo nano /etc/apache2/sites-available/bigo-frontend.conf
```

**ВАЖНО:** Убедитесь, что конфигурация включает правильную обработку статических файлов ПЕРЕД основным ProxyPass:

```apache
<VirtualHost *:80>
    ServerName bigo.1tlt.ru
    
    ProxyPreserveHost On
    ProxyRequests Off
    
    # КРИТИЧЕСКИ ВАЖНО: Сначала статические файлы Next.js
    # Это должно быть ПЕРЕД основным ProxyPass /
    ProxyPass /_next/static http://localhost:3000/_next/static
    ProxyPassReverse /_next/static http://localhost:3000/_next/static
    
    # Затем основной прокси для всего остального
    ProxyPass / http://localhost:3000/
    ProxyPassReverse / http://localhost:3000/
    
    # Заголовки
    RequestHeader set X-Forwarded-Proto "http"
    RequestHeader set X-Forwarded-Port "80"
    RequestHeader set X-Real-IP %{REMOTE_ADDR}s
    
    # WebSocket для Socket.IO
    RewriteEngine On
    RewriteCond %{HTTP:Upgrade} =websocket [NC]
    RewriteRule /(.*) ws://localhost:3000/$1 [P,L]
    RewriteCond %{HTTP:Upgrade} !=websocket [NC]
    RewriteRule /(.*) http://localhost:3000/$1 [P,L]
    
    ProxyTimeout 86400
</VirtualHost>
```

### Шаг 5: Проверьте и перезагрузите Apache

```bash
# Проверьте конфигурацию
sudo apache2ctl configtest

# Если OK, перезагрузите Apache
sudo systemctl reload apache2
```

### Шаг 6: Проверьте логи

```bash
# Логи frontend
pm2 logs nio-frontend --lines 50

# Логи Apache
sudo tail -f /var/log/apache2/bigo-frontend-error.log
```

## Все команды одной строкой (быстрое исправление)

```bash
cd /ssd/www/bigo-mvp/frontend/web && pm2 stop nio-frontend && rm -rf .next && npm run build && pm2 start ecosystem.config.js && sleep 3 && curl http://localhost:3000 && sudo apache2ctl configtest && sudo systemctl reload apache2 && pm2 status nio-frontend
```

## Если проблема сохраняется

### Проверьте, что папка .next существует и содержит файлы

```bash
cd /ssd/www/bigo-mvp/frontend/web
ls -la .next/static/
```

Должны быть папки с файлами.

### Проверьте, что порт 3000 прослушивается

```bash
netstat -tlnp | grep 3000
```

### Проверьте модули Apache

```bash
# Убедитесь, что все модули включены
sudo a2enmod proxy
sudo a2enmod proxy_http
sudo a2enmod rewrite
sudo a2enmod headers

# Перезагрузите Apache
sudo systemctl reload apache2
```

## Диагностика превью

Если превью все еще не отображаются после исправления 404:

1. **Проверьте, что скриншоты загружаются на сервер:**
   ```bash
   ls -lah /ssd/www/bigo-mvp/backend/uploads/streams/screenshots/
   ```

2. **Проверьте логи backend на ошибки загрузки скриншотов:**
   ```bash
   pm2 logs bigo-backend --lines 100 | grep -i screenshot
   ```

3. **Проверьте, что API возвращает скриншоты:**
   ```bash
   curl http://localhost:5000/api/streams
   ```

4. **Проверьте консоль браузера (F12) на ошибки загрузки изображений**
