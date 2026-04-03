import { useState, useEffect } from 'react';
import { signInWithCustomToken, onAuthStateChanged, signOut } from 'firebase/auth';
import type { User } from 'firebase/auth';
import { getFunctions, httpsCallable } from 'firebase/functions';
import app, { auth } from '../firebase';
import { FIREBASE_REGION, getAuthErrorMessage } from '../constants';

interface AuthState {
  user: User | null;
  role: 'admin' | 'teacher' | 'student' | null;
  loading: boolean;
  error: string | null;
}

export const useAuth = () => {
  const [state, setState] = useState<AuthState>({
    user: null,
    role: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    return onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const token = await user.getIdTokenResult();
          setState({
            user,
            role: token.claims.role as 'admin' | 'teacher' | 'student',
            loading: false,
            error: null,
          });
        } catch (err) {
          console.error('Error getting custom claims:', err);
          setState({ user, role: null, loading: false, error: null });
        }
      } else {
        setState({ user: null, role: null, loading: false, error: null });
      }
    });
  }, []);

  const loginWithCode = async (code: string) => {
    setState(s => ({ ...s, loading: true, error: null }));

    try {
      const functions = getFunctions(app, FIREBASE_REGION);
      const validateCodeFn = httpsCallable<{code: string}, {customToken: string, role: string}>(functions, 'validateCode');
      const result = await validateCodeFn({ code });
      
      const { customToken } = result.data;
      await signInWithCustomToken(auth, customToken);
      
    } catch (error: unknown) {
      console.error('Login Error:', error);
      setState(s => ({
        ...s,
        loading: false,
        error: getAuthErrorMessage(error),
      }));
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Logout Error:', error);
    }
  };

  return { ...state, loginWithCode, logout };
};
