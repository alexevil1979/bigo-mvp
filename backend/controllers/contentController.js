const ContentPage = require('../models/ContentPage');

/**
 * Получение всех страниц
 */
exports.getPages = async (req, res) => {
  try {
    const { category, isPublished } = req.query;
    const query = {};
    
    if (category) query.category = category;
    if (isPublished !== undefined) query.isPublished = isPublished === 'true';
    
    const pages = await ContentPage.find(query)
      .sort({ order: 1, createdAt: -1 })
      .populate('lastEditedBy', 'nickname email');
    
    res.json({ pages });
  } catch (error) {
    console.error('Ошибка получения страниц:', error);
    res.status(500).json({ error: 'Ошибка при получении страниц' });
  }
};

/**
 * Получение страницы по slug
 */
exports.getPageBySlug = async (req, res) => {
  try {
    const { slug } = req.params;
    const page = await ContentPage.findOne({ slug, isPublished: true });
    
    if (!page) {
      return res.status(404).json({ error: 'Страница не найдена' });
    }
    
    res.json({ page });
  } catch (error) {
    console.error('Ошибка получения страницы:', error);
    res.status(500).json({ error: 'Ошибка при получении страницы' });
  }
};

/**
 * Создание страницы
 */
exports.createPage = async (req, res) => {
  try {
    const { slug, title, content, metaTitle, metaDescription, category, order, isPublished } = req.body;
    
    const existingPage = await ContentPage.findOne({ slug });
    if (existingPage) {
      return res.status(400).json({ error: 'Страница с таким slug уже существует' });
    }
    
    const page = new ContentPage({
      slug,
      title,
      content: content || '',
      metaTitle: metaTitle || title,
      metaDescription: metaDescription || '',
      category: category || 'other',
      order: order || 0,
      isPublished: isPublished !== undefined ? isPublished : true,
      lastEditedBy: req.user.id
    });
    
    await page.save();
    
    res.status(201).json({ message: 'Страница создана', page });
  } catch (error) {
    console.error('Ошибка создания страницы:', error);
    res.status(500).json({ error: 'Ошибка при создании страницы' });
  }
};

/**
 * Обновление страницы
 */
exports.updatePage = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, content, metaTitle, metaDescription, category, order, isPublished } = req.body;
    
    const page = await ContentPage.findById(id);
    if (!page) {
      return res.status(404).json({ error: 'Страница не найдена' });
    }
    
    if (title) page.title = title;
    if (content !== undefined) page.content = content;
    if (metaTitle !== undefined) page.metaTitle = metaTitle;
    if (metaDescription !== undefined) page.metaDescription = metaDescription;
    if (category) page.category = category;
    if (order !== undefined) page.order = order;
    if (isPublished !== undefined) page.isPublished = isPublished;
    page.lastEditedBy = req.user.id;
    
    await page.save();
    
    res.json({ message: 'Страница обновлена', page });
  } catch (error) {
    console.error('Ошибка обновления страницы:', error);
    res.status(500).json({ error: 'Ошибка при обновлении страницы' });
  }
};

/**
 * Удаление страницы
 */
exports.deletePage = async (req, res) => {
  try {
    const { id } = req.params;
    const page = await ContentPage.findByIdAndDelete(id);
    
    if (!page) {
      return res.status(404).json({ error: 'Страница не найдена' });
    }
    
    res.json({ message: 'Страница удалена' });
  } catch (error) {
    console.error('Ошибка удаления страницы:', error);
    res.status(500).json({ error: 'Ошибка при удалении страницы' });
  }
};



