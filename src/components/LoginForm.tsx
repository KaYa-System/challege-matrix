import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { LogIn } from 'lucide-react';
import { loginSchema, type LoginData } from '../utils/validation';
import { Input } from './ui/Input';
import { supabase } from '../lib/supabase';
import { useState } from 'react';

export function LoginForm({ onToggleForm }: { onToggleForm: () => void }) {
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginData) => {
    try {
      setIsLoading(true);
      setError(null);

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.longrichCode,
      });

      if (signInError) throw signInError;

    } catch (err) {
      console.error('Erreur lors de la connexion:', err);
      setError(
        err instanceof Error
          ? err.message
          : 'Email ou code Longrich incorrect'
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto bg-white rounded-xl shadow-lg p-8">
      <div className="flex items-center justify-center mb-8">
        <div className="bg-blue-50 p-3 rounded-full">
          <LogIn className="w-8 h-8 text-blue-600" />
        </div>
      </div>
      
      <h2 className="text-2xl font-bold text-center text-gray-900 mb-8">
        Connexion Challenge Matrix
      </h2>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
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

        <button
          type="submit"
          disabled={isLoading}
          className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 transition-colors"
        >
          {isLoading ? 'Connexion en cours...' : 'Se connecter'}
        </button>

        <div className="text-center">
          <button
            type="button"
            onClick={onToggleForm}
            className="text-sm text-blue-600 hover:text-blue-500"
          >
            Pas encore inscrit ? Créer un compte
          </button>
        </div>
      </form>
    </div>
  );
}