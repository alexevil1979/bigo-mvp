# 🚀 Инструкция по деплою на сервер

## Варианты деплоя (без привязки карты)

### Вариант 1: Railway.app (рекомендуется) ⭐
**Не требует карту для free tier**

### Вариант 2: Fly.io
**Не требует карту для free tier**

### Вариант 3: VPS сервер (Hetzner, DigitalOcean)
**Полный контроль, ~$5-10/месяц**

---

## 📦 Вариант 1: Railway.app (БЕСПЛАТНО, без карты)

### Шаг 1: Подготовка репозитория

```bash
# В корне проекта
git init
git add .
git commit -m "Initial commit"

# Создай репозиторий на GitHub и выполни:
git remote add origin https://github.com/ВАШ-USERNAME/bigo-mvp.git
git push -u origin main
```

### Шаг 2: Настройка MongoDB Atlas

1. Зайди на [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Создай бесплатный кластер (M0 Free)
3. Создай пользователя БД (Database Access)
4. Добавь IP `0.0.0.0/0` в Network Access (для теста)
5. Получи Connection String:
   ```
   mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/streaming-mvp?retryWrites=true&w=majority
   ```

### Шаг 3: Деплой Backend на Railway

1. Зайди на [Railway.app](https://railway.app)
2. Войди через GitHub
3. Нажми **"New Project" → "Deploy from GitHub repo"**
4. Выбери репозиторий `bigo-mvp`
5. Railway автоматически определит Node.js проект
6. В настройках проекта:
   - **Root Directory**: `backend`
   - **Start Command**: `npm start`
7. Перейди в **Variables** и добавь:

```env
PORT=5000
MONGODB_URI=mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/streaming-mvp?retryWrites=true&w=majority
JWT_SECRET=твой-супер-секретный-ключ-минимум-32-символа
JWT_EXPIRE=7d
CORS_ORIGIN=*
NODE_ENV=production
```

8. Railway автоматически задеплоит проект
9. Получишь URL вида: `https://bigo-backend-production.up.railway.app`
10. **Скопируй этот URL** - это твой backend URL

### Шаг 4: Деплой Web на Vercel

1. Зайди на [Vercel.com](https://vercel.com)
2. Войди через GitHub
3. **New Project** → выбери репозиторий
4. Настройки:
   - **Root Directory**: `frontend/web`
   - **Framework Preset**: Next.js
5. **Environment Variables**:
   ```
   API_URL=https://bigo-backend-production.up.railway.app
   SOCKET_URL=https://bigo-backend-production.up.railway.app
   ```
6. Deploy → получишь URL: `https://bigo-web.vercel.app`

### Шаг 5: Деплой Admin на Vercel

1. Снова **New Project** → тот же репозиторий
2. **Root Directory**: `admin`
3. **Environment Variables**:
   ```
   API_URL=https://bigo-backend-production.up.railway.app
   ```
4. Deploy → получишь URL: `https://bigo-admin.vercel.app`

### Шаг 6: Обновление CORS на Backend

В Railway, в Variables backend проекта, обнови:
```
CORS_ORIGIN=https://bigo-web.vercel.app,https://bigo-admin.vercel.app
```

Railway автоматически перезапустит сервис.

---

## 📦 Вариант 2: Fly.io (БЕСПЛАТНО, без карты)

### Шаг 1: Установка Fly CLI

```bash
# Windows (PowerShell)
iwr https://fly.io/install.ps1 -useb | iex

# Или скачай с https://fly.io/docs/getting-started/installing-flyctl/
```

### Шаг 2: Создание файлов для Fly.io

#### Backend: `backend/fly.toml`

```toml
app = "bigo-backend"
primary_region = "iad"

[build]

[env]
  PORT = "5000"
  NODE_ENV = "production"

[[services]]
  internal_port = 5000
  protocol = "tcp"

  [[services.ports]]
    port = 80
    handlers = ["http"]
    force_https = true

  [[services.ports]]
    port = 443
    handlers = ["tls", "http"]

  [services.concurrency]
    type = "connections"
    hard_limit = 25
    soft_limit = 20

  [[services.http_checks]]
    interval = "10s"
    timeout = "2s"
    grace_period = "5s"
    method = "GET"
    path = "/api/health"
```

#### Backend: `backend/Dockerfile`

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

EXPOSE 5000

CMD ["npm", "start"]
```

### Шаг 3: Деплой Backend на Fly.io

```bash
cd backend

# Логин
fly auth login

# Создай приложение
fly launch --no-deploy

# Установи переменные окружения
fly secrets set MONGODB_URI="mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/streaming-mvp"
fly secrets set JWT_SECRET="твой-секретный-ключ"
fly secrets set JWT_EXPIRE="7d"
fly secrets set CORS_ORIGIN="*"

# Деплой
fly deploy
```

Получишь URL: `https://bigo-backend.fly.dev`

### Шаг 4-5: Web и Admin на Vercel (как в Варианте 1)

Используй тот же процесс, только укажи URL Fly.io вместо Railway.

---

## 📦 Вариант 3: VPS сервер (Hetzner/DigitalOcean)

### Требования
- VPS с Ubuntu 22.04
- Минимум 1GB RAM, 1 CPU
- ~$5-10/месяц

### Шаг 1: Подключение к серверу

```bash
ssh root@ТВОЙ-IP-АДРЕС
```

### Шаг 2: Установка зависимостей

```bash
# Обновление системы
apt update && apt upgrade -y

# Установка Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt install -y nodejs

# Установка PM2
npm install -g pm2

# Установка Nginx
apt install -y nginx

# Установка Git
apt install -y git
```

### Шаг 3: Клонирование проекта

```bash
cd /var/www
git clone https://github.com/ВАШ-USERNAME/bigo-mvp.git
cd bigo-mvp/backend
npm install --production
```

### Шаг 4: Настройка Backend

```bash
# Создай .env файл
nano .env
```

Добавь:
```env
PORT=5000
MONGODB_URI=mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/streaming-mvp
JWT_SECRET=твой-секретный-ключ
JWT_EXPIRE=7d
CORS_ORIGIN=*
NODE_ENV=production
```

Сохрани (Ctrl+X, Y, Enter)

### Шаг 5: Запуск Backend через PM2

```bash
pm2 start server.js --name "bigo-backend"
pm2 save
pm2 startup
```

### Шаг 6: Настройка Nginx для Backend

```bash
nano /etc/nginx/sites-available/bigo-backend
```

Добавь:
```nginx
server {
    listen 80;
    server_name api.твой-домен.com;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Активируй:
```bash
ln -s /etc/nginx/sites-available/bigo-backend /etc/nginx/sites-enabled/
nginx -t
systemctl reload nginx
```

### Шаг 7: SSL сертификат (Let's Encrypt)

```bash
apt install -y certbot python3-certbot-nginx
certbot --nginx -d api.твой-домен.com
```

### Шаг 8: Деплой Web и Admin на Vercel

Используй тот же процесс, что в Варианте 1, но укажи свой домен:
```
API_URL=https://api.твой-домен.com
```

---

## 🔧 Настройка Mobile приложения

В `frontend/mobile/src/contexts/AuthContext.js`:

```javascript
// Для Railway
const API_URL = 'https://bigo-backend-production.up.railway.app';

// Для Fly.io
const API_URL = 'https://bigo-backend.fly.dev';

// Для VPS
const API_URL = 'https://api.твой-домен.com';
```

---

## ✅ Проверка работы

1. **Backend Health Check:**
   ```
   https://твой-backend-url/api/health
   ```
   Должен вернуть: `{"status":"ok"}`

2. **Web приложение:**
   - Открой URL Vercel
   - Зарегистрируйся
   - Создай стрим

3. **Admin панель:**
   - Открой URL админки
   - Войди как администратор

---

## 🐛 Решение проблем

### Backend не запускается
- Проверь логи: `pm2 logs` (VPS) или логи в Railway/Fly.io
- Убедись, что MongoDB URI правильный
- Проверь, что все переменные окружения установлены

### CORS ошибки
- Убедись, что `CORS_ORIGIN` содержит правильные URL
- Проверь, что backend доступен по HTTPS

### WebRTC не работает
- WebRTC требует HTTPS (или localhost)
- Проверь, что все URL используют HTTPS
- Для продакшена настройте TURN сервер

---

## 📝 Создание первого администратора

После деплоя, подключись к MongoDB Atlas и выполни:

```javascript
use streaming-mvp

// Сначала зарегистрируйся через API, затем:
db.users.updateOne(
  { email: "твой-email@example.com" },
  { $set: { role: "admin" } }
)
```

Или используй MongoDB Compass для визуального редактирования.

---

## 🎯 Рекомендации

1. **Для начала:** Railway.app (проще всего, без карты)
2. **Для продакшена:** VPS (больше контроля, лучше для масштабирования)
3. **Для тестирования:** Fly.io (хорошая альтернатива Railway)

Все варианты работают без привязки карты (кроме VPS, который платный, но дешёвый).



