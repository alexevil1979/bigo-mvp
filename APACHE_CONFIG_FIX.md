# Исправление конфигурации Apache для Next.js

## Текущая конфигурация (НЕПРАВИЛЬНАЯ)

```apache
# Основной прокси для Next.js
ProxyPass / http://localhost:3000/
ProxyPassReverse / http://localhost:3000/

# Заголовки для правильной работы прокси
```

## ПРАВИЛЬНАЯ конфигурация

```apache
# ВАЖНО: Сначала обрабатываем статические файлы Next.js
# Это должно быть ПЕРЕД основным ProxyPass /
ProxyPass /_next/static http://localhost:3000/_next/static
ProxyPassReverse /_next/static http://localhost:3000/_next/static

# Затем основной прокси для всего остального
ProxyPass / http://localhost:3000/
ProxyPassReverse / http://localhost:3000/

# Заголовки для правильной работы прокси
RequestHeader set X-Forwarded-Proto "http"
RequestHeader set X-Forwarded-Port "80"
RequestHeader set X-Real-IP %{REMOTE_ADDR}s
```

## Полная конфигурация для HTTP (порт 80)

```apache
<VirtualHost *:80>
    ServerName bigo.1tlt.ru
    
    ErrorLog ${APACHE_LOG_DIR}/bigo-frontend-error.log
    CustomLog ${APACHE_LOG_DIR}/bigo-frontend-access.log combined
    
    ProxyPreserveHost On
    ProxyRequests Off
    
    # КРИТИЧЕСКИ ВАЖНО: Сначала статические файлы Next.js
    ProxyPass /_next/static http://localhost:3000/_next/static
    ProxyPassReverse /_next/static http://localhost:3000/_next/static
    
    # Затем основной прокси
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

## Полная конфигурация для HTTPS (порт 443)

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
    
    # КРИТИЧЕСКИ ВАЖНО: Сначала статические файлы Next.js
    ProxyPass /_next/static http://localhost:3000/_next/static
    ProxyPassReverse /_next/static http://localhost:3000/_next/static
    
    # Затем основной прокси
    ProxyPass / http://localhost:3000/
    ProxyPassReverse / http://localhost:3000/
    
    # Заголовки для HTTPS
    RequestHeader set X-Forwarded-Proto "https"
    RequestHeader set X-Forwarded-Port "443"
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

## Как применить на сервере

```bash
# 1. Отредактируйте конфигурацию Apache
sudo nano /etc/apache2/sites-available/bigo-frontend.conf

# 2. Добавьте строки для статических файлов ПЕРЕД основным ProxyPass /
# ProxyPass /_next/static http://localhost:3000/_next/static
# ProxyPassReverse /_next/static http://localhost:3000/_next/static

# 3. Проверьте конфигурацию
sudo apache2ctl configtest

# 4. Перезагрузите Apache
sudo systemctl reload apache2
```

## Почему это важно?

Без правильной обработки `/_next/static` Apache пытается обработать эти запросы через основной прокси, что может вызывать ошибки 404 или неправильную маршрутизацию. Статические файлы Next.js должны обрабатываться напрямую.

