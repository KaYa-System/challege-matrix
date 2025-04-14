import {useEffect, useState} from 'react';
import {format} from 'date-fns';
import {fr} from 'date-fns/locale';
import {AlertCircle, CheckCircle, Clock, ExternalLink, Filter, RefreshCw, Search, XCircle} from 'lucide-react';
import {supabase} from '../../lib/supabase';

type AdminSubmission = {
  id: string;
  submission_date: string;
  mxf: number;
  mxm: number;
  mx: number;
  mx_global: number;
  status: 'pending' | 'validated' | 'rejected';
  screenshot_url: string;
  full_name: string;
  email: string;
  office: string;
  total_points: number;
  challenge_status: 'active' | 'completed' | 'failed';
};

const officeLabels: Record<string, string> = {
  'yop-canaris': 'Bureau Yop Canaris',
  'cocody-insacc': 'Bureau Cocody Insacc',
  'annani': 'Bureau Annani',
  'attingier': 'Bureau Attingier',
};

export function SubmissionHistory() {
  const [submissions, setSubmissions] = useState<AdminSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'validated' | 'rejected'>('all');
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadSubmissions();
  }, []);

  async function loadSubmissions() {
    try {
      setError(null);
      setLoading(true);

      const {data, error} = await supabase
          .from('admin_submissions_view')
          .select('*')
          .order('submission_date', {ascending: false});

      console.log("admin_submissions_view")

      if (error) throw error;
      setSubmissions(data as AdminSubmission[]);
    } catch (err) {
      console.error('Erreur lors du chargement des soumissions:', err);
      setError(
          err instanceof Error
              ? err.message
              : 'Une erreur est survenue lors du chargement des données'
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleRefresh() {
    try {
      setRefreshing(true);
      await loadSubmissions();
    } finally {
      setRefreshing(false);
    }
  }

  const filteredSubmissions = submissions.filter(submission => {
    const matchesSearch =
        submission.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        submission.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        officeLabels[submission.office].toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus =
        statusFilter === 'all' ||
        submission.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  // Statistiques
  const stats = {
    total: submissions.length,
    pending: submissions.filter(s => s.status === 'pending').length,
    validated: submissions.filter(s => s.status === 'validated').length,
    rejected: submissions.filter(s => s.status === 'rejected').length,
  };

  if (loading) {
    return (
        <div className="min-h-[400px] flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
    );
  }

  return (
      <div className="space-y-6">
        {/* En-tête avec statistiques */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h2 className="text-lg font-medium text-gray-900">
                Historique des soumissions
              </h2>
              <div className="mt-1 flex flex-wrap items-center gap-4 text-sm text-gray-500">
              <span className="flex items-center">
                <Clock className="h-4 w-4 mr-1 text-yellow-500"/>
                {stats.pending} en attente
              </span>
                <span className="hidden sm:inline">•</span>
                <span className="flex items-center">
                <CheckCircle className="h-4 w-4 mr-1 text-green-500"/>
                  {stats.validated} validées
              </span>
                <span className="hidden sm:inline">•</span>
                <span className="flex items-center">
                <XCircle className="h-4 w-4 mr-1 text-red-500"/>
                  {stats.rejected} rejetées
              </span>
              </div>
            </div>
            <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`}/>
              Actualiser
            </button>
          </div>
        </div>

        {error && (
            <div className="rounded-md bg-red-50 p-4">
              <div className="flex">
                <AlertCircle className="h-5 w-5 text-red-400"/>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">{error}</h3>
                </div>
              </div>
            </div>
        )}

        {/* Filtres */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400"/>
              <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Rechercher par nom, email ou bureau..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
          <div className="sm:w-48">
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400"/>
              <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none bg-white"
              >
                <option value="all">Tous les statuts</option>
                <option value="pending">En attente</option>
                <option value="validated">Validées</option>
                <option value="rejected">Rejetées</option>
              </select>
            </div>
          </div>
        </div>

        {/* Liste des soumissions */}
        <div className="bg-white shadow-sm rounded-lg divide-y divide-gray-200">
          {filteredSubmissions.length === 0 ? (
              <div className="p-6 text-center text-gray-500">
                Aucune soumission ne correspond aux critères
              </div>
          ) : (
              filteredSubmissions.map((submission) => (
                  <div key={submission.id} className="p-6">
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-3">
                          <p className="text-sm font-medium text-gray-900">
                            {submission.full_name}
                          </p>
                          <span
                              className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {officeLabels[submission.office]}
                    </span>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              submission.status === 'validated'
                                  ? 'bg-green-100 text-green-800'
                                  : submission.status === 'rejected'
                                      ? 'bg-red-100 text-red-800'
                                      : 'bg-yellow-100 text-yellow-800'
                          }`}>
                      {submission.status === 'validated' && (
                          <CheckCircle className="h-3 w-3 mr-1"/>
                      )}
                            {submission.status === 'rejected' && (
                                <XCircle className="h-3 w-3 mr-1"/>
                            )}
                            {submission.status === 'pending' && (
                                <Clock className="h-3 w-3 mr-1"/>
                            )}
                            {submission.status === 'validated' ? 'Validé'
                                : submission.status === 'rejected' ? 'Rejeté'
                                    : 'En attente'}
                    </span>
                        </div>
                        <div className="mt-1 flex items-center space-x-2 text-sm text-gray-500">
                          <span>{format(new Date(submission.submission_date), 'dd MMMM yyyy à HH:mm', {locale: fr})}</span>
                        </div>
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
                          <ExternalLink className="h-4 w-4 mr-2"/>
                          Voir la capture
                        </a>
                      </div>
                    </div>
                  </div>
              ))
          )}
        </div>
      </div>
  );
}