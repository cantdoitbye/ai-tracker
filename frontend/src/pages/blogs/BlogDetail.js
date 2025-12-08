import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Clock, Eye, Calendar, Share2, Home, ChevronRight, Shield } from 'lucide-react';
import { formatDate } from '../../utils/slugify';
import MetaTags from '../../components/SEO/MetaTags';
import BlogCard from '../../components/BlogCard';
import { Button } from '@/components/ui/button';

const BlogDetail = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [blog, setBlog] = useState(null);
  const [relatedBlogs, setRelatedBlogs] = useState([]);
  const [loading, setLoading] = useState(true);

  const API_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8000';

  useEffect(() => {
    fetchBlog();
    window.scrollTo(0, 0);
  }, [slug]);

  const fetchBlog = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/blogs/${slug}`);
      setBlog(response.data);
      
      // Fetch related blogs (same tags)
      if (response.data.tags.length > 0) {
        const relatedResponse = await axios.get(`${API_URL}/api/blogs`, {
          params: { tag: response.data.tags[0], limit: 3 }
        });
        setRelatedBlogs(relatedResponse.data.filter(b => b.slug !== slug).slice(0, 3));
      }
    } catch (error) {
      console.error('Error fetching blog:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: blog.title,
        text: blog.excerpt,
        url: window.location.href
      });
    } else {
      navigator.clipboard.writeText(window.location.href);
      alert('Link copied to clipboard!');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a1b]">
        <div className="flex justify-center items-center h-64 text-gray-400">Loading...</div>
      </div>
    );
  }

  if (!blog) {
    return (
      <div className="min-h-screen bg-[#0a0a1b]">
        <div className="max-w-7xl mx-auto px-4 py-12 text-center">
          <h1 className="text-3xl font-bold mb-4 text-white">Blog Not Found</h1>
          <Link to="/blogs" className="text-indigo-400 hover:text-indigo-300">
            Back to Blogs
          </Link>
        </div>
      </div>
    );
  }

  return (
    <>
      <MetaTags
        title={blog.seo_title || blog.title}
        description={blog.seo_description || blog.excerpt}
        keywords={blog.seo_keywords}
        image={blog.featured_image}
        type="article"
        author={blog.author_name}
      />

      {/* Structured Data for SEO */}
      <script type="application/ld+json">
        {JSON.stringify({
          "@context": "https://schema.org",
          "@type": "BlogPosting",
          "headline": blog.title,
          "image": blog.featured_image,
          "author": {
            "@type": "Person",
            "name": blog.author_name
          },
          "datePublished": blog.published_at,
          "dateModified": blog.updated_at,
          "description": blog.excerpt,
          "keywords": blog.tags.join(', ')
        })}
      </script>

      <div className="min-h-screen bg-[#0a0a1b]">
        {/* Header */}
        <div className="bg-[#0f0f23] border-b border-white/10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center space-x-2 cursor-pointer" onClick={() => navigate('/')}>
                <Shield className="w-6 h-6 text-indigo-400" />
                <span className="text-xl font-bold" style={{ fontFamily: 'Space Grotesk' }}>AI Tracker</span>
              </div>
              <div className="flex items-center gap-4">
                <Link to="/blogs" className="text-gray-400 hover:text-white">All Blogs</Link>
                <Button
                  variant="ghost"
                  onClick={() => navigate('/')}
                  className="text-gray-400 hover:text-white"
                >
                  Home
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Breadcrumbs */}
        <div className="border-b border-white/10">
          <div className="max-w-4xl mx-auto px-4 py-4">
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <Link to="/" className="hover:text-indigo-400 flex items-center gap-1">
                <Home className="w-4 h-4" />
                Home
              </Link>
              <ChevronRight className="w-4 h-4" />
              <Link to="/blogs" className="hover:text-indigo-400">
                Blogs
              </Link>
              <ChevronRight className="w-4 h-4" />
              <span className="text-white truncate">{blog.title}</span>
            </div>
          </div>
        </div>


// {blog}

   <div className="min-h-screen bg-blog-dark w-full text-blog-text relative">
      {/* Gradient Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-blog-coral/20 via-blog-purple/20 to-blog-dark" />
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-gradient-to-bl from-blog-coral/30 via-blog-purple/20 to-transparent rounded-full blur-3xl" />
      <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-gradient-to-tr from-blog-purple/30 to-transparent rounded-full blur-3xl" />
        
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="relative max-w-7xl mx-auto px-6 py-16 lg:py-24 w-full">
          <div className="grid lg:grid-cols-1 gap-12 items-center max-w-4xl mx-auto">
            <div className="space-y-6">
 
              {/* Title */}
              <h1 className="text-2xl lg:text-4xl xl:text-5xl font-bold text-white leading-tight">
                {blog.title}
              </h1>

              {/* tags */}
              <div className="flex flex-wrap gap-3">
                {blog.tags.map((tag, index) => (
                  <span key={index} className="px-3 py-1.5 bg-blog-coral/10 text-blog-coral text-sm font-medium rounded-full border border-blog-coral/30">
                    {tag}
                  </span>
                ))}
              </div>

              {/* Author Info */}
              <div className="flex flex-wrap items-center gap-6 pt-4 overflow-x-auto">
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blog-coral to-blog-purple flex items-center justify-center">
                    <User className="w-3 h-3 text-white" />
                  </div>
                  <div>
                    <p className="text-white font-medium">{blog.author_name}</p>
                  </div>
                </div>
                <div className="flex flex-wrap  items-center gap-4 text-blog-muted text-sm whitespace-nowrap">
                  <span className="flex items-center gap-1.5">
                    <Calendar className="w-4 h-4" />
                    {formatDate(blog.published_at || blog.created_at)}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Clock className="w-4 h-4" />
                    {blog.reading_time} min read
                  </span>

                  <span className="flex items-center gap-1.5">
                    <Eye className="w-4 h-4" />
                    {blog.view_count} views
                  </span>
                </div>
              </div>
            </div>

            {/* Hero Image/Graphic */}
            {blog.featured_image && (
              <div className="relative">
                <img
                  src={blog.featured_image}
                  alt={blog.title}
                  className="w-full h-auto rounded-2xl shadow-lg"
                />
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Article Content */}
      <article className="w-full max-w-4xl mx-auto px-6 pb-16 relative">
        <div 
            className="prose-blog space-y-6"
            dangerouslySetInnerHTML={{ __html: blog.content }}
          />

        <button
            onClick={handleShare}
            className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg transition-colors text-white mt-8"
        >
            <Share2 className="w-4 h-4" />
            Share
        </button>

        {/* Related Blogs */}
        {relatedBlogs.length > 0 && (
        <section className="mt-16 space-y-6">
            <h2 className="text-3xl font-bold text-white">Related Articles</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {relatedBlogs.map((relatedBlog) => (
                <BlogCard key={relatedBlog.id} blog={relatedBlog} />
            ))}
            </div>
        </section>
        )}
      </article>
    </div>

      
      </div>
    </>
  );
};

export default BlogDetail;
