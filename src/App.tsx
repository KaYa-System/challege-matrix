import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { RegistrationForm } from './components/RegistrationForm';
import { LoginForm } from './components/LoginForm';
import { ParticipantDashboard } from './components/dashboard/ParticipantDashboard';
import { ChallengeList } from './components/challenges/ChallengeList';
import { SubmissionHistory } from './components/history/SubmissionHistory';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { Navigation } from './components/Navigation';
import { PublicHomepage } from './components/public/PublicHomepage';
import { supabase } from './lib/supabase';
import { retry } from './utils/retry';
import { AlertCircle, Loader2 } from 'lucide-react';
import type { User } from '@supabase/supabase-js';

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retrying, setRetrying] = useState(false);

  useEffect(() => {
    // Vérifier la session actuelle
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        checkAdminStatus(session.user.id);
      } else {
        setIsAdmin(false);
        setLoading(false);
      }
    });

    // Écouter les changements d'authentification
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        checkAdminStatus(session.user.id);
      } else {
        setIsAdmin(false);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  async function checkAdminStatus(userId: string) {
    try {
      setError(null);
      setRetrying(false);

      await retry(
        async () => {
          const { data, error } = await supabase
            .from('users')
            .select('role')
            .eq('id', userId)
            .maybeSingle();

          if (error) {
            throw error;
          }

          setIsAdmin(data?.role === 'admin');
        },
        {
          retries: 3,
          delay: 1000,
          onError: (error, attempt) => {
            console.warn(`Tentative ${attempt} échouée:`, error);
            setRetrying(true);
            setError('Problème de connexion, nouvelle tentative...');
          }
        }
      );
    } catch (err) {
      console.error('Erreur lors de la vérification du rôle:', err);
      setError(
        err instanceof Error
          ? err.message
          : 'Une erreur est survenue lors de la vérification des droits'
      );
      setIsAdmin(false);
    } finally {
      setLoading(false);
      setRetrying(false);
    }
  }

  if (loading || retrying) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-sm text-gray-600">
            {retrying ? 'Tentative de reconnexion...' : 'Chargement...'}
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white p-6 rounded-lg shadow-lg max-w-md w-full">
          <div className="flex items-center justify-center mb-4">
            <AlertCircle className="h-12 w-12 text-red-500" />
          </div>
          <h2 className="text-xl font-semibold text-center text-gray-900 mb-2">
            Erreur de connexion
          </h2>
          <p className="text-gray-600 text-center mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Réessayer
          </button>
        </div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      {user ? (
        // Interface utilisateur connecté
        <div className="min-h-screen bg-gray-50">
          <Navigation isAdmin={isAdmin} />
          
          <main className="py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-7xl mx-auto">
              <Routes>
                <Route path="/" element={
                  isAdmin ? (
                    <Navigate to="/admin" replace />
                  ) : (
                    <div className="space-y-8">
                      <ParticipantDashboard />
                    </div>
                  )
                } />
                <Route path="/challenges" element={<ChallengeList />} />
                <Route path="/history" element={<SubmissionHistory />} />
                {isAdmin && <Route path="/admin" element={<AdminDashboard />} />}
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </div>
          </main>
        </div>
      ) : (
        // Interface publique
        <Routes>
          <Route path="/" element={<PublicHomepage />} />
          <Route path="/login" element={
            <main className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
              <div className="max-w-7xl mx-auto">
                <LoginForm onToggleForm={() => window.location.href = '/register'} />
              </div>
            </main>
          } />
          <Route path="/register" element={
            <main className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
              <div className="max-w-7xl mx-auto">
                <RegistrationForm onToggleForm={() => window.location.href = '/login'} />
              </div>
            </main>
          } />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      )}
    </BrowserRouter>
  );
}

export default App;