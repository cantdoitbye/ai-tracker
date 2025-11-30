import { useNavigate } from 'react-router-dom';
import { Shield, Eye, Bell, Map, Download, Key, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState, useEffect } from 'react';
import axios from 'axios';
import BlogCard from '../components/BlogCard';

function BlogSection() {
  const [blogs, setBlogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const API_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8000';

  useEffect(() => {
    fetchRecentBlogs();
  }, []);

  const fetchRecentBlogs = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/blogs/recent`);
      setBlogs(response.data);
    } catch (error) {
      console.error('Error fetching blogs:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading || blogs.length === 0) return null;

  return (
    <div className="max-w-7xl mx-auto px-8 py-20">
      <div className="flex justify-between items-center mb-12">
        <h2
          className="text-4xl font-bold"
          style={{ fontFamily: 'Space Grotesk' }}
        >
          Latest from Our Blog
        </h2>
        <Button
          variant="outline"
          onClick={() => navigate('/blogs')}
          className="border-indigo-500 text-indigo-400 hover:bg-indigo-500/10 flex items-center gap-2"
        >
          View All Blogs
          <ArrowRight className="w-4 h-4" />
        </Button>
      </div>
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
        {blogs.map((blog) => (
          <BlogCard key={blog.id} blog={blog} />
        ))}
      </div>
    </div>
  );
}

export default function Landing() {
  const navigate = useNavigate();

  const features = [
    {
      icon: <Shield className="w-8 h-8" />,
      title: 'AI Bot Detection',
      description: 'Identify traffic from GPTBot, ClaudeBot, and 15+ other AI crawlers'
    },
    {
      icon: <Eye className="w-8 h-8" />,
      title: 'Real-time Monitoring',
      description: 'Track suspicious requests as they happen with detailed analytics'
    },
    {
      icon: <Map className="w-8 h-8" />,
      title: 'Geolocation Mapping',
      description: 'See where bot traffic originates with IP geolocation data'
    },
    {
      icon: <Bell className="w-8 h-8" />,
      title: 'Smart Alerts',
      description: 'Get notified via email or webhook when bots access your content'
    },
    {
      icon: <Download className="w-8 h-8" />,
      title: 'Export Reports',
      description: 'Download traffic logs in CSV or JSON format for analysis'
    },
    {
      icon: <Key className="w-8 h-8" />,
      title: 'API Integration',
      description: 'Easy integration with Chrome Extension and custom tracking'
    }
  ];

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(99,102,241,0.1),transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,rgba(139,92,246,0.1),transparent_50%)]" />
        
        <nav className="relative z-10 flex items-center justify-between px-8 py-6 max-w-7xl mx-auto">
          <div className="flex items-center space-x-3">
            <Shield className="w-8 h-8 text-indigo-400" />
            <span className="text-2xl font-bold" style={{ fontFamily: 'Space Grotesk' }}>AI Tracker</span>
          </div>
          <div className="flex items-center space-x-4">
            <Button
              data-testid="login-nav-btn"
              variant="ghost"
              onClick={() => navigate('/login')}
              className="text-gray-300 hover:text-white"
            >
              Login
            </Button>
            <Button
              data-testid="signup-nav-btn"
              onClick={() => navigate('/register')}
              className="bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700"
            >
              Sign Up
            </Button>
          </div>
        </nav>

        <div className="relative z-10 max-w-6xl mx-auto px-8 py-20 text-center">
          <h1
            className="text-5xl sm:text-6xl lg:text-7xl font-bold mb-6 bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent"
            style={{ fontFamily: 'Space Grotesk' }}
            data-testid="hero-title"
          >
            Protect Your Content from AI Scrapers
          </h1>
          <p className="text-lg sm:text-xl text-gray-400 mb-10 max-w-3xl mx-auto">
            Detect patterns of AI model traffic, web scraping, and bot crawlers. Monitor who's accessing your content for training or retrieval purposes.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-4">
            <Button
              data-testid="get-started-btn"
              onClick={() => navigate('/register')}
              size="lg"
              className="bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-lg px-8 py-6"
            >
              Get Started Free
            </Button>
            <Button
              data-testid="learn-more-btn"
              variant="outline"
              size="lg"
              className="border-indigo-500 text-indigo-400 hover:bg-indigo-500/10 text-lg px-8 py-6"
            >
              Learn More
            </Button>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="max-w-7xl mx-auto px-8 py-20">
        <h2
          className="text-4xl font-bold text-center mb-16"
          style={{ fontFamily: 'Space Grotesk' }}
        >
          Comprehensive Bot Detection
        </h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, idx) => (
            <div
              key={idx}
              data-testid={`feature-${idx}`}
              className="glass-effect p-8 hover:border-indigo-500/50 transition-all duration-300"
            >
              <div className="text-indigo-400 mb-4">{feature.icon}</div>
              <h3 className="text-xl font-semibold mb-3" style={{ fontFamily: 'Space Grotesk' }}>
                {feature.title}
              </h3>
              <p className="text-gray-400">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Bot Detection List */}
      <div className="max-w-7xl mx-auto px-8 py-20">
        <h2
          className="text-4xl font-bold text-center mb-16"
          style={{ fontFamily: 'Space Grotesk' }}
        >
          Detects 15+ AI Crawlers
        </h2>
        <div className="glass-effect p-12">
          <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {[
              { name: 'GPTBot', provider: 'OpenAI' },
              { name: 'ClaudeBot', provider: 'Anthropic' },
              { name: 'Google-Extended', provider: 'Google' },
              { name: 'PerplexityBot', provider: 'Perplexity' },
              { name: 'CCBot', provider: 'Common Crawl' },
              { name: 'Bytespider', provider: 'ByteDance' },
              { name: 'Cohere', provider: 'Cohere' },
              { name: 'YouBot', provider: 'You.com' },
              { name: 'FacebookBot', provider: 'Meta' },
              { name: 'Diffbot', provider: 'Diffbot' },
              { name: 'Applebot', provider: 'Apple' },
              { name: 'And More...', provider: '' }
            ].map((bot, idx) => (
              <div
                key={idx}
                className="text-center p-4 rounded-lg bg-white/5 border border-white/10 hover:border-indigo-500/50 transition-colors"
              >
                <div className="font-semibold text-indigo-300">{bot.name}</div>
                {bot.provider && <div className="text-sm text-gray-500">{bot.provider}</div>}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Blog Section */}
      <BlogSection />

      {/* CTA Section */}
      <div className="max-w-7xl mx-auto px-8 py-20">
        <div className="glass-effect p-16 text-center">
          <h2
            className="text-4xl font-bold mb-6"
            style={{ fontFamily: 'Space Grotesk' }}
          >
            Start Protecting Your Content Today
          </h2>
          <p className="text-xl text-gray-400 mb-8">
            Join website owners monitoring AI bot activity in real-time
          </p>
          <Button
            data-testid="cta-signup-btn"
            onClick={() => navigate('/register')}
            size="lg"
            className="bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-lg px-12 py-6"
          >
            Create Free Account
          </Button>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-white/10 py-8">
        <div className="max-w-7xl mx-auto px-8 text-center text-gray-500">
          <p>&copy; 2025 AI Tracker. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
