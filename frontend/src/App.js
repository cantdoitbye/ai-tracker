import { useState, useEffect } from 'react';
import '@/App.css';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Landing from '@/pages/Landing';
import Login from '@/pages/Login';
import Register from '@/pages/Register';
import Dashboard from '@/pages/Dashboard';
import Domains from '@/pages/Domains';
import TrafficLogs from '@/pages/TrafficLogs';
import ApiKeys from '@/pages/ApiKeys';
import Alerts from '@/pages/Alerts';
import SuperAdmin from '@/pages/SuperAdmin';
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
  return (
    <div className="App">
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
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
        </Routes>
      </BrowserRouter>
      <Toaster position="top-right" />
    </div>
  );
}

export default App;
