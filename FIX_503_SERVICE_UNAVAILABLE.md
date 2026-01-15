# Исправление ошибки 503 (Service Unavailable)

## Проблема

Ошибка `503 (Service Unavailable)` означает, что Apache не может подключиться к Next.js приложению на порту 3000.

## Диагностика

### Шаг 1: Проверьте статус PM2

```bash
pm2 status
```

**Должен быть процесс `nio-frontend` со статусом `online`.**

Если статус `stopped` или `errored`:
```bash
# Проверьте логи
pm2 logs nio-frontend --lines 50

# Перезапустите
pm2 restart nio-frontend

# Проверьте статус снова
pm2 status
```

### Шаг 2: Проверьте, что Next.js слушает на порту 3000

```bash
# Проверьте, что порт 3000 слушается
sudo netstat -tulpn | grep 3000
# или
sudo ss -tulpn | grep 3000
```

**Должно быть что-то вроде:**
```
tcp    LISTEN   0   128   0.0.0.0:3000   0.0.0.0:*   users:(("node",pid=12345,fd=20))
```

Если порт не слушается, Next.js не запущен.

### Шаг 3: Проверьте доступность Next.js локально

```bash
# Попробуйте подключиться к Next.js локально
curl http://localhost:3000
```

**Должен вернуться HTML без ошибок.**

Если не работает:
```bash
# Проверьте логи PM2
pm2 logs nio-frontend --lines 50

# Проверьте, что приложение собрано
ls -la /ssd/www/bigo-mvp/frontend/web/.next/
```

### Шаг 4: Проверьте конфигурацию Apache

```bash
# Проверьте конфигурацию Apache
sudo apache2ctl configtest

# Проверьте, что прокси настроен правильно
sudo cat /etc/apache2/sites-available/bigo-frontend.conf | grep -E "ProxyPass|localhost:3000"
```

**Должно быть:**
```apache
ProxyPass / http://localhost:3000/
ProxyPassReverse / http://localhost:3000/
```

### Шаг 5: Проверьте логи Apache

```bash
# Проверьте логи ошибок Apache
sudo tail -f /var/log/apache2/bigo-frontend-error.log
# или
sudo tail -f /var/log/apache2/error.log
```

Ищите ошибки типа:
- `Connection refused`
- `No route to host`
- `Connection timed out`

## Решения

### Решение 1: Перезапустите Next.js через PM2

```bash
# Остановите
pm2 stop nio-frontend

# Запустите снова
pm2 start nio-frontend

# Проверьте статус
pm2 status

# Проверьте логи
pm2 logs nio-frontend --lines 30
```

### Решение 2: Пересоберите Next.js

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

# Проверьте статус
pm2 status
```

### Решение 3: Проверьте переменные окружения

```bash
# Проверьте .env.local
cat /ssd/www/bigo-mvp/frontend/web/.env.local

# Убедитесь, что все необходимые переменные установлены
```

### Решение 4: Проверьте, что порт 3000 не занят другим процессом

```bash
# Проверьте, что порт 3000 свободен
sudo lsof -i :3000
# или
sudo netstat -tulpn | grep 3000

# Если порт занят другим процессом, остановите его или измените порт в PM2
```

### Решение 5: Перезапустите Apache

```bash
# Проверьте конфигурацию
sudo apache2ctl configtest

# Если OK, перезагрузите Apache
sudo systemctl reload apache2
# или
sudo service apache2 reload
```

### Решение 6: Полная переустановка PM2 процесса

```bash
# Удалите процесс из PM2
pm2 delete nio-frontend

# Перейдите в директорию фронтенда
cd /ssd/www/bigo-mvp/frontend/web

# Проверьте ecosystem.config.js
cat ecosystem.config.js

# Запустите снова
pm2 start ecosystem.config.js

# Сохраните конфигурацию PM2
pm2 save

# Проверьте статус
pm2 status
```

## Быстрое исправление (все в одном)

```bash
# 1. Проверьте статус PM2
pm2 status

# 2. Если не работает, перезапустите
pm2 restart nio-frontend

# 3. Проверьте порт
sudo netstat -tulpn | grep 3000

# 4. Проверьте локально
curl http://localhost:3000

# 5. Если не работает, пересоберите
cd /ssd/www/bigo-mvp/frontend/web
pm2 stop nio-frontend
rm -rf .next
npm run build
pm2 restart nio-frontend

# 6. Проверьте логи
pm2 logs nio-frontend --lines 30

# 7. Перезагрузите Apache
sudo systemctl reload apache2
```

## Проверка после исправления

1. **Проверьте статус PM2:**
   ```bash
   pm2 status
   ```
   Процесс должен быть `online`.

2. **Проверьте порт:**
   ```bash
   sudo netstat -tulpn | grep 3000
   ```
   Порт должен слушаться.

3. **Проверьте локально:**
   ```bash
   curl http://localhost:3000
   ```
   Должен вернуться HTML.

4. **Проверьте через браузер:**
   Откройте `https://bigo.1tlt.ru` - сайт должен загружаться без ошибок 503.

## Если проблема сохраняется

1. **Проверьте логи PM2 в реальном времени:**
   ```bash
   pm2 logs nio-frontend
   ```

2. **Проверьте логи Apache в реальном времени:**
   ```bash
   sudo tail -f /var/log/apache2/bigo-frontend-error.log
   ```

3. **Проверьте системные логи:**
   ```bash
   sudo journalctl -u coturn -f
   sudo journalctl -xe
   ```

4. **Проверьте место на диске:**
   ```bash
   df -h
   ```

5. **Проверьте память:**
   ```bash
   free -h
   ```

## Готово!

После выполнения всех шагов ошибка 503 должна исчезнуть, и сайт должен работать нормально.

