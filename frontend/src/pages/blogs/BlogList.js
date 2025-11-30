import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Search, Shield, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import BlogCard from '../../components/BlogCard';
import MetaTags from '../../components/SEO/MetaTags';
import { Button } from '@/components/ui/button';

const BlogList = () => {
  const [blogs, setBlogs] = useState([]);
  const [tags, setTags] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTag, setSelectedTag] = useState('');
  const [page, setPage] = useState(1);
  const navigate = useNavigate();

  const API_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8000';

  useEffect(() => {
    fetchBlogs();
    fetchTags();
  }, [page, selectedTag, searchTerm]);

  const fetchBlogs = async () => {
    try {
      const params = { page, limit: 9 };
      if (selectedTag) params.tag = selectedTag;
      if (searchTerm) params.search = searchTerm;

      const response = await axios.get(`${API_URL}/api/blogs`, { params });
      setBlogs(response.data);
    } catch (error) {
      console.error('Error fetching blogs:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTags = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/blogs/tags/all`);
      setTags(response.data);
    } catch (error) {
      console.error('Error fetching tags:', error);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    fetchBlogs();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a1b]">
        <div className="flex justify-center items-center h-64 text-gray-400">Loading...</div>
      </div>
    );
  }

  return (
    <>
      <MetaTags
        title="Blog"
        description="Read our latest articles about AI bot detection, web security, and technology insights"
        keywords={['blog', 'ai detection', 'web security', 'technology']}
      />

      <div className="min-h-screen bg-[#0a0a1b]">
        {/* Header */}
        <div className="bg-[#0f0f23] border-b border-white/10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center space-x-2 cursor-pointer" onClick={() => navigate('/')}>
                <Shield className="w-6 h-6 text-indigo-400" />
                <span className="text-xl font-bold" style={{ fontFamily: 'Space Grotesk' }}>AI Tracker</span>
              </div>
              <Button
                variant="ghost"
                onClick={() => navigate('/')}
                className="flex items-center gap-2 text-gray-400 hover:text-white"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Home
              </Button>
            </div>
          </div>
        </div>

        {/* Hero */}
        <div className="relative overflow-hidden py-16">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(99,102,241,0.1),transparent_50%)]" />
          <div className="relative max-w-7xl mx-auto px-4">
            <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent" style={{ fontFamily: 'Space Grotesk' }}>
              Our Blog
            </h1>
            <p className="text-xl text-gray-400">
              Insights, tutorials, and updates about AI bot detection
            </p>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 py-12">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            {/* Sidebar */}
            <div className="lg:col-span-1">
              <div className="glass-effect p-6 sticky top-4">
                <h3 className="font-semibold text-lg mb-4 text-white">Search</h3>
                <form onSubmit={handleSearch} className="mb-6">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Search blogs..."
                      className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-white placeholder-gray-500"
                    />
                  </div>
                </form>

                <h3 className="font-semibold text-lg mb-4 text-white">Filter by Tag</h3>
                <div className="space-y-2">
                  <button
                    onClick={() => {
                      setSelectedTag('');
                      setPage(1);
                    }}
                    className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                      !selectedTag ? 'bg-indigo-500/20 text-indigo-400' : 'text-gray-400 hover:bg-white/5'
                    }`}
                  >
                    All Tags
                  </button>
                  {tags.map((tag) => (
                    <button
                      key={tag.name}
                      onClick={() => {
                        setSelectedTag(tag.name);
                        setPage(1);
                      }}
                      className={`w-full text-left px-3 py-2 rounded-lg flex justify-between items-center transition-colors ${
                        selectedTag === tag.name
                          ? 'bg-indigo-500/20 text-indigo-400'
                          : 'text-gray-400 hover:bg-white/5'
                      }`}
                    >
                      <span>{tag.name}</span>
                      <span className="text-sm text-gray-500">{tag.count}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Blog Grid */}
            <div className="lg:col-span-3">
              {blogs.length === 0 ? (
                <div className="glass-effect p-12 text-center">
                  <p className="text-gray-400 text-lg">No blogs found</p>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {blogs.map((blog) => (
                      <BlogCard key={blog.id} blog={blog} />
                    ))}
                  </div>

                  {/* Pagination */}
                  <div className="flex justify-center gap-2 mt-8">
                    <button
                      onClick={() => setPage(Math.max(1, page - 1))}
                      disabled={page === 1}
                      className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed text-white transition-colors"
                    >
                      Previous
                    </button>
                    <span className="px-4 py-2 text-white">Page {page}</span>
                    <button
                      onClick={() => setPage(page + 1)}
                      disabled={blogs.length < 9}
                      className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed text-white transition-colors"
                    >
                      Next
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default BlogList;
