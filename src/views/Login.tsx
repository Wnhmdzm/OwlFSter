/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ShieldCheck, LogIn, AlertCircle, Mail, Lock } from 'lucide-react';
import { motion } from 'motion/react';
import OwlIcon from '../components/OwlIcon';
import { apiFetch } from '../lib/api-emulator';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      
      if (!res.ok) {
        throw new Error('Invalid credentials or inactive account');
      }
      
      const { token, user } = await res.json();
      login(token, user);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 font-sans">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden"
      >
        <div className="p-8">
          <div className="flex flex-col items-center mb-8">
            <div className="bg-slate-50 p-4 rounded-2xl text-slate-900 mb-4 shadow-md border border-slate-200">
              <OwlIcon size={40} className="text-slate-950" />
            </div>
            <h1 className="text-2xl font-black text-slate-950 tracking-tight text-center uppercase">
              Owl<span className="text-indigo-600 font-extrabold">Fraudster</span>
            </h1>
            <p className="text-slate-500 text-[10px] uppercase tracking-widest font-extrabold text-center mt-2">
              Multi-user Risk & Fraud Mitigation
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            {error && (
              <div className="p-4 bg-red-50 border border-red-100 rounded-xl flex items-start gap-3 text-red-700 text-sm">
                <AlertCircle className="shrink-0 mt-0.5" size={18} />
                <p>{error}</p>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest px-1">Staff ID or Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 text-slate-400" size={18} />
                <input
                  type="text"
                  required
                  placeholder="PS101435"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all outline-none"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest px-1">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 text-slate-400" size={18} />
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all outline-none"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-indigo-600 text-white py-3.5 rounded-xl font-bold hover:bg-indigo-700 transition-all active:scale-[0.98] disabled:opacity-50 mt-4 shadow-lg shadow-indigo-100"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <LogIn size={20} />
                  Sign In to System
                </>
              )}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-slate-100 text-left">
            <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest mb-3 text-center">Authorized Fraud Operators</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-medium">
              {[
                { id: 'PS101435', name: 'Zaim', role: 'Admin' },
                { id: 'PS101436', name: 'Faris', role: 'Staff' },
                { id: 'PS101477', name: 'Nabil', role: 'Staff' },
                { id: 'PS101405', name: 'Naja', role: 'Staff' },
                { id: 'PS101480', name: 'Izzat', role: 'Staff' },
              ].map((op) => (
                <button
                  key={op.id}
                  type="button"
                  onClick={() => {
                    setEmail(op.id);
                    setPassword('Affin123');
                  }}
                  className="flex items-center justify-between p-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200/60 hover:border-indigo-200 rounded-xl transition-all text-left text-slate-700 group cursor-pointer"
                >
                  <div className="truncate">
                    <span className="font-mono font-extrabold text-slate-900 group-hover:text-indigo-600">{op.id}</span>
                    <span className="ml-1 text-slate-500 text-xs">({op.name})</span>
                  </div>
                  <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 bg-white px-1.5 py-0.5 rounded border border-slate-200 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-all">{op.role}</span>
                </button>
              ))}
            </div>
            <p className="text-[9px] text-slate-400 font-semibold text-center mt-3 uppercase tracking-wider">
              💡 Touch any operator card above to instantly pre-fill authorization credentials
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
