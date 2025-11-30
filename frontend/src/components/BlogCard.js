import React from 'react';
import { Link } from 'react-router-dom';
import { Clock, Eye, Calendar } from 'lucide-react';
import { formatDateShort } from '../utils/slugify';

const BlogCard = ({ blog }) => {
  return (
    <div className="glass-effect rounded-lg overflow-hidden hover:border-indigo-500/50 transition-all duration-300">
      {blog.featured_image && (
        <Link to={`/blog/${blog.slug}`}>
          <img
            src={blog.featured_image}
            alt={blog.title}
            className="w-full h-48 object-cover hover:opacity-80 transition-opacity"
          />
        </Link>
      )}
      
      <div className="p-6">
        <div className="flex flex-wrap gap-2 mb-3">
          {blog.tags && blog.tags.slice(0, 3).map((tag, index) => (
            <span
              key={index}
              className="px-2 py-1 bg-indigo-500/20 text-indigo-400 text-xs rounded-full"
            >
              {tag}
            </span>
          ))}
        </div>
        
        <Link to={`/blog/${blog.slug}`}>
          <h3 className="text-xl font-bold text-white mb-2 hover:text-indigo-400 transition-colors line-clamp-2" style={{ fontFamily: 'Space Grotesk' }}>
            {blog.title}
          </h3>
        </Link>
        
        <p className="text-gray-400 mb-4 line-clamp-3">
          {blog.excerpt}
        </p>
        
        <div className="flex items-center justify-between text-sm text-gray-500">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              {formatDateShort(blog.published_at || blog.created_at)}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              {blog.reading_time} min
            </span>
            {blog.view_count > 0 && (
              <span className="flex items-center gap-1">
                <Eye className="w-4 h-4" />
                {blog.view_count}
              </span>
            )}
          </div>
        </div>
        
        <Link
          to={`/blog/${blog.slug}`}
          className="mt-4 inline-block text-indigo-400 hover:text-indigo-300 font-medium"
        >
          Read More →
        </Link>
      </div>
    </div>
  );
};

export default BlogCard;
