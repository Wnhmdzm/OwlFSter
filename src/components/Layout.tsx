/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { ReactNode, useState } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { 
  Database, 
  LogOut, 
  Key,
  Lock,
  ChevronDown,
  Building2,
  LineChart
} from 'lucide-react';
import OwlIcon from './OwlIcon';
import { useAuth } from '../context/AuthContext';
import { cn } from '../lib/utils';
import { motion } from 'motion/react';
import { api } from '../lib/api';

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const { profile, isAdmin, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [changePasswordOpen, setChangePasswordOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwdError, setPwdError] = useState('');
  const [pwdSuccess, setPwdSuccess] = useState('');
  const [pwdLoading, setPwdLoading] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isCaseActive = location.pathname.startsWith('/case') || location.pathname.startsWith('/forms/');

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwdError('');
    setPwdSuccess('');

    if (newPassword !== confirmPassword) {
      setPwdError('New passwords do not match.');
      return;
    }

    if (newPassword.length < 5) {
      setPwdError('Password must be at least 5 characters long.');
      return;
    }

    setPwdLoading(true);
    try {
      await api.post('/api/auth/change-password', { currentPassword, newPassword });
      setPwdSuccess('PASSWORD CHANGED SUCCESS!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setPwdError(err.message || 'Failed to update. Verify current password.');
    } finally {
      setPwdLoading(false);
    }
  };

  return (
    <div className="h-screen flex flex-col bg-surface overflow-hidden border-t-4 border-brand">
      {/* Header */}
      <header className="h-16 flex items-center justify-between px-6 bg-white border-b border-border shadow-sm shrink-0">
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-2">
            <OwlIcon size={24} className="text-slate-950 shrink-0" />
            <span className="font-black text-xl tracking-tight uppercase text-slate-800">
              Owl<span className="text-brand font-black">Fraudster</span>
            </span>
          </div>
          <nav className="flex items-center gap-6">
            <NavLink
              to="/dashboard"
              className={({ isActive }) => cn(
                "text-[11px] font-bold uppercase tracking-widest py-5 transition-all border-b-2",
                isActive 
                  ? "text-brand border-brand" 
                  : "text-gray-400 border-transparent hover:text-brand"
              )}
            >
              Dashboard
            </NavLink>

            <NavLink
              to="/case"
              className={({ isActive }) => cn(
                "text-[11px] font-bold uppercase tracking-widest py-5 transition-all border-b-2",
                isCaseActive || isActive 
                  ? "text-brand border-brand" 
                  : "text-gray-400 border-transparent hover:text-brand"
              )}
            >
              Case
            </NavLink>

            <NavLink
              to="/search-institution"
              className={({ isActive }) => cn(
                "text-[11px] font-bold uppercase tracking-widest py-5 transition-all border-b-2",
                isActive 
                  ? "text-brand border-brand" 
                  : "text-gray-400 border-transparent hover:text-brand"
              )}
            >
              Search Institution
            </NavLink>

            <NavLink
              to="/database"
              className={({ isActive }) => cn(
                "text-[11px] font-bold uppercase tracking-widest py-5 transition-all border-b-2",
                isActive 
                  ? "text-brand border-brand" 
                  : "text-gray-400 border-transparent hover:text-brand"
              )}
            >
              Database
            </NavLink>

            {/* Admin menu shows strictly for authorized admin (PS101435) */}
            {isAdmin && (
              <NavLink
                to="/admin"
                className={({ isActive }) => cn(
                  "text-[11px] font-bold uppercase tracking-widest py-5 transition-all border-b-2 text-rose-500 hover:text-rose-600",
                  isActive 
                    ? "border-rose-500" 
                    : "border-transparent"
                )}
              >
                Admin
              </NavLink>
            )}
          </nav>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden md:flex items-center gap-3 pl-4 border-l border-gray-200">
            <div className="text-right">
              <p className="text-[11px] font-black text-slate-800 uppercase tracking-tight">
                {profile?.displayName || 'User'} 
                <span className="text-[10px] text-indigo-500 font-mono ml-1">({profile?.uid})</span>
              </p>
              <p className="text-[9px] text-gray-400 uppercase font-bold tracking-wider">{profile?.role}</p>
            </div>

            {/* Change Password Button */}
            <button
              onClick={() => setChangePasswordOpen(true)}
              className="w-8 h-8 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-500 hover:text-brand hover:bg-indigo-50 transition-colors cursor-pointer"
              title="Change Password"
            >
              <Key size={13} />
            </button>

            <button 
              onClick={handleLogout}
              className="w-8 h-8 rounded-full bg-red-50 border border-red-100 flex items-center justify-center text-red-500 hover:text-red-700 hover:bg-red-100 transition-colors cursor-pointer"
              title="Logout"
            >
              <LogOut size={14} />
            </button>
          </div>
        </div>
      </header>

      {/* Change Password Modal */}
      {changePasswordOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4 text-left animate-fade-in">
          <div className="bg-white border border-border rounded-xl w-full max-w-sm p-6 shadow-2xl relative">
            <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest mb-4 flex items-center gap-2">
              <Lock className="text-brand" size={14} />
              Set My Password
            </h3>
            
            {pwdError && (
              <div className="p-3 bg-red-50 border border-red-100 text-red-700 text-[11px] rounded mb-4 font-medium leading-tight">
                {pwdError}
              </div>
            )}
            
            {pwdSuccess && (
              <div className="p-3 bg-emerald-50 border border-emerald-100 text-emerald-700 text-xs rounded mb-4 font-black uppercase tracking-wider text-center">
                {pwdSuccess}
              </div>
            )}

            <form onSubmit={handleChangePassword} className="space-y-4">
              <div>
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider block mb-1">Current Password</label>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded text-xs focus:outline-none focus:ring-1 focus:ring-brand font-mono"
                />
              </div>

              <div>
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider block mb-1">New password</label>
                <input
                  type="password"
                  required
                  placeholder="e.g. Affin123"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded text-xs focus:outline-none focus:ring-1 focus:ring-brand font-mono"
                />
              </div>

              <div>
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider block mb-1">Confirm New Password</label>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded text-xs focus:outline-none focus:ring-1 focus:ring-brand font-mono"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  disabled={pwdLoading}
                  className="flex-1 py-2.5 bg-brand text-white text-[10px] font-black uppercase tracking-widest rounded hover:bg-opacity-90 disabled:opacity-50 cursor-pointer"
                >
                  {pwdLoading ? 'Saving...' : 'Update Password'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setChangePasswordOpen(false);
                    setCurrentPassword('');
                    setNewPassword('');
                    setConfirmPassword('');
                    setPwdError('');
                    setPwdSuccess('');
                  }}
                  className="px-4 py-2.5 border border-border text-slate-500 hover:bg-slate-50 text-[10px] uppercase font-bold tracking-widest rounded cursor-pointer"
                >
                  Close
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="p-6"
        >
          {children}
        </motion.div>
      </main>

      {/* Footer / Status Bar */}
      <footer className="h-10 bg-white border-t border-border px-6 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">Storage Engine: SQLite (Local)</span>
          </div>
          <span className="text-[10px] text-gray-300">|</span>
          <span className="text-[10px] text-gray-500 uppercase font-medium">Node: {window.location.hostname}</span>
        </div>
        <div className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">
          &copy; 2026 INTERNAL SECURITY INFRASTRUCTURE
        </div>
      </footer>
    </div>
  );
}
