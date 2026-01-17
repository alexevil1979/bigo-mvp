# Исправление ошибки EADDRINUSE: address already in use :::5000

## Проблема
```
Error: listen EADDRINUSE: address already in use :::5000
```

Это означает, что порт 5000 уже занят другим процессом. Возможно, запущено несколько экземпляров backend.

## Быстрое исправление

### Шаг 1: Найдите процесс, использующий порт 5000

```bash
# Вариант 1: Используя lsof
sudo lsof -i :5000

# Вариант 2: Используя netstat
sudo netstat -tlnp | grep 5000

# Вариант 3: Используя ss
sudo ss -tlnp | grep 5000

# Вариант 4: Используя fuser
sudo fuser 5000/tcp
```

### Шаг 2: Остановите все процессы PM2 backend

```bash
# Остановите backend через PM2
pm2 stop bigo-backend

# Убейте все процессы Node.js на порту 5000 (если нужно)
sudo fuser -k 5000/tcp

# Или убейте процесс вручную (замените PID на реальный из шага 1)
# sudo kill -9 <PID>
```

### Шаг 3: Проверьте, что порт свободен

```bash
# Проверьте, что порт 5000 свободен
sudo lsof -i :5000
# Должно быть пусто

# Или
netstat -tlnp | grep 5000
# Должно быть пусто
```

### Шаг 4: Перезапустите backend

```bash
cd /ssd/www/bigo-mvp/backend

# Запустите через PM2
pm2 start ecosystem.config.js
# или если используете другой способ
pm2 restart bigo-backend

# Проверьте статус
pm2 status bigo-backend

# Проверьте логи
pm2 logs bigo-backend --lines 30
```

## Полное исправление (если ничего не помогло)

```bash
# 1. Остановите все процессы PM2
pm2 stop all

# 2. Убейте все процессы на порту 5000
sudo fuser -k 5000/tcp

# 3. Подождите несколько секунд
sleep 3

# 4. Проверьте, что порт свободен
sudo lsof -i :5000

# 5. Перезапустите backend
cd /ssd/www/bigo-mvp/backend
pm2 start ecosystem.config.js

# 6. Проверьте статус
pm2 status all

# 7. Проверьте логи
pm2 logs bigo-backend --lines 50
```

## Проверка конфигурации PM2

```bash
# Проверьте конфигурацию PM2 для backend
cd /ssd/www/bigo-mvp/backend
cat ecosystem.config.js

# Убедитесь, что указан правильный порт
# env: {
#   PORT: 5000,
#   ...
# }
```

## Если проблема повторяется

### Вариант 1: Измените порт backend

```bash
# Отредактируйте ecosystem.config.js
cd /ssd/www/bigo-mvp/backend
nano ecosystem.config.js

# Измените PORT на другой (например, 5001)
# env: {
#   PORT: 5001,
#   ...
# }

# Также обновите .env файл
nano .env
# PORT=5001

# Перезапустите
pm2 restart bigo-backend
```

**ВАЖНО:** Если измените порт, также нужно обновить конфигурацию Apache для API:

```bash
sudo nano /etc/apache2/sites-available/bigo-api.conf
# Измените ProxyPass на новый порт
# ProxyPass / http://localhost:5001/
```

### Вариант 2: Используйте другой порт в PM2

```bash
# Удалите старый процесс
pm2 delete bigo-backend

# Запустите с другим портом
cd /ssd/www/bigo-mvp/backend
PORT=5001 pm2 start server.js --name bigo-backend
```

## Диагностика

```bash
# Проверьте все процессы Node.js
ps aux | grep node

# Проверьте все процессы PM2
pm2 list

# Проверьте логи PM2
pm2 logs bigo-backend --lines 100

# Проверьте системные логи
sudo journalctl -u pm2-root -n 50
```

## Предотвращение проблемы в будущем

1. **Всегда используйте PM2 для управления процессами:**
   ```bash
   pm2 start ecosystem.config.js
   # Не запускайте напрямую: node server.js
   ```

2. **Проверяйте статус перед запуском:**
   ```bash
   pm2 status bigo-backend
   # Если процесс уже запущен, используйте restart вместо start
   ```

3. **Используйте PM2 для остановки:**
   ```bash
   pm2 stop bigo-backend
   # Не убивайте процесс вручную
   ```

## Все команды одной строкой (быстрое исправление)

```bash
pm2 stop bigo-backend && sudo fuser -k 5000/tcp && sleep 2 && cd /ssd/www/bigo-mvp/backend && pm2 start ecosystem.config.js && pm2 status bigo-backend && pm2 logs bigo-backend --lines 20
```
