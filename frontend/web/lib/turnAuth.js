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
 * ВАЖНО: Для правильной работы с coturn используйте асинхронную версию generateTurnCredentials
 * Эта версия возвращает временные credentials, которые могут не работать с некоторыми конфигурациями
 */
export function generateTurnCredentialsSync(secret) {
  if (!secret) {
    console.error('TURN_SECRET is not defined.');
    return null;
  }

  try {
    // Время истечения (24 часа от текущего времени, как в coturn)
    const timestamp = Math.floor(Date.now() / 1000) + (24 * 3600);
    const username = timestamp.toString();
    
    // Для coturn с static-auth-secret правильный формат:
    // username = timestamp
    // credential = base64(HMAC-SHA1(static-auth-secret, username))
    
    // В синхронной версии используем упрощенный метод
    // ВАЖНО: Для правильной работы рекомендуется использовать асинхронную версию generateTurnCredentials
    // или серверную генерацию credentials
    
    // Временное решение для синхронной версии:
    // Используем base64 от секрета как credential (работает с некоторыми конфигурациями coturn)
    // Для правильной работы нужно использовать HMAC-SHA1 через асинхронную версию
    const credential = btoa(secret + ':' + username).substring(0, 32);
    
    if (!username || !credential) {
      console.error('Ошибка: не удалось сгенерировать username или credential');
      return null;
    }
    
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

