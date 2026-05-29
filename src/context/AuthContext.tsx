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
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const isLoggingInRef = React.useRef(false);

  useEffect(() => {
    let active = true;
    let fetchingUserId: string | null = null;

    const setSessionCookie = (session: any) => {
      if (typeof window !== 'undefined') {
        if (session && session.access_token) {
          // Set access token cookie for Next.js middleware routing
          document.cookie = `sb-access-token=${session.access_token}; path=/; max-age=${session.expires_in || 3600}; SameSite=Lax; Secure`;
        } else {
          document.cookie = 'sb-access-token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;';
        }
      }
    };

    const fetchAndSetProfile = async (session: any) => {
      if (!session || !active) {
        setSessionCookie(null);
        return null;
      }
      if (isLoggingInRef.current) return null;
      if (fetchingUserId === session.user.id) return null;
      fetchingUserId = session.user.id;

      // Sync the cookie to server-side middleware
      setSessionCookie(session);

      try {
        const profilePromise = supabase!
          .from('profiles')
          .select('full_name, role, is_active, consultant_type, sap_modules, phone_number, organizations(name)')
          .eq('id', session.user.id)
          .single();

        const timeoutPromise = new Promise<any>((resolve) =>
          setTimeout(() => resolve({ data: null, error: { message: 'Profile fetch timeout' } }), 20000)
        );

        const { data: profile, error } = await Promise.race([profilePromise, timeoutPromise]) as any;

        const isTimeout = error && error.message === 'Profile fetch timeout';
        const isNetworkError = error && (error.status === 0 || error.message?.includes('Failed to fetch') || error.message?.includes('network'));

        if (isTimeout || isNetworkError) {
          console.warn("Temporary network issue or database waking up. Retrying...");
          fetchingUserId = null;
          setLoading(false);
          return null;
        }

        if (error || !profile || !profile.is_active) {
          console.error("Failed or inactive user profile. Clearing auth session:", error);
          
          await supabase!.auth.signOut();
          setSessionCookie(null);
          setUser(null);
          fetchingUserId = null;
          setLoading(false);
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
        fetchingUserId = null;
        setLoading(false);
        return sessionUser;

      } catch (e: any) {
        console.error('Fatal profile query exception:', e);
        await supabase!.auth.signOut();
        setSessionCookie(null);
        setUser(null);
        setLoading(false);
      }
      fetchingUserId = null;
      return null;
    };

    if (isSupabaseConfigured && supabase) {
      const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
        if (!active) return;

        if (session) {
          await fetchAndSetProfile(session);
        } else {
          setUser(null);
          if (typeof window !== 'undefined') {
            localStorage.removeItem('sap_user_session');
          }
          setLoading(false);
        }
      });

      return () => {
        active = false;
        subscription.unsubscribe();
      };
    } else {
      // Fallback local storage (only in demo mode if Supabase isn't configured)
      const stored = localStorage.getItem('sap_user_session');
      if (stored && active) {
        try {
          setUser(JSON.parse(stored));
        } catch (e) {
          console.error('Failed to parse local user session:', e);
        }
      }
      setLoading(false);
    }
  }, []);

  const login = async (email: string, password?: string): Promise<{ success: boolean; user?: UserSession; error?: string }> => {
    const normalizedEmail = email.trim().toLowerCase();
    isLoggingInRef.current = true;

    if (isSupabaseConfigured && supabase) {
      try {
        const loginPromise = supabase.auth.signInWithPassword({
          email: normalizedEmail,
          password: password || ''
        });

        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Authentication service timeout. Please verify your connection status.')), 10000)
        );

        // Enforce a strict 10s network timeout safety check
        const { data, error } = await Promise.race([loginPromise, timeoutPromise]) as any;

        if (error) {
          isLoggingInRef.current = false;
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
              isLoggingInRef.current = false;
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
            
            if (typeof window !== 'undefined' && data.session) {
              // Sync the cookie to server-side middleware
              const exp = data.session.expires_in || 3600;
              document.cookie = `sb-access-token=${data.session.access_token}; path=/; max-age=${exp}; SameSite=Lax; Secure`;
            }
            
            setUser(sessionUser);
            setLoading(false);
            isLoggingInRef.current = false;
            return { success: true, user: sessionUser };
          }
        }
        isLoggingInRef.current = false;
        return { success: false, error: 'User profile mapping failed.' };
      } catch (e: any) {
        isLoggingInRef.current = false;
        return { success: false, error: e.message || 'An error occurred during authentication.' };
      } finally {
        isLoggingInRef.current = false;
      }
    } else {
      isLoggingInRef.current = false;
      return { success: false, error: 'Database auth server is not online.' };
    }
  };

  const logout = async () => {
    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.auth.signOut();
      } catch (e) {
        console.error('Error signing out from Supabase:', e);
      }
    }
    setUser(null);
    if (typeof window !== 'undefined') {
      // Clear middleware cookie
      document.cookie = 'sb-access-token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;';
      
      localStorage.removeItem('sap_user_session');
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.startsWith('sst_profile_') || key.startsWith('sap_') || key.startsWith('sst_role_') || key.startsWith('sst_user_'))) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(key => localStorage.removeItem(key));
    }
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
