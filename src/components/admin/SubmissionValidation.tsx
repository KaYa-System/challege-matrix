import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { CheckCircle, XCircle, Clock, ExternalLink } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { Database } from '../../types/supabase';

type MatrixSubmission = Database['public']['Tables']['matrix_submissions']['Row'] & {
  users: {
    full_name: string;
    office: string;
  };
};

const officeLabels: Record<string, string> = {
  'yop-canaris': 'Bureau Yop Canaris',
  'cocody-insacc': 'Bureau Cocody Insacc',
  'annani': 'Bureau Annani',
  'attingier': 'Bureau Attingier',
};

export function SubmissionValidation() {
  const [submissions, setSubmissions] = useState<MatrixSubmission[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSubmissions();
  }, []);

  async function loadSubmissions() {
    try {
      const { data, error } = await supabase
        .from('matrix_submissions')
        .select(`
          *,
          users (
            full_name,
            office
          )
        `)
        .eq('status', 'pending')
        .order('submission_date', { ascending: false });

      if (error) throw error;
      setSubmissions(data as MatrixSubmission[]);
    } catch (err) {
      console.error('Erreur lors du chargement des soumissions:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleValidation(submissionId: string, status: 'validated' | 'rejected') {
    try {
      const { error } = await supabase
        .from('matrix_submissions')
        .update({ status })
        .eq('id', submissionId);

      if (error) throw error;
      await loadSubmissions();
    } catch (err) {
      console.error('Erreur lors de la validation:', err);
    }
  }

  if (loading) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (submissions.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Aucune soumission en attente de validation</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-medium text-gray-900">
        Soumissions en attente ({submissions.length})
      </h2>

      <div className="bg-white shadow-sm rounded-lg divide-y divide-gray-200">
        {submissions.map((submission) => (
          <div key={submission.id} className="p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-3">
                  <p className="text-sm font-medium text-gray-900">
                    {submission.users.full_name}
                  </p>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    {officeLabels[submission.users.office]}
                  </span>
                </div>
                <div className="mt-1 flex items-center space-x-2 text-sm text-gray-500">
                  <span>{format(new Date(submission.submission_date), 'dd MMMM yyyy à HH:mm', { locale: fr })}</span>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-4">
                <button
                  onClick={() => handleValidation(submission.id, 'validated')}
                  className="inline-flex items-center justify-center px-3 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Valider
                </button>
                <button
                  onClick={() => handleValidation(submission.id, 'rejected')}
                  className="inline-flex items-center justify-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-red-700 bg-red-100 hover:bg-red-200"
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Rejeter
                </button>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
                  Détails Matrix
                </h4>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{submission.mxf}</p>
                    <p className="text-xs text-gray-500">MXf</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{submission.mxm}</p>
                    <p className="text-xs text-gray-500">MXm</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{submission.mx}</p>
                    <p className="text-xs text-gray-500">MX</p>
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-gray-500">Total MX Global</p>
                    <p className="text-sm font-bold text-gray-900">{submission.mx_global}</p>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
                  Capture d'écran
                </h4>
                <a
                  href={`https://vigzczkntlfrgrjzuoww.supabase.co/storage/v1/object/public/screenshots/${submission.screenshot_url}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Voir la capture
                </a>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}