/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { UserProfile, UserRole } from '../types';
import { 
  ShieldCheck, 
  User, 
  UserCog, 
  CheckCircle2, 
  XCircle,
  RefreshCcw,
  Mail,
  Shield,
  Activity
} from 'lucide-react';
import { cn } from '../lib/utils';
import { useAuth } from '../context/AuthContext';

export default function Admin() {
  const { profile: currentUserProfile } = useAuth();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [resettingUser, setResettingUser] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
       const [userData, logData] = await Promise.all([
         api.get('/api/admin/users'),
         api.get('/api/admin/logs')
       ]);
       const mappedUsers = userData.map((u: any) => ({
         ...u,
         uid: u.id || u.uid || ''
       }));
       setUsers(mappedUsers);
       setLogs(logData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const toggleRole = async (user: UserProfile) => {
    if (user.uid === currentUserProfile?.uid) return;
    
    setUpdating(user.uid);
    try {
      const newRole = user.role === UserRole.ADMIN ? UserRole.USER : UserRole.ADMIN;
      await api.patch(`/api/admin/users/${user.uid}`, { role: newRole });
      setUsers(users.map(u => u.uid === user.uid ? { ...u, role: newRole } : u));
    } catch (err) {
      console.error(err);
    } finally {
      setUpdating(null);
    }
  };

  const toggleStatus = async (user: UserProfile) => {
    if (user.uid === currentUserProfile?.uid) return;
    
    setUpdating(user.uid);
    try {
      const newStatus = !user.isActive;
      await api.patch(`/api/admin/users/${user.uid}`, { isActive: newStatus });
      setUsers(users.map(u => u.uid === user.uid ? { ...u, isActive: newStatus } : u));
    } catch (err) {
      console.error(err);
    } finally {
      setUpdating(null);
    }
  };

  const resetUserPassword = async (user: UserProfile) => {
    setUpdating(user.uid);
    setResettingUser(user.uid);
    try {
      await api.post(`/api/admin/users/${user.uid}/reset-password`, {});
      setTimeout(() => {
        setResettingUser(null);
      }, 3000);
      fetchData(); // reload logs
    } catch (err) {
      console.error(err);
      setResettingUser(null);
    } finally {
      setUpdating(null);
    }
  };

  if (loading) {
     return (
       <div className="h-full flex items-center justify-center">
         <RefreshCcw className="animate-spin text-indigo-600" size={32} />
       </div>
     );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <header>
        <h2 className="text-3xl font-bold text-slate-900 tracking-tight">System Administration</h2>
        <p className="text-slate-500 mt-1">Manage user roles, permissions, and platform access.</p>
      </header>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
           <h3 className="font-bold text-slate-700 flex items-center gap-2">
             <UserCog size={20} className="text-indigo-600" />
             Staff Directory
           </h3>
           <button onClick={fetchData} className="text-sm text-slate-500 hover:text-indigo-600 flex items-center gap-1 transition-colors">
              <RefreshCcw size={14} /> Refresh List
           </button>
        </div>

        <div className="divide-y divide-slate-100">
          {users.map((user) => (
            <div key={user.uid} className="p-6 flex items-center justify-between hover:bg-slate-50 transition-colors">
              <div className="flex items-center gap-4">
                <div className={cn(
                  "p-3 rounded-2xl",
                  user.role === UserRole.ADMIN ? "bg-indigo-50 text-indigo-600" : "bg-slate-100 text-slate-500"
                )}>
                  {user.role === UserRole.ADMIN ? <ShieldCheck size={24} /> : <User size={24} />}
                </div>
                <div>
                  <h4 className="font-bold text-slate-900">{user.displayName || 'Unnamed Staff'}</h4>
                  <div className="flex items-center gap-4 mt-1">
                    <div className="flex items-center gap-1.5 text-slate-400 text-sm">
                      <Mail size={14} />
                      {user.email}
                    </div>
                    <div className={cn(
                      "flex items-center gap-1 text-[10px] font-bold uppercase px-2 py-0.5 rounded-full",
                      user.isActive ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"
                    )}>
                      {user.isActive ? <CheckCircle2 size={10} /> : <XCircle size={10} />}
                      {user.isActive ? 'Active' : 'Suspended'}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  disabled={updating === user.uid}
                  onClick={() => resetUserPassword(user)}
                  className={cn(
                    "px-4 py-2 rounded-xl text-xs font-bold transition-all border uppercase tracking-wider text-[10px]",
                    resettingUser === user.uid 
                      ? "bg-slate-900 border-slate-900 text-emerald-400" 
                      : "bg-amber-500 border-amber-500 text-white hover:bg-amber-600 hover:border-amber-600 cursor-pointer"
                  )}
                  title="Reset forgotten password to default: Affin123"
                >
                  {resettingUser === user.uid ? 'Reset OK ✓' : 'Reset Pwd'}
                </button>
                <button
                  disabled={updating === user.uid || user.uid === currentUserProfile?.uid}
                  onClick={() => toggleRole(user)}
                  className={cn(
                    "px-4 py-2 rounded-xl text-xs font-semibold transition-all border cursor-pointer",
                    user.role === UserRole.ADMIN 
                      ? "bg-white border-slate-200 text-slate-600 hover:bg-slate-50" 
                      : "bg-indigo-600 border-indigo-600 text-white hover:bg-indigo-700"
                  )}
                >
                  {user.role === UserRole.ADMIN ? 'Demote to User' : 'Promote to Admin'}
                </button>
                <button
                   disabled={updating === user.uid || user.uid === currentUserProfile?.uid}
                   onClick={() => toggleStatus(user)}
                   className={cn(
                     "p-2 rounded-xl transition-all border cursor-pointer",
                     user.isActive 
                       ? "bg-white border-red-200 text-red-600 hover:bg-red-50" 
                       : "bg-emerald-600 border-emerald-600 text-white hover:bg-emerald-700"
                   )}
                >
                   {user.isActive ? <XCircle size={18} /> : <CheckCircle2 size={18} />}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
           <h3 className="font-bold text-slate-700 flex items-center gap-2">
             <Activity size={20} className="text-indigo-600" />
             Recent Activity Logs
           </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
               <tr>
                 <th className="px-6 py-3 font-bold text-slate-400 uppercase tracking-widest text-[10px]">Staff</th>
                 <th className="px-6 py-3 font-bold text-slate-400 uppercase tracking-widest text-[10px]">Action</th>
                 <th className="px-6 py-3 font-bold text-slate-400 uppercase tracking-widest text-[10px]">Details</th>
                 <th className="px-6 py-3 font-bold text-slate-400 uppercase tracking-widest text-[10px]">Time</th>
               </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {logs.map((log, idx) => (
                <tr key={log.id || `log-${idx}`} className="hover:bg-slate-50">
                  <td className="px-6 py-3 whitespace-nowrap">
                    <span className="font-semibold text-slate-700">{log.display_name}</span>
                  </td>
                  <td className="px-6 py-3 whitespace-nowrap">
                    <span className={cn(
                      "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase",
                      log.action.includes('CREATE') ? "bg-emerald-100 text-emerald-700" : "bg-blue-100 text-blue-700"
                    )}>
                      {log.action}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-slate-500 font-mono text-[10px]">{log.details}</td>
                  <td className="px-6 py-3 text-slate-400 whitespace-nowrap">{log.timestamp}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      
      <div className="bg-indigo-900 rounded-3xl p-8 text-white relative overflow-hidden shadow-2xl shadow-indigo-200">
         <div className="relative z-10">
           <div className="flex items-center gap-3 mb-4">
             <Shield size={24} className="text-indigo-400" />
             <h3 className="text-xl font-bold uppercase tracking-widest">Security Advisory</h3>
           </div>
           <p className="text-indigo-100 leading-relaxed max-w-2xl text-sm">
             As an Administrator, you have full access to PII and historical data. Ensure that you regularly review the staff directory and suspend accounts for any members who have left the department. All administrative actions are logged for audit purposes.
           </p>
         </div>
         <div className="absolute -right-12 -bottom-12 w-64 h-64 bg-indigo-800 rounded-full blur-3xl opacity-50"></div>
      </div>
    </div>
  );
}
