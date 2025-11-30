import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Plus, Edit, Trash2, Eye, Search } from 'lucide-react';
import { formatDateShort } from '../../utils/slugify';
import Navigation from '../../components/Navigation';

const BlogList = () => {
  const [blogs, setBlogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate();

  const API_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8000';

  useEffect(() => {
    fetchBlogs();
  }, [filter, searchTerm]);

  const fetchBlogs = async () => {
    try {
      const token = localStorage.getItem('token');
      const params = {};
      if (filter !== 'all') params.status = filter;
      if (searchTerm) params.search = searchTerm;

      const response = await axios.get(`${API_URL}/api/admin/blogs`, {
        headers: { Authorization: `Bearer ${token}` },
        params
      });
      setBlogs(response.data);
    } catch (error) {
      console.error('Error fetching blogs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this blog?')) return;

    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API_URL}/api/admin/blogs/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchBlogs();
    } catch (error) {
      console.error('Error deleting blog:', error);
      alert('Failed to delete blog');
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
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-white" style={{ fontFamily: 'Space Grotesk' }}>
            Manage Blogs
          </h1>
          <Link
            to="/admin/blogs/new"
            className="flex items-center gap-2 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white px-4 py-2 rounded-lg transition-all"
          >
            <Plus className="w-5 h-5" />
            New Blog
          </Link>
        </div>

        <div className="glass-effect p-6 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search blogs..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-white placeholder-gray-500"
              />
            </div>
            <div className="flex gap-2">
              {['all', 'published', 'draft'].map((status) => (
                <button
                  key={status}
                  onClick={() => setFilter(status)}
                  className={`px-4 py-2 rounded-lg capitalize transition-all ${
                    filter === status
                      ? 'bg-indigo-500 text-white'
                      : 'bg-white/5 text-gray-400 hover:bg-white/10'
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>
          </div>
        </div>

        {blogs.length === 0 ? (
          <div className="glass-effect p-12 text-center">
            <p className="text-gray-400 text-lg mb-4">No blogs found</p>
            <Link
              to="/admin/blogs/new"
              className="inline-block text-indigo-400 hover:text-indigo-300"
            >
              Create your first blog
            </Link>
          </div>
        ) : (
          <div className="glass-effect overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b border-white/10">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Title</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Tags</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Views</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Date</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  {blogs.map((blog) => (
                    <tr key={blog.id} className="hover:bg-white/5 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-medium text-white">{blog.title}</div>
                        <div className="text-sm text-gray-400 truncate max-w-md">{blog.excerpt}</div>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`px-2 py-1 text-xs rounded-full ${
                            blog.status === 'published'
                              ? 'bg-green-500/20 text-green-400'
                              : 'bg-yellow-500/20 text-yellow-400'
                          }`}
                        >
                          {blog.status}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1">
                          {blog.tags.slice(0, 2).map((tag, idx) => (
                            <span key={idx} className="px-2 py-1 bg-indigo-500/20 text-indigo-400 text-xs rounded">
                              {tag}
                            </span>
                          ))}
                          {blog.tags.length > 2 && (
                            <span className="text-xs text-gray-500">+{blog.tags.length - 2}</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-400">
                        <div className="flex items-center gap-1">
                          <Eye className="w-4 h-4" />
                          {blog.view_count}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-400">
                        {formatDateShort(blog.published_at || blog.created_at)}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          <Link
                            to={`/admin/blogs/edit/${blog.id}`}
                            className="text-indigo-400 hover:text-indigo-300"
                          >
                            <Edit className="w-5 h-5" />
                          </Link>
                          <button
                            onClick={() => handleDelete(blog.id)}
                            className="text-red-400 hover:text-red-300"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BlogList;
