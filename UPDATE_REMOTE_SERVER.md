# Обновление всего на удаленном сервере

## Быстрое обновление всех компонентов

### 1. Подключитесь к серверу

```bash
ssh root@ваш_сервер
```

### 2. Обновите код из git

**Если есть конфликты с локальными изменениями:**

```bash
cd /ssd/www/bigo-mvp

# Вариант 1: Сохраните локальные изменения (если они нужны)
git stash
git pull origin master
git stash pop  # Применить сохраненные изменения обратно

# Вариант 2: Отмените локальные изменения (если они не нужны)
git reset --hard HEAD
git pull origin master
```

**Если конфликтов нет:**

```bash
cd /ssd/www/bigo-mvp
git pull origin master
```

### 3. Обновите Backend

```bash
cd /ssd/www/bigo-mvp/backend
npm install
pm2 restart bigo-backend
```

**Примечание:** На удаленном сервере процесс backend называется `bigo-backend` (не nio-backend!)

### 4. Обновите Frontend

```bash
cd /ssd/www/bigo-mvp/frontend/web
rm -rf .next
npm run build
pm2 restart nio-frontend
```

### 5. Обновите Admin

```bash
cd /ssd/www/bigo-mvp/admin
rm -rf .next
npm run build
pm2 restart nio-admin
```

### 6. Проверьте статус всех сервисов

```bash
pm2 status all
```

### 7. Проверьте логи (если нужно)

```bash
# Логи backend
pm2 logs bigo-backend --lines 50

# Логи frontend
pm2 logs nio-frontend --lines 50

# Логи admin
pm2 logs nio-admin --lines 50
```

## Решение проблем

### Проблема: Конфликт при git pull

```bash
cd /ssd/www/bigo-mvp
# Отмените локальные изменения (если они не нужны)
git reset --hard HEAD
# Затем обновите
git pull origin master
```

### Проблема: PM2 не находит процесс

```bash
# Проверьте список всех процессов
pm2 list

# На удаленном сервере процессы называются:
# - bigo-backend (backend)
# - nio-frontend (frontend)
# - nio-admin (admin)

# Если процесс не запущен, запустите его:
# Backend:
cd /ssd/www/bigo-mvp/backend
pm2 start server.js --name bigo-backend

# Frontend:
cd /ssd/www/bigo-mvp/frontend/web
pm2 start ecosystem.config.js

# Admin:
cd /ssd/www/bigo-mvp/admin
pm2 start ecosystem.config.js
```

## Все команды одной строкой (для копирования)

**Внимание:** Используйте только если нет конфликтов в git!

```bash
cd /ssd/www/bigo-mvp && git reset --hard HEAD && git pull origin master && cd backend && npm install && pm2 restart bigo-backend && cd ../frontend/web && rm -rf .next && npm run build && pm2 restart nio-frontend && cd ../../admin && rm -rf .next && npm run build && pm2 restart nio-admin && pm2 status all
```

## Названия процессов PM2 на удаленном сервере

- **Backend:** `bigo-backend`
- **Frontend:** `nio-frontend`
- **Admin:** `nio-admin`

## Пути на удаленном сервере

- **Backend:** `/ssd/www/bigo-mvp/backend`
- **Frontend:** `/ssd/www/bigo-mvp/frontend/web`
- **Admin:** `/ssd/www/bigo-mvp/admin`
