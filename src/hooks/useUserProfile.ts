import { useState, useEffect } from 'react';
import { doc, onSnapshot, Timestamp } from 'firebase/firestore';
import { db } from '../firebase';

export interface UserProfile {
  uid: string;
  role: 'admin' | 'teacher' | 'student';
  profileCompleted: boolean;
  teacherId: string | null;
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
    totalMasteredCount?: number;
  };
}

export const useUserProfile = (uid: string | undefined) => {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let unsubscribe: () => void = () => {};

    if (uid) {
      const docRef = doc(db, 'users', uid);
      unsubscribe = onSnapshot(docRef, (docSnap) => {
        if (docSnap.exists()) {
          setProfile(docSnap.data() as UserProfile);
        } else {
      setProfile(null);
        }
        setLoading(false);
      }, (err) => {
        console.error("Error fetching user profile:", err);
        setError(err);
        setLoading(false);
      });
    } else {
      setTimeout(() => {
        setProfile(null);
        setLoading(false);
      }, 0);
    }

    return () => unsubscribe();
  }, [uid]);

  return { profile, loading, error };
};
