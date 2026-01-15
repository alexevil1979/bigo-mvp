# Быстрое исправление ошибок 500 и 400

## Что нужно сделать на сервере ПРЯМО СЕЙЧАС

### Шаг 1: Обновите конфигурацию Apache

```bash
sudo nano /etc/apache2/sites-available/bigo-frontend.conf
```

**Замените секцию `ProxyPass` на:**

```apache
# ВАЖНО: Сначала обрабатываем статические файлы Next.js
ProxyPass /_next/static http://localhost:3000/_next/static
ProxyPassReverse /_next/static http://localhost:3000/_next/static

# Затем основной прокси
ProxyPass / http://localhost:3000/
ProxyPassReverse / http://localhost:3000/
```

**Полная конфигурация для HTTP (порт 80):**

```apache
<VirtualHost *:80>
    ServerName bigo.1tlt.ru
    
    ErrorLog ${APACHE_LOG_DIR}/bigo-frontend-error.log
    CustomLog ${APACHE_LOG_DIR}/bigo-frontend-access.log combined
    
    ProxyPreserveHost On
    ProxyRequests Off
    
    # Статические файлы Next.js (ВАЖНО!)
    ProxyPass /_next/static http://localhost:3000/_next/static
    ProxyPassReverse /_next/static http://localhost:3000/_next/static
    
    # Основной прокси
    ProxyPass / http://localhost:3000/
    ProxyPassReverse / http://localhost:3000/
    
    RequestHeader set X-Forwarded-Proto "http"
    RequestHeader set X-Forwarded-Port "80"
    RequestHeader set X-Real-IP %{REMOTE_ADDR}s
    
    RewriteEngine On
    RewriteCond %{HTTP:Upgrade} =websocket [NC]
    RewriteRule /(.*) ws://localhost:3000/$1 [P,L]
    RewriteCond %{HTTP:Upgrade} !=websocket [NC]
    RewriteRule /(.*) http://localhost:3000/$1 [P,L]
    
    ProxyTimeout 86400
</VirtualHost>
```

**Если используете HTTPS, обновите секцию `<VirtualHost *:443>` аналогично.**

### Шаг 2: Проверьте и перезагрузите Apache

```bash
# Проверьте конфигурацию
sudo apache2ctl configtest

# Если OK, перезагрузите
sudo systemctl reload apache2
```

### Шаг 3: Проверьте логи

```bash
# Логи PM2 Next.js
pm2 logs nio-frontend --lines 30

# Логи Apache
sudo tail -f /var/log/apache2/bigo-frontend-error.log
```

### Шаг 4: Пересоберите Next.js (ВАЖНО!)

**Если видите ошибки `ENOENT: prerender-manifest.json` в логах PM2, это обязательный шаг!**

```bash
cd /ssd/www/bigo-mvp/frontend/web
pm2 stop nio-frontend
rm -rf .next
npm run build

# Проверьте, что файл создан
ls -la .next/prerender-manifest.json

# Запустите снова
pm2 restart nio-frontend
```

**Если сборка не работает:**
```bash
# Полная очистка и переустановка
rm -rf .next node_modules package-lock.json
npm cache clean --force
npm install
npm run build
pm2 restart nio-frontend
```

## Проверка

Откройте в браузере:
- `https://bigo.1tlt.ru` - должна загружаться без ошибок
- `https://bigo.1tlt.ru/stream/[id]` - страница стрима должна работать

В консоли браузера (F12) не должно быть ошибок 400/500.

## Если видите ошибки prerender-manifest.json

Если в логах PM2 есть ошибки `ENOENT: prerender-manifest.json`, смотрите:
- `QUICK_FIX_PRERENDER.md` - быстрое исправление
- `FIX_PRERENDER_MANIFEST.md` - подробная инструкция

## Если не помогло

Смотрите подробную инструкцию: `FIX_500_400_ERRORS.md`

