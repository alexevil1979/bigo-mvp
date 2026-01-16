# Исправление ошибки SSL-сертификата

## Проблема
Ошибка `ERR_CERT_COMMON_NAME_INVALID` означает, что SSL-сертификат не соответствует домену `api.bigo.1tlt.ru`.

## Решения

### Вариант 1: Настроить правильный SSL-сертификат на сервере

Если вы используете Nginx как reverse proxy:

1. **Установите SSL-сертификат** (Let's Encrypt):
```bash
sudo apt-get update
sudo apt-get install certbot python3-certbot-nginx
sudo certbot --nginx -d api.bigo.1tlt.ru
```

2. **Проверьте конфигурацию Nginx** (`/etc/nginx/sites-available/api.bigo.1tlt.ru`):
```nginx
server {
    listen 443 ssl http2;
    server_name api.bigo.1tlt.ru;

    ssl_certificate /etc/letsencrypt/live/api.bigo.1tlt.ru/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.bigo.1tlt.ru/privkey.pem;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}

server {
    listen 80;
    server_name api.bigo.1tlt.ru;
    return 301 https://$server_name$request_uri;
}
```

3. **Перезагрузите Nginx**:
```bash
sudo nginx -t
sudo systemctl reload nginx
```

### Вариант 2: Использовать HTTP вместо HTTPS (временно)

Если SSL-сертификат еще не настроен, можно временно использовать HTTP:

1. **Измените переменную окружения на Vercel**:
   - `NEXT_PUBLIC_API_URL` = `http://api.bigo.1tlt.ru` (без `s` в `http`)

2. **Или настройте Nginx для HTTP**:
```nginx
server {
    listen 80;
    server_name api.bigo.1tlt.ru;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### Вариант 3: Использовать самоподписанный сертификат (только для разработки)

⚠️ **Не рекомендуется для продакшена!**

Если нужно временно для тестирования:

1. **Создайте самоподписанный сертификат**:
```bash
sudo openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout /etc/nginx/ssl/api.bigo.1tlt.ru.key \
  -out /etc/nginx/ssl/api.bigo.1tlt.ru.crt \
  -subj "/C=RU/ST=State/L=City/O=Organization/CN=api.bigo.1tlt.ru"
```

2. **Настройте Nginx** (как в Варианте 1, но с путями к самоподписанному сертификату)

## Проверка

После настройки проверьте:

```bash
# Проверка SSL-сертификата
openssl s_client -connect api.bigo.1tlt.ru:443 -servername api.bigo.1tlt.ru

# Проверка доступности API
curl https://api.bigo.1tlt.ru/api/auth/qr-session
```

## Рекомендация

Для продакшена используйте **Вариант 1** с Let's Encrypt - это бесплатный и безопасный способ получить валидный SSL-сертификат.



