# Исправление ошибок 500 и 400 на странице стрима

## Проблема

При загрузке страницы стрима возникают ошибки:
- `500 (Internal Server Error)` на странице стрима
- `400 (Bad Request)` для статических файлов Next.js (`/_next/static/...`)

## Диагностика

### 1. Проверьте логи PM2 для Next.js

```bash
pm2 logs nio-frontend --lines 50
```

Ищите ошибки типа:
- `Cannot find module`
- `EADDRINUSE` (порт занят)
- Ошибки сборки
- Ошибки подключения к API

### 2. Проверьте логи Apache

```bash
sudo tail -f /var/log/apache2/bigo-frontend-error.log
# или
sudo tail -f /var/log/apache2/error.log
```

### 3. Проверьте, что Next.js запущен

```bash
pm2 status
```

Должен быть процесс `nio-frontend` со статусом `online`.

### 4. Проверьте доступность Next.js локально

```bash
curl http://localhost:3000
```

Если не работает, проблема в Next.js, а не в Apache.

## Решения

### Решение 1: Пересборка Next.js

```bash
cd /ssd/www/bigo-mvp/frontend/web

# Остановите PM2
pm2 stop nio-frontend

# Удалите старую сборку
rm -rf .next

# Пересоберите
npm run build

# Запустите снова
pm2 restart nio-frontend
```

### Решение 2: Исправление конфигурации Apache для статических файлов

Проблема с ошибками 400 для `/_next/static/...` часто связана с неправильной конфигурацией Apache.

Отредактируйте конфигурацию Apache:

```bash
sudo nano /etc/apache2/sites-available/bigo-frontend.conf
```

**Важно:** Убедитесь, что конфигурация включает правильную обработку статических файлов:

```apache
<VirtualHost *:80>
    ServerName bigo.1tlt.ru
    
    # Логи
    ErrorLog ${APACHE_LOG_DIR}/bigo-frontend-error.log
    CustomLog ${APACHE_LOG_DIR}/bigo-frontend-access.log combined
    
    ProxyPreserveHost On
    ProxyRequests Off
    
    # ВАЖНО: Сначала обрабатываем статические файлы Next.js
    # Это предотвращает ошибки 400
    ProxyPass /_next/static http://localhost:3000/_next/static
    ProxyPassReverse /_next/static http://localhost:3000/_next/static
    
    # Затем основной прокси для всего остального
    ProxyPass / http://localhost:3000/
    ProxyPassReverse / http://localhost:3000/
    
    # Заголовки для правильной работы прокси
    RequestHeader set X-Forwarded-Proto "http"
    RequestHeader set X-Forwarded-Port "80"
    RequestHeader set X-Real-IP %{REMOTE_ADDR}s
    
    # Для WebSocket (Socket.IO)
    RewriteEngine On
    RewriteCond %{HTTP:Upgrade} =websocket [NC]
    RewriteRule /(.*) ws://localhost:3000/$1 [P,L]
    RewriteCond %{HTTP:Upgrade} !=websocket [NC]
    RewriteRule /(.*) http://localhost:3000/$1 [P,L]
    
    # Таймауты для WebSocket
    ProxyTimeout 86400
</VirtualHost>
```

**Если используете HTTPS:**

```apache
<VirtualHost *:443>
    ServerName bigo.1tlt.ru
    
    # SSL настройки
    SSLEngine on
    SSLCertificateFile /etc/letsencrypt/live/bigo.1tlt.ru/fullchain.pem
    SSLCertificateKeyFile /etc/letsencrypt/live/bigo.1tlt.ru/privkey.pem
    
    ProxyPreserveHost On
    ProxyRequests Off
    
    # ВАЖНО: Сначала обрабатываем статические файлы Next.js
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

### Решение 3: Проверка переменных окружения

Убедитесь, что в `frontend/web/.env.local` или `frontend/web/.env.production` указаны правильные значения:

```bash
cd /ssd/www/bigo-mvp/frontend/web
cat .env.local
# или
cat .env.production
```

Должны быть:
```
NEXT_PUBLIC_API_URL=https://api.bigo.1tlt.ru
NEXT_PUBLIC_SOCKET_URL=https://api.bigo.1tlt.ru
NEXT_PUBLIC_WEB_URL=https://bigo.1tlt.ru
```

### Решение 4: Перезапуск Apache

После изменения конфигурации:

```bash
# Проверьте конфигурацию
sudo apache2ctl configtest

# Если OK, перезагрузите Apache
sudo systemctl reload apache2
# или
sudo service apache2 reload
```

### Решение 5: Проверка прав доступа

Убедитесь, что Apache может читать файлы Next.js:

```bash
# Проверьте права на директорию .next
ls -la /ssd/www/bigo-mvp/frontend/web/.next

# Если нужно, измените права (замените user на вашего пользователя)
sudo chown -R user:user /ssd/www/bigo-mvp/frontend/web/.next
```

### Решение 6: Полная переустановка зависимостей Next.js

Если ничего не помогает:

```bash
cd /ssd/www/bigo-mvp/frontend/web

# Остановите PM2
pm2 stop nio-frontend

# Удалите зависимости и сборку
rm -rf node_modules .next package-lock.json

# Очистите кэш npm
npm cache clean --force

# Переустановите зависимости
npm install

# Пересоберите
npm run build

# Запустите снова
pm2 restart nio-frontend
```

## Проверка после исправления

1. **Проверьте логи PM2:**
   ```bash
   pm2 logs nio-frontend --lines 20
   ```
   Не должно быть ошибок.

2. **Проверьте доступность локально:**
   ```bash
   curl http://localhost:3000
   ```

3. **Проверьте через браузер:**
   Откройте `https://bigo.1tlt.ru` и проверьте консоль браузера (F12) - не должно быть ошибок 400/500.

4. **Проверьте страницу стрима:**
   Откройте `https://bigo.1tlt.ru/stream/[id]` - должна загружаться без ошибок.

## Если проблема сохраняется

1. Проверьте логи Apache в реальном времени:
   ```bash
   sudo tail -f /var/log/apache2/bigo-frontend-error.log
   ```

2. Проверьте логи PM2 в реальном времени:
   ```bash
   pm2 logs nio-frontend
   ```

3. Попробуйте открыть страницу стрима и посмотрите, какие ошибки появляются в логах.

4. Проверьте, что бэкенд работает:
   ```bash
   curl https://api.bigo.1tlt.ru/api/health
   ```



