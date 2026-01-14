const Payment = require('../models/Payment');
const User = require('../models/User');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

/**
 * Создание платежного намерения (Stripe)
 */
exports.createPaymentIntent = async (req, res) => {
  try {
    const { amount, currency = 'usd' } = req.body;
    const userId = req.user.id;

    // Конвертация: 1 USD = 100 монет (можно настроить)
    const coinsAmount = Math.floor(amount * 100);

    // Создаем платежное намерение в Stripe
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.floor(amount * 100), // Stripe использует центы
      currency: currency.toLowerCase(),
      metadata: {
        userId: userId.toString(),
        coinsAmount: coinsAmount.toString()
      }
    });

    // Создаем запись о платеже в БД
    const payment = new Payment({
      user: userId,
      paymentProvider: 'stripe',
      transactionId: paymentIntent.id,
      amount: Math.floor(amount * 100),
      currency: currency.toLowerCase(),
      coinsReceived: coinsAmount,
      status: 'pending'
    });

    await payment.save();

    res.json({
      clientSecret: paymentIntent.client_secret,
      paymentId: payment._id,
      coinsAmount
    });
  } catch (error) {
    console.error('Ошибка создания платежного намерения:', error);
    res.status(500).json({ error: 'Ошибка при создании платежа' });
  }
};

/**
 * Webhook для обработки успешных платежей (Stripe)
 */
exports.stripeWebhook = async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error('Ошибка верификации webhook:', err);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Обработка события
  if (event.type === 'payment_intent.succeeded') {
    const paymentIntent = event.data.object;

    try {
      // Находим платеж в БД
      const payment = await Payment.findOne({
        transactionId: paymentIntent.id
      });

      if (payment && payment.status === 'pending') {
        // Обновляем статус платежа
        payment.status = 'completed';
        payment.completedAt = new Date();
        await payment.save();

        // Начисляем монеты пользователю
        const user = await User.findById(payment.user);
        if (user) {
          user.coins += payment.coinsReceived;
          await user.save();
        }

        console.log(`✅ Платеж успешен: ${paymentIntent.id}, монет начислено: ${payment.coinsReceived}`);
      }
    } catch (error) {
      console.error('Ошибка обработки платежа:', error);
    }
  }

  res.json({ received: true });
};

/**
 * Получение истории платежей пользователя
 */
exports.getPaymentHistory = async (req, res) => {
  try {
    const payments = await Payment.find({ user: req.user.id })
      .sort({ createdAt: -1 })
      .limit(50);

    res.json({ payments });
  } catch (error) {
    console.error('Ошибка получения истории платежей:', error);
    res.status(500).json({ error: 'Ошибка при получении истории платежей' });
  }
};

/**
 * Получение конфигурации подарков
 */
exports.getGiftConfig = async (req, res) => {
  try {
    const chatService = require('../services/chatService');
    const giftConfig = chatService.getGiftConfig();
    res.json({ gifts: giftConfig });
  } catch (error) {
    console.error('Ошибка получения конфигурации подарков:', error);
    res.status(500).json({ error: 'Ошибка при получении конфигурации подарков' });
  }
};

