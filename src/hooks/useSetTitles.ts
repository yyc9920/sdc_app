import { useState, useEffect } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';

const titleCache = new Map<string, string>();

export const useSetTitles = (setIds: string[]) => {
  const [titles, setTitles] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (setIds.length === 0) {
      setTitles({});
      setLoading(false);
      return;
    }

    const fetchTitles = async () => {
      const result: Record<string, string> = {};
      const uncachedIds = setIds.filter(id => {
        if (!id) {
          return false;
        }
        if (titleCache.has(id)) {
          result[id] = titleCache.get(id)!;
          return false;
        }
        return true;
      });

      if (uncachedIds.length > 0) {
        await Promise.all(
          uncachedIds.map(async (setId) => {
            try {
              // Try speed_listening_sets first
              let docRef = doc(db, 'speed_listening_sets', setId);
              let docSnap = await getDoc(docRef);
              
              if (docSnap.exists()) {
                const data = docSnap.data();
                const title = data.theme || setId;
                titleCache.set(setId, title);
                result[setId] = title;
                return;
              }

              // Try learning_sets next
              docRef = doc(db, 'learning_sets', setId);
              docSnap = await getDoc(docRef);
              
              if (docSnap.exists()) {
                const data = docSnap.data();
                const title = data.title || setId;
                titleCache.set(setId, title);
                result[setId] = title;
                return;
              }

              // Default if not found in either
              titleCache.set(setId, setId);
              result[setId] = setId;
            } catch (e) {
              console.error(`Error fetching title for ${setId}:`, e);
              result[setId] = setId;
            }
          })
        );
      }

      setTitles(result);
      setLoading(false);
    };

    fetchTitles();
  }, [setIds.join(',')]);

  const getTitle = (setId: string): string => {
    if (!setId) return '알 수 없음';
    return titles[setId] || titleCache.get(setId) || setId;
  };

  return { titles, loading, getTitle };
};
