/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import Login from './views/Login';
import CaseManager from './views/CaseManager';
import Dashboard from './views/Dashboard';
import Database from './views/Database';
import SearchBank from './views/SearchBank';
import Admin from './views/Admin';
import { RefreshCcw } from 'lucide-react';

function PrivateRoute({ children, adminOnly = false }: { children: React.ReactNode; adminOnly?: boolean }) {
  const { user, loading, isAdmin, profile } = useAuth();

  if (loading) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-slate-50">
        <RefreshCcw className="animate-spin text-indigo-600 mb-4" size={40} />
        <p className="text-slate-400 font-medium uppercase tracking-widest text-xs">Initializing Secure Environment...</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (profile && !profile.isActive) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-slate-50 p-6 text-center">
        <div className="bg-white p-12 rounded-3xl shadow-xl border border-slate-200 max-w-md">
          <h2 className="text-2xl font-bold text-slate-900 mb-4">Access Suspended</h2>
          <p className="text-slate-500 mb-8">Your account has been deactivated by an administrator. If you believe this is an error, please contact your department lead.</p>
          <button 
            onClick={() => window.location.reload()}
            className="w-full py-3 bg-slate-900 text-white rounded-xl font-bold"
          >
            Retry Login
          </button>
        </div>
      </div>
    );
  }

  if (adminOnly && !isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Layout>{children}</Layout>;
}

export default function App() {
  React.useEffect(() => {
    document.title = "owlfraudster in action";
  }, []);

  return (
    <Router>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          
          <Route path="/case" element={
            <PrivateRoute>
              <CaseManager />
            </PrivateRoute>
          } />

          <Route path="/forms/create" element={<Navigate to="/case" replace />} />
          <Route path="/forms/update" element={<Navigate to="/case" replace />} />
          
          <Route path="/dashboard" element={
            <PrivateRoute>
              <Dashboard />
            </PrivateRoute>
          } />
          
          <Route path="/database" element={
            <PrivateRoute>
              <Database />
            </PrivateRoute>
          } />

          <Route path="/search-institution" element={
            <PrivateRoute>
              <SearchBank />
            </PrivateRoute>
          } />

          <Route path="/admin" element={
            <PrivateRoute adminOnly>
              <Admin />
            </PrivateRoute>
          } />

          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </AuthProvider>
    </Router>
  );
}
