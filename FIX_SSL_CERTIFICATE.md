# Исправление SSL-сертификата для api.bigo.1tlt.ru

## Проблема
Сертификат выдан для `helpcdek.ru`, а нужен для `api.bigo.1tlt.ru`.

## Решение

### Шаг 1: Проверьте конфигурацию Nginx

```bash
# Проверьте текущую конфигурацию
sudo cat /etc/nginx/sites-available/api.bigo.1tlt.ru
# или
sudo cat /etc/nginx/sites-enabled/api.bigo.1tlt.ru
```

### Шаг 2: Получите SSL-сертификат для api.bigo.1tlt.ru

```bash
# Установите certbot (если еще не установлен)
sudo apt-get update
sudo apt-get install certbot python3-certbot-nginx

# Получите сертификат для api.bigo.1tlt.ru
sudo certbot --nginx -d api.bigo.1tlt.ru

# Или если нужен сертификат для нескольких доменов:
sudo certbot --nginx -d api.bigo.1tlt.ru -d bigo.1tlt.ru
```

### Шаг 3: Проверьте конфигурацию Nginx после certbot

Certbot автоматически обновит конфигурацию. Проверьте:

```bash
sudo nginx -t
```

Должна быть примерно такая конфигурация:

```nginx
server {
    listen 443 ssl http2;
    server_name api.bigo.1tlt.ru;

    ssl_certificate /etc/letsencrypt/live/api.bigo.1tlt.ru/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.bigo.1tlt.ru/privkey.pem;

    # Include SSL configuration
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

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

### Шаг 4: Перезагрузите Nginx

```bash
sudo systemctl reload nginx
# или
sudo service nginx reload
```

### Шаг 5: Проверьте сертификат

```bash
# Проверка сертификата
openssl s_client -connect api.bigo.1tlt.ru:443 -servername api.bigo.1tlt.ru | grep "subject="

# Должно показать: subject=CN = api.bigo.1tlt.ru

# Проверка API
curl https://api.bigo.1tlt.ru/api/auth/qr-session
```

## Если certbot не может получить сертификат

### Проверьте DNS
```bash
# Убедитесь, что DNS правильно настроен
dig api.bigo.1tlt.ru
nslookup api.bigo.1tlt.ru
```

### Проверьте, что порт 80 открыт
```bash
# Проверьте, что Nginx слушает порт 80
sudo netstat -tulpn | grep :80
```

### Ручная настройка (если certbot не работает)

1. **Создайте конфигурацию Nginx для HTTP** (для проверки домена):

```bash
sudo nano /etc/nginx/sites-available/api.bigo.1tlt.ru
```

```nginx
server {
    listen 80;
    server_name api.bigo.1tlt.ru;

    location /.well-known/acme-challenge/ {
        root /var/www/html;
    }

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
```

2. **Создайте симлинк** (если еще нет):
```bash
sudo ln -s /etc/nginx/sites-available/api.bigo.1tlt.ru /etc/nginx/sites-enabled/
```

3. **Проверьте и перезагрузите Nginx**:
```bash
sudo nginx -t
sudo systemctl reload nginx
```

4. **Запустите certbot снова**:
```bash
sudo certbot --nginx -d api.bigo.1tlt.ru
```

## Автоматическое обновление сертификата

Certbot автоматически настроит обновление. Проверьте:

```bash
# Проверьте cron job для обновления
sudo certbot renew --dry-run
```

## Альтернатива: Временное использование HTTP

Если SSL-сертификат настроить не получается, можно временно использовать HTTP:

1. **Измените переменную окружения на Vercel**:
   - `NEXT_PUBLIC_API_URL` = `http://api.bigo.1tlt.ru` (без `s`)

2. **Настройте Nginx для HTTP** (см. выше, но без SSL)

⚠️ **Внимание**: HTTP небезопасен для продакшена, используйте только для тестирования!



