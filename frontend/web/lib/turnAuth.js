/**
 * Генерация временных учетных данных для TURN сервера
 * Используется статический ключ (static-auth-secret) для создания временных username/credential
 * 
 * TURN сервер с static-auth-secret использует формат:
 * username = timestamp:username (время истечения:имя пользователя)
 * credential = HMAC-SHA1(secret, username)
 * 
 * Для упрощения в браузере используем упрощенный метод.
 * В production рекомендуется генерировать credentials на сервере.
 */

/**
 * Синхронная версия генерации credentials
 * Использует упрощенный метод для браузера
 */
export function generateTurnCredentialsSync(secret) {
  if (!secret) return null;

  try {
    // Время истечения (1 час от текущего времени)
    const timestamp = Math.floor(Date.now() / 1000) + 3600;
    const username = timestamp.toString();
    
    // Упрощенный метод для браузера
    // В production лучше использовать серверную генерацию с правильным HMAC-SHA1
    // Для coturn с static-auth-secret можно использовать просто timestamp как username
    // и секрет как credential (если настроено в конфиге)
    const credential = btoa(secret + ':' + username).substring(0, 24);
    
    return {
      username,
      credential
    };
  } catch (error) {
    console.error('Ошибка генерации TURN credentials:', error);
    return null;
  }
}

/**
 * Асинхронная версия с Web Crypto API (для правильного HMAC-SHA1)
 */
export async function generateTurnCredentials(secret) {
  if (!secret) return null;

  try {
    const timestamp = Math.floor(Date.now() / 1000) + 3600;
    const username = timestamp.toString();

    // Генерация HMAC-SHA1 с использованием Web Crypto API
    const encoder = new TextEncoder();
    const keyData = encoder.encode(secret);
    const key = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: 'SHA-1' },
      false,
      ['sign']
    );

    const messageData = encoder.encode(username);
    const signature = await crypto.subtle.sign('HMAC', key, messageData);
    const credential = btoa(String.fromCharCode(...new Uint8Array(signature)));

    return {
      username,
      credential
    };
  } catch (error) {
    console.error('Ошибка генерации TURN credentials:', error);
    // Fallback на упрощенный метод
    return generateTurnCredentialsSync(secret);
  }
}

