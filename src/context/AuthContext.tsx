'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { isSupabaseConfigured, supabase } from '../lib/supabase/client';
import { checkUserLockedStatus, handleFailedLogin, handleSuccessfulLogin, getUserProfileServer } from '../app/actions/auth';

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
  firstLoginCompleted?: boolean;
  forcePasswordChange?: boolean;
  isLocked?: boolean;
}

interface AuthContextType {
  user: UserSession | null;
  loading: boolean;
  login: (email: string, password?: string) => Promise<{ success: boolean; user?: UserSession; error?: string }>;
  logout: () => Promise<void>;
  updateProfile: (name: string) => void;
  refreshProfile: () => Promise<UserSession | null>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const DEMO_USERS: Record<string, UserSession> = {};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserSession | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const activeRef = React.useRef(true);
  const activeProfileFetchRef = React.useRef<Promise<UserSession | null> | null>(null);
  const isLoggingInRef = React.useRef(false);

  const fetchAndSetProfile = async (session: any, force = false) => {
    if (!session || !activeRef.current) {
      return null;
    }
    if (isLoggingInRef.current && !force) return null;
    
    // Prevent duplicate fetches if profile is already loaded and matches current session user
    if (!force && user && user.id === session.user.id) {
      setLoading(false);
      return user;
    }

    if (activeProfileFetchRef.current && !force) {
      return activeProfileFetchRef.current;
    }

    const fetchPromise = (async () => {
      try {
        const profileRes = await getUserProfileServer(session.user.id);
        const profile = profileRes.success ? profileRes.profile : null;
        const error = profileRes.success ? null : { message: profileRes.error || 'Profile fetch failed' };

        if (error || !profile || !profile.is_active || profile.is_locked === true) {
          console.error("Failed, inactive, or locked user profile. Clearing auth session:", error);
          await supabase!.auth.signOut();
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
          phoneNumber: profile.phone_number,
          firstLoginCompleted: profile.first_login_completed,
          forcePasswordChange: profile.force_password_change,
          isLocked: profile.is_locked
        };
        
        setUser(sessionUser);
        setLoading(false);
        return sessionUser;

      } catch (e: any) {
        console.error('Fatal profile query exception:', e);
        await supabase!.auth.signOut();
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
    isLoggingInRef.current = true;

    if (isSupabaseConfigured && supabase) {
      try {
        // Pre-check user locked/active status from profiles
        const lockCheck = await checkUserLockedStatus(normalizedEmail);
        if (!lockCheck.success) {
          isLoggingInRef.current = false;
          return { success: false, error: lockCheck.error };
        }

        const loginPromise = supabase.auth.signInWithPassword({
          email: normalizedEmail,
          password: password || ''
        });

        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Authentication service timeout. Please verify your connection status.')), 15000)
        );

        // Enforce a strict network timeout safety check
        const { data, error } = await Promise.race([loginPromise, timeoutPromise]) as any;

        if (error) {
          // Increment failed attempts and trigger lockout if limit reached
          const failedRes = await handleFailedLogin(normalizedEmail);
          const errorMsg = failedRes.locked ? failedRes.error : (error.message || 'Invalid credentials.');
          isLoggingInRef.current = false;
          return { success: false, error: errorMsg };
        }

        if (data.user) {
          // Successful login: reset failed attempts
          await handleSuccessfulLogin(normalizedEmail);

          const getProfileRes = () => getUserProfileServer(data.user.id);
          let profileRes = await getProfileRes();
          let profile = profileRes.success ? profileRes.profile : null;
          if (!profile) {
            // JWT race on first login: wait briefly and try again
            await new Promise(r => setTimeout(r, 600));
            profileRes = await getProfileRes();
            profile = profileRes.success ? profileRes.profile : null;
          }

          if (profile) {
            if (!profile.is_active) {
              await supabase.auth.signOut();
              setUser(null);
              return { success: false, error: 'Your account has been disabled. Please contact your administrator.' };
            }
            if (profile.is_locked) {
              await supabase.auth.signOut();
              setUser(null);
              return { success: false, error: 'Your account has been locked due to too many failed login attempts. Please contact your administrator to unlock it.' };
            }
            const userOrg = profile.organizations as any;
            const sessionUser: UserSession = {
              id: data.user.id,
              email: data.user.email || '',
              name: profile.full_name,
              role: profile.role as UserRole,
              company: userOrg ? userOrg.name : undefined,
              consultantType: profile.consultant_type as any,
              modules: profile.sap_modules || [],
              phoneNumber: profile.phone_number,
              firstLoginCompleted: profile.first_login_completed,
              forcePasswordChange: profile.force_password_change,
              isLocked: profile.is_locked
            };
            
            setUser(sessionUser);
            setLoading(false);
            return { success: true, user: sessionUser };
          }
        }
        await supabase.auth.signOut();
        setUser(null);
        return { success: false, error: 'User profile mapping failed.' };
      } catch (e: any) {
        if (supabase) {
          await supabase.auth.signOut().catch(() => {});
        }
        setUser(null);
        return { success: false, error: e.message || 'An error occurred during authentication.' };
      } finally {
        setTimeout(() => { isLoggingInRef.current = false; }, 1500);
      }
    } else {
      isLoggingInRef.current = false;
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

  const refreshProfile = async (): Promise<UserSession | null> => {
    if (isSupabaseConfigured && supabase) {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          return await fetchAndSetProfile(session, true);
        }
      } catch (err) {
        console.error('Error refreshing user profile:', err);
      }
    }
    return null;
  };

  useEffect(() => {
    if (user && user.firstLoginCompleted === false) {
      if (typeof window !== 'undefined' && window.location.pathname !== '/first-login-reset') {
        router.push('/first-login-reset');
      }
    }
  }, [user]);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, updateProfile, refreshProfile }}>
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
