import { X } from 'lucide-react';
import type { Database } from '../types/supabase';

type Reward = Database['public']['Tables']['rewards']['Row'];

interface RewardDetailsModalProps {
  reward: Reward;
  isUnlocked: boolean;
  onClose: () => void;
}

export function RewardDetailsModal({ reward, isUnlocked, onClose }: RewardDetailsModalProps) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
        <div className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900">
              {reward.title}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-500"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {reward.image_url && (
            <div className="relative rounded-lg overflow-hidden">
              <img 
                src={reward.image_url} 
                alt={reward.title} 
                className="w-full h-48 object-cover"
              />
              {isUnlocked && (
                <div className="absolute top-2 right-2 bg-green-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                  Débloqué
                </div>
              )}
            </div>
          )}

          <div className="prose prose-sm max-w-none text-gray-600">
            <p>{reward.description}</p>
          </div>

          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm font-medium text-gray-900">Points requis</p>
                <p className="text-2xl font-bold text-blue-600">{reward.min_points} MX</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">Type</p>
                <p className="text-sm text-gray-600">
                  {reward.type === 'product' ? 'Produit' : 'Badge'}
                </p>
              </div>
            </div>
          </div>

          {isUnlocked ? (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-green-800 text-sm font-medium">
                Félicitations ! Vous avez débloqué cette récompense.
              </p>
              <p className="text-green-700 text-xs mt-1">
                Contactez l'administrateur pour récupérer votre récompense.
              </p>
            </div>
          ) : (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-blue-800 text-sm font-medium">
                Continuez à accumuler des points pour débloquer cette récompense !
              </p>
            </div>
          )}

          <div className="pt-2 flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
            >
              Fermer
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}