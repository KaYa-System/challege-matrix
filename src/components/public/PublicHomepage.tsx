import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trophy, Users, Target, ArrowRight, Building2, Medal, Calendar, Crown } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { supabase } from '../../lib/supabase';
import type { Database } from '../../types/supabase';
import type { Office } from '../../types';
import { cn } from '../../utils/cn';

type Challenge = Database['public']['Tables']['challenges']['Row'];

interface OfficeStats {
  office: Office;
  total_points: number;
  participants_count: number;
  average_points: number;
}

interface UserRanking {
  full_name: string;
  office: Office;
  current_points: number;
}

const officeLabels: Record<Office, string> = {
  'yop-canaris': 'Bureau Yop Canaris',
  'cocody-insacc': 'Bureau Cocody Insacc',
  'annani': 'Bureau Annani',
  'attingier': 'Bureau Attingier',
};

export function PublicHomepage() {
  const navigate = useNavigate();
  const [activeChallenge, setActiveChallenge] = useState<Challenge | null>(null);
  const [officeStats, setOfficeStats] = useState<OfficeStats[]>([]);
  const [topUsers, setTopUsers] = useState<UserRanking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        // Charger le challenge actif
        const { data: challengeData } = await supabase
          .from('challenges')
          .select('*')
          .eq('status', 'active')
          .order('level', { ascending: true })
          .maybeSingle();

        setActiveChallenge(challengeData);

        // Charger les statistiques des bureaux
        const { data: participantsData, error: statsError } = await supabase
          .from('challenge_participants')
          .select(`
            current_points,
            users!inner (
              office
            )
          `);

        if (statsError) throw statsError;

        // Agréger les statistiques par bureau
        const officeStatsMap = participantsData.reduce((acc, entry) => {
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

        const sortedStats = Object.values(officeStatsMap)
          .map(stat => ({
            ...stat,
            average_points: Math.round(stat.total_points / stat.participants_count),
          }))
          .sort((a, b) => b.total_points - a.total_points);

        setOfficeStats(sortedStats);

        // Charger le top 10 des participants
        const { data: rankingsData, error: rankingsError } = await supabase
          .from('challenge_participants')
          .select(`
            current_points,
            users!inner (
              full_name,
              office
            )
          `)
          .order('current_points', { ascending: false })
          .limit(10);

        if (rankingsError) throw rankingsError;

        setTopUsers(rankingsData.map(entry => ({
          full_name: entry.users.full_name,
          office: entry.users.office as Office,
          current_points: entry.current_points,
        })));

      } catch (err) {
        console.error('Erreur lors du chargement des données:', err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  const handleParticipateClick = (e: React.MouseEvent) => {
    e.preventDefault();
    navigate('/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* En-tête */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="md:flex md:items-center md:justify-between">
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:truncate">
                Challenge Matrix
              </h1>
              <p className="mt-1 text-sm text-gray-500">
                Relevez le défi et développez votre réseau Longrich
              </p>
            </div>
            <div className="mt-4 flex md:mt-0 md:ml-4">
              <button
                onClick={handleParticipateClick}
                className="group relative inline-flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-lg text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-150"
              >
                <Trophy className="w-5 h-5 mr-2 animate-pulse" />
                <span>Participer au challenge</span>
                <span className="absolute right-2 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all duration-200">
                  <ArrowRight className="w-5 h-5" />
                </span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        {/* Challenge actif */}
        {activeChallenge ? (
          <div className="bg-white rounded-xl shadow-sm overflow-hidden mb-12">
            <div className="px-6 py-8 sm:p-10">
              <div className="flex items-center space-x-4">
                <div className="flex-shrink-0">
                  <div className="bg-blue-50 rounded-lg p-3">
                    <Trophy className="h-8 w-8 text-blue-600" />
                  </div>
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">
                    {activeChallenge.title}
                  </h2>
                  <p className="mt-1 text-gray-500">
                    {activeChallenge.description}
                  </p>
                </div>
              </div>

              <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                <div className="bg-gray-50 rounded-lg p-6">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <Calendar className="h-6 w-6 text-gray-400" />
                    </div>
                    <div className="ml-4">
                      <h3 className="text-sm font-medium text-gray-900">Période</h3>
                      <p className="mt-1 text-sm text-gray-500">
                        Du {format(new Date(activeChallenge.start_date), 'dd MMMM', { locale: fr })} au{' '}
                        {format(new Date(activeChallenge.end_date), 'dd MMMM yyyy', { locale: fr })}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 rounded-lg p-6">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <Target className="h-6 w-6 text-gray-400" />
                    </div>
                    <div className="ml-4">
                      <h3 className="text-sm font-medium text-gray-900">Objectif</h3>
                      <p className="mt-1 text-sm text-gray-500">
                        Atteindre {activeChallenge.min_points} points MX Global
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 rounded-lg p-6">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <Users className="h-6 w-6 text-gray-400" />
                    </div>
                    <div className="ml-4">
                      <h3 className="text-sm font-medium text-gray-900">Participants</h3>
                      <p className="mt-1 text-sm text-gray-500">
                        {officeStats.reduce((acc, stat) => acc + stat.participants_count, 0)} participants actifs
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm overflow-hidden mb-12">
            <div className="px-6 py-8 sm:p-10 text-center">
              <div className="bg-blue-50 rounded-lg p-3 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                <Trophy className="h-8 w-8 text-blue-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Prochain challenge à venir
              </h2>
              <p className="text-gray-500">
                Le prochain challenge Matrix sera bientôt disponible. Inscrivez-vous dès maintenant pour être notifié de son lancement !
              </p>
            </div>
          </div>
        )}

        {/* Classements */}
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
          {/* Classement des bureaux */}
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="p-6">
              <div className="flex items-center space-x-3 mb-6">
                <div className="bg-amber-50 p-2 rounded-lg">
                  <Building2 className="h-5 w-5 text-amber-600" />
                </div>
                <h2 className="text-lg font-bold text-gray-900">
                  Classement des Bureaux
                </h2>
              </div>

              <div className="space-y-4">
                {officeStats.map((stat, index) => (
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
                          width: `${(stat.total_points / (officeStats[0]?.total_points || 1)) * 100}%`,
                        }}
                      />
                    </div>
                  </div>
                ))}

                {officeStats.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    Aucune donnée disponible
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Top 10 participants */}
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="p-6">
              <div className="flex items-center space-x-3 mb-6">
                <div className="bg-purple-50 p-2 rounded-lg">
                  <Medal className="h-5 w-5 text-purple-600" />
                </div>
                <h2 className="text-lg font-bold text-gray-900">
                  Top 10 Participants
                </h2>
              </div>

              <div className="space-y-4">
                {topUsers.map((user, index) => (
                  <div
                    key={index}
                    className="relative bg-gradient-to-r from-gray-50 to-transparent rounded-lg p-4"
                  >
                    {index === 0 && (
                      <div className="absolute -top-2 -right-2">
                        <Crown className="h-5 w-5 text-yellow-500" />
                      </div>
                    )}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <span className={cn(
                          "flex items-center justify-center w-6 h-6 rounded-full text-sm font-medium",
                          index === 0 && "bg-yellow-100 text-yellow-700",
                          index === 1 && "bg-gray-100 text-gray-700",
                          index === 2 && "bg-amber-100 text-amber-700",
                          index > 2 && "bg-purple-50 text-purple-700"
                        )}>
                          {index + 1}
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

                {topUsers.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    Aucun participant pour le moment
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}