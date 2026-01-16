# Исправление ошибки сборки Next.js

## Проблема
```
[Error: ENOENT: no such file or directory, open '/ssd/www/bigo-mvp/frontend/web/.next/server/pages-manifest.json']
```

## Решение

### 1. Полная очистка и пересборка

```bash
cd /ssd/www/bigo-mvp/frontend/web

# Удаляем папку .next полностью
rm -rf .next

# Удаляем node_modules и package-lock.json (опционально, если проблема сохраняется)
# rm -rf node_modules package-lock.json
# npm install

# Пересобираем проект
npm run build
```

### 2. Если ошибка сохраняется

```bash
cd /ssd/www/bigo-mvp/frontend/web

# Полная очистка
rm -rf .next node_modules package-lock.json

# Переустановка зависимостей
npm install

# Пересборка
npm run build
```

### 3. Проверка прав доступа

```bash
# Убедитесь, что у пользователя есть права на запись
chown -R $USER:$USER /ssd/www/bigo-mvp/frontend/web
chmod -R 755 /ssd/www/bigo-mvp/frontend/web
```

### 4. После успешной сборки

```bash
# Перезапуск PM2
pm2 restart nio-frontend

# Проверка статуса
pm2 status
pm2 logs nio-frontend --lines 50
```

## Альтернативное решение

Если проблема связана с нехваткой места на диске:

```bash
# Проверка свободного места
df -h

# Очистка старых сборок
cd /ssd/www/bigo-mvp/frontend/web
rm -rf .next
```

## Проверка после исправления

```bash
# Проверка наличия файла
ls -la /ssd/www/bigo-mvp/frontend/web/.next/server/pages-manifest.json

# Если файл существует, сборка успешна
```

