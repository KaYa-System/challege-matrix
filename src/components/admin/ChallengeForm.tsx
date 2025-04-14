import {useEffect} from 'react';
import {useForm} from 'react-hook-form';
import {zodResolver} from '@hookform/resolvers/zod';
import {z} from 'zod';
import {format} from 'date-fns';
import {Calendar, Clock, Gift, Plus, Trash2, Trophy, X} from 'lucide-react';
import {Input} from '../ui/Input';
import {supabase} from '../../lib/supabase';
import type {Database} from '../../types/supabase';

type Challenge = Database['public']['Tables']['challenges']['Row'];
type Reward = Database['public']['Tables']['rewards']['Row'];

const weekDays = [
    {value: 'MONDAY', label: 'Lundi'},
    {value: 'TUESDAY', label: 'Mardi'},
    {value: 'WEDNESDAY', label: 'Mercredi'},
    {value: 'THURSDAY', label: 'Jeudi'},
    {value: 'FRIDAY', label: 'Vendredi'},
    {value: 'SATURDAY', label: 'Samedi'},
    {value: 'SUNDAY', label: 'Dimanche'},
] as const;

const rewardTypes = [
    {value: 'product', label: 'Produit'},
    {value: 'badge', label: 'Badge'},
    {value: 'bonus', label: 'Bonus'},
] as const;

const rewardSchema = z.object({
    title: z.string().min(1, 'Le titre est requis'),
    description: z.string().min(1, 'La description est requise'),
    type: z.enum(['product', 'badge', 'bonus'], {
        errorMap: () => ({message: 'Type de récompense invalide'}),
    }),
    minPoints: z.number().min(1, 'Le nombre de points minimum doit être supérieur à 0'),
    imageUrl: z.string().url('URL invalide').optional(),
});

const challengeSchema = z.object({
    title: z.string().min(1, 'Le titre est requis'),
    description: z.string().min(1, 'La description est requise'),
    level: z.number().min(1, 'Le niveau doit être supérieur à 0'),
    startDate: z.string().min(1, 'La date de début est requise'),
    endDate: z.string().min(1, 'La date de fin est requise'),
    submissionStart: z.string().min(1, 'L\'heure de début est requise'),
    submissionEnd: z.string().min(1, 'L\'heure de fin est requise'),
    submissionDays: z.array(z.string()).min(1, 'Au moins un jour doit être sélectionné'),
    minPoints: z.number().min(1, 'Le nombre de points minimum doit être supérieur à 0'),
    rewards: z.array(rewardSchema).min(1, 'Au moins une récompense est requise'),
});

type ChallengeFormData = z.infer<typeof challengeSchema>;

interface ChallengeFormProps {
    challenge?: Challenge;
    onClose: () => void;
    onSuccess: () => void;
}

export function ChallengeForm({challenge, onClose, onSuccess}: ChallengeFormProps) {
    const {
        register,
        handleSubmit,
        formState: {errors, isSubmitting},
        watch,
        setValue,
        reset,
    } = useForm<ChallengeFormData>({
        resolver: zodResolver(challengeSchema),
        defaultValues: {
            level: 1,
            minPoints: 100,
            submissionStart: '17:00',
            submissionEnd: '18:00',
            submissionDays: ['MONDAY', 'SUNDAY'],
            startDate: format(new Date(), 'yyyy-MM-dd'),
            endDate: format(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'),
            rewards: [
                {
                    title: '',
                    description: '',
                    type: 'product',
                    minPoints: 100,
                    imageUrl: '',
                },
            ],
        },
    });

    useEffect(() => {
        if (challenge) {
            // Charger les récompenses du challenge
            async function loadRewards() {
                try {
                    const {data: rewards, error} = await supabase
                        .from('rewards')
                        .select('*')
                        .eq('challenge_id', challenge.id)
                        .order('min_points', {ascending: true});

                    if (error) throw error;

                    reset({
                        title: challenge.title,
                        description: challenge.description,
                        level: challenge.level,
                        startDate: format(new Date(challenge.start_date), 'yyyy-MM-dd'),
                        endDate: format(new Date(challenge.end_date), 'yyyy-MM-dd'),
                        submissionStart: challenge.submission_start,
                        submissionEnd: challenge.submission_end,
                        submissionDays: challenge.submission_days,
                        minPoints: challenge.min_points,
                        rewards: rewards.map(reward => ({
                            title: reward.title,
                            description: reward.description,
                            type: reward.type,
                            minPoints: reward.min_points,
                            imageUrl: reward.image_url || '',
                        })),
                    });
                } catch (err) {
                    console.error('Erreur lors du chargement des récompenses:', err);
                }
            }

            loadRewards();
        }
    }, [challenge, reset]);

    const rewards = watch('rewards');

    const addReward = () => {
        setValue('rewards', [
            ...rewards,
            {
                title: '',
                description: '',
                type: 'product',
                minPoints: 100,
                imageUrl: '',
            },
        ]);
    };

    const removeReward = (index: number) => {
        setValue(
            'rewards',
            rewards.filter((_, i) => i !== index)
        );
    };

    const onSubmit = async (data: ChallengeFormData) => {
        try {
            if (challenge) {
                // Mise à jour du challenge
                const {error: challengeError} = await supabase
                    .from('challenges')
                    .update({
                        title: data.title,
                        description: data.description,
                        level: data.level,
                        start_date: new Date(data.startDate).toISOString(),
                        end_date: new Date(data.endDate).toISOString(),
                        submission_start: data.submissionStart,
                        submission_end: data.submissionEnd,
                        submission_days: data.submissionDays,
                        min_points: data.minPoints,
                    })
                    .eq('id', challenge.id);

                if (challengeError) throw challengeError;

                // Supprimer les anciennes récompenses
                const {error: deleteError} = await supabase
                    .from('rewards')
                    .delete()
                    .eq('challenge_id', challenge.id);

                if (deleteError) throw deleteError;

                // Créer les nouvelles récompenses
                const {error: rewardsError} = await supabase
                    .from('rewards')
                    .insert(
                        data.rewards.map((reward) => ({
                            challenge_id: challenge.id,
                            title: reward.title,
                            description: reward.description,
                            type: reward.type,
                            min_points: reward.minPoints,
                            image_url: reward.imageUrl || null,
                        }))
                    );

                if (rewardsError) throw rewardsError;
            } else {
                // Création d'un nouveau challenge
                const {data: newChallenge, error: challengeError} = await supabase
                    .from('challenges')
                    .insert({
                        title: data.title,
                        description: data.description,
                        level: data.level,
                        start_date: new Date(data.startDate).toISOString(),
                        end_date: new Date(data.endDate).toISOString(),
                        submission_start: data.submissionStart,
                        submission_end: data.submissionEnd,
                        submission_days: data.submissionDays,
                        min_points: data.minPoints,
                        status: 'draft',
                    })
                    .select()
                    .single();

                if (challengeError) throw challengeError;

                // Créer les récompenses
                const {error: rewardsError} = await supabase
                    .from('rewards')
                    .insert(
                        data.rewards.map((reward) => ({
                            challenge_id: newChallenge.id,
                            title: reward.title,
                            description: reward.description,
                            type: reward.type,
                            min_points: reward.minPoints,
                            image_url: reward.imageUrl || null,
                        }))
                    );

                if (rewardsError) throw rewardsError;
            }

            onSuccess();
            onClose();
        } catch (err) {
            console.error('Erreur lors de la création/mise à jour du challenge:', err);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                <div className="p-6 space-y-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                            <div className="bg-blue-50 p-2 rounded-lg">
                                <Trophy className="h-5 w-5 text-blue-600"/>
                            </div>
                            <h2 className="text-xl font-bold text-gray-900">
                                {challenge ? 'Modifier le challenge' : 'Nouveau Challenge'}
                            </h2>
                        </div>
                        <button
                            onClick={onClose}
                            className="text-gray-400 hover:text-gray-500"
                        >
                            <X className="h-5 w-5"/>
                        </button>
                    </div>

                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                        <div className="space-y-4">
                            <Input
                                {...register('title')}
                                label="Titre du challenge"
                                placeholder="Ex: Challenge Matrix - Niveau 1"
                                error={errors.title?.message}
                            />

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Description
                                </label>
                                <textarea
                                    {...register('description')}
                                    className="w-full px-4 py-2 bg-white border rounded-lg text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                                    rows={3}
                                    placeholder="Décrivez les objectifs et les règles du challenge..."
                                />
                                {errors.description && (
                                    <p className="mt-1 text-sm text-red-600">{errors.description.message}</p>
                                )}
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <Input
                                    {...register('level', {valueAsNumber: true})}
                                    type="number"
                                    label="Niveau"
                                    min={1}
                                    error={errors.level?.message}
                                />

                                <Input
                                    {...register('minPoints', {valueAsNumber: true})}
                                    type="number"
                                    label="Points minimum requis"
                                    min={1}
                                    error={errors.minPoints?.message}
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        <Calendar className="inline-block h-4 w-4 mr-1"/>
                                        Période du challenge
                                    </label>
                                    <div className="grid grid-cols-2 gap-2">
                                        <Input
                                            {...register('startDate')}
                                            type="date"
                                            label="Début"
                                            error={errors.startDate?.message}
                                        />
                                        <Input
                                            {...register('endDate')}
                                            type="date"
                                            label="Fin"
                                            error={errors.endDate?.message}
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        <Clock className="inline-block h-4 w-4 mr-1"/>
                                        Horaires de soumission
                                    </label>
                                    <div className="grid grid-cols-2 gap-2">
                                        <Input
                                            {...register('submissionStart')}
                                            type="time"
                                            label="Début"
                                            error={errors.submissionStart?.message}
                                        />
                                        <Input
                                            {...register('submissionEnd')}
                                            type="time"
                                            label="Fin"
                                            error={errors.submissionEnd?.message}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Jours de soumission autorisés
                                </label>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                    {weekDays.map((day) => (
                                        <label
                                            key={day.value}
                                            className="relative flex items-center"
                                        >
                                            <input
                                                type="checkbox"
                                                value={day.value}
                                                {...register('submissionDays')}
                                                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                            />
                                            <span className="ml-2 text-sm text-gray-700">
                        {day.label}
                      </span>
                                        </label>
                                    ))}
                                </div>
                                {errors.submissionDays && (
                                    <p className="mt-1 text-sm text-red-600">{errors.submissionDays.message}</p>
                                )}
                            </div>

                            {/* Récompenses */}
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <label className="block text-sm font-medium text-gray-700">
                                        <Gift className="inline-block h-4 w-4 mr-1"/>
                                        Récompenses
                                    </label>
                                    <button
                                        type="button"
                                        onClick={addReward}
                                        className="inline-flex items-center px-2 py-1 border border-transparent text-sm font-medium rounded text-blue-600 hover:text-blue-700"
                                    >
                                        <Plus className="h-4 w-4 mr-1"/>
                                        Ajouter
                                    </button>
                                </div>

                                {errors.rewards && (
                                    <p className="text-sm text-red-600">{errors.rewards.message}</p>
                                )}

                                <div className="space-y-4">
                                    {rewards.map((_, index) => (
                                        <div
                                            key={index}
                                            className="bg-gray-50 rounded-lg p-4 space-y-4"
                                        >
                                            <div className="flex items-center justify-between">
                                                <h4 className="text-sm font-medium text-gray-900">
                                                    Récompense {index + 1}
                                                </h4>
                                                {index > 0 && (
                                                    <button
                                                        type="button"
                                                        onClick={() => removeReward(index)}
                                                        className="text-red-600 hover:text-red-700"
                                                    >
                                                        <Trash2 className="h-4 w-4"/>
                                                    </button>
                                                )}
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <Input
                                                    {...register(`rewards.${index}.title`)}
                                                    label="Titre"
                                                    placeholder="Ex: Badge Matrix Bronze"
                                                    error={errors.rewards?.[index]?.title?.message}
                                                />

                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                                        Type
                                                    </label>
                                                    <select
                                                        {...register(`rewards.${index}.type`)}
                                                        className="w-full px-4 py-2 bg-white border rounded-lg text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                                                    >
                                                        {rewardTypes.map((type) => (
                                                            <option key={type.value} value={type.value}>
                                                                {type.label}
                                                            </option>
                                                        ))}
                                                    </select>
                                                    {errors.rewards?.[index]?.type && (
                                                        <p className="mt-1 text-sm text-red-600">
                                                            {errors.rewards[index]?.type?.message}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>

                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                                    Description
                                                </label>
                                                <textarea
                                                    {...register(`rewards.${index}.description`)}
                                                    className="w-full px-4 py-2 bg-white border rounded-lg text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                                                    rows={2}
                                                    placeholder="Décrivez la récompense..."
                                                />
                                                {errors.rewards?.[index]?.description && (
                                                    <p className="mt-1 text-sm text-red-600">
                                                        {errors.rewards[index]?.description?.message}
                                                    </p>
                                                )}
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <Input
                                                    {...register(`rewards.${index}.minPoints`, {valueAsNumber: true})}
                                                    type="number"
                                                    label="Points requis"
                                                    min={1}
                                                    error={errors.rewards?.[index]?.minPoints?.message}
                                                />

                                                <Input
                                                    {...register(`rewards.${index}.imageUrl`)}
                                                    type="url"
                                                    label="URL de l'image (optionnel)"
                                                    placeholder="https://..."
                                                    error={errors.rewards?.[index]?.imageUrl?.message}
                                                />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end space-x-3 pt-6 border-t">
                            <button
                                type="button"
                                onClick={onClose}
                                className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-800"
                            >
                                Annuler
                            </button>
                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm disabled:opacity-50"
                            >
                                {isSubmitting
                                    ? challenge ? 'Mise à jour...' : 'Création...'
                                    : challenge ? 'Mettre à jour' : 'Créer le challenge'
                                }
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}