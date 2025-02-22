import { Trophy, X } from 'lucide-react';

interface NextChallengeModalProps {
  level: number;
  onClose: () => void;
  onAccept: () => void;
}

export function NextChallengeModal({ level, onClose, onAccept }: NextChallengeModalProps) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <div className="bg-blue-50 p-2 rounded-lg">
                <Trophy className="h-6 w-6 text-blue-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-900">
                Félicitations !
              </h2>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-500"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="text-center mb-6">
            <p className="text-lg text-gray-600 mb-2">
              Vous avez complété le niveau {level - 1} avec succès !
            </p>
            <p className="text-gray-600">
              Êtes-vous prêt à relever le défi du niveau {level} ?
            </p>
          </div>

          <div className="flex justify-end space-x-3 pt-6 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-800"
            >
              Plus tard
            </button>
            <button
              type="button"
              onClick={onAccept}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm"
            >
              Commencer le niveau {level}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}