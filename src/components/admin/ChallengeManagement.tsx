import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Plus, Edit2, Archive, Trophy, AlertCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { ChallengeForm } from './ChallengeForm';
import type { Database } from '../../types/supabase';

type Challenge = Database['public']['Tables']['challenges']['Row'];

export function ChallengeManagement() {
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [selectedChallenge, setSelectedChallenge] = useState<Challenge | undefined>();

  useEffect(() => {
    loadChallenges();
  }, []);

  async function loadChallenges() {
    try {
      setError(null);
      const { data, error } = await supabase
        .from('challenges')
        .select('*')
        .order('level', { ascending: true });

      if (error) throw error;
      setChallenges(data);
    } catch (err) {
      console.error('Erreur lors du chargement des challenges:', err);
      setError('Erreur lors du chargement des challenges');
    } finally {
      setLoading(false);
    }
  }

  async function handleStatusChange(challengeId: string, status: Challenge['status']) {
    try {
      setError(null);
      const { error } = await supabase
        .from('challenges')
        .update({ status })
        .eq('id', challengeId);

      if (error) throw error;
      await loadChallenges();
    } catch (err) {
      console.error('Erreur lors de la mise à jour du statut:', err);
      setError('Erreur lors de la mise à jour du statut');
    }
  }

  function handleEdit(challenge: Challenge) {
    setSelectedChallenge(challenge);
    setShowForm(true);
  }

  function handleCloseForm() {
    setShowForm(false);
    setSelectedChallenge(undefined);
  }

  // Statistiques des challenges par statut
  const stats = challenges.reduce((acc, challenge) => {
    acc[challenge.status] = (acc[challenge.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  if (loading) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-lg font-medium text-gray-900">
            Gestion des challenges ({challenges.length})
          </h2>
          <div className="mt-1 flex flex-wrap items-center gap-4 text-sm text-gray-500">
            <span className="flex items-center">
              <span className="h-2 w-2 rounded-full bg-green-500 mr-1"></span>
              {stats.active || 0} actifs
            </span>
            <span className="hidden sm:inline">•</span>
            <span className="flex items-center">
              <span className="h-2 w-2 rounded-full bg-gray-300 mr-1"></span>
              {stats.draft || 0} brouillons
            </span>
            <span className="hidden sm:inline">•</span>
            <span className="flex items-center">
              <span className="h-2 w-2 rounded-full bg-blue-500 mr-1"></span>
              {stats.completed || 0} terminés
            </span>
          </div>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
        >
          <Plus className="h-4 w-4 mr-2" />
          Nouveau challenge
        </button>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <AlertCircle className="h-5 w-5 text-red-400" />
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">{error}</h3>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white shadow-sm rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Challenge
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Période
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Objectif
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Statut
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {challenges.map((challenge) => (
                <tr key={challenge.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <div className="h-10 w-10 rounded-lg bg-blue-50 flex items-center justify-center">
                          <Trophy className="h-5 w-5 text-blue-600" />
                        </div>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">
                          {challenge.title}
                        </div>
                        <div className="text-sm text-gray-500">
                          Niveau {challenge.level}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {format(new Date(challenge.start_date), 'dd MMM yyyy', { locale: fr })}
                    </div>
                    <div className="text-sm text-gray-500">
                      au {format(new Date(challenge.end_date), 'dd MMM yyyy', { locale: fr })}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {challenge.min_points} points
                    </div>
                    <div className="text-xs text-gray-500">
                      Soumissions: {challenge.submission_days.join(', ')}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      challenge.status === 'active'
                        ? 'bg-green-100 text-green-800'
                        : challenge.status === 'completed'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {challenge.status === 'active' ? 'En cours'
                        : challenge.status === 'completed' ? 'Terminé'
                        : 'Brouillon'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end space-x-3">
                      <button 
                        onClick={() => handleEdit(challenge)}
                        className="text-gray-400 hover:text-gray-500"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      {challenge.status === 'draft' && (
                        <button
                          onClick={() => handleStatusChange(challenge.id, 'active')}
                          className="text-green-600 hover:text-green-700"
                        >
                          Activer
                        </button>
                      )}
                      {challenge.status === 'active' && (
                        <button
                          onClick={() => handleStatusChange(challenge.id, 'completed')}
                          className="text-blue-600 hover:text-blue-700"
                        >
                          Terminer
                        </button>
                      )}
                      {challenge.status === 'completed' && (
                        <button className="text-gray-400 hover:text-gray-500">
                          <Archive className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showForm && (
        <ChallengeForm
          challenge={selectedChallenge}
          onClose={handleCloseForm}
          onSuccess={loadChallenges}
        />
      )}
    </div>
  );
}