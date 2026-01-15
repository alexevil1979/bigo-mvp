# Исправление: Could not find a production build

## Проблема

```
Error: Could not find a production build in the '.next' directory. 
Try building your app with 'next build' before starting the production server.
```

Это означает, что Next.js пытается запуститься в production режиме, но не находит собранный билд.

## Решение

### Шаг 1: Остановите PM2 процесс

```bash
pm2 stop nio-frontend
```

### Шаг 2: Перейдите в директорию фронтенда

```bash
cd /ssd/www/bigo-mvp/frontend/web
```

### Шаг 3: Удалите старую директорию .next (если она есть, но неполная)

```bash
rm -rf .next
```

### Шаг 4: Выполните сборку

```bash
npm run build
```

Дождитесь завершения сборки. Это может занять несколько минут.

### Шаг 5: Проверьте, что билд создан

```bash
ls -la .next
```

Должны быть файлы:
- `BUILD_ID`
- `server/`
- `static/`
- и другие

### Шаг 6: Перезапустите PM2

```bash
pm2 restart nio-frontend
```

### Шаг 7: Проверьте логи

```bash
pm2 logs nio-frontend --lines 30
```

Должно быть:
```
✓ Ready in Xms
- Local: http://localhost:3000
```

**НЕ должно быть ошибки "Could not find a production build"**

## Если сборка не удается

### Проверьте ошибки сборки

```bash
cd /ssd/www/bigo-mvp/frontend/web
npm run build 2>&1 | tee build.log
```

Ищите ошибки в выводе или в файле `build.log`.

### Типичные ошибки сборки:

1. **"Module not found"** - нужно переустановить зависимости:
   ```bash
   rm -rf node_modules package-lock.json
   npm install
   npm run build
   ```

2. **"Out of memory"** - не хватает памяти:
   ```bash
   # Увеличьте лимит памяти для Node.js
   export NODE_OPTIONS="--max-old-space-size=4096"
   npm run build
   ```

3. **"ENOENT: prerender-manifest.json"** - проблема с билдом:
   ```bash
   rm -rf .next
   npm run build
   ```

## Полное исправление (если ничего не помогает)

```bash
cd /ssd/www/bigo-mvp/frontend/web

# Остановите PM2
pm2 stop nio-frontend

# Удалите все
rm -rf node_modules .next package-lock.json

# Переустановите зависимости
npm install

# Соберите проект
npm run build

# Проверьте билд
ls -la .next

# Запустите снова
pm2 restart nio-frontend

# Проверьте логи
pm2 logs nio-frontend --lines 20
```

## Проверка после исправления

1. Проверьте статус PM2:
   ```bash
   pm2 status
   ```
   Должен быть `online` для `nio-frontend`

2. Проверьте логи:
   ```bash
   pm2 logs nio-frontend --lines 10
   ```
   Не должно быть ошибок

3. Проверьте сайт:
   - Откройте https://bigo.1tlt.ru
   - Сайт должен загружаться

4. Проверьте локально:
   ```bash
   curl http://localhost:3000
   ```
   Должен вернуть HTML страницу

## Готово!

После выполнения этих шагов ошибка "Could not find a production build" должна исчезнуть, и сайт должен работать.

