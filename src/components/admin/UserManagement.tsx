import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Shield, ShieldOff, AlertCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { Database } from '../../types/supabase';

type User = Database['public']['Tables']['users']['Row'];

const officeLabels: Record<string, string> = {
  'yop-canaris': 'Bureau Yop Canaris',
  'cocody-insacc': 'Bureau Cocody Insacc',
  'annani': 'Bureau Annani',
  'attingier': 'Bureau Attingier',
};

export function UserManagement() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadUsers();
  }, []);

  async function loadUsers() {
    try {
      setError(null);
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUsers(data || []);
    } catch (err) {
      console.error('Erreur lors du chargement des utilisateurs:', err);
      setError('Erreur lors du chargement des utilisateurs');
    } finally {
      setLoading(false);
    }
  }

  async function handleRoleChange(userId: string, role: 'user' | 'admin') {
    try {
      setError(null);
      const { error } = await supabase
        .from('users')
        .update({ role })
        .eq('id', userId);

      if (error) throw error;
      await loadUsers();
    } catch (err) {
      console.error('Erreur lors de la mise à jour du rôle:', err);
      setError('Erreur lors de la mise à jour du rôle');
    }
  }

  // Statistiques des utilisateurs par rôle
  const stats = users.reduce((acc, user) => {
    acc[user.role] = (acc[user.role] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Statistiques des utilisateurs par bureau
  const officeStats = users.reduce((acc, user) => {
    acc[user.office] = (acc[user.office] || 0) + 1;
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
      <div>
        <h2 className="text-lg font-medium text-gray-900">
          Gestion des utilisateurs ({users.length})
        </h2>
        <div className="mt-1 flex flex-wrap items-center gap-4 text-sm text-gray-500">
          <span className="flex items-center">
            <span className="h-2 w-2 rounded-full bg-gray-400 mr-1"></span>
            {stats.user || 0} utilisateurs
          </span>
          <span className="hidden sm:inline">•</span>
          <span className="flex items-center">
            <span className="h-2 w-2 rounded-full bg-purple-500 mr-1"></span>
            {stats.admin || 0} administrateurs
          </span>
        </div>
        <div className="mt-2 flex flex-wrap gap-4 text-sm text-gray-500">
          {Object.entries(officeLabels).map(([key, label]) => (
            <span key={key} className="flex items-center">
              <span className="h-2 w-2 rounded-full bg-blue-400 mr-1"></span>
              {label}: {officeStats[key] || 0}
            </span>
          ))}
        </div>
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
                  Utilisateur
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Bureau
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Code Longrich
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Inscription
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Rôle
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {user.full_name}
                        </div>
                        <div className="text-sm text-gray-500">
                          {user.email}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {officeLabels[user.office]}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {user.longrich_code}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {format(new Date(user.created_at), 'dd MMM yyyy', { locale: fr })}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      user.role === 'admin'
                        ? 'bg-purple-100 text-purple-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {user.role === 'admin' ? 'Administrateur' : 'Utilisateur'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    {user.role === 'user' ? (
                      <button
                        onClick={() => handleRoleChange(user.id, 'admin')}
                        className="inline-flex items-center text-purple-600 hover:text-purple-900"
                      >
                        <Shield className="h-4 w-4 mr-1" />
                        <span className="hidden sm:inline">Promouvoir</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => handleRoleChange(user.id, 'user')}
                        className="inline-flex items-center text-gray-600 hover:text-gray-900"
                      >
                        <ShieldOff className="h-4 w-4 mr-1" />
                        <span className="hidden sm:inline">Rétrograder</span>
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}