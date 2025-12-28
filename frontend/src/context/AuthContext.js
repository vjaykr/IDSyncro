import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { API_BASE_URL } from '../config';

const AuthContext = createContext(null);
const TOKEN_STORAGE_KEY = 'idsyncro_token';

function setAxiosAuthHeader(token) {
  if (token) {
    axios.defaults.headers.common.Authorization = `Bearer ${token}`;
  } else {
    delete axios.defaults.headers.common.Authorization;
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_STORAGE_KEY));
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    setAxiosAuthHeader(token);

    if (!token) {
      setUser(null);
      setInitializing(false);
      return;
    }

    let isMounted = true;

    axios
      .get(`${API_BASE_URL}/api/auth/me`)
      .then((response) => {
        if (isMounted) {
          setUser(response.data.user);
        }
      })
      .catch(() => {
        if (isMounted) {
          localStorage.removeItem(TOKEN_STORAGE_KEY);
          setToken(null);
          setUser(null);
          setAxiosAuthHeader(null);
        }
      })
      .finally(() => {
        if (isMounted) {
          setInitializing(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [token]);

  const login = async (email, password) => {
    const response = await axios.post(`${API_BASE_URL}/api/auth/login`, { email, password });
    const authToken = response.data.token;

    localStorage.setItem(TOKEN_STORAGE_KEY, authToken);
    setToken(authToken);
    setUser(response.data.user);
    setAxiosAuthHeader(authToken);
  };

  const logout = () => {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    setToken(null);
    setUser(null);
    setAxiosAuthHeader(null);
  };

  const value = useMemo(
    () => ({
      user,
      token,
      initializing,
      login,
      logout,
      isAuthenticated: Boolean(user)
    }),
    [user, token, initializing]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
