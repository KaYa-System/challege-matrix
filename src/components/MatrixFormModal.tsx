import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Calculator, Upload, AlertCircle, X, Info } from 'lucide-react';
import { matrixDataSchema, type MatrixSubmissionData } from '../utils/validation';
import { Input } from './ui/Input';
import { supabase } from '../lib/supabase';
import { useState } from 'react';

interface MatrixFormModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export function MatrixFormModal({ onClose, onSuccess }: MatrixFormModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isDirty },
  } = useForm<MatrixSubmissionData>({
    resolver: zodResolver(matrixDataSchema),
    defaultValues: {
      mxf: 0,
      mxm: 0,
      mx: 0,
    },
  });

  const values = watch(['mxf', 'mxm', 'mx']);
  const total = values.reduce((acc, val) => acc + (Number(val) || 0), 0);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Vérifier la taille du fichier
      if (file.size > 10 * 1024 * 1024) {
        setError('La taille du fichier ne doit pas dépasser 10MB');
        event.target.value = '';
        return;
      }

      // Vérifier le type du fichier
      if (!['image/jpeg', 'image/png', 'image/gif'].includes(file.type)) {
        setError('Format de fichier non supporté. Utilisez JPG, PNG ou GIF');
        event.target.value = '';
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
        setError(null);
        setValue('screenshot', file, { shouldValidate: true });
      };
      reader.readAsDataURL(file);
    } else {
      setPreview(null);
      setValue('screenshot', undefined, { shouldValidate: true });
    }
  };

  const onSubmit = async (data: MatrixSubmissionData) => {
    try {
      setIsSubmitting(true);
      setError(null);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Utilisateur non connecté');

      // Upload de la capture d'écran
      const file = data.screenshot;
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;

      const { error: uploadError, data: uploadData } = await supabase.storage
        .from('screenshots')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Création de la soumission
      const { error: submissionError } = await supabase
        .from('matrix_submissions')
        .insert({
          user_id: user.id,
          mxf: data.mxf,
          mxm: data.mxm,
          mx: data.mx,
          screenshot_url: uploadData.path,
          status: 'pending',
        });

      if (submissionError) throw submissionError;

      onSuccess();
      onClose();

    } catch (err) {
      console.error('Erreur lors de la soumission:', err);
      setError(
        err instanceof Error
          ? err.message
          : 'Une erreur est survenue lors de la soumission'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <div className="bg-emerald-50 p-2 rounded-lg">
                <Calculator className="h-6 w-6 text-emerald-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-900">
                Soumission Matrix
              </h2>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-500"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 rounded-lg flex items-start space-x-3">
              <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="bg-blue-50 rounded-lg p-4 flex items-start space-x-3">
              <Info className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-700">
                <p className="font-medium">Instructions :</p>
                <ul className="mt-1 list-disc list-inside">
                  <li>Entrez les valeurs MX de vos trois branches principales</li>
                  <li>Ajoutez une capture d'écran de votre tableau de bord</li>
                  <li>Vérifiez que le total MX Global est correct</li>
                </ul>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Input
                {...register('mxf', { valueAsNumber: true })}
                type="number"
                label="Branche Forte (MXf)"
                placeholder="0"
                min={0}
                error={errors.mxf?.message}
                disabled={isSubmitting}
              />

              <Input
                {...register('mxm', { valueAsNumber: true })}
                type="number"
                label="Pied de paiement 1 (MXm)"
                placeholder="0"
                min={0}
                error={errors.mxm?.message}
                disabled={isSubmitting}
              />

              <Input
                {...register('mx', { valueAsNumber: true })}
                type="number"
                label="Dernier pied de paiement (MX)"
                placeholder="0"
                min={0}
                error={errors.mx?.message}
                disabled={isSubmitting}
              />
            </div>

            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-700">
                  Total MX Global
                </span>
                <span className={`text-lg font-bold ${
                  total > 0 ? 'text-emerald-600' : 'text-gray-900'
                }`}>
                  {total}
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Capture d'écran
              </label>
              <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-lg relative">
                <div className="space-y-1 text-center">
                  {preview ? (
                    <div className="space-y-2">
                      <img
                        src={preview}
                        alt="Aperçu"
                        className="mx-auto h-32 w-auto rounded-lg"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setPreview(null);
                          setValue('screenshot', undefined, { shouldValidate: true });
                          const input = document.getElementById('screenshot') as HTMLInputElement;
                          if (input) input.value = '';
                        }}
                        className="text-sm text-red-600 hover:text-red-700"
                      >
                        Supprimer
                      </button>
                    </div>
                  ) : (
                    <>
                      <Upload className="mx-auto h-12 w-12 text-gray-400" />
                      <div className="flex text-sm text-gray-600">
                        <label
                          htmlFor="screenshot"
                          className="relative cursor-pointer rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500"
                        >
                          <span>Téléverser un fichier</span>
                          <input
                            id="screenshot"
                            type="file"
                            className="sr-only"
                            accept="image/jpeg,image/png,image/gif"
                            {...register('screenshot')}
                            onChange={handleFileChange}
                            disabled={isSubmitting}
                          />
                        </label>
                        <p className="pl-1">ou glisser-déposer</p>
                      </div>
                      <p className="text-xs text-gray-500">
                        PNG, JPG jusqu'à 10MB
                      </p>
                    </>
                  )}
                </div>
              </div>
              {errors.screenshot && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.screenshot.message}
                </p>
              )}
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
                disabled={isSubmitting || !isDirty || !preview}
                className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isSubmitting ? 'Soumission en cours...' : 'Soumettre les résultats'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}