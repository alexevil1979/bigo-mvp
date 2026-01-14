# 🏠 Деплой на домашний сервер Ubuntu 22 (Apache)

## 📋 Предварительные требования

- Ubuntu 22.04 Server
- Apache установлен и работает
- Доступ по SSH к серверу
- Доменное имя (опционально, но рекомендуется для HTTPS)
- Порт 80, 443 открыты в роутере (port forwarding)

---

## 🔧 Шаг 1: Подготовка сервера

### Подключение к серверу

```bash
ssh username@твой-ip-адрес
```

### Обновление системы

```bash
sudo apt update && sudo apt upgrade -y
```

### Установка Node.js 18

```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Проверка
node --version  # Должно быть v18.x.x
npm --version
```

### Установка PM2 (менеджер процессов)

```bash
sudo npm install -g pm2

# Настройка автозапуска
pm2 startup
# Выполни команду, которую PM2 покажет (обычно с sudo)
```

### Установка Git

```bash
sudo apt install -y git
```

### Установка MongoDB (опционально, или используй MongoDB Atlas)

Если хочешь локальную MongoDB:

```bash
# Импорт ключа
wget -qO - https://www.mongodb.org/static/pgp/server-6.0.asc | sudo apt-key add -

# Добавление репозитория
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/6.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-6.0.list

# Установка
sudo apt update
sudo apt install -y mongodb-org

# Запуск MongoDB
sudo systemctl start mongod
sudo systemctl enable mongod
```

**Или используй MongoDB Atlas (рекомендуется для начала):**
- Создай бесплатный кластер на [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
- Получи Connection String

---

## 📦 Шаг 2: Клонирование и настройка проекта

### Создание директории для проекта

```bash
sudo mkdir -p /var/www
cd /var/www
```

### Клонирование репозитория

```bash
# Если проект на GitHub
sudo git clone https://github.com/ВАШ-USERNAME/bigo-mvp.git
cd bigo-mvp

# Или загрузи проект через SCP/SFTP
```

### Установка зависимостей Backend

```bash
cd backend
sudo npm install --production
```

### Настройка переменных окружения Backend

```bash
sudo nano .env
```

Добавь:

```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/streaming-mvp
# Или для MongoDB Atlas:
# MONGODB_URI=mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/streaming-mvp

JWT_SECRET=твой-супер-секретный-ключ-минимум-32-символа-измени-это
JWT_EXPIRE=7d
CORS_ORIGIN=*
NODE_ENV=production
```

Сохрани: `Ctrl+X`, затем `Y`, затем `Enter`

### Запуск Backend через PM2

```bash
pm2 start server.js --name "bigo-backend"
pm2 save
```

Проверь статус:
```bash
pm2 status
pm2 logs bigo-backend
```

Backend должен быть доступен на `http://localhost:5000`

---

## 🌐 Шаг 3: Настройка Apache как Reverse Proxy

### Включение необходимых модулей Apache

```bash
sudo a2enmod proxy
sudo a2enmod proxy_http
sudo a2enmod proxy_wstunnel  # Для WebSocket
sudo a2enmod ssl
sudo a2enmod rewrite
sudo systemctl restart apache2
```

### Создание конфигурации для Backend

```bash
sudo nano /etc/apache2/sites-available/bigo-backend.conf
```

Добавь конфигурацию (замени `твой-домен.com` на свой домен или IP):

```apache
<VirtualHost *:80>
    ServerName api.твой-домен.com
    # Или используй IP: ServerName твой-ip-адрес

    # Логи
    ErrorLog ${APACHE_LOG_DIR}/bigo-backend-error.log
    CustomLog ${APACHE_LOG_DIR}/bigo-backend-access.log combined

    # Proxy для HTTP запросов
    ProxyPreserveHost On
    ProxyPass / http://localhost:5000/
    ProxyPassReverse / http://localhost:5000/

    # Proxy для WebSocket (Socket.IO)
    RewriteEngine On
    RewriteCond %{HTTP:Upgrade} =websocket [NC]
    RewriteRule /(.*) ws://localhost:5000/$1 [P,L]
    RewriteCond %{HTTP:Upgrade} !=websocket [NC]
    RewriteRule /(.*) http://localhost:5000/$1 [P,L]
</VirtualHost>
```

Активируй сайт:

```bash
sudo a2ensite bigo-backend.conf
sudo systemctl reload apache2
```

### Проверка конфигурации

```bash
sudo apache2ctl configtest
```

Должно быть: `Syntax OK`

---

## 🔒 Шаг 4: Настройка HTTPS (SSL сертификат)

### Установка Certbot

```bash
sudo apt install -y certbot python3-certbot-apache
```

### Получение SSL сертификата

**Если у тебя есть домен:**

```bash
sudo certbot --apache -d api.твой-домен.com
```

Certbot автоматически:
- Получит сертификат от Let's Encrypt
- Настроит Apache для HTTPS
- Настроит автоматическое обновление

**Если нет домена (только IP):**
- Используй самоподписанный сертификат (не рекомендуется для продакшена)
- Или используй сервис типа [ngrok](https://ngrok.com) для туннеля

### Обновление конфигурации для HTTPS

Certbot автоматически создаст конфигурацию в `/etc/apache2/sites-available/bigo-backend-le-ssl.conf`

Проверь, что там есть WebSocket поддержка:

```apache
<VirtualHost *:443>
    ServerName api.твой-домен.com
    
    SSLEngine on
    SSLCertificateFile /etc/letsencrypt/live/api.твой-домен.com/fullchain.pem
    SSLCertificateKeyFile /etc/letsencrypt/live/api.твой-домен.com/privkey.pem

    # Proxy для HTTP
    ProxyPreserveHost On
    ProxyPass / http://localhost:5000/
    ProxyPassReverse / http://localhost:5000/

    # Proxy для WebSocket
    RewriteEngine On
    RewriteCond %{HTTP:Upgrade} =websocket [NC]
    RewriteRule /(.*) ws://localhost:5000/$1 [P,L]
    RewriteCond %{HTTP:Upgrade} !=websocket [NC]
    RewriteRule /(.*) http://localhost:5000/$1 [P,L]
</VirtualHost>
```

---

## 🎨 Шаг 5: Деплой Web и Admin приложений

### Вариант A: Деплой на Vercel (рекомендуется)

1. Зайди на [Vercel.com](https://vercel.com)
2. New Project → выбери репозиторий
3. **Web приложение:**
   - Root Directory: `frontend/web`
   - Environment Variables:
     ```
     API_URL=https://api.твой-домен.com
     SOCKET_URL=https://api.твой-домен.com
     ```
4. **Admin приложение:**
   - Root Directory: `admin`
   - Environment Variables:
     ```
     API_URL=https://api.твой-домен.com
     ```

### Вариант B: Деплой на том же сервере

#### Сборка Web приложения

```bash
cd /var/www/bigo-mvp/frontend/web
sudo npm install
sudo npm run build
```

#### Создание конфигурации Apache для Web

```bash
sudo nano /etc/apache2/sites-available/bigo-web.conf
```

```apache
<VirtualHost *:80>
    ServerName твой-домен.com
    
    DocumentRoot /var/www/bigo-mvp/frontend/web/out
    
    <Directory /var/www/bigo-mvp/frontend/web/out>
        Options Indexes FollowSymLinks
        AllowOverride All
        Require all granted
    </Directory>

    # Proxy для API (если нужно)
    ProxyPreserveHost On
    ProxyPass /api http://localhost:5000/api
    ProxyPassReverse /api http://localhost:5000/api
</VirtualHost>
```

**Важно:** Next.js нужно настроить для статического экспорта или использовать Node.js сервер.

Для статического экспорта добавь в `frontend/web/next.config.js`:

```javascript
module.exports = {
  output: 'export',
  // ...
}
```

Затем:
```bash
cd /var/www/bigo-mvp/frontend/web
sudo npm run build
```

Активируй сайт:
```bash
sudo a2ensite bigo-web.conf
sudo systemctl reload apache2
```

---

## 🔧 Шаг 6: Настройка Firewall

### Открытие портов

```bash
# Если используешь UFW
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 22/tcp  # SSH
sudo ufw enable
```

### Настройка Port Forwarding в роутере

1. Зайди в настройки роутера (обычно `192.168.1.1`)
2. Найди "Port Forwarding" или "Виртуальные серверы"
3. Добавь правила:
   - **Порт 80** → IP сервера:80
   - **Порт 443** → IP сервера:443
4. Сохрани настройки

---

## 📱 Шаг 7: Настройка Mobile приложения

В `frontend/mobile/src/contexts/AuthContext.js`:

```javascript
// Если есть домен с HTTPS
const API_URL = 'https://api.твой-домен.com';

// Если только IP (не рекомендуется, но для теста)
const API_URL = 'http://твой-ip-адрес';
```

**Важно:** WebRTC требует HTTPS для работы в продакшене (кроме localhost).

---

## ✅ Шаг 8: Проверка работы

### Проверка Backend

```bash
# Локально на сервере
curl http://localhost:5000/api/health

# Извне
curl https://api.твой-домен.com/api/health
```

Должен вернуть: `{"status":"ok","timestamp":"..."}`

### Проверка WebSocket

Открой в браузере:
```
https://api.твой-домен.com
```

Должен подключиться Socket.IO.

### Проверка Web приложения

Открой:
```
https://твой-домен.com
```

Проверь:
- Регистрация/вход
- Создание стрима
- Просмотр стрима
- Чат
- Подарки

---

## 🐛 Решение проблем

### Backend не запускается

```bash
# Проверь логи
pm2 logs bigo-backend

# Проверь, что порт свободен
sudo netstat -tulpn | grep 5000

# Перезапусти
pm2 restart bigo-backend
```

### Apache не проксирует WebSocket

Убедись, что модули включены:
```bash
sudo a2enmod proxy_wstunnel
sudo systemctl restart apache2
```

Проверь конфигурацию - должны быть RewriteRule для WebSocket.

### CORS ошибки

В `backend/.env` убедись, что:
```
CORS_ORIGIN=https://твой-домен.com,https://api.твой-домен.com
```

Или временно для теста:
```
CORS_ORIGIN=*
```

### WebRTC не работает

- Убедись, что используется HTTPS (не HTTP)
- Проверь, что все URL используют HTTPS
- Для продакшена настройте TURN сервер

### Проблемы с портами

```bash
# Проверь, что Apache слушает порты
sudo netstat -tulpn | grep apache

# Проверь логи Apache
sudo tail -f /var/log/apache2/error.log
```

---

## 🔄 Обновление проекта

```bash
cd /var/www/bigo-mvp
sudo git pull origin main

# Backend
cd backend
sudo npm install --production
pm2 restart bigo-backend

# Web (если деплоишь на сервере)
cd ../frontend/web
sudo npm install
sudo npm run build
```

---

## 📊 Мониторинг

### PM2 мониторинг

```bash
# Статус
pm2 status

# Логи в реальном времени
pm2 logs bigo-backend

# Мониторинг ресурсов
pm2 monit
```

### Логи Apache

```bash
# Ошибки
sudo tail -f /var/log/apache2/error.log

# Доступ
sudo tail -f /var/log/apache2/access.log
```

---

## 🔐 Безопасность

### Рекомендации

1. **Firewall:**
   ```bash
   sudo ufw enable
   sudo ufw default deny incoming
   sudo ufw default allow outgoing
   sudo ufw allow 22/tcp  # SSH
   sudo ufw allow 80/tcp
   sudo ufw allow 443/tcp
   ```

2. **Fail2Ban (защита от брутфорса):**
   ```bash
   sudo apt install -y fail2ban
   sudo systemctl enable fail2ban
   ```

3. **Регулярные обновления:**
   ```bash
   sudo apt update && sudo apt upgrade -y
   ```

4. **Сильные пароли для всех сервисов**

5. **Не используй `CORS_ORIGIN=*` в продакшене** - укажи конкретные домены

---

## 📝 Создание первого администратора

После деплоя:

```bash
# Подключись к MongoDB
mongosh  # или mongo для старых версий

# Или используй MongoDB Compass для визуального управления
```

В MongoDB:

```javascript
use streaming-mvp

// Сначала зарегистрируйся через API, затем:
db.users.updateOne(
  { email: "твой-email@example.com" },
  { $set: { role: "admin" } }
)
```

---

## 🎯 Итоговая структура

```
Сервер Ubuntu 22:
├── Backend (Node.js + PM2)
│   └── Порт: 5000 (локально)
├── Apache (Reverse Proxy)
│   ├── HTTP: 80 → Backend:5000
│   └── HTTPS: 443 → Backend:5000
├── MongoDB (локально или Atlas)
└── Web/Admin (Vercel или на сервере)
```

**Backend URL:** `https://api.твой-домен.com`  
**Web URL:** `https://твой-домен.com` (или Vercel)  
**Admin URL:** `https://admin.твой-домен.com` (или Vercel)

---

Готово! Твой стриминговый сервис работает на домашнем сервере! 🚀

