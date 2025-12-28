import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from './Toast';

const Login = () => {
  const { login, initializing, isAuthenticated } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [formState, setFormState] = useState({ email: '', password: '' });
  const [submitting, setSubmitting] = useState(false);

  const redirectPath = location.state?.from?.pathname || '/';

  useEffect(() => {
    if (!initializing && isAuthenticated) {
      navigate(redirectPath, { replace: true });
    }
  }, [initializing, isAuthenticated, navigate, redirectPath]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormState((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    try {
      await login(formState.email, formState.password);
      toast.success('Welcome back!');
      navigate(redirectPath, { replace: true });
    } catch (error) {
      const message = error.response?.data?.error || 'Unable to sign in. Please check your credentials.';
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  if (!initializing && isAuthenticated) {
    return null;
  }

  return (
    <div className="auth-wrapper">
      <div className="auth-card">
        <h1>Sign in</h1>
        <p>Enter the admin credentials to continue.</p>
        <form onSubmit={handleSubmit}>
          <label>
            Email
            <input
              type="email"
              name="email"
              value={formState.email}
              onChange={handleChange}
              required
              autoComplete="username"
              placeholder="admin@example.com"
            />
          </label>

          <label>
            Password
            <input
              type="password"
              name="password"
              value={formState.password}
              onChange={handleChange}
              required
              autoComplete="current-password"
              placeholder="Enter password"
            />
          </label>

          <button type="submit" className="auth-submit-btn" disabled={submitting}>
            {submitting ? 'Signing in...' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;
