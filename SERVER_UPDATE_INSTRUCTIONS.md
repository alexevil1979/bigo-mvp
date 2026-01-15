# Инструкция по обновлению сервера

## Проблема: Локальные изменения мешают git pull

На сервере есть локальные изменения в `backend/package-lock.json`. Нужно их сохранить или откатить.

## Решение:

### Вариант 1: Сохранить изменения (рекомендуется)

```bash
cd /ssd/www/bigo-mvp
git stash
git pull origin master
git stash pop  # Применить сохраненные изменения обратно (если нужно)
```

### Вариант 2: Откатить изменения (если они не нужны)

```bash
cd /ssd/www/bigo-mvp
git checkout -- backend/package-lock.json
git pull origin master
```

### Вариант 3: Принудительное обновление (осторожно!)

```bash
cd /ssd/www/bigo-mvp
git reset --hard origin/master
git pull origin master
```

**⚠️ Внимание:** Вариант 3 удалит все локальные изменения!

## После успешного git pull:

```bash
cd /ssd/www/bigo-mvp/backend
node scripts/fix-index.js
pm2 restart bigo-backend --update-env
```

## Проверка:

```bash
pm2 logs bigo-backend --err --lines 20
```

Предупреждения о дублирующемся индексе должны исчезнуть.

