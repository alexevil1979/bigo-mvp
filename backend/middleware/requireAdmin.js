const { authorize } = require('./auth');

/**
 * Middleware для проверки прав администратора
 */
const requireAdmin = authorize('admin');

module.exports = { requireAdmin };

