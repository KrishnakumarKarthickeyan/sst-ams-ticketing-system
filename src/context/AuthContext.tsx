'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { isSupabaseConfigured, supabase } from '../lib/supabase/client';

export type UserRole = 'SuperAdmin' | 'Manager' | 'Consultant' | 'Customer';

export interface UserSession {
  name: string;
  email: string;
  role: UserRole;
  company?: string;
  id?: string;
  consultantType?: 'Functional' | 'Technical';
  modules?: string[];
  phoneNumber?: string;
}

interface AuthContextType {
  user: UserSession | null;
  loading: boolean;
  login: (email: string, password?: string) => Promise<{ success: boolean; user?: UserSession; error?: string }>;
  logout: () => Promise<void>;
  updateProfile: (name: string) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const DEMO_USERS: Record<string, UserSession> = {};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserSession | null>(null);
  const [loading, setLoading] = useState(() => {
    if (typeof window !== 'undefined') {
      const isConfigured = !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
      if (isConfigured) {
        // Look for any supabase auth token in localStorage to see if session exists
        const keys = Object.keys(localStorage);
        const hasToken = keys.some(key => key.includes('auth-token'));
        return hasToken;
      } else {
        const hasSession = !!localStorage.getItem('sap_user_session');
        return hasSession;
      }
    }
    return true;
  });
  const router = useRouter();

  useEffect(() => {
    let active = true;
    let currentUserId: string | null = null;

    const fetchAndSetProfile = async (session: any) => {
      if (!session || !active) return null;
      try {
        const { data: profile, error } = await supabase!
          .from('profiles')
          .select('full_name, role, is_active, consultant_type, sap_modules, phone_number, organizations(name)')
          .eq('id', session.user.id)
          .single();

        if (profile && !error && active) {
          if (!profile.is_active) {
            await supabase!.auth.signOut();
            setUser(null);
            currentUserId = null;
            return null;
          }
          const userOrg = profile.organizations as any;
          const sessionUser: UserSession = {
            id: session.user.id,
            email: session.user.email || '',
            name: profile.full_name,
            role: profile.role as UserRole,
            company: userOrg ? userOrg.name : undefined,
            consultantType: profile.consultant_type as any,
            modules: profile.sap_modules || [],
            phoneNumber: profile.phone_number
          };
          setUser(sessionUser);
          currentUserId = session.user.id;
          return sessionUser;
        } else if (active) {
          const sessionUser: UserSession = {
            id: session.user.id,
            email: session.user.email || '',
            name: session.user.email?.split('@')[0] || 'User',
            role: 'Customer'
          };
          setUser(sessionUser);
          currentUserId = session.user.id;
          return sessionUser;
        }
      } catch (e) {
        console.error('Error fetching profile from Supabase', e);
      }
      return null;
    };

    const initAuth = async () => {
      if (isSupabaseConfigured && supabase) {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (session && active) {
            if (session.user.id !== currentUserId) {
              await fetchAndSetProfile(session);
            }
          } else if (active) {
            setUser(null);
            currentUserId = null;
          }
        } catch (e) {
          console.error('Error in initAuth getSession', e);
        }
      } else {
        // Fallback local storage
        const stored = localStorage.getItem('sap_user_session');
        if (stored && active) {
          try {
            const parsed = JSON.parse(stored);
            setUser(parsed);
            currentUserId = parsed.id || null;
          } catch (e) {
            console.error('Failed to parse local user session', e);
          }
        }
      }
      if (active) {
        setLoading(false);
      }
    };

    initAuth();

    // Setup Supabase auth state listener if active
    const client = supabase;
    if (isSupabaseConfigured && client) {
      const { data: { subscription } } = client.auth.onAuthStateChange(async (event, session) => {
        if (session) {
          if (session.user.id !== currentUserId) {
            if (active) setLoading(true);
            await fetchAndSetProfile(session);
            if (active) setLoading(false);
          }
        } else {
          setUser(null);
          currentUserId = null;
          if (active) setLoading(false);
        }
      });

      return () => {
        active = false;
        subscription.unsubscribe();
      };
    }
  }, []);

  const login = async (email: string, password?: string): Promise<{ success: boolean; user?: UserSession; error?: string }> => {
    const normalizedEmail = email.trim().toLowerCase();

    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: normalizedEmail,
          password: password || ''
        });

        if (error) {
          // Check if it is a demo account, let it authenticate client side as fallback if needed
          if (DEMO_USERS[normalizedEmail] && password === 'Manager@12345') {
            const demoSession = DEMO_USERS[normalizedEmail];
            setUser(demoSession);
            localStorage.setItem('sap_user_session', JSON.stringify(demoSession));
            return { success: true, user: demoSession };
          }
          return { success: false, error: error.message };
        }

        if (data.user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name, role, is_active, consultant_type, sap_modules, phone_number, organizations(name)')
            .eq('id', data.user.id)
            .single();

          if (profile) {
            if (!profile.is_active) {
              await supabase.auth.signOut();
              setUser(null);
              return { success: false, error: 'Your account has been disabled. Please contact your administrator.' };
            }
            const userOrg = profile.organizations as any;
            const sessionUser: UserSession = {
              id: data.user.id,
              email: data.user.email || '',
              name: profile.full_name || data.user.email?.split('@')[0] || 'User',
              role: (profile.role as UserRole) || 'Customer',
              company: userOrg ? userOrg.name : undefined,
              consultantType: profile.consultant_type as any,
              modules: profile.sap_modules || [],
              phoneNumber: profile.phone_number
            };
            setUser(sessionUser);
            return { success: true, user: sessionUser };
          }
        }
        return { success: false, error: 'User details missing.' };
      } catch (e: any) {
        return { success: false, error: e.message || 'An error occurred during authentication.' };
      }
    } else {
      // Local demo mode check
      const matched = DEMO_USERS[normalizedEmail];
      if (matched && password === 'Manager@12345') {
        setUser(matched);
        localStorage.setItem('sap_user_session', JSON.stringify(matched));
        return { success: true, user: matched };
      }
      return { success: false, error: 'Invalid credentials. Use email manager@supportstudio.com and password Manager@12345.' };
    }
  };

  const logout = async () => {
    if (isSupabaseConfigured && supabase) {
      await supabase.auth.signOut();
    }
    setUser(null);
    localStorage.removeItem('sap_user_session');
    router.push('/login');
  };

  const updateProfile = (name: string) => {
    if (!user) return;
    const updated = { ...user, name };
    setUser(updated);
    if (!isSupabaseConfigured) {
      localStorage.setItem('sap_user_session', JSON.stringify(updated));
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, updateProfile }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
