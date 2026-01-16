# Быстрое исправление ошибки 503

## Диагностика

503 ошибка означает, что Next.js сервер не отвечает. Проверьте:

### 1. Проверьте статус PM2

```bash
pm2 status
```

Должен быть запущен `nio-frontend`. Если его нет или он остановлен:

```bash
cd /ssd/www/bigo-mvp/frontend/web
pm2 start ecosystem.config.js
# или
pm2 restart nio-frontend
```

### 2. Проверьте логи PM2

```bash
pm2 logs nio-frontend --lines 50
```

Ищите ошибки:
- `Could not find a production build` - нужно пересобрать
- `Port already in use` - порт занят
- `ENOENT` - отсутствуют файлы
- Ошибки импорта модулей

### 3. Проверьте, есть ли билд

```bash
ls -la /ssd/www/bigo-mvp/frontend/web/.next
```

Если папка `.next` отсутствует или пустая - нужно пересобрать.

## Быстрое исправление

### Вариант 1: Пересборка и перезапуск

```bash
cd /ssd/www/bigo-mvp/frontend/web

# Остановите PM2
pm2 stop nio-frontend

# Удалите старый билд
rm -rf .next

# Пересоберите
npm run build

# Запустите снова
pm2 restart nio-frontend

# Проверьте логи
pm2 logs nio-frontend --lines 30
```

### Вариант 2: Полная переустановка зависимостей

Если пересборка не помогла:

```bash
cd /ssd/www/bigo-mvp/frontend/web

# Остановите PM2
pm2 stop nio-frontend

# Удалите node_modules и билд
rm -rf node_modules .next package-lock.json

# Переустановите зависимости
npm install

# Пересоберите
npm run build

# Запустите снова
pm2 restart nio-frontend

# Проверьте статус
pm2 status
pm2 logs nio-frontend --lines 30
```

### Вариант 3: Проверка порта

```bash
# Проверьте, не занят ли порт 3000
netstat -tulpn | grep 3000

# Если порт занят другим процессом, убейте его
# Найдите PID процесса
lsof -i :3000
# Убейте процесс (замените PID)
kill -9 PID
```

### Вариант 4: Проверка Apache конфигурации

```bash
# Проверьте конфигурацию Apache
sudo apache2ctl configtest

# Проверьте, что прокси настроен правильно
sudo cat /etc/apache2/sites-available/bigo.1tlt.ru.conf | grep -A 10 ProxyPass

# Должно быть:
# ProxyPass /_next/static !
# ProxyPass / http://localhost:3000/
# ProxyPassReverse / http://localhost:3000/
```

Если конфигурация неправильная, исправьте и перезапустите Apache:

```bash
sudo systemctl restart apache2
```

## Проверка после исправления

1. Проверьте статус PM2:
   ```bash
   pm2 status
   ```
   Должен быть `online` для `nio-frontend`

2. Проверьте логи:
   ```bash
   pm2 logs nio-frontend --lines 20
   ```
   Не должно быть ошибок

3. Проверьте сайт:
   - Откройте https://bigo.1tlt.ru
   - Не должно быть 503 ошибки

4. Проверьте порт:
   ```bash
   curl http://localhost:3000
   ```
   Должен вернуть HTML страницу

## Если ничего не помогло

### Полный перезапуск всего стека

```bash
# Остановите все PM2 процессы
pm2 stop all

# Перезапустите Apache
sudo systemctl restart apache2

# Перезапустите PM2
pm2 restart all

# Проверьте статус
pm2 status
```

### Проверка системных ресурсов

```bash
# Проверьте использование памяти
free -h

# Проверьте использование диска
df -h

# Проверьте загрузку CPU
top
```

Если не хватает ресурсов, освободите место или увеличьте ресурсы сервера.

## Типичные ошибки и решения

### Ошибка: "Could not find a production build"

```bash
cd /ssd/www/bigo-mvp/frontend/web
rm -rf .next
npm run build
pm2 restart nio-frontend
```

### Ошибка: "Port 3000 is already in use"

```bash
# Найдите процесс
lsof -i :3000
# Убейте процесс
kill -9 PID
# Или измените порт в ecosystem.config.js
```

### Ошибка: "Module not found"

```bash
cd /ssd/www/bigo-mvp/frontend/web
rm -rf node_modules package-lock.json
npm install
npm run build
pm2 restart nio-frontend
```

### Ошибка: "ENOENT: prerender-manifest.json"

```bash
cd /ssd/www/bigo-mvp/frontend/web
rm -rf .next
npm run build
pm2 restart nio-frontend
```

## Готово!

После выполнения этих шагов сайт должен работать без ошибки 503.



