const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const authController = require('../controllers/authController');
const qrController = require('../controllers/qrController');
const { authenticate } = require('../middleware/auth');

// Валидация для регистрации
const registerValidation = [
  body('email')
    .isEmail()
    .withMessage('Некорректный email'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Пароль должен быть минимум 6 символов'),
  body('nickname')
    .isLength({ min: 3, max: 20 })
    .withMessage('Никнейм должен быть от 3 до 20 символов')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Никнейм может содержать только буквы, цифры и подчеркивание')
];

// Валидация для входа
const loginValidation = [
  body('email')
    .isEmail()
    .withMessage('Некорректный email'),
  body('password')
    .notEmpty()
    .withMessage('Пароль обязателен')
];

// Маршруты
router.post('/register', registerValidation, authController.register);
router.post('/login', loginValidation, authController.login);
router.get('/me', authenticate, authController.getMe);
router.put('/profile', authenticate, authController.updateProfile);

// QR-код авторизация
router.post('/qr-session', qrController.createQRSession);
router.post('/qr-confirm', qrController.confirmQRLogin);
router.get('/qr-session/:sessionId', qrController.checkQRSession);

module.exports = router;

