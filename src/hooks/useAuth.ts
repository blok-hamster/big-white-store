import { useState, useEffect } from 'react';
import { 
  User, 
  onAuthStateChanged, 
  signInAnonymously, 
  signOut as firebaseSignOut,
  Unsubscribe 
} from 'firebase/auth';
import { auth } from '../config/firebase';

export interface AuthState {
  user: User | null;
  loading: boolean;
  error: string | null;
}

export const useAuth = () => {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    loading: true,
    error: null
  });

  useEffect(() => {
    const unsubscribe: Unsubscribe = onAuthStateChanged(
      auth,
      (user) => {
        setAuthState({
          user,
          loading: false,
          error: null
        });
      },
      (error) => {
        setAuthState({
          user: null,
          loading: false,
          error: error.message
        });
      }
    );

    return unsubscribe;
  }, []);

  const signInAsGuest = async (): Promise<User | null> => {
    try {
      setAuthState(prev => ({ ...prev, loading: true, error: null }));
      const result = await signInAnonymously(auth);
      return result.user;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to sign in as guest';
      setAuthState(prev => ({ ...prev, loading: false, error: errorMessage }));
      return null;
    }
  };

  const signOut = async (): Promise<void> => {
    try {
      await firebaseSignOut(auth);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to sign out';
      setAuthState(prev => ({ ...prev, error: errorMessage }));
    }
  };

  return {
    ...authState,
    signInAsGuest,
    signOut,
    isAuthenticated: !!authState.user,
    isAnonymous: authState.user?.isAnonymous || false
  };
};