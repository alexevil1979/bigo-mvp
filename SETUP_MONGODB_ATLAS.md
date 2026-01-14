# 🔧 Настройка MongoDB Atlas

## Твой Connection String

```
mongodb+srv://alexevil1979_db_user:5Vickv7p4yDVOKrX@free.wcg21p5.mongodb.net/?appName=Free
```

## ✅ Настройка на сервере

### Шаг 1: Обнови .env файл

На сервере выполни:

```bash
cd /ssd/www/bigo-mvp/backend
sudo nano .env
```

Найди строку `MONGODB_URI` и замени на:

```env
MONGODB_URI=mongodb+srv://alexevil1979_db_user:5Vickv7p4yDVOKrX@free.wcg21p5.mongodb.net/streaming-mvp?retryWrites=true&w=majority
```

**Важно:**
- Добавлено имя базы: `/streaming-mvp`
- Добавлены параметры: `?retryWrites=true&w=majority`
- Убран параметр `appName=Free` (не нужен для подключения)

**Сохрани:** `Ctrl+X`, `Y`, `Enter`

### Шаг 2: Проверь настройки

```bash
cat .env | grep MONGODB_URI
```

Должно показать:
```
MONGODB_URI=mongodb+srv://alexevil1979_db_user:5Vickv7p4yDVOKrX@free.wcg21p5.mongodb.net/streaming-mvp?retryWrites=true&w=majority
```

### Шаг 3: Перезапусти Backend

```bash
pm2 restart bigo-backend
```

### Шаг 4: Проверь логи

```bash
pm2 logs bigo-backend --lines 30
```

**Ожидаемый результат:**
```
✅ MongoDB подключена
📊 База данных: streaming-mvp
🚀 Сервер запущен на порту 5000
📡 WebSocket сервер готов для подключений
```

**НЕ должно быть:**
- ❌ Ошибка подключения к MongoDB
- ❌ ECONNREFUSED
- ❌ Operation buffering timed out

---

## 🔍 Проверка подключения (опционально)

Можешь проверить подключение напрямую:

```bash
# Установи MongoDB Shell (если еще не установлен)
curl -fsSL https://www.mongodb.org/static/pgp/server-6.0.asc | sudo gpg -o /usr/share/keyrings/mongodb-server-6.0.gpg --dearmor
echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-6.0.gpg ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/6.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-6.0.list
sudo apt update
sudo apt install -y mongodb-mongosh

# Проверь подключение
mongosh "mongodb+srv://alexevil1979_db_user:5Vickv7p4yDVOKrX@free.wcg21p5.mongodb.net/streaming-mvp"
```

Если подключится успешно, увидишь приглашение MongoDB shell.

---

## 🎯 Настройка Network Access в MongoDB Atlas

**Важно:** Убедись, что в MongoDB Atlas настроен Network Access:

1. Зайди на [MongoDB Atlas](https://cloud.mongodb.com)
2. Выбери свой кластер
3. Перейди в **"Network Access"**
4. Нажми **"Add IP Address"**
5. Добавь:
   - **Для теста:** `0.0.0.0/0` (разрешает все IP)
   - **Для продакшена:** IP адрес твоего сервера
6. Сохрани

Без этого backend не сможет подключиться к MongoDB Atlas.

---

## ✅ После настройки

1. Backend должен подключиться к MongoDB
2. Регистрация должна работать
3. Вход должен работать
4. Все API endpoints должны работать

Проверь в Web приложении - попробуй зарегистрироваться!

---

## 🐛 Если не работает

### Проверь пароль

Убедись, что пароль правильный: `5Vickv7p4yDVOKrX`

### Проверь Network Access

В MongoDB Atlas → Network Access должно быть разрешено подключение с твоего IP.

### Проверь логи

```bash
pm2 logs bigo-backend --lines 50
```

Если видишь ошибки аутентификации, проверь username и password.

---

Готово! 🚀

