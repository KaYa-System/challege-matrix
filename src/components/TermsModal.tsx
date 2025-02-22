import { useState } from 'react';
import { X } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface TermsModalProps {
  onClose: () => void;
  onAccept: () => void;
}

export function TermsModal({ onClose, onAccept }: TermsModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleAccept() {
    try {
      setLoading(true);
      setError(null);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Utilisateur non connecté');

      // Mettre à jour directement la table users
      const { error: updateError } = await supabase
        .from('users')
        .update({
          terms_accepted: true,
          terms_accepted_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (updateError) throw updateError;

      onAccept();
    } catch (err) {
      console.error('Erreur lors de l\'acceptation des termes:', err);
      setError(
        err instanceof Error
          ? err.message
          : 'Une erreur est survenue lors de l\'acceptation des termes'
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900">
              Conditions de participation
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-500"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="prose prose-sm max-w-none text-gray-600 mb-6">
            <p>
              En participant au Challenge Matrix, vous acceptez les conditions suivantes :
            </p>
            <ul>
              <li>Respecter les règles de soumission des résultats</li>
              <li>Fournir des captures d'écran authentiques de vos résultats</li>
              <li>Participer de manière éthique et respectueuse</li>
              <li>Accepter les décisions de validation des administrateurs</li>
            </ul>
            <p>
              Le non-respect de ces conditions peut entraîner la disqualification du challenge.
            </p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          <div className="flex justify-end space-x-3 pt-6 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-800"
              disabled={loading}
            >
              Annuler
            </button>
            <button
              type="button"
              onClick={handleAccept}
              disabled={loading}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm disabled:opacity-50"
            >
              {loading ? 'Acceptation...' : 'J\'accepte les conditions'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}