/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { UserProfile, UserRole } from '../types';

interface AuthContextType {
  user: { id: string; email: string; role: UserRole; displayName: string } | null;
  profile: UserProfile | null;
  loading: boolean;
  isAdmin: boolean;
  login: (token: string, userData: any) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
  isAdmin: false,
  login: () => {},
  logout: () => {},
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (token: string) => {
    try {
      const res = await fetch('/api/me', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setProfile({
          ...data,
          uid: data.id || data.uid || '',
          isActive: data.isActive === 1
        } as UserProfile);
      } else {
        logout();
      }
    } catch (err) {
      console.error(err);
      logout();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const token = localStorage.getItem('fms_token');
    const savedUser = localStorage.getItem('fms_user');
    
    if (token && savedUser) {
      setUser(JSON.parse(savedUser));
      fetchProfile(token);
    } else {
      setLoading(false);
    }
  }, []);

  const login = (token: string, userData: any) => {
    localStorage.setItem('fms_token', token);
    localStorage.setItem('fms_user', JSON.stringify(userData));
    setUser(userData);
    fetchProfile(token);
  };

  const logout = () => {
    localStorage.removeItem('fms_token');
    localStorage.removeItem('fms_user');
    setUser(null);
    setProfile(null);
    setLoading(false);
  };

  const isAdmin = profile?.role === UserRole.ADMIN && (profile?.uid === 'PS101435' || profile?.email === 'ps101435@fms.pro');

  return (
    <AuthContext.Provider value={{ user, profile, loading, isAdmin, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
