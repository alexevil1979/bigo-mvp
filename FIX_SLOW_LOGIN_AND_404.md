# Исправление медленного логина и ошибок 404 для статических файлов

## Проблемы
1. Очень медленно логинится
2. При создании стрима только "загрузка"
3. Ошибки 404 для статических файлов Next.js:
   - `GET /_next/static/chunks/98-5e1c799ab952c685.js 404`
   - `GET /_next/static/.../_buildManifest.js 404`
   - `GET /_next/static/.../_ssgManifest.js 404`

## Быстрое исправление на сервере

### Шаг 1: Проверьте статус всех процессов

```bash
pm2 status all
```

Должны быть запущены:
- `bigo-backend` (backend)
- `nio-frontend` (frontend)
- `nio-admin` (admin, если используется)

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
pm2 start nio-frontend
```

### Шаг 3: Проверьте конфигурацию Apache

```bash
sudo nano /etc/apache2/sites-available/bigo-frontend.conf
```

**ВАЖНО:** Убедитесь, что конфигурация включает правильную обработку статических файлов ПЕРЕД основным ProxyPass:

```apache
<VirtualHost *:80>
    ServerName bigo.1tlt.ru
    
    ErrorLog ${APACHE_LOG_DIR}/bigo-frontend-error.log
    CustomLog ${APACHE_LOG_DIR}/bigo-frontend-access.log combined
    
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

### Шаг 4: Проверьте и перезагрузите Apache

```bash
# Проверьте конфигурацию
sudo apache2ctl configtest

# Если OK, перезагрузите Apache
sudo systemctl reload apache2
```

### Шаг 5: Проверьте, что Next.js отвечает локально

```bash
# Проверьте, что Next.js работает на порту 3000
curl http://localhost:3000

# Проверьте статические файлы (должен вернуть содержимое, не 404)
curl -I http://localhost:3000/_next/static/chunks/webpack.js
```

### Шаг 6: Проверьте логи

```bash
# Логи frontend
pm2 logs nio-frontend --lines 50

# Логи backend (для проверки медленного логина)
pm2 logs bigo-backend --lines 50

# Логи Apache
sudo tail -f /var/log/apache2/bigo-frontend-error.log
```

## Все команды одной строкой (для быстрого исправления)

```bash
cd /ssd/www/bigo-mvp/frontend/web && pm2 stop nio-frontend && rm -rf .next && npm run build && pm2 start nio-frontend && sudo apache2ctl configtest && sudo systemctl reload apache2 && pm2 status all
```

## Дополнительная диагностика медленного логина

Если логин все еще медленный после исправления 404:

### 1. Проверьте подключение к MongoDB

```bash
# Проверьте, что MongoDB работает
sudo systemctl status mongod

# Проверьте логи MongoDB
sudo tail -f /var/log/mongodb/mongod.log
```

### 2. Проверьте подключение к backend API

```bash
# Проверьте, что backend отвечает
curl http://localhost:5000/api/health

# Проверьте время ответа
time curl http://localhost:5000/api/auth/me
```

### 3. Проверьте сетевые задержки

```bash
# Проверьте ping до API
ping api.bigo.1tlt.ru

# Проверьте DNS разрешение
nslookup api.bigo.1tlt.ru
```

## Важные моменты

1. **Порядок ProxyPass критичен!** Статические файлы `/_next/static` должны обрабатываться ПЕРЕД основным `ProxyPass /`
2. **Папка .next должна существовать** после `npm run build`
3. **Next.js должен быть запущен** через PM2 на порту 3000
4. **Apache должен иметь модули** `proxy`, `proxy_http`, `rewrite`, `headers`
5. **Медленный логин** может быть связан с:
   - Проблемами подключения к MongoDB
   - Медленным ответом backend API
   - Проблемами сети между frontend и backend
   - Неправильной конфигурацией CORS

## Проверка модулей Apache

```bash
# Проверьте, что все необходимые модули включены
sudo a2enmod proxy
sudo a2enmod proxy_http
sudo a2enmod rewrite
sudo a2enmod headers

# Перезагрузите Apache
sudo systemctl reload apache2
```
