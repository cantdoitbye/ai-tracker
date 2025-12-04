import { useState, useEffect } from 'react';
import '@/App.css';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { GoogleOAuthProvider } from '@react-oauth/google';
import Landing from '@/pages/Landing';
import Login from '@/pages/Login';
import Register from '@/pages/Register';
import Dashboard from '@/pages/Dashboard';
import Domains from '@/pages/Domains';
import TrafficLogs from '@/pages/TrafficLogs';
import ApiKeys from '@/pages/ApiKeys';
import Alerts from '@/pages/Alerts';
import SuperAdmin from '@/pages/SuperAdmin';
import BlogList from '@/pages/blogs/BlogList';
import BlogDetail from '@/pages/blogs/BlogDetail';
import AdminBlogList from '@/pages/admin/BlogList';
import BlogEditor from '@/pages/admin/BlogEditor';
import { Toaster } from '@/components/ui/sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API = `${BACKEND_URL}/api`;

export const getAuthToken = () => localStorage.getItem('token');
export const setAuthToken = (token) => localStorage.setItem('token', token);
export const removeAuthToken = () => localStorage.removeItem('token');
export const getUser = () => {
  const user = localStorage.getItem('user');
  return user ? JSON.parse(user) : null;
};
export const setUser = (user) => localStorage.setItem('user', JSON.stringify(user));
export const removeUser = () => localStorage.removeItem('user');

function PrivateRoute({ children }) {
  const token = getAuthToken();
  return token ? children : <Navigate to="/login" />;
}

function App() {
  const googleClientId = process.env.REACT_APP_GOOGLE_CLIENT_ID;

  return (
    <GoogleOAuthProvider clientId={googleClientId}>
      <HelmetProvider>
        <div className="App">
          <BrowserRouter>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            
            {/* Public Blog Routes */}
            <Route path="/blogs" element={<BlogList />} />
            <Route path="/blog/:slug" element={<BlogDetail />} />
            
            {/* Private Routes */}
            <Route
              path="/dashboard"
              element={
                <PrivateRoute>
                  <Dashboard />
                </PrivateRoute>
              }
            />
            <Route
              path="/domains"
              element={
                <PrivateRoute>
                  <Domains />
                </PrivateRoute>
              }
            />
            <Route
              path="/traffic"
              element={
                <PrivateRoute>
                  <TrafficLogs />
                </PrivateRoute>
              }
            />
            <Route
              path="/api-keys"
              element={
                <PrivateRoute>
                  <ApiKeys />
                </PrivateRoute>
              }
            />
            <Route
              path="/alerts"
              element={
                <PrivateRoute>
                  <Alerts />
                </PrivateRoute>
              }
            />
            <Route
              path="/admin"
              element={
                <PrivateRoute>
                  <SuperAdmin />
                </PrivateRoute>
              }
            />
            
            {/* Admin Blog Routes */}
            <Route
              path="/admin/blogs"
              element={
                <PrivateRoute>
                  <AdminBlogList />
                </PrivateRoute>
              }
            />
            <Route
              path="/admin/blogs/new"
              element={
                <PrivateRoute>
                  <BlogEditor />
                </PrivateRoute>
              }
            />
            <Route
              path="/admin/blogs/edit/:id"
              element={
                <PrivateRoute>
                  <BlogEditor />
                </PrivateRoute>
              }
            />
          </Routes>
        </BrowserRouter>
        <Toaster position="top-right" />
      </div>
    </HelmetProvider>
    </GoogleOAuthProvider>
  );
}

export default App;
