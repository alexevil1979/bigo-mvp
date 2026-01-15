import { useState, useEffect } from 'react';
import axios from 'axios';

const API_URL = process.env.API_URL || 'http://localhost:5000';

export default function ContentPages() {
  const [pages, setPages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingPage, setEditingPage] = useState(null);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    fetchPages();
  }, []);

  const fetchPages = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/content/pages`);
      setPages(response.data.pages);
    } catch (error) {
      console.error('Ошибка загрузки страниц:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (page) => {
    setEditingPage(page);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('Удалить эту страницу?')) return;
    try {
      await axios.delete(`${API_URL}/api/content/pages/${id}`);
      fetchPages();
    } catch (error) {
      alert('Ошибка удаления страницы');
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = {
      slug: formData.get('slug'),
      title: formData.get('title'),
      content: formData.get('content'),
      metaTitle: formData.get('metaTitle'),
      metaDescription: formData.get('metaDescription'),
      category: formData.get('category'),
      isPublished: formData.get('isPublished') === 'on'
    };

    try {
      if (editingPage) {
        await axios.put(`${API_URL}/api/content/pages/${editingPage._id}`, data);
      } else {
        await axios.post(`${API_URL}/api/content/pages`, data);
      }
      setShowForm(false);
      setEditingPage(null);
      fetchPages();
    } catch (error) {
      alert('Ошибка сохранения страницы');
    }
  };

  if (loading) {
    return <div className="loading">Загрузка...</div>;
  }

  return (
    <div className="content-pages">
      <div className="pages-header">
        <h2>Управление страницами</h2>
        <button onClick={() => { setEditingPage(null); setShowForm(true); }} className="add-btn">
          + Создать страницу
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSave} className="page-form">
          <h3>{editingPage ? 'Редактировать' : 'Создать'} страницу</h3>
          <div className="form-group">
            <label>Slug (URL):</label>
            <input type="text" name="slug" defaultValue={editingPage?.slug} required />
          </div>
          <div className="form-group">
            <label>Заголовок:</label>
            <input type="text" name="title" defaultValue={editingPage?.title} required />
          </div>
          <div className="form-group">
            <label>Содержимое:</label>
            <textarea name="content" defaultValue={editingPage?.content} rows="10" required />
          </div>
          <div className="form-group">
            <label>Meta Title:</label>
            <input type="text" name="metaTitle" defaultValue={editingPage?.metaTitle} />
          </div>
          <div className="form-group">
            <label>Meta Description:</label>
            <textarea name="metaDescription" defaultValue={editingPage?.metaDescription} rows="3" />
          </div>
          <div className="form-group">
            <label>Категория:</label>
            <select name="category" defaultValue={editingPage?.category || 'legal'}>
              <option value="legal">Правовые</option>
              <option value="support">Поддержка</option>
              <option value="resources">Ресурсы</option>
              <option value="other">Другое</option>
            </select>
          </div>
          <div className="form-group">
            <label>
              <input type="checkbox" name="isPublished" defaultChecked={editingPage?.isPublished !== false} />
              Опубликовано
            </label>
          </div>
          <div className="form-actions">
            <button type="submit" className="save-btn">Сохранить</button>
            <button type="button" onClick={() => { setShowForm(false); setEditingPage(null); }} className="cancel-btn">
              Отмена
            </button>
          </div>
        </form>
      )}

      <table className="admin-table">
        <thead>
          <tr>
            <th>Slug</th>
            <th>Заголовок</th>
            <th>Категория</th>
            <th>Статус</th>
            <th>Действия</th>
          </tr>
        </thead>
        <tbody>
          {pages.map(page => (
            <tr key={page._id}>
              <td>{page.slug}</td>
              <td>{page.title}</td>
              <td>{page.category}</td>
              <td>{page.isPublished ? 'Опубликовано' : 'Черновик'}</td>
              <td>
                <button onClick={() => handleEdit(page)} className="edit-btn">Редактировать</button>
                <button onClick={() => handleDelete(page._id)} className="delete-btn">Удалить</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

