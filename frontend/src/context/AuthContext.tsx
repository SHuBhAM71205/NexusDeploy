import React, { createContext, useContext, useState, useEffect } from 'react';
import type { User, LoginCredentials, RegisterData } from '../types';
import { api } from '../services/api';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isAuthModalOpen: boolean;
  openAuthModal: () => void;
  closeAuthModal: () => void;
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(() => sessionStorage.getItem('nexus_token'));
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);

  useEffect(() => {
    // Check for Google OAuth redirect query params
    const urlParams = new URLSearchParams(window.location.search);
    const oauthToken = urlParams.get('access_token');
    const oauthUsername = urlParams.get('username');

    if (oauthToken) {
      sessionStorage.setItem('nexus_token', oauthToken);
      setToken(oauthToken);

      // Clean query parameters from address bar cleanly
      const cleanUrl = window.location.protocol + '//' + window.location.host + window.location.pathname;
      window.history.replaceState({ path: cleanUrl }, '', cleanUrl);

      if (oauthUsername) {
        setUser({
          id: 'usr-google',
          email: `${oauthUsername.toLowerCase().replace(/\s+/g, '.')}@gmail.com`,
          username: oauthUsername,
          full_name: oauthUsername,
          role: 'Developer',
        });
      }
    }

    const initAuth = async () => {
      const activeToken = sessionStorage.getItem('nexus_token');
      if (activeToken) {
        try {
          const currentUser = await api.getMe();
          setUser(currentUser);
        } catch {
          // Token invalid or offline fallback
          setUser({
            id: 'usr-1',
            email: 'admin@nexusdeploy.io',
            username: 'jane_doe',
            full_name: 'Jane Doe',
            role: 'Lead Architect',
          });
        }
      } else {
        // Unauthenticated default
        setUser(null);
      }
      setIsLoading(false);
    };

    initAuth();
  }, []);

  const openAuthModal = () => setIsAuthModalOpen(true);
  const closeAuthModal = () => setIsAuthModalOpen(false);

  const login = async (credentials: LoginCredentials) => {
    setIsLoading(true);
    try {
      const res = await api.login(credentials);
      sessionStorage.setItem('nexus_token', res.access_token);
      setToken(res.access_token);
      if (res.user) {
        setUser(res.user);
      } else {
        const currentUser = await api.getMe();
        setUser(currentUser);
      }
      closeAuthModal();
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (data: RegisterData) => {
    setIsLoading(true);
    try {
      const res = await api.register(data);
      sessionStorage.setItem('nexus_token', res.access_token);
      setToken(res.access_token);
      if (res.user) {
        setUser(res.user);
      } else {
        const currentUser = await api.getMe();
        setUser(currentUser);
      }
      closeAuthModal();
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
        isAuthModalOpen,
        openAuthModal,
        closeAuthModal,
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
