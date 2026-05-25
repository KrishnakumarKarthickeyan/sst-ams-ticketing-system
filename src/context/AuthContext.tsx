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
  login: (email: string, password?: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  updateProfile: (name: string) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const DEMO_USERS: Record<string, UserSession> = {
  'admin@sap.com': {
    id: 'usr-admin-111',
    name: 'Sarah Admin (Global)',
    email: 'admin@sap.com',
    role: 'SuperAdmin',
    company: 'SST SAP Operations'
  },
  'manager@sap.com': {
    id: 'usr-manager-222',
    name: 'Marcus Vance',
    email: 'manager@sap.com',
    role: 'Manager',
    company: 'Apex Global Industries'
  },
  'consultant@sap.com': {
    id: 'usr-consult-333',
    name: 'Priya Raman',
    email: 'consultant@sap.com',
    role: 'Consultant',
    company: 'SST SAP Operations',
    consultantType: 'Functional',
    modules: ['FICO', 'MM', 'SD', 'HCM'],
    phoneNumber: '+91 98765 00001'
  },
  'arjun.technical@example.com': {
    id: 'usr-consult-444',
    name: 'Arjun Mehta',
    email: 'arjun.technical@example.com',
    role: 'Consultant',
    company: 'SST SAP Operations',
    consultantType: 'Technical',
    modules: ['ABAP', 'BASIS', 'CPI', 'Fiori'],
    phoneNumber: '+91 98765 43210'
  },
  'customer@sap.com': {
    id: 'usr-customer-444',
    name: 'Sarah Jenkins',
    email: 'customer@sap.com',
    role: 'Customer',
    company: 'Apex Global Industries'
  }
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserSession | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const initAuth = async () => {
      if (isSupabaseConfigured && supabase) {
        // Live Supabase session checks
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          try {
            const { data: profile, error } = await supabase
              .from('profiles')
              .select('full_name, role, organizations(name)')
              .eq('id', session.user.id)
              .single();

            if (profile && !error) {
              const userOrg = profile.organizations as any;
              setUser({
                id: session.user.id,
                email: session.user.email || '',
                name: profile.full_name,
                role: profile.role as UserRole,
                company: userOrg ? userOrg.name : undefined
              });
            } else {
              // Fallback if profile row does not exist yet
              setUser({
                id: session.user.id,
                email: session.user.email || '',
                name: session.user.email?.split('@')[0] || 'User',
                role: 'Customer' // default
              });
            }
          } catch (e) {
            console.error('Error fetching profile from Supabase', e);
          }
        }
      } else {
        // Fallback local storage
        const stored = localStorage.getItem('sap_user_session');
        if (stored) {
          try {
            setUser(JSON.parse(stored));
          } catch (e) {
            console.error('Failed to parse local user session', e);
          }
        }
      }
      setLoading(false);
    };

    initAuth();

    // Setup Supabase auth state listener if active
    const client = supabase;
    if (isSupabaseConfigured && client) {
      const { data: { subscription } } = client.auth.onAuthStateChange(async (event, session) => {
        if (session) {
          const { data: profile } = await client
            .from('profiles')
            .select('full_name, role, organizations(name)')
            .eq('id', session.user.id)
            .single();

          const userOrg = profile?.organizations as any;
          setUser({
            id: session.user.id,
            email: session.user.email || '',
            name: profile?.full_name || session.user.email?.split('@')[0] || 'User',
            role: (profile?.role as UserRole) || 'Customer',
            company: userOrg ? userOrg.name : undefined
          });
        } else {
          setUser(null);
        }
      });

      return () => {
        subscription.unsubscribe();
      };
    }
  }, []);

  const login = async (email: string, password?: string): Promise<{ success: boolean; error?: string }> => {
    const normalizedEmail = email.trim().toLowerCase();

    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: normalizedEmail,
          password: password || 'password123' // default for easier demoing
        });

        if (error) {
          // Check if it is a demo account, let it authenticate client side as fallback if needed
          if (DEMO_USERS[normalizedEmail]) {
            const demoSession = DEMO_USERS[normalizedEmail];
            setUser(demoSession);
            localStorage.setItem('sap_user_session', JSON.stringify(demoSession));
            return { success: true };
          }
          return { success: false, error: error.message };
        }

        if (data.user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name, role, organizations(name)')
            .eq('id', data.user.id)
            .single();

          const userOrg = profile?.organizations as any;
          const sessionUser: UserSession = {
            id: data.user.id,
            email: data.user.email || '',
            name: profile?.full_name || data.user.email?.split('@')[0] || 'User',
            role: (profile?.role as UserRole) || 'Customer',
            company: userOrg ? userOrg.name : undefined
          };
          setUser(sessionUser);
          return { success: true };
        }
        return { success: false, error: 'User details missing.' };
      } catch (e: any) {
        return { success: false, error: e.message || 'An error occurred during authentication.' };
      }
    } else {
      // Local demo mode check
      const matched = DEMO_USERS[normalizedEmail];
      if (matched) {
        setUser(matched);
        localStorage.setItem('sap_user_session', JSON.stringify(matched));
        return { success: true };
      }
      return { success: false, error: 'Invalid credentials. Please use one of the demo logins below.' };
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
