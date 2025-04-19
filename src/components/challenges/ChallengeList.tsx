import { useEffect, useState } from 'react';
import { Trophy, Calendar, Target, ArrowRight, Clock, Gift, X } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { supabase } from '../../lib/supabase';
import type { Database } from '../../types/supabase';

type Challenge = Database['public']['Tables']['challenges']['Row'];
type Reward = Database['public']['Tables']['rewards']['Row'];

interface ChallengeDetailsProps {
  challenge: Challenge;
  rewards: Reward[];
  onClose: () => void;
}

function ChallengeDetails({ challenge, rewards, onClose }: ChallengeDetailsProps) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="bg-blue-50 p-2 rounded-lg">
                <Trophy className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">
                  {challenge.title}
                </h2>
                <p className="text-sm text-gray-500">
                  Niveau {challenge.level}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-500"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="prose prose-sm max-w-none text-gray-600">
            <p>{challenge.description}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center mb-2">
                <Calendar className="h-5 w-5 text-gray-400 mr-2" />
                <h3 className="text-sm font-medium text-gray-900">Période</h3>
              </div>
              <p className="text-sm text-gray-600">
                Du {format(new Date(challenge.start_date), 'dd MMMM yyyy', { locale: fr })}
                <br />
                au {format(new Date(challenge.end_date), 'dd MMMM yyyy', { locale: fr })}
              </p>
            </div>

            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center mb-2">
                <Clock className="h-5 w-5 text-gray-400 mr-2" />
                <h3 className="text-sm font-medium text-gray-900">Soumissions</h3>
              </div>
              <p className="text-sm text-gray-600">
                De {challenge.submission_start} à {challenge.submission_end}
                <br />
                {challenge.submission_days.join(', ')}
              </p>
            </div>

            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center mb-2">
                <Target className="h-5 w-5 text-gray-400 mr-2" />
                <h3 className="text-sm font-medium text-gray-900">Objectif</h3>
              </div>
              <p className="text-sm text-gray-600">
                {challenge.min_points} points MX Global
              </p>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              <Gift className="inline-block h-5 w-5 mr-2 text-gray-400" />
              Récompenses
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {rewards.map((reward) => (
                <div
                  key={reward.id}
                  className="bg-gray-50 rounded-lg p-4 space-y-2"
                >
                  {reward.image_url && (
                    <img
                      src={reward.image_url}
                      alt={reward.title}
                      className="w-full h-32 object-cover rounded-lg"
                    />
                  )}
                  <h4 className="font-medium text-gray-900">{reward.title}</h4>
                  <p className="text-sm text-gray-600">{reward.description}</p>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Points requis</span>
                    <span className="font-medium text-gray-900">
                      {reward.min_points}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function ChallengeList() {
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [selectedChallenge, setSelectedChallenge] = useState<Challenge | null>(null);
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadChallenges() {
      try {
        const { data, error } = await supabase
          .from('challenges')
          .select('*')
          .order('level', { ascending: true });

        if (error) throw error;
        setChallenges(data);
      } catch (err) {
        console.error('Erreur lors du chargement des challenges:', err);
      } finally {
        setLoading(false);
      }
    }

    loadChallenges();
  }, []);

  async function handleChallengeClick(challenge: Challenge) {
    try {
      const { data, error } = await supabase
        .from('rewards')
        .select('*')
        .eq('challenge_id', challenge.id)
        .order('min_points', { ascending: true });

      if (error) throw error;
      setRewards(data);
      setSelectedChallenge(challenge);
    } catch (err) {
      console.error('Erreur lors du chargement des récompenses:', err);
    }
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Challenges Matrix
          </h1>
          <div className="mt-1 flex items-center space-x-4 text-sm text-gray-500">
            <span>{stats.active || 0} actifs</span>
            <span>•</span>
            <span>{stats.draft || 0} à venir</span>
            <span>•</span>
            <span>{stats.completed || 0} terminés</span>
          </div>
        </div>
        <div className="flex items-center space-x-2 text-sm text-gray-500">
          <Calendar className="h-4 w-4" />
          <span>Mars 2024</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {
          challenges
              .filter((chal) => chal.status ==='active')
        .map((challenge) => (
          <div
            key={challenge.id}
            className="bg-white rounded-xl shadow-sm overflow-hidden group hover:shadow-md transition-shadow"
          >
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="bg-blue-50 p-2 rounded-lg">
                    <Trophy className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <h2 className="font-semibold text-gray-900">
                      {challenge.title}
                    </h2>
                    <p className="text-sm text-gray-500">
                      Niveau {challenge.level}
                    </p>
                  </div>
                </div>
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                  challenge.status === 'active'
                    ? 'bg-green-50 text-green-700'
                    : challenge.status === 'completed'
                    ? 'bg-blue-50 text-blue-700'
                    : 'bg-gray-50 text-gray-700'
                }`}>
                  {challenge.status === 'active' ? 'En cours'
                    : challenge.status === 'completed' ? 'Terminé'
                    : 'À venir'}
                </span>
              </div>

              <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                {challenge.description}
              </p>

              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Période</span>
                  <span className="font-medium text-gray-900">
                    {format(new Date(challenge.start_date), 'dd MMM', { locale: fr })} - {format(new Date(challenge.end_date), 'dd MMM yyyy', { locale: fr })}
                  </span>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Objectif</span>
                  <div className="flex items-center space-x-1">
                    <Target className="h-4 w-4 text-gray-400" />
                    <span className="font-medium text-gray-900">
                      {challenge.min_points} points
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="px-6 py-4 bg-gray-50 group-hover:bg-gray-100 transition-colors">
              <button
                onClick={() => handleChallengeClick(challenge)}
                className="w-full flex items-center justify-center space-x-2 text-sm font-medium text-blue-600 hover:text-blue-700"
              >
                <span>Voir les détails</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {selectedChallenge && (
        <ChallengeDetails
          challenge={selectedChallenge}
          rewards={rewards}
          onClose={() => setSelectedChallenge(null)}
        />
      )}
    </div>
  );
}