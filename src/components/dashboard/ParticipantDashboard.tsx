import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Trophy, Target, Clock, ChevronRight, AlertCircle, Plus, ArrowRight, Calendar, CheckCircle, AlertTriangle } from 'lucide-react';
import Countdown from 'react-countdown';
import { supabase } from '../../lib/supabase';
import { OfficeRanking } from '../rankings/OfficeRanking';
import { UserRanking } from '../rankings/UserRanking';
import { MatrixFormModal } from '../MatrixFormModal';
import { NextChallengeModal } from '../NextChallengeModal';
import type { Database } from '../../types/supabase';
import { TermsModal } from "../TermsModal.tsx";

type Challenge = Database['public']['Tables']['challenges']['Row'] & {
  submission_start: string;
  submission_end: string;
};
type Reward = Database['public']['Tables']['rewards']['Row'];
type ChallengeParticipant = Database['public']['Tables']['challenge_participants']['Row'];

export function ParticipantDashboard() {
  const [activeChallenge, setActiveChallenge] = useState<Challenge | null>(null);
  const [nextChallenge, setNextChallenge] = useState<Challenge | null>(null);
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [participation, setParticipation] = useState<ChallengeParticipant | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showMatrixForm, setShowMatrixForm] = useState(false);
  const [showNextChallengeModal, setShowNextChallengeModal] = useState(false);
  const [transitioning, setTransitioning] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [, setTermsAccepted] = useState(false);
  const [countdownTarget, setCountdownTarget] = useState<Date | null>(null);
  const [isSubmissionWindowOpen, setIsSubmissionWindowOpen] = useState(false);
  const [challengeStatus, setChallengeStatus] = useState<'not_started' | 'active' | 'ended' | null>(null);
  const [countdownType, setCountdownType] = useState<'to_start' | 'to_end' | 'to_submission'>('to_submission');

  useEffect(() => {
    loadDashboardData();
  }, []);

  useEffect(() => {
    if (!activeChallenge) return;

    const updateStatus = () => {
      const now = new Date();
      const startDate = new Date(activeChallenge.start_date);
      const endDate = new Date(activeChallenge.end_date);

      // Définir le statut du challenge (pas encore commencé, actif, terminé)
      if (now < startDate) {
        setChallengeStatus('not_started');
        setCountdownType('to_start');
        setCountdownTarget(startDate);
      } else if (now > endDate) {
        setChallengeStatus('ended');
        setCountdownType('to_end');
        setCountdownTarget(null);
      } else {
        setChallengeStatus('active');

        // Vérifier si la fenêtre de soumission est ouverte
        const submissionStart = new Date();
        submissionStart.setHours(
            parseInt(activeChallenge.submission_start.split(':')[0], 10),
            parseInt(activeChallenge.submission_start.split(':')[1], 10),
            0
        );

        const submissionEnd = new Date();
        submissionEnd.setHours(
            parseInt(activeChallenge.submission_end.split(':')[0], 10),
            parseInt(activeChallenge.submission_end.split(':')[1], 10),
            0
        );

        if (now > submissionEnd) {
          submissionStart.setDate(submissionStart.getDate() + 1);
          submissionEnd.setDate(submissionEnd.getDate() + 1);
        }

        const isOpen = now >= submissionStart && now <= submissionEnd;
        setIsSubmissionWindowOpen(isOpen);

        if (isOpen) {
          setCountdownType('to_end');
          setCountdownTarget(submissionEnd);
        } else {
          setCountdownType('to_submission');
          setCountdownTarget(submissionStart);
        }
      }
    };

    updateStatus();
    const interval = setInterval(updateStatus, 1000);
    return () => clearInterval(interval);
  }, [activeChallenge]);

  async function loadDashboardData() {
    try {
      setLoading(true);
      setError(null);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Utilisateur non connecté');

      const { data: userData, error: userError } = await supabase
          .from('users')
          .select('terms_accepted, current_level')
          .eq('id', user.id)
          .single();

      if (userError) throw userError;
      setTermsAccepted(userData.terms_accepted || false);

      const { data: challengeData, error: challengeError } = await supabase
          .from('challenges')
          .select('*, submission_start, submission_end')
          .eq('status', 'active')
          .eq('level', userData.current_level)
          .maybeSingle();

      if (challengeError && challengeError.code !== 'PGRST116') throw challengeError;
      setActiveChallenge(challengeData);

      if (challengeData) {
        const { data: rewardsData, error: rewardsError } = await supabase
            .from('rewards')
            .select('*')
            .eq('challenge_id', challengeData.id)
            .order('min_points', { ascending: true });

        if (rewardsError) throw rewardsError;
        setRewards(rewardsData);

        const { data: participationData, error: participationError } = await supabase
            .from('challenge_participants')
            .select('*')
            .eq('user_id', user.id)
            .eq('challenge_id', challengeData.id)
            .maybeSingle();

        if (participationError) throw participationError;
        setParticipation(participationData);

        if (participationData?.status === 'completed') {
          const nextLevel = userData.current_level + 1;
          const { data: nextChallengeData, error: nextChallengeError } = await supabase
              .from('challenges')
              .select('*')
              .eq('status', 'active')
              .eq('level', nextLevel)
              .single();

          if (nextChallengeError) {
            console.error('Erreur lors du chargement du prochain challenge:', nextChallengeError);
          } else {
            setNextChallenge(nextChallengeData);
          }
        }
      }
    } catch (err) {
      console.error('Erreur lors du chargement des données:', err);
      setError(
          err instanceof Error
              ? err.message
              : 'Une erreur est survenue lors du chargement des données'
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleNextChallenge() {
    if (!nextChallenge || transitioning || !activeChallenge?.level) return;

    try {
      setTransitioning(true);
      setError(null);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Utilisateur non connecté');

      if (nextChallenge.level !== activeChallenge.level + 1) {
        throw new Error('Le niveau doit être exactement le niveau suivant');
      }

      const { error: updateCurrentError } = await supabase
          .from('challenges')
          .update({ status: 'completed' })
          .eq('id', activeChallenge.id);

      if (updateCurrentError) throw updateCurrentError;

      const { error: updateUserError } = await supabase
          .from('users')
          .update({
            current_level: nextChallenge.level,
            terms_accepted: true,
            terms_accepted_at: new Date().toISOString()
          })
          .eq('id', user.id);

      if (updateUserError) throw updateUserError;

      await new Promise(resolve => setTimeout(resolve, 1000));
      await loadDashboardData();
      setShowNextChallengeModal(false);
    } catch (err) {
      console.error('Erreur lors du passage au prochain challenge:', err);
      setError(
          err instanceof Error
              ? err.message
              : 'Une erreur est survenue lors du passage au prochain challenge'
      );
    } finally {
      setTransitioning(false);
    }
  }

  if (loading) {
    return (
        <div className="min-h-[400px] flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
    );
  }

  if (error) {
    return (
        <div className="min-h-[400px] flex items-center justify-center">
          <div className="text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <p className="text-gray-600">{error}</p>
          </div>
        </div>
    );
  }

  if (!activeChallenge && nextChallenge) {
    return (
        <div className="min-h-[400px] flex items-center justify-center">
          <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full text-center">
            <Trophy className="h-12 w-12 text-blue-600 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Prêt pour le prochain niveau ?
            </h2>
            <p className="text-gray-600 mb-6">
              Le niveau {nextChallenge.level} vous attend ! Cliquez sur le bouton ci-dessous pour commencer.
            </p>
            <button
                onClick={handleNextChallenge}
                disabled={transitioning}
                className="w-full inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition-colors disabled:opacity-50"
            >
              {transitioning ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Démarrage...
                  </>
              ) : (
                  <>
                    <ArrowRight className="h-4 w-4 mr-2" />
                    Commencer le niveau {nextChallenge.level}
                  </>
              )}
            </button>
          </div>
        </div>
    );
  }

  if (!activeChallenge) {
    return (
        <div className="min-h-[400px] flex items-center justify-center">
          <div className="text-center">
            <AlertCircle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
            <p className="text-gray-600">Aucun challenge n'est actuellement disponible</p>
          </div>
        </div>
    );
  }

  const showNextChallengeButton =
      nextChallenge &&
      participation?.status === 'completed' &&
      !transitioning;

  const submitButtonDisabled = showNextChallengeButton ||
      !isSubmissionWindowOpen ||
      challengeStatus === 'not_started' ||
      challengeStatus === 'ended';

  // Obtenir la couleur de bordure et la bannière en fonction du statut
  let statusBorderColor = "border-blue-200";
  let statusBanner = null;

  if (challengeStatus === 'not_started') {
    statusBorderColor = "border-yellow-200";
    statusBanner = (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4 rounded-lg">
          <div className="flex items-center">
            <Calendar className="h-5 w-5 text-yellow-500 mr-2" />
            <p className="text-yellow-700 font-medium">
              Ce challenge n'a pas encore commencé. Il débutera le{' '}
              <span className="font-bold">
              {format(new Date(activeChallenge.start_date), 'dd MMMM yyyy', { locale: fr })}
            </span>
            </p>
          </div>
          {countdownTarget && (
              <div className="mt-2 pl-7">
                <span className="text-yellow-600 font-medium">Temps restant : </span>
                <Countdown
                    date={countdownTarget}
                    renderer={({ days, hours, minutes, seconds }) => (
                        <span className="text-yellow-800 font-bold">
                  {days}j {hours}h {minutes}m {seconds}s
                </span>
                    )}
                />
              </div>
          )}
        </div>
    );
  } else if (challengeStatus === 'ended') {
    statusBorderColor = "border-gray-200";
    statusBanner = (
        <div className="bg-gray-50 border-l-4 border-gray-400 p-4 mb-4 rounded-lg">
          <div className="flex items-center">
            <CheckCircle className="h-5 w-5 text-gray-500 mr-2" />
            <p className="text-gray-700 font-medium">
              Ce challenge est terminé depuis le{' '}
              <span className="font-bold">
              {format(new Date(activeChallenge.end_date), 'dd MMMM yyyy', { locale: fr })}
            </span>
            </p>
          </div>
        </div>
    );
  } else if (challengeStatus === 'active' && !isSubmissionWindowOpen) {
    statusBanner = (
        <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-4 rounded-lg">
          <div className="flex items-center">
            <AlertTriangle className="h-5 w-5 text-blue-500 mr-2" />
            <p className="text-blue-700 font-medium">
              La fenêtre de soumission est actuellement fermée. Prochaine fenêtre à{' '}
              {countdownTarget && format(countdownTarget, 'HH:mm', { locale: fr })}
            </p>
          </div>
          {countdownTarget && (
              <div className="mt-2 pl-7">
                <span className="text-blue-600 font-medium">Temps restant : </span>
                <Countdown
                    date={countdownTarget}
                    renderer={({ days, hours, minutes, seconds }) => (
                        <span className="text-blue-800 font-bold">
                  {days}j {hours}h {minutes}m {seconds}s
                </span>
                    )}
                />
              </div>
          )}
        </div>
    );
  }

  return (
      <div className="space-y-6">
        {statusBanner}

        <div className={`bg-white rounded-xl shadow-sm p-6 border-2 ${statusBorderColor} transition-colors duration-300`}>
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                {activeChallenge.title}
              </h2>
              <p className="mt-1 text-gray-600">
                {activeChallenge.description}
              </p>
            </div>
            <div className="flex items-center space-x-1 bg-blue-50 text-blue-700 px-3 py-1 rounded-full">
              <Trophy className="h-4 w-4" />
              <span className="text-sm font-medium">Niveau {activeChallenge.level}</span>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium text-gray-900">Progression</h3>
                <Target className="h-5 w-5 text-blue-600" />
              </div>
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-2xl font-bold text-gray-900">
                    {participation?.current_points || 0}
                  </p>
                  <p className="text-sm text-gray-600">
                    points accumulés
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900">
                    Objectif: {activeChallenge.min_points}
                  </p>
                  <p className="text-xs text-gray-600">
                    points requis
                  </p>
                </div>
              </div>
              <div className="mt-3 bg-white rounded-full h-2">
                <div
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{
                      width: `${Math.min(
                          ((participation?.current_points || 0) / activeChallenge.min_points) * 100,
                          100
                      )}%`,
                    }}
                />
              </div>
            </div>

            <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium text-gray-900">Période</h3>
                <Clock className="h-5 w-5 text-emerald-600" />
              </div>
              <p className="text-sm text-gray-600">
                Du{' '}
                <span className="font-medium">
                {format(new Date(activeChallenge.start_date), 'dd MMMM yyyy', { locale: fr })}
              </span>
                {' '}au{' '}
                <span className="font-medium">
                {format(new Date(activeChallenge.end_date), 'dd MMMM yyyy', { locale: fr })}
              </span>
              </p>
              <div className="mt-2">
                <p className="text-xs text-gray-600">
                  {countdownType === 'to_start' && 'Début du challenge dans :'}
                  {countdownType === 'to_end' && isSubmissionWindowOpen && 'Fin de soumission dans :'}
                  {countdownType === 'to_submission' && 'Prochaine soumission dans :'}
                </p>
                {countdownTarget && (
                    <Countdown
                        date={countdownTarget}
                        renderer={({ days, hours, minutes, seconds }) => (
                            <p className="text-lg font-bold text-gray-900">
                              {days}j {hours}h {minutes}m {seconds}s
                            </p>
                        )}
                    />
                )}
              </div>
            </div>

            <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium text-gray-900">Statut</h3>
                <div className={`h-2 w-2 rounded-full ${
                    participation?.status === 'completed'
                        ? 'bg-green-500'
                        : participation?.status === 'failed'
                            ? 'bg-red-500'
                            : challengeStatus === 'not_started'
                                ? 'bg-yellow-500'
                                : challengeStatus === 'ended'
                                    ? 'bg-gray-500'
                                    : 'bg-blue-500'
                }`}></div>
              </div>
              <p className="text-2xl font-bold text-gray-900">
                {participation?.status === 'completed' ? 'Complété' :
                    participation?.status === 'failed' ? 'Échoué' :
                        challengeStatus === 'not_started' ? 'À venir' :
                            challengeStatus === 'ended' ? 'Terminé' : 'En cours'}
              </p>
              <div className="mt-2 space-y-2">
                {showNextChallengeButton ? (
                    <button
                        onClick={() => setShowNextChallengeModal(true)}
                        disabled={transitioning}
                        className="w-full inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition-colors disabled:opacity-50"
                    >
                      {transitioning ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                            Transition...
                          </>
                      ) : (
                          <>
                            <ArrowRight className="h-4 w-4 mr-2" />
                            Niveau suivant
                          </>
                      )}
                    </button>
                ) : (
                    <button
                        onClick={() => setShowMatrixForm(true)}
                        disabled={submitButtonDisabled}
                        className="w-full inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm transition-colors disabled:opacity-50"
                        title={
                          challengeStatus === 'not_started'
                              ? "Le challenge n'a pas encore commencé"
                              : challengeStatus === 'ended'
                                  ? "Le challenge est terminé"
                                  : !isSubmissionWindowOpen
                                      ? "Vous devez attendre l'heure de soumission"
                                      : ""
                        }
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      {challengeStatus === 'not_started'
                          ? "En attente du début"
                          : challengeStatus === 'ended'
                              ? "Challenge terminé"
                              : isSubmissionWindowOpen
                                  ? 'Nouvelle soumission'
                                  : "En attente de l'heure de soumission"}
                    </button>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <OfficeRanking />
          <UserRanking />
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Récompenses à débloquer
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {rewards.map((reward) => (
                <div
                    key={reward.id}
                    className="group relative bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                  {reward.image_url && (
                      <img
                          src={reward.image_url}
                          alt={reward.title}
                          className="w-full h-32 object-cover rounded-lg mb-3"
                      />
                  )}
                  <h4 className="text-sm font-medium text-gray-900 group-hover:text-blue-600 transition-colors">
                    {reward.title}
                  </h4>
                  <p className="text-xs text-gray-600 mt-1">
                    {reward.description}
                  </p>
                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-xs font-medium text-gray-500">
                      {reward.min_points} points requis
                    </span>
                    <ChevronRight className="h-4 w-4 text-gray-400 group-hover:text-blue-600 transition-colors" />
                  </div>
                  {(participation?.current_points || 0) >= reward.min_points && (
                      <div className="absolute inset-0 bg-green-500/10 rounded-lg flex items-center justify-center">
                        <span className="bg-white px-3 py-1 rounded-full text-xs font-medium text-green-600">
                          Débloqué !
                        </span>
                      </div>
                  )}
                </div>
            ))}
          </div>
        </div>

        {showMatrixForm && (
            <MatrixFormModal
                onClose={() => setShowMatrixForm(false)}
                onSuccess={loadDashboardData}
            />
        )}

        {showTermsModal && (
            <TermsModal
                onClose={() => setShowTermsModal(false)}
                onAccept={() => {
                  setTermsAccepted(true);
                  setShowTermsModal(false);
                }}
            />
        )}

        {showNextChallengeModal && nextChallenge && (
            <NextChallengeModal
                level={nextChallenge.level}
                onClose={() => setShowNextChallengeModal(false)}
                onAccept={handleNextChallenge}
            />
        )}
      </div>
  );
}