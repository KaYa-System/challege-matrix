import { useEffect, useState } from 'react';
import { History, FileCheck, FileX, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { supabase } from '../../lib/supabase';
import type { Database } from '../../types/supabase';

type MatrixSubmission = Database['public']['Tables']['matrix_submissions']['Row'];

export function SubmissionHistory() {
  const [submissions, setSubmissions] = useState<MatrixSubmission[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadSubmissions() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Utilisateur non connecté');

        const { data, error } = await supabase
          .from('matrix_submissions')
          .select('*')
          .eq('user_id', user.id)
          .order('submission_date', { ascending: false });

        if (error) throw error;
        setSubmissions(data);
      } catch (err) {
        console.error('Erreur lors du chargement de l\'historique:', err);
      } finally {
        setLoading(false);
      }
    }

    loadSubmissions();
  }, []);

  if (loading) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">
          Historique des soumissions
        </h1>
        <div className="flex items-center space-x-2 text-sm text-gray-500">
          <History className="h-4 w-4" />
          <span>Dernières activités</span>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  MX Global
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Détails
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Statut
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Capture
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {submissions.map((submission) => (
                <tr key={submission.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {format(new Date(submission.submission_date), 'dd MMM yyyy HH:mm', { locale: fr })}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {submission.mx_global} pts
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      MXf: {submission.mxf}
                    </div>
                    <div className="text-sm text-gray-500">
                      MXm: {submission.mxm} | MX: {submission.mx}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      submission.status === 'validated'
                        ? 'bg-green-100 text-green-800'
                        : submission.status === 'rejected'
                        ? 'bg-red-100 text-red-800'
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {submission.status === 'validated' && (
                        <FileCheck className="h-3 w-3 mr-1" />
                      )}
                      {submission.status === 'rejected' && (
                        <FileX className="h-3 w-3 mr-1" />
                      )}
                      {submission.status === 'pending' && (
                        <Clock className="h-3 w-3 mr-1" />
                      )}
                      {submission.status === 'validated' ? 'Validé'
                        : submission.status === 'rejected' ? 'Rejeté'
                        : 'En attente'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <a
                      href={`https://vigzczkntlfrgrjzuoww.supabase.co/storage/v1/object/public/screenshots/${submission.screenshot_url}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-700"
                    >
                      Voir la capture
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}