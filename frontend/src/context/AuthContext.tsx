import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import client from '../api/client';

export interface User {
  id: string;
  username: string;
  email: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (username: string, email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('sc_token'));
  const [loading, setLoading] = useState<boolean>(true);

  const isAuthenticated = !!user && !!token;

  const loadUser = useCallback(async () => {
    const storedToken = localStorage.getItem('sc_token');
    if (!storedToken) {
      setLoading(false);
      return;
    }
    try {
      const response = await client.get('/auth/me');
      setUser(response.data.user);
      setToken(storedToken);
    } catch {
      localStorage.removeItem('sc_token');
      localStorage.removeItem('sc_user');
      setUser(null);
      setToken(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  const login = async (email: string, password: string) => {
    const response = await client.post('/auth/login', { email, password });
    const { access_token: newToken, user: userData } = response.data;
    localStorage.setItem('sc_token', newToken);
    localStorage.setItem('sc_user', JSON.stringify(userData));
    setToken(newToken);
    setUser(userData);
  };

  const signup = async (username: string, email: string, password: string) => {
    const response = await client.post('/auth/signup', { username, email, password });
    const { access_token: newToken, user: userData } = response.data;
    localStorage.setItem('sc_token', newToken);
    localStorage.setItem('sc_user', JSON.stringify(userData));
    setToken(newToken);
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem('sc_token');
    localStorage.removeItem('sc_user');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, isAuthenticated, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export default AuthContext;
