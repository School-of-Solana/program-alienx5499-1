/* eslint-disable react-refresh/only-export-components */
"use client";
import React, { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { toast } from 'sonner';

interface AuthContextType {
  isAuthenticated: boolean;
  user: User | null;
  login: (method: 'email' | 'gmail') => Promise<void>;
  logout: () => void;
  isLoading: boolean;
  authMethod: string | null;
}

interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [authMethod, setAuthMethod] = useState<string | null>(null);

  // Initialize auth state on app load
  useEffect(() => {
    const initializeAuth = async () => {
      if (typeof window === 'undefined' || typeof document === 'undefined') return;
      
      try {
        // Check if user was previously authenticated
        const wasAuthenticated = localStorage.getItem('isAuthenticated');
        const savedAuthMethod = localStorage.getItem('authMethod');
        const savedUser = localStorage.getItem('user');
        
        if (wasAuthenticated && savedUser) {
          const userData = JSON.parse(savedUser);
          setUser(userData);
          setIsAuthenticated(true);
          setAuthMethod(savedAuthMethod);
          console.log('User re-authenticated:', userData.email);
        }
      } catch (error) {
        console.log('No existing authentication found');
        localStorage.removeItem('isAuthenticated');
        localStorage.removeItem('authMethod');
        localStorage.removeItem('user');
      }
    };

    initializeAuth();
  }, []);

  const login = async (method: 'email' | 'gmail') => {
    try {
      setIsLoading(true);
      
      // Check if we're on client side
      if (typeof window === 'undefined' || typeof document === 'undefined') {
        throw new Error('Authentication only available in browser');
      }
      
      if (method === 'email') {
        // Simulate email login flow
        const email = prompt('Enter your email address:');
        if (!email) {
          throw new Error('Email is required');
        }
        
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const userData: User = {
          id: 'user_' + Date.now(),
          email: email,
          name: email.split('@')[0],
        };
        
        setUser(userData);
        setIsAuthenticated(true);
        setAuthMethod('email');
        localStorage.setItem('isAuthenticated', 'true');
        localStorage.setItem('authMethod', 'email');
        localStorage.setItem('user', JSON.stringify(userData));
        
        console.log('Email login successful:', userData.email);
        toast.success('Successfully logged in with email!');
        
      } else if (method === 'gmail') {
        // Simulate Gmail OAuth flow
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        const userData: User = {
          id: 'user_' + Date.now(),
          email: 'user@gmail.com',
          name: 'Gmail User',
          avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face',
        };
        
        setUser(userData);
        setIsAuthenticated(true);
        setAuthMethod('gmail');
        localStorage.setItem('isAuthenticated', 'true');
        localStorage.setItem('authMethod', 'gmail');
        localStorage.setItem('user', JSON.stringify(userData));
        
        console.log('Gmail login successful:', userData.email);
        toast.success('Successfully logged in with Gmail!');
      } else {
        throw new Error('Unsupported authentication method');
      }
    } catch (error: any) {
      console.error(`Failed to login with ${method}:`, error);
      toast.error(`Failed to login with ${method}: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setUser(null);
    setIsAuthenticated(false);
    setAuthMethod(null);
    localStorage.removeItem('isAuthenticated');
    localStorage.removeItem('authMethod');
    localStorage.removeItem('user');
    toast.success('Successfully logged out!');
  };

  const value: AuthContextType = {
    isAuthenticated,
    user,
    login,
    logout,
    isLoading,
    authMethod,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
