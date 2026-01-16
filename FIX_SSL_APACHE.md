# Исправление SSL-сертификата для api.bigo.1tlt.ru (Apache)

## Проблема
Сертификат выдан для `helpcdek.ru`, а нужен для `api.bigo.1tlt.ru`.

## Решение для Apache

### Шаг 1: Проверьте текущую конфигурацию Apache

```bash
# Проверьте конфигурацию виртуального хоста
sudo cat /etc/apache2/sites-available/api.bigo.1tlt.ru.conf
# или
sudo cat /etc/apache2/sites-enabled/api.bigo.1tlt.ru.conf

# Проверьте, какие модули включены
sudo a2enmod ssl
sudo a2enmod proxy
sudo a2enmod proxy_http
sudo a2enmod headers
```

### Шаг 2: Получите SSL-сертификат для api.bigo.1tlt.ru

```bash
# Установите certbot для Apache (если еще не установлен)
sudo apt-get update
sudo apt-get install certbot python3-certbot-apache

# Получите сертификат для api.bigo.1tlt.ru
sudo certbot --apache -d api.bigo.1tlt.ru

# Или если нужен сертификат для нескольких доменов:
sudo certbot --apache -d api.bigo.1tlt.ru -d bigo.1tlt.ru
```

### Шаг 3: Проверьте конфигурацию Apache после certbot

Certbot автоматически обновит конфигурацию. Проверьте:

```bash
sudo apache2ctl configtest
```

Должна быть примерно такая конфигурация:

```apache
<VirtualHost *:443>
    ServerName api.bigo.1tlt.ru
    
    SSLEngine on
    SSLCertificateFile /etc/letsencrypt/live/api.bigo.1tlt.ru/fullchain.pem
    SSLCertificateKeyFile /etc/letsencrypt/live/api.bigo.1tlt.ru/privkey.pem
    
    # Include SSL configuration
    Include /etc/letsencrypt/options-ssl-apache.conf
    
    # Proxy settings
    ProxyPreserveHost On
    ProxyRequests Off
    
    ProxyPass / http://localhost:5000/
    ProxyPassReverse / http://localhost:5000/
    
    # WebSocket support
    RewriteEngine on
    RewriteCond %{HTTP:Upgrade} websocket [NC]
    RewriteCond %{HTTP:Connection} upgrade [NC]
    RewriteRule ^/?(.*) "ws://localhost:5000/$1" [P,L]
    
    # Headers
    RequestHeader set X-Forwarded-Proto "https"
    RequestHeader set X-Forwarded-Port "443"
</VirtualHost>

<VirtualHost *:80>
    ServerName api.bigo.1tlt.ru
    Redirect permanent / https://api.bigo.1tlt.ru/
</VirtualHost>
```

### Шаг 4: Перезагрузите Apache

```bash
sudo systemctl reload apache2
# или
sudo service apache2 reload
```

### Шаг 5: Проверьте сертификат

```bash
# Проверка сертификата
openssl s_client -connect api.bigo.1tlt.ru:443 -servername api.bigo.1tlt.ru | grep "subject="

# Должно показать: subject=CN = api.bigo.1tlt.ru

# Проверка API
curl https://api.bigo.1tlt.ru/api/auth/qr-session
```

## Ручная настройка (если certbot не работает)

### 1. Создайте конфигурацию для HTTP (для проверки домена)

```bash
sudo nano /etc/apache2/sites-available/api.bigo.1tlt.ru.conf
```

```apache
<VirtualHost *:80>
    ServerName api.bigo.1tlt.ru
    
    # Для Let's Encrypt проверки
    DocumentRoot /var/www/html
    
    <Directory /var/www/html>
        Options -Indexes +FollowSymLinks
        AllowOverride All
    </Directory>
    
    # Proxy settings
    ProxyPreserveHost On
    ProxyRequests Off
    
    ProxyPass /.well-known/acme-challenge/ !
    ProxyPass / http://localhost:5000/
    ProxyPassReverse / http://localhost:5000/
    
    # Headers
    RequestHeader set X-Forwarded-Proto "http"
    RequestHeader set X-Forwarded-Port "80"
</VirtualHost>
```

### 2. Включите сайт

```bash
sudo a2ensite api.bigo.1tlt.ru.conf
sudo systemctl reload apache2
```

### 3. Запустите certbot

```bash
sudo certbot --apache -d api.bigo.1tlt.ru
```

Certbot автоматически создаст конфигурацию для HTTPS.

## Если certbot не может получить сертификат

### Проверьте DNS
```bash
# Убедитесь, что DNS правильно настроен
dig api.bigo.1tlt.ru
nslookup api.bigo.1tlt.ru
```

### Проверьте, что порт 80 открыт
```bash
# Проверьте, что Apache слушает порт 80
sudo netstat -tulpn | grep :80
sudo netstat -tulpn | grep :443
```

### Проверьте файрвол
```bash
# Если используется ufw
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw status
```

## Полная конфигурация Apache для HTTPS (ручная настройка)

Если certbot не работает, можно настроить вручную:

```bash
sudo nano /etc/apache2/sites-available/api.bigo.1tlt.ru-ssl.conf
```

```apache
<IfModule mod_ssl.c>
<VirtualHost *:443>
    ServerName api.bigo.1tlt.ru
    
    # SSL Configuration
    SSLEngine on
    SSLCertificateFile /etc/letsencrypt/live/api.bigo.1tlt.ru/fullchain.pem
    SSLCertificateKeyFile /etc/letsencrypt/live/api.bigo.1tlt.ru/privkey.pem
    
    # SSL Security
    SSLProtocol all -SSLv3 -TLSv1 -TLSv1.1
    SSLCipherSuite ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384
    SSLHonorCipherOrder off
    SSLSessionTickets off
    
    # Proxy settings
    ProxyPreserveHost On
    ProxyRequests Off
    
    ProxyPass / http://localhost:5000/
    ProxyPassReverse / http://localhost:5000/
    
    # WebSocket support
    RewriteEngine on
    RewriteCond %{HTTP:Upgrade} websocket [NC]
    RewriteCond %{HTTP:Connection} upgrade [NC]
    RewriteRule ^/?(.*) "ws://localhost:5000/$1" [P,L]
    
    # Headers
    RequestHeader set X-Forwarded-Proto "https"
    RequestHeader set X-Forwarded-Port "443"
    RequestHeader set X-Real-IP %{REMOTE_ADDR}s
</VirtualHost>
</IfModule>
```

Включите конфигурацию:
```bash
sudo a2ensite api.bigo.1tlt.ru-ssl.conf
sudo systemctl reload apache2
```

## Автоматическое обновление сертификата

Certbot автоматически настроит обновление. Проверьте:

```bash
# Проверьте cron job для обновления
sudo certbot renew --dry-run

# Проверьте таймер systemd (если используется)
sudo systemctl status certbot.timer
```

## Альтернатива: Временное использование HTTP

Если SSL-сертификат настроить не получается, можно временно использовать HTTP:

1. **Измените переменную окружения на Vercel**:
   - `NEXT_PUBLIC_API_URL` = `http://api.bigo.1tlt.ru` (без `s`)

2. **Настройте Apache для HTTP** (см. выше, но без SSL)

⚠️ **Внимание**: HTTP небезопасен для продакшена, используйте только для тестирования!

## Полезные команды для отладки

```bash
# Проверка конфигурации Apache
sudo apache2ctl configtest

# Проверка статуса Apache
sudo systemctl status apache2

# Просмотр логов
sudo tail -f /var/log/apache2/error.log
sudo tail -f /var/log/apache2/access.log

# Проверка портов
sudo lsof -i :80
sudo lsof -i :443
sudo lsof -i :5000
```



