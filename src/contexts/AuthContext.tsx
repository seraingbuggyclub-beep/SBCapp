'use client';

import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { User } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/client';
import { MemberProfile } from '@/types/models';
import { isSuperAdmin as checkSuperAdmin } from '@/modules/admin/permissions';

export interface AuthContextType {
  user: User | null;
  profile: MemberProfile | null;
  loading: boolean;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  hasAcceptedAgreements: boolean;
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<MemberProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const supabase = useMemo(() => createClient(), []);

  const fetchProfile = useCallback(async (userId: string): Promise<MemberProfile | null> => {
    try {
      const { data, error } = await supabase
        .from('sbc_members')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        console.error('Erreur chargement profil auth:', error.message);
        return null;
      }
      return (data as MemberProfile) || null;
    } catch (err) {
      console.error('Erreur inattendue chargement profil:', err);
      return null;
    }
  }, [supabase]);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUser(session.user);
        const memberProf = await fetchProfile(session.user.id);
        setProfile(memberProf);
      } else {
        setUser(null);
        setProfile(null);
      }
    } catch (err) {
      console.error('Erreur refresh auth:', err);
      setUser(null);
      setProfile(null);
    } finally {
      setLoading(false);
    }
  }, [supabase, fetchProfile]);

  useEffect(() => {
    let isMounted = true;

    async function initAuth() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!isMounted) return;

        if (session?.user) {
          setUser(session.user);
          const prof = await fetchProfile(session.user.id);
          if (isMounted) setProfile(prof);
        } else {
          setUser(null);
          setProfile(null);
        }
      } catch (err) {
        console.error('Erreur initialisation auth:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!isMounted) return;
      if (session?.user) {
        setUser(session.user);
        const prof = await fetchProfile(session.user.id);
        if (isMounted) setProfile(prof);
      } else {
        setUser(null);
        setProfile(null);
      }
      if (isMounted) setLoading(false);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [supabase, fetchProfile]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
  }, [supabase]);

  const isSuper = useMemo(() => {
    return checkSuperAdmin(user?.email);
  }, [user?.email]);

  const isAdmin = useMemo(() => {
    return isSuper || profile?.role === 'admin';
  }, [isSuper, profile?.role]);

  const hasAcceptedAgreements = useMemo(() => {
    if (!profile) return false;
    return Boolean(profile.roi_accepted && profile.insurance_ack);
  }, [profile?.roi_accepted, profile?.insurance_ack]);

  const contextValue = useMemo<AuthContextType>(() => ({
    user,
    profile,
    loading,
    isAdmin,
    isSuperAdmin: isSuper,
    hasAcceptedAgreements,
    refresh,
    signOut,
  }), [user, profile, loading, isAdmin, isSuper, hasAcceptedAgreements, refresh, signOut]);

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth doit être utilisé à l\'intérieur d\'un AuthProvider');
  }
  return context;
}
