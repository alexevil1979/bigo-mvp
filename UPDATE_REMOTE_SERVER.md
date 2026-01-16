# Обновление всего на удаленном сервере

## Быстрое обновление всех компонентов

### 1. Подключитесь к серверу

```bash
ssh root@ваш_сервер
```

### 2. Обновите код из git

```bash
cd /ssd/www/bigo-mvp
git pull origin master
```

### 3. Обновите Backend

```bash
cd /ssd/www/bigo-mvp/backend
npm install
pm2 restart nio-backend
```

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
pm2 logs nio-backend --lines 50

# Логи frontend
pm2 logs nio-frontend --lines 50

# Логи admin
pm2 logs nio-admin --lines 50
```

## Все команды одной строкой (для копирования)

```bash
cd /ssd/www/bigo-mvp && git pull origin master && cd backend && npm install && pm2 restart nio-backend && cd ../frontend/web && rm -rf .next && npm run build && pm2 restart nio-frontend && cd ../../admin && rm -rf .next && npm run build && pm2 restart nio-admin && pm2 status all
```

## Пути на удаленном сервере

- **Backend:** `/ssd/www/bigo-mvp/backend`
- **Frontend:** `/ssd/www/bigo-mvp/frontend/web`
- **Admin:** `/ssd/www/bigo-mvp/admin`
