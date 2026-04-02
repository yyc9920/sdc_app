import { useState, useEffect } from 'react';
import { doc, onSnapshot, Timestamp } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { db } from '../firebase';

export interface UserProfile {
  uid: string;
  role: 'admin' | 'teacher' | 'student';
  profileCompleted: boolean;
  teacherId: string | null;
  accessCode?: string;
  profile: {
    name: string;
    goal: string;
    phone?: string;
    email?: string;
    age?: number;
    createdAt: Timestamp;
  };
  stats?: {
    totalStudyTimeSeconds?: number;
    currentStreak?: number;
    longestStreak?: number;
    totalMasteredCount?: number;
    lastActiveDate?: string;
  };
}

export const useUserProfile = (uid: string | undefined) => {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let unsubscribe: () => void = () => {};
    let cancelled = false;

    if (!uid) {
      setTimeout(() => {
        setProfile(null);
        setLoading(false);
      }, 0);
      return;
    }

    const startListener = () => {
      if (cancelled) return;
      const docRef = doc(db, 'users', uid);
      unsubscribe = onSnapshot(
        docRef,
        (docSnap) => {
          if (!cancelled) {
            setProfile(docSnap.exists() ? (docSnap.data() as UserProfile) : null);
            setLoading(false);
          }
        },
        (err) => {
          if (cancelled) return;
          if (err.code === 'permission-denied') {
            unsubscribe();
            const auth = getAuth();
            auth.currentUser
              ?.getIdToken(true)
              .then(() => startListener())
              .catch(() => {
                setError(err);
                setLoading(false);
              });
          } else {
            setError(err);
            setLoading(false);
          }
        }
      );
    };

    startListener();

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [uid]);

  return { profile, loading, error };
};
