# Исправление конфликта при git pull на сервере

## Проблема

При выполнении `git pull origin master` возникает ошибка:
```
error: Your local changes to the following files would be overwritten by merge:
        backend/scripts/setup-turn.sh
Please commit your changes or stash them before you merge.
```

## Решение

### Вариант 1: Сохранить локальные изменения (рекомендуется)

Если вы вносили изменения в `backend/scripts/setup-turn.sh` и хотите их сохранить:

```bash
# 1. Перейдите в корневую директорию проекта
cd /ssd/www/bigo-mvp

# 2. Сохраните локальные изменения
git stash

# 3. Обновите код из репозитория
git pull origin master

# 4. Примените сохраненные изменения обратно
git stash pop

# 5. Если есть конфликты, разрешите их вручную
# Затем закоммитьте изменения, если нужно
```

### Вариант 2: Отменить локальные изменения

Если локальные изменения в `backend/scripts/setup-turn.sh` не нужны:

```bash
# 1. Перейдите в корневую директорию проекта
cd /ssd/www/bigo-mvp

# 2. Отмените локальные изменения
git checkout -- backend/scripts/setup-turn.sh

# 3. Обновите код из репозитория
git pull origin master
```

### Вариант 3: Закоммитить локальные изменения

Если вы хотите сохранить изменения в репозитории:

```bash
# 1. Перейдите в корневую директорию проекта
cd /ssd/www/bigo-mvp

# 2. Добавьте измененный файл
git add backend/scripts/setup-turn.sh

# 3. Закоммитьте изменения
git commit -m "Локальные изменения в setup-turn.sh"

# 4. Обновите код из репозитория
git pull origin master

# 5. Если есть конфликты, разрешите их и выполните:
git add backend/scripts/setup-turn.sh
git commit -m "Разрешен конфликт в setup-turn.sh"
```

## После обновления кода

После успешного `git pull` выполните пересборку Next.js:

```bash
# 1. Перейдите в директорию фронтенда
cd /ssd/www/bigo-mvp/frontend/web

# 2. Остановите PM2
pm2 stop nio-frontend

# 3. Удалите старую сборку
rm -rf .next

# 4. Пересоберите Next.js
npm run build

# 5. Запустите PM2 снова
pm2 restart nio-frontend

# 6. Проверьте логи
pm2 logs nio-frontend --lines 30
```

## Быстрое решение (если изменения не важны)

Если локальные изменения в `setup-turn.sh` не важны, выполните:

```bash
cd /ssd/www/bigo-mvp
git checkout -- backend/scripts/setup-turn.sh
git pull origin master
cd frontend/web
pm2 stop nio-frontend
rm -rf .next
npm run build
pm2 restart nio-frontend
pm2 logs nio-frontend --lines 30
```

## Проверка

После выполнения всех шагов:

1. **Проверьте статус git:**
   ```bash
   cd /ssd/www/bigo-mvp
   git status
   ```
   Должно быть: `Your branch is up to date with 'origin/master'`

2. **Проверьте сборку Next.js:**
   ```bash
   cd /ssd/www/bigo-mvp/frontend/web
   ls -la .next/prerender-manifest.json
   ```
   Файл должен существовать.

3. **Проверьте логи PM2:**
   ```bash
   pm2 logs nio-frontend --lines 30
   ```
   Не должно быть ошибок `SEO is not defined` или `ENOENT: prerender-manifest.json`.

4. **Проверьте сайт:**
   ```bash
   curl http://localhost:3000
   ```
   Должен вернуться HTML без ошибок.

## Готово!

После выполнения всех шагов код будет обновлен, Next.js пересобран, и ошибка `SEO is not defined` должна исчезнуть.

