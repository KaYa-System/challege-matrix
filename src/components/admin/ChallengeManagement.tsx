import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Plus, Edit2, Archive, Trophy, AlertCircle, CheckCircle, X } from 'lucide-react';
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
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<{
    challengeId: string;
    status: Challenge['status'];
    activeChallenge?: Challenge;
  } | null>(null);

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
      setSuccessMessage(null);
      
      // If we're deactivating a challenge (changing from active to draft)
      if (status === 'draft') {
        const targetChallenge = challenges.find(c => c.id === challengeId);
        if (targetChallenge && targetChallenge.status === 'active') {
          // Show confirmation for deactivation
          setConfirmAction({
            challengeId,
            status,
            activeChallenge: targetChallenge
          });
          return;
        }
      }
      
      // If we're activating a challenge, perform validations
      if (status === 'active') {
        // Check if there's already an active challenge
        const activeChallenge = challenges.find(c => c.status === 'active');
        
        if (activeChallenge) {
          // Show confirmation for already active challenge
          setConfirmAction({
            challengeId,
            status,
            activeChallenge
          });
          return;
        }
        
        // Get the challenge we're trying to activate
        const targetChallenge = challenges.find(c => c.id === challengeId);
        if (!targetChallenge) return;
        
        // Check if this is level 1 or if the previous level is completed
        if (targetChallenge.level > 1) {
          const previousLevelCompleted = challenges.some(c => 
            c.level === targetChallenge.level - 1 && c.status === 'completed'
          );
          
          if (!previousLevelCompleted) {
            setError(`Vous devez d'abord compléter le challenge de niveau ${targetChallenge.level - 1} avant d'activer celui-ci.`);
            return;
          }
        }
      }
      
      // If all validations pass, proceed with the update
      await updateChallengeStatus(challengeId, status);
    } catch (err) {
      console.error('Erreur lors de la mise à jour du statut:', err);
      setError('Erreur lors de la mise à jour du statut');
    }
  }

  async function updateChallengeStatus(challengeId: string, status: Challenge['status'], deactivateOthers = false) {
    try {
      // If requested, deactivate other active challenges first
      if (deactivateOthers && status === 'active') {
        const { error: deactivateError } = await supabase
          .from('challenges')
          .update({ status: 'draft' })
          .eq('status', 'active');
        
        if (deactivateError) throw deactivateError;
      }
      
      // Update the status of the selected challenge
      const { error } = await supabase
        .from('challenges')
        .update({ status })
        .eq('id', challengeId);
  
      if (error) throw error;
      await loadChallenges();
      // In the updateChallengeStatus function, update the success message section
      // Set success message based on the action
      if (status === 'active') {
        setSuccessMessage(deactivateOthers 
          ? 'Le challenge a été activé avec succès. Le challenge précédemment actif a été désactivé.' 
          : 'Le challenge a été activé avec succès.');
      } else if (status === 'completed') {
        setSuccessMessage('Le challenge a été marqué comme terminé avec succès.');
      } else if (status === 'draft' && challenges.find(c => c.id === challengeId)?.status === 'active') {
        setSuccessMessage('Le challenge a été désactivé avec succès.');
      } else {
        setSuccessMessage('Le statut du challenge a été mis à jour avec succès.');
      }
      
      // Clear success message after 5 seconds
      setTimeout(() => setSuccessMessage(null), 5000);
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
          <h2 className="text-xl font-bold text-gray-900">
            Gestion des challenges
          </h2>
          <div className="mt-2 flex flex-wrap items-center gap-4 text-sm text-gray-500">
            <div className="flex items-center gap-2 px-3 py-1 bg-gray-50 rounded-full">
              <span className="h-2.5 w-2.5 rounded-full bg-green-500"></span>
              <span>{stats.active || 0} actifs</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1 bg-gray-50 rounded-full">
              <span className="h-2.5 w-2.5 rounded-full bg-gray-300"></span>
              <span>{stats.draft || 0} brouillons</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1 bg-gray-50 rounded-full">
              <span className="h-2.5 w-2.5 rounded-full bg-blue-500"></span>
              <span>{stats.completed || 0} terminés</span>
            </div>
          </div>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 transition-colors duration-200"
        >
          <Plus className="h-4 w-4 mr-2" />
          Nouveau challenge
        </button>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 p-4 border border-red-100 animate-fadeIn">
          <div className="flex">
            <div className="flex-shrink-0">
              <AlertCircle className="h-5 w-5 text-red-400" />
            </div>
            <div className="ml-3 flex-1">
              <h3 className="text-sm font-medium text-red-800">{error}</h3>
            </div>
            <button 
              onClick={() => setError(null)}
              className="text-red-500 hover:text-red-600"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}

      {successMessage && (
        <div className="rounded-md bg-green-50 p-4 border border-green-100 animate-fadeIn">
          <div className="flex">
            <div className="flex-shrink-0">
              <CheckCircle className="h-5 w-5 text-green-500" />
            </div>
            <div className="ml-3 flex-1">
              <h3 className="text-sm font-medium text-green-800">{successMessage}</h3>
            </div>
            <button 
              onClick={() => setSuccessMessage(null)}
              className="text-green-500 hover:text-green-600"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}

      <div className="bg-white shadow rounded-lg overflow-hidden border border-gray-100">
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
              {challenges.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center text-gray-500">
                    Aucun challenge trouvé. Créez votre premier challenge !
                  </td>
                </tr>
              ) : (
                challenges.map((challenge) => (
                  <tr key={challenge.id} className="hover:bg-gray-50 transition-colors duration-150">
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
                      <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${
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
                          className="text-gray-400 hover:text-gray-600 transition-colors duration-150"
                          title="Modifier"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        {challenge.status === 'draft' && (
                          <button
                            onClick={() => handleStatusChange(challenge.id, 'active')}
                            className="text-green-600 hover:text-green-700 transition-colors duration-150 px-2 py-1 rounded hover:bg-green-50"
                            title="Activer le challenge"
                          >
                            Activer
                          </button>
                        )}
                        {challenge.status === 'active' && (
                          <>
                            <button
                              onClick={() => handleStatusChange(challenge.id, 'completed')}
                              className="text-blue-600 hover:text-blue-700 transition-colors duration-150 px-2 py-1 rounded hover:bg-blue-50"
                              title="Marquer comme terminé"
                            >
                              Terminer
                            </button>
                            <button
                              onClick={() => handleStatusChange(challenge.id, 'draft')}
                              className="text-amber-600 hover:text-amber-700 transition-colors duration-150 px-2 py-1 rounded hover:bg-amber-50 ml-2"
                              title="Désactiver le challenge"
                            >
                              Désactiver
                            </button>
                          </>
                        )}
                        {challenge.status === 'completed' && (
                          <button 
                            className="text-gray-400 hover:text-gray-600 transition-colors duration-150"
                            title="Archiver"
                          >
                            <Archive className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
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

      {confirmAction && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">
                Un seul challenge actif à la fois
              </h3>
              <button 
                onClick={() => setConfirmAction(null)}
                className="text-gray-400 hover:text-gray-500"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="p-4 mb-4 bg-amber-50 border border-amber-100 rounded-lg">
              <p className="text-sm text-amber-800 mb-2">
                <strong>Attention :</strong> Le challenge "{confirmAction.activeChallenge?.title}" est déjà actif.
              </p>
              <p className="text-sm text-amber-700">
                Un seul challenge peut être actif à la fois. Si vous continuez, le challenge actuel sera désactivé.
              </p>
            </div>
            
            <div className="flex justify-end space-x-3 pt-2">
              <button
                onClick={() => setConfirmAction(null)}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-800 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors duration-150"
              >
                Annuler
              </button>
              <button
                onClick={() => {
                  updateChallengeStatus(confirmAction.challengeId, confirmAction.status, true);
                  setConfirmAction(null);
                }}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md shadow-sm transition-colors duration-150"
              >
                Confirmer le changement
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}