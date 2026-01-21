import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import Categories from './pages/Categories';
import Analytics from './pages/Analytics';
import AdminDashboard from './pages/AdminDashboard';
import Expenses from './pages/Expenses';
import Incomes from './pages/Incomes';
import { AuthProvider } from './context/AuthContext';
import { SubscriptionProvider } from './context/SubscriptionContext';
import { ExpenseProvider } from './context/ExpenseContext';
import { IncomeProvider } from './context/IncomeContext';
import { AdminProvider } from './context/AdminContext';

function App() {
  return (
    <AuthProvider>
      <SubscriptionProvider>
        <ExpenseProvider>
          <IncomeProvider>
            <AdminProvider>
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/expenses" element={<Expenses />} />
                <Route path="/incomes" element={<Incomes />} />
                <Route path="/categories" element={<Categories />} />
                <Route path="/analytics" element={<Analytics />} />
                <Route path="/admin" element={<AdminDashboard />} />
              </Routes>
            </AdminProvider>
          </IncomeProvider>
        </ExpenseProvider>
      </SubscriptionProvider>
    </AuthProvider>
  );
}

export default App;
