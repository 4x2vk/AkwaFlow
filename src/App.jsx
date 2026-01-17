import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import Categories from './pages/Categories';
import Analytics from './pages/Analytics';
import AdminDashboard from './pages/AdminDashboard';
import { AuthProvider } from './context/AuthContext';
import { SubscriptionProvider } from './context/SubscriptionContext';
import { AdminProvider } from './context/AdminContext';

function App() {
  return (
    <AuthProvider>
      <SubscriptionProvider>
        <AdminProvider>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/categories" element={<Categories />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/admin" element={<AdminDashboard />} />
          </Routes>
        </AdminProvider>
      </SubscriptionProvider>
    </AuthProvider>
  );
}

export default App;
