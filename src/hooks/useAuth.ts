import { useState, useEffect } from 'react';
import { getAuth, signInWithCustomToken, onAuthStateChanged, signOut } from 'firebase/auth';
import type { User } from 'firebase/auth';
import { getFunctions, httpsCallable } from 'firebase/functions';
import app from '../firebase';

interface AuthState {
  user: User | null;
  role: 'admin' | 'student' | null;
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
    const auth = getAuth(app);
    return onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const token = await user.getIdTokenResult();
          setState({
            user,
            role: token.claims.role as 'admin' | 'student',
            loading: false,
            error: null,
          });
        } catch (err) {
          console.error("Error getting custom claims:", err);
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
      const functions = getFunctions(app, 'asia-northeast3');
      const validateCodeFn = httpsCallable<{code: string}, {customToken: string, role: string}>(functions, 'validateCode');
      const result = await validateCodeFn({ code });
      
      const { customToken } = result.data;
      const auth = getAuth(app);
      
      await signInWithCustomToken(auth, customToken);
      
    } catch (error: unknown) {
      console.error("Login Error:", error);
      let errorMessage = 'Login failed. Please check your code and try again.';
      
      if (error instanceof Error && error.message) {
        if (error.message.includes('not-found')) errorMessage = 'Invalid access code.';
        if (error.message.includes('permission-denied')) errorMessage = error.message;
      }
      
      setState(s => ({
        ...s,
        loading: false,
        error: errorMessage,
      }));
    }
  };

  const logout = async () => {
    try {
      const auth = getAuth(app);
      await signOut(auth);
    } catch (error) {
      console.error("Logout Error:", error);
    }
  };

  return { ...state, loginWithCode, logout };
};
