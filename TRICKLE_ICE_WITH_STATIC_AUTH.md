# Как использовать Trickle ICE с TURN сервером, использующим static-auth-secret

## Проблема

Trickle ICE не может автоматически использовать TURN сервер с `static-auth-secret` без username/password. Нужно вручную сгенерировать временные credentials.

## Решение: Генерация credentials для Trickle ICE

### Шаг 1: Получите секретный ключ

```bash
# На сервере
sudo grep static-auth-secret /etc/turnserver.conf | cut -d'=' -f2
```

### Шаг 2: Сгенерируйте credentials

Для coturn с `static-auth-secret` формат:
- **username** = timestamp (время истечения в секундах, например, на 24 часа вперед)
- **credential** = base64(HMAC-SHA1(static-auth-secret, username))

#### Вариант 1: Использовать онлайн-инструмент

Используйте Node.js для генерации:

```bash
# На сервере или локально
node -e "
const crypto = require('crypto');
const secret = 'ВАШ_СЕКРЕТНЫЙ_КЛЮЧ';
const timestamp = Math.floor(Date.now() / 1000) + (24 * 3600);
const username = timestamp.toString();
const hmac = crypto.createHmac('sha1', secret);
hmac.update(username);
const credential = hmac.digest('base64');
console.log('Username:', username);
console.log('Credential:', credential);
"
```

#### Вариант 2: Использовать скрипт

Создайте файл `generate-turn-creds.js`:

```javascript
const crypto = require('crypto');

const secret = process.argv[2];
if (!secret) {
  console.error('Использование: node generate-turn-creds.js <SECRET>');
  process.exit(1);
}

const timestamp = Math.floor(Date.now() / 1000) + (24 * 3600);
const username = timestamp.toString();

const hmac = crypto.createHmac('sha1', secret);
hmac.update(username);
const credential = hmac.digest('base64');

console.log('Username:', username);
console.log('Credential:', credential);
```

Запустите:
```bash
node generate-turn-creds.js ВАШ_СЕКРЕТНЫЙ_КЛЮЧ
```

### Шаг 3: Используйте в Trickle ICE

1. Откройте: https://webrtc.github.io/samples/src/content/peerconnection/trickle-ice/
2. Введите:
   - **STUN/TURN Server:** `turn:bigo.1tlt.ru:3478`
   - **TURN username:** (вставьте сгенерированный username)
   - **TURN password:** (вставьте сгенерированный credential)
3. Нажмите "Add Server"
4. Нажмите "Gather candidates"
5. **Должен появиться кандидат типа `relay`!**

## Быстрая генерация на сервере

```bash
# На сервере выполните:
SECRET=$(sudo grep static-auth-secret /etc/turnserver.conf | cut -d'=' -f2)
node -e "
const crypto = require('crypto');
const secret = '$SECRET';
const timestamp = Math.floor(Date.now() / 1000) + (24 * 3600);
const username = timestamp.toString();
const hmac = crypto.createHmac('sha1', secret);
hmac.update(username);
const credential = hmac.digest('base64');
console.log('TURN Server: turn:bigo.1tlt.ru:3478');
console.log('Username:', username);
console.log('Credential:', credential);
"
```

Скопируйте username и credential и используйте их в Trickle ICE.

## Альтернатива: Настройка TURN сервера с статическими username/password

Если хотите использовать Trickle ICE без генерации credentials, можно настроить TURN сервер с статическими username/password:

```bash
sudo nano /etc/turnserver.conf
```

Добавьте:
```ini
# Отключите static-auth-secret
# static-auth-secret=...

# Включите статические пользователи
lt-cred-mech
user=testuser:testpassword
realm=bigo.1tlt.ru
```

Перезапустите:
```bash
sudo systemctl restart coturn
```

Теперь в Trickle ICE можно использовать:
- **Username:** `testuser`
- **Password:** `testpassword`

**Примечание:** Для production рекомендуется использовать `static-auth-secret` с динамической генерацией credentials.

## Проверка

После использования правильных credentials в Trickle ICE должен появиться кандидат типа `relay`.

Если кандидат `relay` появился:
- ✅ TURN сервер работает правильно
- ✅ Проблема была в отсутствии credentials в Trickle ICE
- ✅ Фронтенд должен правильно генерировать credentials автоматически



