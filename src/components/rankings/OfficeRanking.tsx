import { useEffect, useState } from 'react';
import { Trophy, Building2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { Office } from '../../types';

interface OfficeStats {
  office: Office;
  total_points: number;
  participants_count: number;
  average_points: number;
}

const officeLabels: Record<Office, string> = {
  'yop-canaris': 'Bureau Yop Canaris',
  'cocody-insacc': 'Bureau Cocody Insacc',
  'annani': 'Bureau Annani',
  'attingier': 'Bureau Attingier',
};

export function OfficeRanking() {
  const [stats, setStats] = useState<OfficeStats[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadOfficeStats() {
      try {
        const { data, error } = await supabase
          .from('challenge_participants')
          .select(`
            current_points,
            users!inner (
              office
            )
          `);

        if (error) throw error;

        // Agréger les statistiques par bureau
        const officeStats = data.reduce((acc, entry) => {
          const office = entry.users.office as Office;
          if (!acc[office]) {
            acc[office] = {
              office,
              total_points: 0,
              participants_count: 0,
              average_points: 0,
            };
          }
          acc[office].total_points += entry.current_points;
          acc[office].participants_count += 1;
          return acc;
        }, {} as Record<string, OfficeStats>);

        // Calculer les moyennes et trier par points totaux
        const sortedStats = Object.values(officeStats)
          .map(stat => ({
            ...stat,
            average_points: Math.round(stat.total_points / stat.participants_count),
          }))
          .sort((a, b) => b.total_points - a.total_points);

        setStats(sortedStats);
      } catch (err) {
        console.error('Erreur lors du chargement des statistiques:', err);
      } finally {
        setLoading(false);
      }
    }

    loadOfficeStats();
  }, []);

  if (loading) {
    return (
      <div className="min-h-[200px] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      <div className="flex items-center space-x-3 mb-6">
        <div className="bg-amber-50 p-2 rounded-lg">
          <Building2 className="h-5 w-5 text-amber-600" />
        </div>
        <h2 className="text-lg font-bold text-gray-900">
          Classement des Bureaux
        </h2>
      </div>

      <div className="space-y-4">
        {stats.map((stat, index) => (
          <div
            key={stat.office}
            className="relative bg-gradient-to-r from-gray-50 to-transparent rounded-lg p-4"
          >
            {index === 0 && (
              <div className="absolute -top-2 -right-2">
                <Trophy className="h-5 w-5 text-amber-500" />
              </div>
            )}
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium text-gray-900">
                  {officeLabels[stat.office]}
                </h3>
                <p className="text-sm text-gray-600">
                  {stat.participants_count} participant{stat.participants_count > 1 ? 's' : ''}
                </p>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold text-gray-900">
                  {stat.total_points} pts
                </p>
                <p className="text-sm text-gray-600">
                  moy. {stat.average_points} pts
                </p>
              </div>
            </div>
            <div className="mt-2 bg-gray-200 rounded-full h-1.5">
              <div
                className="bg-amber-500 h-1.5 rounded-full transition-all duration-300"
                style={{
                  width: `${(stat.total_points / stats[0].total_points) * 100}%`,
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}