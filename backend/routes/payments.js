const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const { authenticate } = require('../middleware/auth');
const bodyParser = require('body-parser');

// Для Stripe webhook нужен raw body
const stripeWebhook = express.raw({ type: 'application/json' });

// Маршруты, требующие аутентификации
router.post('/create-intent', authenticate, paymentController.createPaymentIntent);
router.get('/history', authenticate, paymentController.getPaymentHistory);
router.get('/gifts', authenticate, paymentController.getGiftConfig);

// Webhook для Stripe (не требует аутентификации, но требует подписи)
router.post('/stripe-webhook', stripeWebhook, paymentController.stripeWebhook);

module.exports = router;

