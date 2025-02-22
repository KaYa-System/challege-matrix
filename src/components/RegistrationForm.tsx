import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { UserPlus } from 'lucide-react';
import { registrationSchema, type RegistrationData } from '../utils/validation';
import { Input } from './ui/Input';
import { Select } from './ui/Select';
import { supabase } from '../lib/supabase';
import { useState } from 'react';

const offices = [
  { value: 'yop-canaris', label: 'Bureau Yop Canaris' },
  { value: 'cocody-insacc', label: 'Bureau Cocody Insacc' },
  { value: 'annani', label: 'Bureau Annani' },
  { value: 'attingier', label: 'Bureau Attingier' },
] as const;

export function RegistrationForm({ onToggleForm }: { onToggleForm: () => void }) {
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegistrationData>({
    resolver: zodResolver(registrationSchema),
  });

  const onSubmit = async (data: RegistrationData) => {
    try {
      setIsLoading(true);
      setError(null);

      // 1. Créer le compte utilisateur
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email: data.email,
        password: data.longrichCode, // Utiliser le code Longrich comme mot de passe initial
        options: {
          data: {
            full_name: data.fullName,
          },
        },
      });

      if (signUpError) throw signUpError;

      if (!authData.user) throw new Error('Erreur lors de la création du compte');

      // 2. Créer le profil utilisateur
      const { error: profileError } = await supabase
        .from('users')
        .insert({
          id: authData.user.id,
          full_name: data.fullName,
          email: data.email,
          longrich_code: data.longrichCode,
          office: data.office,
        });

      if (profileError) {
        // En cas d'erreur, supprimer le compte auth créé
        await supabase.auth.admin.deleteUser(authData.user.id);
        throw profileError;
      }

      // 3. Connexion automatique
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.longrichCode,
      });

      if (signInError) throw signInError;

    } catch (err) {
      console.error('Erreur lors de l\'inscription:', err);
      setError(
        err instanceof Error
          ? err.message
          : 'Une erreur est survenue lors de l\'inscription'
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto bg-white rounded-xl shadow-lg p-8">
      <div className="flex items-center justify-center mb-8">
        <div className="bg-blue-50 p-3 rounded-full">
          <UserPlus className="w-8 h-8 text-blue-600" />
        </div>
      </div>
      
      <h2 className="text-2xl font-bold text-center text-gray-900 mb-8">
        Inscription Challenge Matrix
      </h2>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <Input
          {...register('fullName')}
          label="Nom et prénom"
          placeholder="John Doe"
          error={errors.fullName?.message}
          disabled={isLoading}
        />

        <Input
          {...register('email')}
          type="email"
          label="Email"
          placeholder="john@example.com"
          error={errors.email?.message}
          disabled={isLoading}
        />

        <Input
          {...register('longrichCode')}
          type="password"
          label="Code Longrich"
          placeholder="Entrez votre code Longrich"
          error={errors.longrichCode?.message}
          disabled={isLoading}
        />

        <Select
          {...register('office')}
          label="Bureau"
          options={offices}
          error={errors.office?.message}
          disabled={isLoading}
        />

        <button
          type="submit"
          disabled={isLoading}
          className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 transition-colors"
        >
          {isLoading ? 'Inscription en cours...' : 'S\'inscrire'}
        </button>

        <div className="text-center">
          <button
            type="button"
            onClick={onToggleForm}
            className="text-sm text-blue-600 hover:text-blue-500"
          >
            Déjà inscrit ? Se connecter
          </button>
        </div>
      </form>
    </div>
  );
}