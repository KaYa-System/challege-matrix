import {useEffect, useState} from 'react';
import {format} from 'date-fns';
import {fr} from 'date-fns/locale';
import {
    AlertCircle,
    AlertTriangle,
    ArrowRight,
    Calendar,
    CheckCircle,
    ChevronRight,
    Clock,
    History,
    Home,
    Plus,
    Target,
    Trophy,
    Users
} from 'lucide-react';
import Countdown from 'react-countdown';
import {supabase} from '../../lib/supabase';
import {OfficeRanking} from '../rankings/OfficeRanking';
import {UserRanking} from '../rankings/UserRanking';
import {MatrixFormModal} from '../MatrixFormModal';
import {NextChallengeModal} from '../NextChallengeModal';
import {TermsModal} from "../TermsModal";
import {ChallengeDetailsModal} from '../ChallengeDetailsModal';
import type {Database} from '../../types/supabase';
import {RewardDetailsModal} from '../RewardDetailsModal';

type Challenge = Database['public']['Tables']['challenges']['Row'] & {
    submission_start: string;
    submission_end: string;
};
type Reward = Database['public']['Tables']['rewards']['Row'];
type ChallengeParticipant = Database['public']['Tables']['challenge_participants']['Row'];
type Submission = Database['public']['Tables']['matrix_submissions']['Row'];

export function ParticipantDashboard() {
    // États existants
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
    const [termsAccepted, setTermsAccepted] = useState(false);
    const [countdownTarget, setCountdownTarget] = useState<Date | null>(null);
    const [isSubmissionWindowOpen, setIsSubmissionWindowOpen] = useState(false);
    const [challengeStatus, setChallengeStatus] = useState<'not_started' | 'active' | 'ended' | null>(null);
    const [countdownType, setCountdownType] = useState<'to_start' | 'to_end' | 'to_submission'>('to_submission');

    // Nouveaux états
    const [activeTab, setActiveTab] = useState<'overview' | 'submissions' | 'rankings'>('overview');
    const [recentSubmissions, setRecentSubmissions] = useState<Submission[]>([]);
    const [recentlyValidated, setRecentlyValidated] = useState<boolean>(false);
    const [showChallengeDetails, setShowChallengeDetails] = useState(false);
    const [selectedReward, setSelectedReward] = useState<Reward | null>(null);

    useEffect(() => {
        loadDashboardData();
    }, []);

    useEffect(() => {
        if (recentlyValidated) {
            const timer = setTimeout(() => {
                setRecentlyValidated(false);
            }, 5000);
            return () => clearTimeout(timer);
        }
    }, [recentlyValidated]);

    useEffect(() => {
        if (!activeChallenge) return;

        const updateStatus = () => {
            const now = new Date();
            const startDate = new Date(activeChallenge.start_date);
            const endDate = new Date(activeChallenge.end_date);

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

            const {data: {user}} = await supabase.auth.getUser();
            if (!user) throw new Error('Utilisateur non connecté');

            const {data: userData, error: userError} = await supabase
                .from('users')
                .select('terms_accepted, current_level')
                .eq('id', user.id)
                .single();

            if (userError) throw userError;
            setTermsAccepted(userData.terms_accepted || false);

            // Récupérer le challenge actif pour le niveau de l'utilisateur
            const {data: challengeData, error: challengeError} = await supabase
                .from('challenges')
                .select('*, submission_start, submission_end')
                .eq('status', 'active')
                .eq('level', userData.current_level || 1)
                .maybeSingle();

            if (challengeError && challengeError.code !== 'PGRST116') throw challengeError;


            let currentChallenge = challengeData;

            // Si aucun challenge n'est trouvé, rechercher tout challenge actif
            if (!currentChallenge) {
                const {data: anyActiveChallenge, error: anyActiveError} = await supabase
                    .from('challenges')
                    .select('*, submission_start, submission_end')
                    .eq('status', 'active')
                    .order('level', {ascending: true})
                    .limit(1)
                    .maybeSingle();

                if (anyActiveError && anyActiveError.code !== 'PGRST116') throw anyActiveError;

                if (anyActiveChallenge) {
                    if (!userData.current_level) {
                        const {error: updateUserLevelError} = await supabase
                            .from('users')
                            .update({current_level: anyActiveChallenge.level})
                            .eq('id', user.id);

                        if (updateUserLevelError) throw updateUserLevelError;
                    }
                    currentChallenge = anyActiveChallenge;
                }
            }

            // Set the active challenge state
            setActiveChallenge(currentChallenge);


            // Continuer avec le reste du code pour récupérer les récompenses, etc.
            if (currentChallenge) {
                // Fetch rewards for the current challenge
                const {data: rewardsData, error: rewardsError} = await supabase
                    .from('rewards')
                    .select('*')
                    .eq('challenge_id', currentChallenge.id)
                    .order('min_points', {ascending: true});
                if (rewardsError) throw rewardsError;
                setRewards(rewardsData || []);

                // Also fetch rewards for higher level challenges if needed
                if (userData.current_level > 1) {
                    // You could add code here to fetch rewards for higher level challenges
                    // For example, to show what rewards are available in future levels
                }

                const {data: participationData, error: participationError} = await supabase
                    .from('challenge_participants')
                    .select('*')
                    .eq('user_id', user.id)
                    .eq('challenge_id', currentChallenge.id)
                    .maybeSingle();

                if (participationError) throw participationError;
                setParticipation(participationData);

                // Charger les soumissions récentes
                const {data: submissionsData, error: submissionsError} = await supabase
                    .from('matrix_submissions')
                    .select('*')
                    .eq('user_id', user.id)
                    .order('submission_date', {ascending: false})
                    .limit(5);

                if (submissionsError) throw submissionsError;
                setRecentSubmissions(submissionsData || []);

                if (participationData?.status === 'completed') {
                    const nextLevel = userData.current_level + 1;
                    const {data: nextChallengeData, error: nextChallengeError} = await supabase
                        .from('challenges')
                        .select('*')
                        .eq('status', 'active')
                        .eq('level', nextLevel)
                        .single();

                    if (!nextChallengeError) {
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

            const {data: {user}} = await supabase.auth.getUser();
            if (!user) throw new Error('Utilisateur non connecté');

            if (nextChallenge.level !== activeChallenge.level + 1) {
                throw new Error('Le niveau doit être exactement le niveau suivant');
            }

            const {error: updateCurrentError} = await supabase
                .from('challenges')
                .update({status: 'completed'})
                .eq('id', activeChallenge.id);

            if (updateCurrentError) throw updateCurrentError;

            const {error: updateUserError} = await supabase
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

    // Cette fonction sera appelée après une soumission réussie
    const handleSubmissionSuccess = async () => {
        await loadDashboardData();
        setRecentlyValidated(true);
    };

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
                    <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4"/>
                    <p className="text-gray-600">{error}</p>
                </div>
            </div>
        );
    }

    if (!activeChallenge && nextChallenge) {
        return (
            <div className="min-h-[400px] flex items-center justify-center">
                <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full text-center">
                    <Trophy className="h-12 w-12 text-blue-600 mx-auto mb-4"/>
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
                                <ArrowRight className="h-4 w-4 mr-2"/>
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
                    <AlertCircle className="h-12 w-12 text-yellow-500 mx-auto mb-4"/>
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
                    <Calendar className="h-5 w-5 text-yellow-500 mr-2"/>
                    <p className="text-yellow-700 font-medium">
                        Ce challenge n'a pas encore commencé. Il débutera le{' '}
                        <span className="font-bold">
                            {format(new Date(activeChallenge.start_date), 'dd MMMM yyyy', {locale: fr})}
                        </span>
                    </p>
                </div>
                {countdownTarget && (
                    <div className="mt-2 pl-7">
                        <span className="text-yellow-600 font-medium">Temps restant : </span>
                        <Countdown
                            date={countdownTarget}
                            renderer={({days, hours, minutes, seconds}) => (
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
                    <CheckCircle className="h-5 w-5 text-gray-500 mr-2"/>
                    <p className="text-gray-700 font-medium">
                        Ce challenge est terminé depuis le{' '}
                        <span className="font-bold">
                            {format(new Date(activeChallenge.end_date), 'dd MMMM yyyy', {locale: fr})}
                        </span>
                    </p>
                </div>
            </div>
        );
    } else if (challengeStatus === 'active' && !isSubmissionWindowOpen) {
        statusBanner = (
            <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-4 rounded-lg">
                <div className="flex items-center">
                    <AlertTriangle className="h-5 w-5 text-blue-500 mr-2"/>
                    <p className="text-blue-700 font-medium">
                        La fenêtre de soumission est actuellement fermée. Prochaine fenêtre à{' '}
                        {countdownTarget && format(countdownTarget, 'HH:mm', {locale: fr})}
                    </p>
                </div>
                {countdownTarget && (
                    <div className="mt-2 pl-7">
                        <span className="text-blue-600 font-medium">Temps restant : </span>
                        <Countdown
                            date={countdownTarget}
                            renderer={({days, hours, minutes, seconds}) => (
                                <span className="text-blue-800 font-bold">
                                    {days}j {hours}h {minutes}m {seconds}s
                                </span>
                            )}
                        />
                    </div>
                )}
            </div>
        );
    } else if (challengeStatus === 'active' && isSubmissionWindowOpen) {
        statusBanner = (
            <div className="bg-green-50 border-l-4 border-green-400 p-4 mb-4 rounded-lg">
                <div className="flex items-center">
                    <CheckCircle className="h-5 w-5 text-green-500 mr-2"/>
                    <p className="text-green-700 font-medium">
                        La fenêtre de soumission est actuellement ouverte ! Vous pouvez soumettre vos résultats
                        jusqu'à{' '}
                        {countdownTarget && format(countdownTarget, 'HH:mm', {locale: fr})}
                    </p>
                </div>
                {countdownTarget && (
                    <div className="mt-2 pl-7">
                        <span className="text-green-600 font-medium">Temps restant : </span>
                        <Countdown
                            date={countdownTarget}
                            renderer={({days, hours, minutes, seconds}) => (
                                <span className="text-green-800 font-bold">
                                    {hours}h {minutes}m {seconds}s
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

            {recentlyValidated && (
                <div className="bg-green-50 border-l-4 border-green-400 p-4 mb-4 rounded-lg animate-pulse">
                    <div className="flex items-center">
                        <CheckCircle className="h-5 w-5 text-green-500 mr-2"/>
                        <p className="text-green-700 font-medium">
                            Votre soumission a été enregistrée avec succès !
                        </p>
                    </div>
                </div>
            )}

            {/* Onglets de navigation */}
            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                <div className="flex border-b">
                    <button
                        onClick={() => setActiveTab('overview')}
                        className={`px-4 py-3 font-medium text-sm flex items-center ${activeTab === 'overview'
                            ? 'text-blue-600 border-b-2 border-blue-500'
                            : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        <Home className="h-4 w-4 mr-2"/>
                        Aperçu
                    </button>
                    <button
                        onClick={() => setActiveTab('submissions')}
                        className={`px-4 py-3 font-medium text-sm flex items-center ${activeTab === 'submissions'
                            ? 'text-blue-600 border-b-2 border-blue-500'
                            : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        <History className="h-4 w-4 mr-2"/>
                        Mes soumissions
                    </button>
                    <button
                        onClick={() => setActiveTab('rankings')}
                        className={`px-4 py-3 font-medium text-sm flex items-center ${activeTab === 'rankings'
                            ? 'text-blue-600 border-b-2 border-blue-500'
                            : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        <Trophy className="h-4 w-4 mr-2"/>
                        Classements
                    </button>
                </div>

                <div className="p-6">
                    {/* Onglet Aperçu */}
                    {activeTab === 'overview' && (
                        <div className="space-y-6">
                            <div
                                className={`bg-white rounded-xl shadow-sm p-6 border-2 ${statusBorderColor} transition-colors duration-300`}>
                                <div className="flex items-start justify-between">
                                    <div>
                                        <h2 className="text-2xl font-bold text-gray-900">
                                            {activeChallenge.title}
                                        </h2>

                                    </div>
                                    <div
                                        className="flex items-center space-x-1 bg-blue-50 text-blue-700 px-3 py-1 rounded-full">
                                        <Trophy className="h-4 w-4"/>
                                        <span className="text-sm font-medium">Niveau {activeChallenge.level}</span>
                                    </div>
                                </div>

                                {/* Add a button to view challenge details */}
                                <div className="mt-4">
                                    <button
                                        onClick={() => setShowChallengeDetails(true)}
                                        className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center"
                                    >
                                        Voir les détails du challenge
                                        <ChevronRight className="h-4 w-4 ml-1"/>
                                    </button>
                                </div>

                                <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-4">
                                        <div className="flex items-center justify-between mb-3">
                                            <h3 className="text-sm font-medium text-gray-900">Progression</h3>
                                            <Target className="h-5 w-5 text-blue-600"/>
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
                                            <Clock className="h-5 w-5 text-emerald-600"/>
                                        </div>
                                        <p className="text-sm text-gray-600">
                                            Du{' '}
                                            <span className="font-medium">
                                                {format(new Date(activeChallenge.start_date), 'dd MMM', {locale: fr})}
                                            </span>
                                            {' '}au{' '}
                                            <span className="font-medium">
                                                {format(new Date(activeChallenge.end_date), 'dd MMM', {locale: fr})}
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
                                                    renderer={({days, hours, minutes, seconds}) => (
                                                        <p className="text-lg font-bold text-gray-900">
                                                            {days > 0 ? `${days}j ` : ''}{hours}h {minutes}m {seconds}s
                                                        </p>
                                                    )}
                                                />
                                            )}
                                        </div>
                                    </div>

                                    <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg p-4">
                                        <div className="flex items-center justify-between mb-3">
                                            <h3 className="text-sm font-medium text-gray-900">Statut</h3>
                                            <div
                                                className={`h-2 w-2 rounded-full ${participation?.status === 'completed'
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
                                                            <div
                                                                className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                                            Transition...
                                                        </>
                                                    ) : (
                                                        <>
                                                            <ArrowRight className="h-4 w-4 mr-2"/>
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
                                                    <Plus className="h-4 w-4 mr-2"/>
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

                            <div className="bg-white rounded-xl shadow-sm p-6">
                                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                                    <Trophy className="h-5 w-5 mr-2 text-amber-500"/>
                                    Récompenses à débloquer
                                </h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {rewards.map((reward) => (
                                        <div
                                            key={reward.id}
                                            className="group relative bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
                                            onClick={() => setSelectedReward(reward)}
                                        >
                                            <h4 className="text-sm font-medium text-gray-900 group-hover:text-blue-600 transition-colors">
                                                {reward.title}
                                            </h4>
                                            <div className="mt-2 flex items-center justify-between">
                                                <span className="text-xs font-medium text-gray-500">
                                                    {reward.min_points} points requis
                                                </span>
                                                <ChevronRight
                                                    className="h-4 w-4 text-gray-400 group-hover:text-blue-600 transition-colors"/>
                                            </div>
                                            {(participation?.current_points || 0) >= reward.min_points && (
                                                <div
                                                    className="absolute inset-0 bg-green-500/10 rounded-lg flex items-center justify-center">
                                                    <span
                                                        className="bg-white px-3 py-1 rounded-full text-xs font-medium text-green-600">
                                                        Débloqué !
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Onglet Mes soumissions */}
                    {activeTab === 'submissions' && (
                        <div className="space-y-6">
                            <div className="flex justify-between items-center">
                                <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                                    <History className="h-5 w-5 mr-2 text-blue-500"/>
                                    Mes soumissions récentes
                                </h3>
                                <button
                                    onClick={() => setShowMatrixForm(true)}
                                    disabled={submitButtonDisabled}
                                    className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm transition-colors disabled:opacity-50"
                                >
                                    <Plus className="h-4 w-4 mr-2"/>
                                    Nouvelle soumission
                                </button>
                            </div>

                            {/* Remplacer cette partie dans le fichier ParticipantDashboard.tsx */}

                            {/* Dans l'onglet "submissions" */}
                            {recentSubmissions.length === 0 ? (
                                <div className="text-center py-12 bg-gray-50 rounded-lg">
                                    <History className="h-12 w-12 text-gray-400 mx-auto mb-3"/>
                                    <p className="text-gray-600">Aucune soumission récente</p>
                                    <button
                                        onClick={() => setShowMatrixForm(true)}
                                        disabled={submitButtonDisabled}
                                        className="mt-4 inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition-colors disabled:opacity-50"
                                    >
                                        <Plus className="h-4 w-4 mr-2"/>
                                        Faire ma première soumission
                                    </button>
                                </div>
                            ) : (
                                <div className="bg-white rounded-lg overflow-hidden border border-gray-200">
                                    <table className="min-w-full divide-y divide-gray-200">
                                        <thead className="bg-gray-50">
                                        <tr>
                                            <th scope="col"
                                                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Date
                                            </th>
                                            <th scope="col"
                                                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                MX Global
                                            </th>
                                            <th scope="col"
                                                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Détails
                                            </th>
                                            <th scope="col"
                                                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Statut
                                            </th>
                                        </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-gray-200">
                                        {/* Afficher uniquement la soumission validée la plus récente */}
                                        {(() => {
                                            const mostRecentSubmission = recentSubmissions
                                                .filter(sub => sub.status === 'validated')
                                                .sort((a, b) => new Date(b.submission_date).getTime() - new Date(a.submission_date).getTime())[0];

                                            if (mostRecentSubmission) {
                                                return (
                                                    <tr key={mostRecentSubmission.id} className="hover:bg-gray-50">
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                            {format(new Date(mostRecentSubmission.submission_date), 'dd MMM yyyy HH:mm', {locale: fr})}
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                                            {mostRecentSubmission.mx_global}
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap">
                                                            <div className="text-sm text-gray-900">
                                                                MXf: {mostRecentSubmission.mxf}
                                                            </div>
                                                            <div className="text-sm text-gray-500">
                                                                MXm: {mostRecentSubmission.mxm} |
                                                                MX: {mostRecentSubmission.mx}
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap">
                                <span
                                    className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                    <CheckCircle className="h-3 w-3 mr-1"/>
                                    Validé
                                </span>
                                                        </td>
                                                    </tr>
                                                );
                                            } else {
                                                return (
                                                    <tr>
                                                        <td colSpan={4}
                                                            className="px-6 py-4 text-center text-sm text-gray-500">
                                                            Aucune soumission validée
                                                        </td>
                                                    </tr>
                                                );
                                            }
                                        })()}
                                        </tbody>
                                    </table>
                                </div>
                            )}

                            <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                                <h4 className="text-sm font-medium text-blue-800 mb-2">Comment fonctionnent les
                                    soumissions ?</h4>
                                <ul className="text-sm text-blue-700 space-y-1 list-disc pl-5">
                                    <li>Vous pouvez soumettre vos résultats uniquement pendant les heures d'ouverture
                                    </li>
                                    <li>Les soumissions sont validées par nos administrateurs</li>
                                    <li>Une fois validées, vos points sont automatiquement ajoutés à votre total</li>
                                    <li>Atteignez le nombre de points requis pour compléter le challenge</li>
                                </ul>
                            </div>
                        </div>
                    )}

                    {/* Onglet Classements */}
                    {activeTab === 'rankings' && (
                        <div className="space-y-6">
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                <div>
                                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                                        <Trophy className="h-5 w-5 mr-2 text-amber-500"/>
                                        Classement des Bureaux
                                    </h3>
                                    <OfficeRanking/>
                                </div>
                                <div>
                                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                                        <Users className="h-5 w-5 mr-2 text-purple-500"/>
                                        Top 10 Participants
                                    </h3>
                                    <UserRanking/>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {showMatrixForm && (
                <MatrixFormModal
                    onClose={() => setShowMatrixForm(false)}
                    onSuccess={handleSubmissionSuccess}
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

            {showChallengeDetails && activeChallenge && (
                <ChallengeDetailsModal
                    challenge={activeChallenge}
                    rewards={rewards}
                    onClose={() => setShowChallengeDetails(false)}
                />
            )}

            {selectedReward && (
                <RewardDetailsModal
                    reward={selectedReward}
                    isUnlocked={(participation?.current_points || 0) >= selectedReward.min_points}
                    onClose={() => setSelectedReward(null)}
                />
            )}
        </div>
    );
}