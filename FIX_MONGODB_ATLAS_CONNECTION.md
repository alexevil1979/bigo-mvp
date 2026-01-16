# 🔧 Исправление подключения к MongoDB Atlas

## Проблема

Ошибка: `ReplicaSetNoPrimary` - MongoDB Atlas видит серверы, но не может установить соединение.

## ✅ Решение

### Шаг 1: Проверь Network Access в MongoDB Atlas

1. Зайди на [MongoDB Atlas](https://cloud.mongodb.com)
2. Войди в свой аккаунт
3. Выбери кластер `Free`
4. Перейди в раздел **"Network Access"** (слева в меню)
5. Проверь список разрешенных IP адресов

**Если список пустой или нет IP твоего сервера:**

1. Нажми **"Add IP Address"**
2. Выбери один из вариантов:
   - **"Allow Access from Anywhere"** → `0.0.0.0/0` (для теста)
   - **"Add Current IP Address"** (добавит IP твоего компьютера, но не сервера)
   - **"Add IP Address"** → введи IP адрес твоего сервера

3. Нажми **"Confirm"**

**Важно:** Изменения могут занять 1-2 минуты для применения.

### Шаг 2: Проверь статус кластера

1. В MongoDB Atlas перейди в раздел **"Database"**
2. Проверь статус кластера:
   - Должен быть **"Active"** (зеленый)
   - Если **"Paused"** - нажми "Resume" для запуска

### Шаг 3: Получи IP адрес сервера

На сервере выполни:

```bash
curl ifconfig.me
# или
curl ipinfo.io/ip
```

Скопируй IP адрес и добавь его в Network Access в MongoDB Atlas.

### Шаг 4: Проверь Connection String

На сервере:

```bash
cd /ssd/www/bigo-mvp/backend
cat .env | grep MONGODB_URI
```

Должно быть:
```
MONGODB_URI=mongodb+srv://alexevil1979_db_user:5Vickv7p4yDVOKrX@free.wcg21p5.mongodb.net/streaming-mvp?retryWrites=true&w=majority
```

**Проверь:**
- Username правильный: `alexevil1979_db_user`
- Password правильный: `5Vickv7p4yDVOKrX`
- Имя базы добавлено: `/streaming-mvp`

### Шаг 5: Обнови Connection String (если нужно)

В MongoDB Atlas:

1. Нажми **"Connect"** на кластере
2. Выбери **"Connect your application"**
3. Выбери **"Node.js"** и версию **"4.1 or later"**
4. Скопируй новый Connection String
5. Замени `<password>` на реальный пароль
6. Добавь имя базы: `/streaming-mvp`

Обнови в `.env`:

```bash
sudo nano .env
```

### Шаг 6: Перезапусти Backend

```bash
pm2 restart bigo-backend
pm2 logs bigo-backend --lines 30
```

**Ожидаемый результат:**
```
✅ MongoDB подключена
📊 База данных: streaming-mvp
🚀 Сервер запущен на порту 5000
```

---

## 🔍 Альтернативное решение: Используй прямой IP вместо SRV

Если SRV не работает, попробуй использовать прямой IP:

1. В MongoDB Atlas → **"Connect"** → **"Connect your application"**
2. Выбери **"Standard connection string"** (не SRV)
3. Получишь строку вида:
   ```
   mongodb://alexevil1979_db_user:5Vickv7p4yDVOKrX@ac-ryxzsun-shard-00-00.wcg21p5.mongodb.net:27017,ac-ryxzsun-shard-00-01.wcg21p5.mongodb.net:27017,ac-ryxzsun-shard-00-02.wcg21p5.mongodb.net:27017/?ssl=true&replicaSet=atlas-6ap6ys-shard-0&authSource=admin
   ```

4. Добавь имя базы:
   ```
   mongodb://alexevil1979_db_user:5Vickv7p4yDVOKrX@ac-ryxzsun-shard-00-00.wcg21p5.mongodb.net:27017,ac-ryxzsun-shard-00-01.wcg21p5.mongodb.net:27017,ac-ryxzsun-shard-00-02.wcg21p5.mongodb.net:27017/streaming-mvp?ssl=true&replicaSet=atlas-6ap6ys-shard-0&authSource=admin
   ```

5. Обнови в `.env`:
   ```env
   MONGODB_URI=mongodb://alexevil1979_db_user:5Vickv7p4yDVOKrX@ac-ryxzsun-shard-00-00.wcg21p5.mongodb.net:27017,ac-ryxzsun-shard-00-01.wcg21p5.mongodb.net:27017,ac-ryxzsun-shard-00-02.wcg21p5.mongodb.net:27017/streaming-mvp?ssl=true&replicaSet=atlas-6ap6ys-shard-0&authSource=admin
   ```

---

## 🧪 Тест подключения напрямую

На сервере установи MongoDB Shell:

```bash
# Установка mongosh
curl -fsSL https://www.mongodb.org/static/pgp/server-6.0.asc | sudo gpg -o /usr/share/keyrings/mongodb-server-6.0.gpg --dearmor
echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-6.0.gpg ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/6.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-6.0.list
sudo apt update
sudo apt install -y mongodb-mongosh
```

Попробуй подключиться:

```bash
mongosh "mongodb+srv://alexevil1979_db_user:5Vickv7p4yDVOKrX@free.wcg21p5.mongodb.net/streaming-mvp"
```

Если подключится - проблема в коде backend.
Если не подключится - проблема в Network Access или пароле.

---

## ✅ Чеклист

- [ ] Network Access настроен (добавлен IP или 0.0.0.0/0)
- [ ] Кластер активен (не приостановлен)
- [ ] Connection String правильный (с паролем и именем базы)
- [ ] IP сервера добавлен в whitelist
- [ ] Backend перезапущен

---

## 🐛 Если все еще не работает

### Проверь пароль

Убедись, что пароль правильный. В MongoDB Atlas:
1. **Database Access** → найди пользователя `alexevil1979_db_user`
2. Если нужно, сбрось пароль и создай новый
3. Обнови Connection String с новым паролем

### Проверь права пользователя

Пользователь должен иметь права:
- **Atlas admin** или
- **Read and write to any database**

### Проверь firewall на сервере

```bash
# Если используешь UFW
sudo ufw status

# Разреши исходящие соединения (обычно разрешены по умолчанию)
sudo ufw allow out 27017
```

---

Готово! После настройки Network Access должно заработать! 🚀



