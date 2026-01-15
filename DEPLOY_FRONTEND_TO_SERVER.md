# Пошаговая инструкция: Деплой фронтенда на локальный сервер

## 📋 Предварительные требования

- Сервер с установленным Node.js (версия 18+)
- PM2 установлен глобально (`npm install -g pm2`)
- Nginx или Apache установлен
- Git установлен
- Домен настроен и указывает на сервер

---

## Шаг 1: Подготовка на сервере

### 1.1. Подключитесь к серверу по SSH

```bash
ssh root@your-server-ip
# или
ssh user@your-server-ip
```

### 1.2. Перейдите в директорию проекта (или создайте новую)

```bash
cd /ssd/www/bigo-mvp
# или
cd /var/www/bigo-mvp
```

### 1.3. Обновите код из репозитория

```bash
git pull origin master
```

---

## Шаг 2: Установка зависимостей фронтенда

### 2.1. Перейдите в директорию фронтенда

```bash
cd frontend/web
```

### 2.2. Установите зависимости

```bash
npm install
```

**Важно:** Если возникают ошибки с правами, используйте:
```bash
npm install --unsafe-perm=true
```

---

## Шаг 3: Настройка переменных окружения

### 3.1. Создайте файл `.env.local` в `frontend/web/`

```bash
nano .env.local
```

### 3.2. Добавьте следующие переменные:

```env
# API URL (замените на ваш домен)
NEXT_PUBLIC_API_URL=https://api.bigo.1tlt.ru
# или если без SSL:
# NEXT_PUBLIC_API_URL=http://api.bigo.1tlt.ru

# Socket.IO URL (должен совпадать с API URL)
NEXT_PUBLIC_SOCKET_URL=https://api.bigo.1tlt.ru
# или если без SSL:
# NEXT_PUBLIC_SOCKET_URL=http://api.bigo.1tlt.ru

# Stripe (если используете)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your_stripe_key_here

# TURN сервер для WebRTC (опционально, для мобильных)
NEXT_PUBLIC_WEBRTC_TURN_SERVER=turn:your-turn-server.com:3478
NEXT_PUBLIC_WEBRTC_TURN_USERNAME=your_username
NEXT_PUBLIC_WEBRTC_TURN_PASSWORD=your_password

# Порт для Next.js (по умолчанию 3000)
PORT=3000
```

### 3.3. Сохраните файл (Ctrl+O, Enter, Ctrl+X)

---

## Шаг 4: Сборка проекта

### 4.1. Соберите production версию

```bash
npm run build
```

**Примечание:** Сборка может занять 2-5 минут. Если возникают ошибки, проверьте логи.

### 4.2. Проверьте, что сборка прошла успешно

Должна появиться папка `.next` с собранными файлами.

---

## Шаг 5: Настройка PM2

### 5.1. Создайте конфигурационный файл PM2

В директории `frontend/web/` создайте файл `ecosystem.config.js`:

```bash
nano ecosystem.config.js
```

### 5.2. Добавьте следующую конфигурацию:

```javascript
module.exports = {
  apps: [{
    name: 'nio-frontend',
    script: 'npm',
    args: 'start',
    cwd: '/ssd/www/bigo-mvp/frontend/web',
    instances: 1,
    exec_mode: 'fork',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: '/root/.pm2/logs/nio-frontend-error.log',
    out_file: '/root/.pm2/logs/nio-frontend-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    autorestart: true,
    max_memory_restart: '500M'
  }]
};
```

**Важно:** Замените путь `/ssd/www/bigo-mvp/frontend/web` на ваш реальный путь.

### 5.3. Сохраните файл

---

## Шаг 6: Запуск через PM2

### 6.1. Запустите приложение

```bash
pm2 start ecosystem.config.js
```

### 6.2. Проверьте статус

```bash
pm2 status
```

Должен появиться процесс `nio-frontend` со статусом `online`.

### 6.3. Сохраните конфигурацию PM2

```bash
pm2 save
```

### 6.4. Настройте автозапуск при перезагрузке сервера

```bash
pm2 startup
```

Выполните команду, которую выведет PM2 (обычно что-то вроде `sudo env PATH=... pm2 startup systemd -u root --hp /root`).

---

## Шаг 7: Настройка Nginx (Reverse Proxy)

### 7.1. Создайте конфигурационный файл Nginx

```bash
sudo nano /etc/nginx/sites-available/bigo-frontend
```

### 7.2. Добавьте следующую конфигурацию:

```nginx
server {
    listen 80;
    server_name bigo.1tlt.ru;  # Замените на ваш домен

    # Редирект на HTTPS (если используете SSL)
    # return 301 https://$server_name$request_uri;

    # Если без SSL, используйте эту секцию:
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Таймауты для WebSocket
        proxy_read_timeout 86400;
        proxy_send_timeout 86400;
    }

    # Для статических файлов (опционально, для оптимизации)
    location /_next/static {
        proxy_pass http://localhost:3000;
        proxy_cache_valid 200 60m;
        add_header Cache-Control "public, immutable";
    }
}
```

### 7.3. Если используете HTTPS, добавьте секцию для SSL:

```nginx
server {
    listen 443 ssl http2;
    server_name bigo.1tlt.ru;

    ssl_certificate /etc/letsencrypt/live/bigo.1tlt.ru/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/bigo.1tlt.ru/privkey.pem;
    
    # SSL настройки
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        proxy_read_timeout 86400;
        proxy_send_timeout 86400;
    }
}
```

### 7.4. Активируйте конфигурацию

```bash
sudo ln -s /etc/nginx/sites-available/bigo-frontend /etc/nginx/sites-enabled/
```

### 7.5. Проверьте конфигурацию Nginx

```bash
sudo nginx -t
```

Должно быть: `nginx: configuration file /etc/nginx/nginx.conf test is successful`

### 7.6. Перезагрузите Nginx

```bash
sudo systemctl reload nginx
# или
sudo service nginx reload
```

---

## Шаг 8: Настройка Apache (если используете Apache вместо Nginx)

### 8.1. Включите необходимые модули

```bash
sudo a2enmod proxy
sudo a2enmod proxy_http
sudo a2enmod proxy_wstunnel
sudo a2enmod rewrite
sudo a2enmod headers
sudo a2enmod ssl  # обязательно для HTTPS

# Перезагрузите Apache для применения модулей
sudo systemctl restart apache2
```

**Важно:** Модуль `ssl` нужен обязательно, даже если SSL еще не настроен. Он понадобится после получения сертификата через Certbot.

**Проверка модулей:**
```bash
apache2ctl -M | grep -E "proxy|rewrite|headers|ssl"
```

Должны быть: `proxy_module`, `proxy_http_module`, `proxy_wstunnel_module`, `rewrite_module`, `headers_module`, `ssl_module` (если используете HTTPS)

### 8.2. Создайте конфигурационный файл

```bash
sudo nano /etc/apache2/sites-available/bigo-frontend.conf
```

### 8.3. Добавьте конфигурацию:

```apache
<VirtualHost *:80>
    ServerName bigo.1tlt.ru
    
    # Логи
    ErrorLog ${APACHE_LOG_DIR}/bigo-frontend-error.log
    CustomLog ${APACHE_LOG_DIR}/bigo-frontend-access.log combined
    
    # Редирект на HTTPS (если используете SSL) - раскомментируйте:
    # Redirect permanent / https://bigo.1tlt.ru/
    
    # Если без SSL, используйте эту секцию:
    ProxyPreserveHost On
    ProxyRequests Off
    
    # Основной прокси для Next.js
    ProxyPass / http://localhost:3000/
    ProxyPassReverse / http://localhost:3000/
    
    # Заголовки для правильной работы прокси
    ProxyPassReverse / http://localhost:3000/
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

# Если используете HTTPS:
<VirtualHost *:443>
    ServerName bigo.1tlt.ru
    
    # Логи
    ErrorLog ${APACHE_LOG_DIR}/bigo-frontend-ssl-error.log
    CustomLog ${APACHE_LOG_DIR}/bigo-frontend-ssl-access.log combined
    
    # SSL настройки
    SSLEngine on
    SSLCertificateFile /etc/letsencrypt/live/bigo.1tlt.ru/fullchain.pem
    SSLCertificateKeyFile /etc/letsencrypt/live/bigo.1tlt.ru/privkey.pem
    
    # SSL Security
    SSLProtocol all -SSLv3 -TLSv1 -TLSv1.1
    SSLCipherSuite ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384
    SSLHonorCipherOrder off
    
    # Proxy настройки
    ProxyPreserveHost On
    ProxyRequests Off
    
    ProxyPass / http://localhost:3000/
    ProxyPassReverse / http://localhost:3000/
    
    # Заголовки для HTTPS
    RequestHeader set X-Forwarded-Proto "https"
    RequestHeader set X-Forwarded-Port "443"
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

### 8.4. Активируйте сайт

```bash
sudo a2ensite bigo-frontend.conf
```

### 8.5. Проверьте конфигурацию

```bash
sudo apache2ctl configtest
```

### 8.6. Перезагрузите Apache

```bash
sudo systemctl reload apache2
# или
sudo service apache2 reload
```

---

## Шаг 9: Проверка работы

### 9.1. Проверьте, что Next.js приложение запущено

```bash
pm2 logs nio-frontend --lines 50
```

Должно быть что-то вроде:
```
ready - started server on 0.0.0.0:3000
```

### 9.2. Проверьте доступность через локальный порт

```bash
curl http://localhost:3000
```

Должен вернуться HTML код страницы.

### 9.3. Проверьте через домен

Откройте в браузере: `http://bigo.1tlt.ru` (или `https://bigo.1tlt.ru` если настроен SSL)

---

## Шаг 10: Настройка SSL для Apache (обязательно для продакшена)

### 10.1. Установите Certbot для Apache

```bash
sudo apt-get update
sudo apt-get install certbot python3-certbot-apache
```

### 10.2. Убедитесь, что Apache запущен и конфигурация работает

```bash
# Проверьте, что Apache работает
sudo systemctl status apache2

# Проверьте конфигурацию
sudo apache2ctl configtest
```

**Важно:** Перед получением SSL-сертификата убедитесь, что:
- Домен `bigo.1tlt.ru` указывает на IP вашего сервера (A-запись в DNS)
- Apache настроен и отвечает на HTTP (порт 80 открыт)
- Конфигурация `bigo-frontend.conf` активна и работает

### 10.3. Получите SSL-сертификат через Certbot

```bash
sudo certbot --apache -d bigo.1tlt.ru
```

**Во время установки Certbot спросит:**
1. Email для уведомлений (введите ваш email)
2. Согласие с условиями (нажмите `A` для Agree)
3. Редирект HTTP на HTTPS (выберите `2` для Redirect - рекомендуется)

Certbot автоматически:
- Получит SSL-сертификат от Let's Encrypt
- Настроит конфигурацию Apache для HTTPS
- Добавит редирект с HTTP на HTTPS
- Настроит автоматическое обновление сертификата

### 10.4. Проверьте конфигурацию после Certbot

```bash
# Проверьте, что конфигурация корректна
sudo apache2ctl configtest

# Должно быть: Syntax OK
```

### 10.5. Проверьте SSL-сертификат

```bash
# Проверьте сертификат
sudo certbot certificates

# Или проверьте через openssl
openssl s_client -connect bigo.1tlt.ru:443 -servername bigo.1tlt.ru
```

### 10.6. Проверьте автоматическое обновление

```bash
# Тестовый запуск обновления
sudo certbot renew --dry-run

# Проверьте, что таймер настроен
sudo systemctl status certbot.timer
```

**Примечание:** Certbot автоматически настроит обновление сертификата. Сертификаты Let's Encrypt действительны 90 дней и обновляются автоматически.

### 10.7. Если Certbot не может автоматически настроить Apache

Если Certbot не смог автоматически настроить конфигурацию, сделайте вручную:

1. **Сертификат будет в:**
   ```bash
   /etc/letsencrypt/live/bigo.1tlt.ru/fullchain.pem
   /etc/letsencrypt/live/bigo.1tlt.ru/privkey.pem
   ```

2. **Обновите конфигурацию Apache** (см. Шаг 8.3) с правильными путями к сертификатам

3. **Включите SSL модуль:**
   ```bash
   sudo a2enmod ssl
   sudo systemctl restart apache2
   ```

4. **Активируйте сайт:**
   ```bash
   sudo a2ensite bigo-frontend.conf
   sudo systemctl reload apache2
   ```

---

## Шаг 11: Автоматическое обновление (опционально)

### 11.1. Создайте скрипт для автоматического обновления

```bash
nano /ssd/www/bigo-mvp/deploy-frontend.sh
```

### 11.2. Добавьте содержимое:

```bash
#!/bin/bash

cd /ssd/www/bigo-mvp
git pull origin master

cd frontend/web
npm install
npm run build

pm2 restart nio-frontend

echo "Frontend deployed successfully!"
```

### 11.3. Сделайте скрипт исполняемым

```bash
chmod +x /ssd/www/bigo-mvp/deploy-frontend.sh
```

### 11.4. Запускайте при необходимости:

```bash
/ssd/www/bigo-mvp/deploy-frontend.sh
```

---

## 🔧 Полезные команды PM2

```bash
# Просмотр логов
pm2 logs nio-frontend

# Перезапуск
pm2 restart nio-frontend

# Остановка
pm2 stop nio-frontend

# Удаление из PM2
pm2 delete nio-frontend

# Мониторинг
pm2 monit
```

---

## 🐛 Решение проблем

### Проблема: Приложение не запускается

**Решение:**
1. Проверьте логи: `pm2 logs nio-frontend --err`
2. Убедитесь, что порт 3000 свободен: `netstat -tulpn | grep 3000`
3. Проверьте переменные окружения в `.env.local`

### Проблема: Ошибка "Cannot find module"

**Решение:**
```bash
cd frontend/web
rm -rf node_modules package-lock.json
npm install
npm run build
pm2 restart nio-frontend
```

### Проблема: Nginx/Apache не проксирует запросы

**Решение:**
1. Проверьте конфигурацию: `sudo nginx -t` или `sudo apache2ctl configtest`
2. Проверьте, что Next.js запущен: `pm2 status`
3. Проверьте логи Nginx/Apache: `sudo tail -f /var/log/nginx/error.log`

### Проблема: WebSocket не работает

**Решение:**
1. Убедитесь, что в конфигурации Nginx/Apache есть настройки для WebSocket
2. Проверьте, что `NEXT_PUBLIC_SOCKET_URL` указывает на правильный адрес

---

## ✅ Готово!

После выполнения всех шагов ваш фронтенд будет работать на вашем сервере без зависимости от Vercel.

**Важно:** Не забудьте обновить DNS записи, чтобы домен указывал на ваш сервер, если еще не настроено.

