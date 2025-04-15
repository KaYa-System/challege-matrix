import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Calendar, CheckCircle, Clock, Target, Trophy, Users, X } from 'lucide-react';
import type { Database } from '../types/supabase';

type Challenge = Database['public']['Tables']['challenges']['Row'] & {
  submission_start: string;
  submission_end: string;
};

type Reward = Database['public']['Tables']['rewards']['Row'];

interface ChallengeDetailsModalProps {
  challenge: Challenge;
  rewards: Reward[];
  onClose: () => void;
}

export function ChallengeDetailsModal({ challenge, rewards, onClose }: ChallengeDetailsModalProps) {
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="flex items-center space-x-2 mb-2">
                <Calendar className="h-4 w-4 text-blue-600" />
                <h3 className="font-medium text-gray-900">Période</h3>
              </div>
              <p className="text-sm text-gray-600">
                Du {format(new Date(challenge.start_date), 'dd MMMM yyyy', { locale: fr })} au{' '}
                {format(new Date(challenge.end_date), 'dd MMMM yyyy', { locale: fr })}
              </p>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="flex items-center space-x-2 mb-2">
                <Clock className="h-4 w-4 text-blue-600" />
                <h3 className="font-medium text-gray-900">Fenêtre de soumission</h3>
              </div>
              <p className="text-sm text-gray-600">
                De {challenge.submission_start} à {challenge.submission_end}
              </p>
              <p className="text-sm text-gray-600 mt-1">
                Jours: {challenge.submission_days?.join(', ') || 'Tous les jours'}
              </p>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="flex items-center space-x-2 mb-2">
                <Target className="h-4 w-4 text-blue-600" />
                <h3 className="font-medium text-gray-900">Objectif</h3>
              </div>
              <p className="text-sm text-gray-600">
                {challenge.min_points} MX minimum pour compléter le challenge
              </p>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="flex items-center space-x-2 mb-2">
                <Users className="h-4 w-4 text-blue-600" />
                <h3 className="font-medium text-gray-900">Participation</h3>
              </div>
              <p className="text-sm text-gray-600">
                Ouvert à tous les utilisateurs de niveau {challenge.level}
              </p>
            </div>
          </div>

          {rewards.length > 0 && (
            <div>
              <h3 className="font-semibold text-gray-900 mb-3">Récompenses</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {rewards.map((reward) => (
                  <div
                    key={reward.id}
                    className="border border-gray-200 rounded-lg p-3 hover:shadow-md transition-shadow"
                  >
                    {reward.image_url && (
                      <img
                        src={reward.image_url}
                        alt={reward.title}
                        className="w-full h-32 object-cover rounded-lg mb-2"
                      />
                    )}
                    <h4 className="font-medium text-gray-900">{reward.title}</h4>
                    <p className="text-xs text-gray-500 mb-1">{reward.description}</p>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-xs font-medium text-blue-600">
                        {reward.type === 'product' ? 'Produit' : 'Badge'}
                      </span>
                      <span className="bg-blue-50 text-blue-700 text-xs px-2 py-1 rounded-full">
                        {reward.min_points} MX
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="pt-4 border-t flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Fermer
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}