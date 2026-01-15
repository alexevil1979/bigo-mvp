# Исправление: PM2 не находит production build

## Проблема

PM2 постоянно выдает ошибку:
```
Error: Could not find a production build in the '.next' directory.
```

Даже после выполнения `npm run build`.

## Причина

PM2 может запускаться из неправильной директории из-за использования `process.cwd()` в конфигурации.

## Решение

### Шаг 1: Удалите старый процесс PM2

```bash
pm2 delete nio-frontend
```

### Шаг 2: Перейдите в директорию фронтенда

```bash
cd /ssd/www/bigo-mvp/frontend/web
```

### Шаг 3: Обновите код (если нужно)

```bash
git pull origin master
```

### Шаг 4: Убедитесь, что билд создан

```bash
# Удалите старый билд
rm -rf .next

# Создайте билд
npm run build

# Проверьте, что BUILD_ID существует
ls -la .next/BUILD_ID

# Должен быть файл BUILD_ID
```

### Шаг 5: Проверьте ecosystem.config.js

```bash
cat ecosystem.config.js
```

Должно быть:
```javascript
cwd: path.resolve(__dirname),
```

**НЕ должно быть:**
```javascript
cwd: process.cwd(),
```

### Шаг 6: Запустите PM2 из правильной директории

```bash
# Убедитесь, что вы в правильной директории
pwd
# Должно быть: /ssd/www/bigo-mvp/frontend/web

# Запустите PM2
pm2 start ecosystem.config.js

# Или если процесс уже существует, перезапустите
pm2 restart nio-frontend --update-env
```

### Шаг 7: Проверьте логи

```bash
pm2 logs nio-frontend --lines 20
```

Должно быть:
```
✓ Ready in Xms
- Local: http://localhost:3000
```

**НЕ должно быть ошибки "Could not find a production build"**

## Альтернативное решение: Использовать абсолютный путь

Если проблема сохраняется, отредактируйте `ecosystem.config.js`:

```bash
cd /ssd/www/bigo-mvp/frontend/web
nano ecosystem.config.js
```

Измените на:
```javascript
module.exports = {
  apps: [{
    name: 'nio-frontend',
    script: 'npm',
    args: 'start',
    cwd: '/ssd/www/bigo-mvp/frontend/web',  // Абсолютный путь
    instances: 1,
    exec_mode: 'fork',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: '/root/.pm2/logs/nio-frontend-error.log',
    out_file: '/root/.pm2/logs/nio-frontend-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    autorestart: true,
    max_memory_restart: '500M',
    watch: false,
    ignore_watch: ['node_modules', '.next', 'logs']
  }]
};
```

Затем:
```bash
pm2 delete nio-frontend
pm2 start ecosystem.config.js
pm2 save
```

## Полное исправление (если ничего не помогает)

```bash
# 1. Остановите и удалите процесс
pm2 delete nio-frontend

# 2. Перейдите в директорию
cd /ssd/www/bigo-mvp/frontend/web

# 3. Полная очистка
rm -rf node_modules .next package-lock.json

# 4. Переустановка
npm install

# 5. Сборка
npm run build

# 6. Проверка билда
ls -la .next/BUILD_ID

# 7. Запуск PM2
pm2 start ecosystem.config.js

# 8. Сохранение конфигурации
pm2 save

# 9. Проверка
pm2 status
pm2 logs nio-frontend --lines 20
```

## Проверка рабочей директории PM2

```bash
# Проверьте, из какой директории запускается процесс
pm2 describe nio-frontend | grep cwd

# Или
pm2 show nio-frontend
```

Если директория неправильная, удалите процесс и создайте заново из правильной директории.

## Проверка после исправления

1. **Статус PM2:**
   ```bash
   pm2 status
   ```
   Должен быть `online`

2. **Логи:**
   ```bash
   pm2 logs nio-frontend --lines 10
   ```
   Не должно быть ошибок

3. **Локальный доступ:**
   ```bash
   curl http://localhost:3000
   ```
   Должен вернуть HTML

4. **Сайт:**
   - Откройте https://bigo.1tlt.ru
   - Не должно быть ошибки 503

## Готово!

После выполнения этих шагов PM2 должен найти production build и запустить Next.js сервер.

