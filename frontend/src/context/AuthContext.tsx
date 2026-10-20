import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import type { User, LoginCredentials, RegisterData } from '../types';
import { api } from '../services/api';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(() => sessionStorage.getItem('nexus_token'));
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const didInitialize = useRef(false);

  useEffect(() => {
    if (didInitialize.current) return;
    didInitialize.current = true;

    const urlParams = new URLSearchParams(window.location.search);
    const isGoogleOAuthCallback = urlParams.get('oauth') === 'success';

    if (isGoogleOAuthCallback) {
      window.history.replaceState({}, '', `${window.location.pathname}${window.location.hash}`);
    }

    const initAuth = async () => {
      try {
        if (isGoogleOAuthCallback) {
          const refreshed = await api.refreshSession();
          sessionStorage.setItem('nexus_token', refreshed.access_token);
          setToken(refreshed.access_token);
        }

        if (sessionStorage.getItem('nexus_token')) {
          const currentUser = await api.getMe();
          setUser({ ...currentUser, full_name: currentUser.full_name || currentUser.username });
        }
      } catch {
        sessionStorage.removeItem('nexus_token');
        setToken(null);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();
  }, []);

  const login = async (credentials: LoginCredentials) => {
    setIsLoading(true);
    try {
      const res = await api.login(credentials);
      sessionStorage.setItem('nexus_token', res.access_token);
      setToken(res.access_token);
      const currentUser = await api.getMe();
      setUser({ ...currentUser, full_name: currentUser.full_name || currentUser.username });
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (data: RegisterData) => {
  setIsLoading(true);

  try {
    await api.register(data);

    // Registration creates the account.
    // The user must log in separately to receive a JWT.
    sessionStorage.removeItem('nexus_token');
    setToken(null);
    setUser(null);
  } finally {
    setIsLoading(false);
  }
};

  const logout = async () => {
    setIsLoading(true);
    try {
      await api.logout();
    } finally {
      sessionStorage.removeItem('nexus_token');
      setToken(null);
      setUser(null);
      setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!user || !!token,
        isLoading,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
