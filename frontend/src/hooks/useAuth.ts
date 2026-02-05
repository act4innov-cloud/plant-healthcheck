import { useState, useEffect } from 'react';
import { 
  User,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup
} from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { authApi } from '@/lib/api';

interface AuthState {
  user: User | null;
  userData: any | null;
  loading: boolean;
  error: string | null;
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    user: null,
    userData: null,
    loading: true,
    error: null
  });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          // Récupérer les données utilisateur depuis l'API
          const response = await authApi.getMe();
          setState({
            user,
            userData: response.data,
            loading: false,
            error: null
          });
        } catch (error) {
          console.error('Error fetching user data:', error);
          setState({
            user,
            userData: null,
            loading: false,
            error: 'Failed to load user data'
          });
        }
      } else {
        setState({
          user: null,
          userData: null,
          loading: false,
          error: null
        });
      }
    });

    return () => unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error: any) {
      setState(prev => ({ 
        ...prev, 
        loading: false, 
        error: error.message 
      }));
      throw error;
    }
  };

  const signInWithGoogle = async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (error: any) {
      setState(prev => ({ 
        ...prev, 
        loading: false, 
        error: error.message 
      }));
      throw error;
    }
  };

  const signUp = async (email: string, password: string, displayName: string) => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      // L'API créera automatiquement l'utilisateur dans la BDD lors de la première connexion
    } catch (error: any) {
      setState(prev => ({ 
        ...prev, 
        loading: false, 
        error: error.message 
      }));
      throw error;
    }
  };

  const signOut = async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    try {
      await firebaseSignOut(auth);
    } catch (error: any) {
      setState(prev => ({ 
        ...prev, 
        loading: false, 
        error: error.message 
      }));
      throw error;
    }
  };

  return {
    user: state.user,
    userData: state.userData,
    loading: state.loading,
    error: state.error,
    signIn,
    signInWithGoogle,
    signUp,
    signOut
  };
}
