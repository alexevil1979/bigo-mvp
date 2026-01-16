# Исправление ошибки 503 Service Unavailable

## Проблема
- `GET https://bigo.1tlt.ru/ 503 (Service Unavailable)`
- `GET https://bigo.1tlt.ru/favicon.ico 503 (Service Unavailable)`

Это означает, что Apache не может подключиться к Next.js на `localhost:3000`.

## Быстрая диагностика

### Шаг 1: Проверьте статус PM2

```bash
pm2 status all
```

Должен быть запущен процесс `nio-frontend` со статусом `online`.

### Шаг 2: Проверьте, работает ли Next.js локально

```bash
# Проверьте, что Next.js отвечает на порту 3000
curl http://localhost:3000

# Если не работает, проверьте логи
pm2 logs nio-frontend --lines 50
```

### Шаг 3: Проверьте, что порт 3000 прослушивается

```bash
# Проверьте, что порт 3000 занят процессом Node.js
netstat -tlnp | grep 3000
# или
ss -tlnp | grep 3000
```

## Исправление

### Вариант 1: Next.js не запущен

```bash
cd /ssd/www/bigo-mvp/frontend/web

# Проверьте, что папка .next существует
ls -la .next

# Если папки нет, пересоберите
rm -rf .next
npm run build

# Запустите через PM2
pm2 start ecosystem.config.js
# или если уже есть процесс
pm2 restart nio-frontend

# Проверьте статус
pm2 status nio-frontend
pm2 logs nio-frontend --lines 30
```

### Вариант 2: Next.js упал с ошибкой

```bash
# Проверьте логи на ошибки
pm2 logs nio-frontend --lines 100

# Если есть ошибки, перезапустите
pm2 restart nio-frontend

# Если не помогает, пересоберите
cd /ssd/www/bigo-mvp/frontend/web
pm2 stop nio-frontend
rm -rf .next
npm run build
pm2 start nio-frontend
```

### Вариант 3: Проблема с конфигурацией Apache

```bash
# Проверьте конфигурацию Apache
sudo apache2ctl configtest

# Проверьте, что прокси настроен правильно
sudo cat /etc/apache2/sites-available/bigo-frontend.conf | grep -A 5 ProxyPass

# Должно быть:
# ProxyPass /_next/static http://localhost:3000/_next/static
# ProxyPass / http://localhost:3000/
```

### Вариант 4: Проблема с портом или firewall

```bash
# Проверьте, что порт 3000 открыт
sudo netstat -tlnp | grep 3000

# Проверьте firewall (если используется)
sudo ufw status
# или
sudo iptables -L -n | grep 3000
```

## Полное перезапуск (если ничего не помогло)

```bash
# 1. Остановите frontend
cd /ssd/www/bigo-mvp/frontend/web
pm2 stop nio-frontend

# 2. Удалите старую сборку
rm -rf .next

# 3. Пересоберите
npm run build

# 4. Запустите через PM2
pm2 start ecosystem.config.js
# или если используете ecosystem.config.js
pm2 delete nio-frontend
pm2 start ecosystem.config.js

# 5. Проверьте статус
pm2 status nio-frontend

# 6. Проверьте, что работает локально
curl http://localhost:3000

# 7. Перезагрузите Apache
sudo systemctl reload apache2

# 8. Проверьте логи Apache
sudo tail -f /var/log/apache2/bigo-frontend-error.log
```

## Проверка конфигурации PM2

```bash
# Проверьте конфигурацию PM2 для frontend
cd /ssd/www/bigo-mvp/frontend/web
cat ecosystem.config.js

# Должно быть что-то вроде:
# {
#   name: 'nio-frontend',
#   script: 'npm',
#   args: 'start',
#   cwd: '/ssd/www/bigo-mvp/frontend/web',
#   env: {
#     PORT: 3000,
#     ...
#   }
# }
```

## Проверка логов

```bash
# Логи PM2 frontend
pm2 logs nio-frontend --lines 100

# Логи Apache ошибок
sudo tail -f /var/log/apache2/bigo-frontend-error.log

# Логи Apache доступа
sudo tail -f /var/log/apache2/bigo-frontend-access.log
```

## Типичные ошибки и решения

### Ошибка: "Cannot find module"
```bash
cd /ssd/www/bigo-mvp/frontend/web
npm install
npm run build
pm2 restart nio-frontend
```

### Ошибка: "Port 3000 is already in use"
```bash
# Найдите процесс, использующий порт 3000
sudo lsof -i :3000
# или
sudo netstat -tlnp | grep 3000

# Убейте процесс или используйте другой порт
# Или перезапустите PM2
pm2 restart nio-frontend
```

### Ошибка: "EADDRINUSE: address already in use"
```bash
# Остановите все процессы PM2
pm2 stop all

# Убейте процессы на порту 3000
sudo fuser -k 3000/tcp

# Запустите заново
cd /ssd/www/bigo-mvp/frontend/web
pm2 start ecosystem.config.js
```

## Все команды одной строкой (полный перезапуск)

```bash
cd /ssd/www/bigo-mvp/frontend/web && pm2 stop nio-frontend && rm -rf .next && npm run build && pm2 start ecosystem.config.js && sleep 5 && curl http://localhost:3000 && pm2 status nio-frontend && sudo systemctl reload apache2
```

## Проверка после исправления

```bash
# 1. Проверьте статус PM2
pm2 status nio-frontend

# 2. Проверьте локальный доступ
curl http://localhost:3000

# 3. Проверьте через браузер
# Откройте https://bigo.1tlt.ru

# 4. Проверьте логи на ошибки
pm2 logs nio-frontend --lines 20
```

## Если проблема сохраняется

1. **Проверьте, что Next.js действительно запущен:**
   ```bash
   ps aux | grep node
   ```

2. **Проверьте, что порт 3000 прослушивается:**
   ```bash
   netstat -tlnp | grep 3000
   ```

3. **Проверьте конфигурацию Apache:**
   ```bash
   sudo apache2ctl -S
   ```

4. **Проверьте, что модули Apache включены:**
   ```bash
   sudo a2enmod proxy
   sudo a2enmod proxy_http
   sudo systemctl reload apache2
   ```

5. **Проверьте логи Apache на детали ошибки:**
   ```bash
   sudo tail -50 /var/log/apache2/bigo-frontend-error.log
   ```
