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
  const activeRef = React.useRef(true);
  const activeProfileFetchRef = React.useRef<Promise<UserSession | null> | null>(null);

  const setSessionCookie = (session: any) => {
    if (typeof window !== 'undefined') {
      if (session && session.access_token) {
        const secureFlag = window.location.protocol === 'https:' ? '; Secure' : '';
        document.cookie = `sb-access-token=${session.access_token}; path=/; max-age=${session.expires_in || 3600}; SameSite=Lax${secureFlag}`;
      } else {
        document.cookie = 'sb-access-token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;';
      }
    }
  };

  const fetchAndSetProfile = async (session: any) => {
    if (!session || !activeRef.current) {
      setSessionCookie(null);
      return null;
    }
    
    // Prevent duplicate fetches if profile is already loaded and matches current session user
    if (user && user.id === session.user.id) {
      setLoading(false);
      return user;
    }

    if (activeProfileFetchRef.current) {
      return activeProfileFetchRef.current;
    }

    const fetchPromise = (async () => {
      // Sync the cookie to server-side middleware
      setSessionCookie(session);

      try {
        const profilePromise = supabase!
          .from('profiles')
          .select('full_name, role, is_active, consultant_type, sap_modules, phone_number, organizations(name)')
          .eq('id', session.user.id)
          .single();

        const timeoutPromise = new Promise<any>((resolve) =>
          setTimeout(() => resolve({ data: null, error: { message: 'Profile fetch timeout' } }), 5000)
        );

        const { data: profile, error } = await Promise.race([profilePromise, timeoutPromise]) as any;

        if (error || !profile || !profile.is_active) {
          console.error("Failed or inactive user profile. Clearing auth session:", error);
          await supabase!.auth.signOut();
          setSessionCookie(null);
          setUser(null);
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
        setLoading(false);
        return sessionUser;

      } catch (e: any) {
        console.error('Fatal profile query exception:', e);
        await supabase!.auth.signOut();
        setSessionCookie(null);
        setUser(null);
        setLoading(false);
        return null;
      } finally {
        activeProfileFetchRef.current = null;
      }
    })();

    activeProfileFetchRef.current = fetchPromise;
    return fetchPromise;
  };

  useEffect(() => {
    activeRef.current = true;
    let unsubscribeFn: (() => void) | null = null;

    const initAuth = async () => {
      if (isSupabaseConfigured && supabase) {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (activeRef.current) {
            if (session) {
              await fetchAndSetProfile(session);
            } else {
              setUser(null);
              setSessionCookie(null);
              setLoading(false);
            }
          }
        } catch (err) {
          console.error('Error loading initial session:', err);
          if (activeRef.current) {
            setUser(null);
            setLoading(false);
          }
        }

        if (activeRef.current) {
          const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            if (!activeRef.current) return;
            if (session) {
              await fetchAndSetProfile(session);
            } else {
              setUser(null);
              setSessionCookie(null);
              setLoading(false);
            }
          });
          unsubscribeFn = () => subscription.unsubscribe();
        }
      } else {
        setUser(null);
        setLoading(false);
      }
    };

    initAuth();

    return () => {
      activeRef.current = false;
      if (unsubscribeFn) {
        unsubscribeFn();
      }
    };
  }, []);

  const login = async (email: string, password?: string): Promise<{ success: boolean; user?: UserSession; error?: string }> => {
    const normalizedEmail = email.trim().toLowerCase();

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
          return { success: false, error: error.message };
        }

        if (data.session) {
          const sessionUser = await fetchAndSetProfile(data.session);
          if (sessionUser) {
            return { success: true, user: sessionUser };
          }
        }
        return { success: false, error: 'User profile mapping failed.' };
      } catch (e: any) {
        return { success: false, error: e.message || 'An error occurred during authentication.' };
      }
    } else {
      return { success: false, error: 'Database auth server is not online.' };
    }
  };

  const logout = async () => {
    if (isSupabaseConfigured && supabase) {
      supabase.auth.signOut().catch(e => {
        console.error('Error signing out from Supabase (bg):', e);
      });
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
