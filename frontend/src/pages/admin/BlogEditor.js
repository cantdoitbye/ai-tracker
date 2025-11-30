import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import { Save, Eye, ArrowLeft } from 'lucide-react';
import RichTextEditor from '../../components/BlogEditor/RichTextEditor';
import TagInput from '../../components/BlogEditor/TagInput';
import { generateSlug } from '../../utils/slugify';
import Navigation from '../../components/Navigation';

const BlogEditor = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = !!id;

  const [formData, setFormData] = useState({
    title: '',
    slug: '',
    content: '',
    excerpt: '',
    featured_image: '',
    status: 'draft',
    seo_title: '',
    seo_description: '',
    seo_keywords: [],
    tags: [],
  });

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const API_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8000';

  useEffect(() => {
    if (isEdit) {
      fetchBlog();
    }
  }, [id]);

  const fetchBlog = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/api/admin/blogs/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setFormData(response.data);
    } catch (error) {
      console.error('Error fetching blog:', error);
      alert('Failed to load blog');
    } finally {
      setLoading(false);
    }
  };

  const handleTitleChange = (e) => {
    const title = e.target.value;
    setFormData({
      ...formData,
      title,
      slug: generateSlug(title),
      seo_title: title
    });
  };

  const handleSave = async (status) => {
    if (!formData.title || !formData.content || !formData.excerpt) {
      alert('Please fill in title, content, and excerpt');
      return;
    }

    try {
      setSaving(true);
      const token = localStorage.getItem('token');
      const dataToSend = {
        ...formData,
        status,
        published_at: status === 'published' ? new Date().toISOString() : null
      };

      if (isEdit) {
        await axios.put(`${API_URL}/api/admin/blogs/${id}`, dataToSend, {
          headers: { Authorization: `Bearer ${token}` }
        });
      } else {
        await axios.post(`${API_URL}/api/admin/blogs`, dataToSend, {
          headers: { Authorization: `Bearer ${token}` }
        });
      }

      alert(`Blog ${status === 'published' ? 'published' : 'saved'} successfully!`);
      navigate('/admin/blogs');
    } catch (error) {
      console.error('Error saving blog:', error);
      alert('Failed to save blog');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a1b]">
        <Navigation />
        <div className="flex justify-center items-center h-64 text-gray-400">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a1b]">
      <Navigation />
      
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-6">
          <button
            onClick={() => navigate('/admin/blogs')}
            className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Blogs
          </button>
        </div>

        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-white" style={{ fontFamily: 'Space Grotesk' }}>
            {isEdit ? 'Edit Blog' : 'Create New Blog'}
          </h1>
          <div className="flex gap-2">
            <button
              onClick={() => handleSave('draft')}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 disabled:opacity-50 text-white transition-all"
            >
              <Save className="w-5 h-5" />
              Save Draft
            </button>
            <button
              onClick={() => handleSave('published')}
              disabled={saving}
              className="flex items-center gap-2 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white px-4 py-2 rounded-lg disabled:opacity-50 transition-all"
            >
              <Eye className="w-5 h-5" />
              Publish
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            <div className="glass-effect p-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Title *
                  </label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={handleTitleChange}
                    placeholder="Enter blog title"
                    className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-white placeholder-gray-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Content *
                  </label>
                  <RichTextEditor
                    value={formData.content}
                    onChange={(content) => setFormData({ ...formData, content })}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Excerpt * (160 characters)
                  </label>
                  <textarea
                    value={formData.excerpt}
                    onChange={(e) => setFormData({ ...formData, excerpt: e.target.value })}
                    placeholder="Brief description of the blog"
                    maxLength={160}
                    rows={3}
                    className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-white placeholder-gray-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {formData.excerpt.length}/160 characters
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Featured Image */}
            <div className="glass-effect p-6">
              <h3 className="font-semibold mb-4 text-white">Featured Image</h3>
              <input
                type="text"
                value={formData.featured_image}
                onChange={(e) => setFormData({ ...formData, featured_image: e.target.value })}
                placeholder="Image URL"
                className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-white placeholder-gray-500"
              />
              {formData.featured_image && (
                <img
                  src={formData.featured_image}
                  alt="Preview"
                  className="mt-4 w-full rounded-lg"
                  onError={(e) => e.target.style.display = 'none'}
                />
              )}
            </div>

            {/* Tags */}
            <div className="glass-effect p-6">
              <h3 className="font-semibold mb-4 text-white">Tags</h3>
              <TagInput
                tags={formData.tags}
                onChange={(tags) => setFormData({ ...formData, tags })}
              />
            </div>

            {/* SEO Settings */}
            <div className="glass-effect p-6">
              <h3 className="font-semibold mb-4 text-white">SEO Settings</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    SEO Title (60 chars)
                  </label>
                  <input
                    type="text"
                    value={formData.seo_title}
                    onChange={(e) => setFormData({ ...formData, seo_title: e.target.value })}
                    maxLength={60}
                    className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-white placeholder-gray-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {formData.seo_title.length}/60
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    SEO Description (160 chars)
                  </label>
                  <textarea
                    value={formData.seo_description}
                    onChange={(e) => setFormData({ ...formData, seo_description: e.target.value })}
                    maxLength={160}
                    rows={3}
                    className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-white placeholder-gray-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {formData.seo_description.length}/160
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    SEO Keywords
                  </label>
                  <TagInput
                    tags={formData.seo_keywords}
                    onChange={(keywords) => setFormData({ ...formData, seo_keywords: keywords })}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    URL Slug
                  </label>
                  <input
                    type="text"
                    value={formData.slug}
                    onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                    className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-white placeholder-gray-500"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BlogEditor;
