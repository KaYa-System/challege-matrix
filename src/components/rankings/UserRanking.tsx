import { useEffect, useState } from 'react';
import { Medal, Crown } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { cn } from '../../utils/cn';
import type { Office } from '../../types';

interface UserRankingData {
  id: string;
  full_name: string;
  office: Office;
  current_points: number;
  rank: number;
}

const officeLabels: Record<Office, string> = {
  'yop-canaris': 'Bureau Yop Canaris',
  'cocody-insacc': 'Bureau Cocody Insacc',
  'annani': 'Bureau Annani',
  'attingier': 'Bureau Attingier',
};

export function UserRanking() {
  const [users, setUsers] = useState<UserRankingData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadUserRankings() {
      try {
        const { data, error } = await supabase
          .from('challenge_participants')
          .select(`
            current_points,
            users!inner (
              id,
              full_name,
              office
            )
          `)
          .order('current_points', { ascending: false })
          .limit(10);

        if (error) throw error;

        const rankings = data.map((entry, index) => ({
          id: entry.users.id,
          full_name: entry.users.full_name,
          office: entry.users.office as Office,
          current_points: entry.current_points,
          rank: index + 1,
        }));

        setUsers(rankings);
      } catch (err) {
        console.error('Erreur lors du chargement du classement:', err);
      } finally {
        setLoading(false);
      }
    }

    loadUserRankings();
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
        <div className="bg-purple-50 p-2 rounded-lg">
          <Medal className="h-5 w-5 text-purple-600" />
        </div>
        <h2 className="text-lg font-bold text-gray-900">
          Top 10 Participants
        </h2>
      </div>

      <div className="space-y-4">
        {users.map((user) => (
          <div
            key={user.id}
            className="relative bg-gradient-to-r from-gray-50 to-transparent rounded-lg p-4"
          >
            {user.rank === 1 && (
              <div className="absolute -top-2 -right-2">
                <Crown className="h-5 w-5 text-yellow-500" />
              </div>
            )}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <span className={cn(
                  "flex items-center justify-center w-6 h-6 rounded-full text-sm font-medium",
                  user.rank === 1 && "bg-yellow-100 text-yellow-700",
                  user.rank === 2 && "bg-gray-100 text-gray-700",
                  user.rank === 3 && "bg-amber-100 text-amber-700",
                  user.rank > 3 && "bg-purple-50 text-purple-700"
                )}>
                  {user.rank}
                </span>
                <div>
                  <h3 className="font-medium text-gray-900">
                    {user.full_name}
                  </h3>
                  <p className="text-sm text-gray-600">
                    {officeLabels[user.office]}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold text-gray-900">
                  {user.current_points} pts
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}