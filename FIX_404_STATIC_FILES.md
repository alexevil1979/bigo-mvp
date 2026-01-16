# Исправление ошибок 404 для статических файлов Next.js

## Проблема

Ошибки 404 для статических файлов Next.js:
- `GET /_next/static/chunks/... 404`
- `GET /_next/static/.../_ssgManifest.js 404`
- `GET /_next/static/.../_buildManifest.js 404`

## Решение на сервере

### Шаг 1: Проверьте, что Next.js запущен и файлы собраны

```bash
# Проверьте статус PM2
pm2 status

# Должен быть процесс nio-frontend со статусом online

# Проверьте, что папка .next существует
cd /ssd/www/bigo-mvp/frontend/web
ls -la .next

# Если папки нет или она пустая, пересоберите:
rm -rf .next
npm run build
pm2 restart nio-frontend
```

### Шаг 2: Проверьте конфигурацию Apache

```bash
sudo nano /etc/apache2/sites-available/bigo-frontend.conf
```

**ВАЖНО:** Убедитесь, что конфигурация включает правильную обработку статических файлов:

```apache
<VirtualHost *:80>
    ServerName bigo.1tlt.ru
    
    ErrorLog ${APACHE_LOG_DIR}/bigo-frontend-error.log
    CustomLog ${APACHE_LOG_DIR}/bigo-frontend-access.log combined
    
    ProxyPreserveHost On
    ProxyRequests Off
    
    # КРИТИЧЕСКИ ВАЖНО: Сначала обрабатываем статические файлы Next.js
    # Это должно быть ПЕРЕД основным ProxyPass
    ProxyPass /_next/static http://localhost:3000/_next/static
    ProxyPassReverse /_next/static http://localhost:3000/_next/static
    
    # Затем основной прокси для всего остального
    ProxyPass / http://localhost:3000/
    ProxyPassReverse / http://localhost:3000/
    
    # Заголовки
    RequestHeader set X-Forwarded-Proto "http"
    RequestHeader set X-Forwarded-Port "80"
    RequestHeader set X-Real-IP %{REMOTE_ADDR}s
    
    # WebSocket
    RewriteEngine On
    RewriteCond %{HTTP:Upgrade} =websocket [NC]
    RewriteRule /(.*) ws://localhost:3000/$1 [P,L]
    RewriteCond %{HTTP:Upgrade} !=websocket [NC]
    RewriteRule /(.*) http://localhost:3000/$1 [P,L]
    
    ProxyTimeout 86400
</VirtualHost>
```

**Если используете HTTPS (порт 443):**

```apache
<VirtualHost *:443>
    ServerName bigo.1tlt.ru
    
    ErrorLog ${APACHE_LOG_DIR}/bigo-frontend-ssl-error.log
    CustomLog ${APACHE_LOG_DIR}/bigo-frontend-ssl-access.log combined
    
    # SSL настройки
    SSLEngine on
    SSLCertificateFile /etc/letsencrypt/live/bigo.1tlt.ru/fullchain.pem
    SSLCertificateKeyFile /etc/letsencrypt/live/bigo.1tlt.ru/privkey.pem
    
    ProxyPreserveHost On
    ProxyRequests Off
    
    # КРИТИЧЕСКИ ВАЖНО: Сначала статические файлы
    ProxyPass /_next/static http://localhost:3000/_next/static
    ProxyPassReverse /_next/static http://localhost:3000/_next/static
    
    # Затем основной прокси
    ProxyPass / http://localhost:3000/
    ProxyPassReverse / http://localhost:3000/
    
    # Заголовки для HTTPS
    RequestHeader set X-Forwarded-Proto "https"
    RequestHeader set X-Forwarded-Port "443"
    RequestHeader set X-Real-IP %{REMOTE_ADDR}s
    
    # WebSocket
    RewriteEngine On
    RewriteCond %{HTTP:Upgrade} =websocket [NC]
    RewriteRule /(.*) ws://localhost:3000/$1 [P,L]
    RewriteCond %{HTTP:Upgrade} !=websocket [NC]
    RewriteRule /(.*) http://localhost:3000/$1 [P,L]
    
    ProxyTimeout 86400
</VirtualHost>
```

### Шаг 3: Проверьте и перезагрузите Apache

```bash
# Проверьте конфигурацию
sudo apache2ctl configtest

# Если OK, перезагрузите Apache
sudo systemctl reload apache2
# или
sudo service apache2 reload
```

### Шаг 4: Проверьте, что Next.js отвечает локально

```bash
# Проверьте, что Next.js работает на порту 3000
curl http://localhost:3000

# Проверьте статические файлы
curl http://localhost:3000/_next/static/chunks/webpack.js

# Если не работает, перезапустите Next.js
cd /ssd/www/bigo-mvp/frontend/web
pm2 restart nio-frontend
pm2 logs nio-frontend --lines 30
```

### Шаг 5: Проверьте логи

```bash
# Логи Apache
sudo tail -f /var/log/apache2/bigo-frontend-error.log

# Логи Next.js
pm2 logs nio-frontend --lines 50
```

## Быстрое исправление (если ничего не помогло)

```bash
# 1. Пересоберите Next.js
cd /ssd/www/bigo-mvp/frontend/web
pm2 stop nio-frontend
rm -rf .next
npm run build

# 2. Проверьте конфигурацию Apache
sudo apache2ctl configtest

# 3. Перезапустите все
pm2 restart nio-frontend
sudo systemctl reload apache2

# 4. Проверьте работу
curl http://localhost:3000/_next/static/chunks/webpack.js
```

## Важные моменты

1. **Порядок ProxyPass важен!** Статические файлы должны обрабатываться ПЕРЕД основным прокси
2. **Папка .next должна существовать** после `npm run build`
3. **Next.js должен быть запущен** через PM2 на порту 3000
4. **Apache должен иметь модули** `proxy`, `proxy_http`, `rewrite`, `headers`

