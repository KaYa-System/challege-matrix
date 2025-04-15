import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { User, Settings, UserCog, Users, AlertCircle, CheckCircle, X } from 'lucide-react';
import type { Database } from '../../types/supabase';

type UserProfile = Database['public']['Tables']['users']['Row'];

export function AccountManagement() {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    avatar_url: '',
    current_password: '',
    new_password: '',
    confirm_password: '',
  });
  const [isAdmin, setIsAdmin] = useState(false);
  const [selectedUser, setSelectedUser] = useState<string | null>(null);

  useEffect(() => {
    loadUserProfile();
  }, []);

  async function loadUserProfile() {
    try {
      setLoading(true);
      setError(null);
      
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setError("Utilisateur non authentifié");
        return;
      }
      
      // Get user profile from the users table
      const { data: profile, error: profileError } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single();
      
      if (profileError) throw profileError;
      
      setCurrentUser(profile);
      setFormData({
        full_name: profile.full_name || '',
        email: user.email || '',
        avatar_url: profile.avatar_url || '',
        current_password: '',
        new_password: '',
        confirm_password: '',
      });
      
      // Check if user is admin
      if (profile.role === 'admin') {
        setIsAdmin(true);
        // Load all users if admin
        await loadAllUsers();
      }
      
    } catch (err) {
      console.error('Erreur lors du chargement du profil:', err);
      setError('Erreur lors du chargement du profil');
    } finally {
      setLoading(false);
    }
  }
  
  async function loadAllUsers() {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('full_name', { ascending: true });
        
      if (error) throw error;
      setUsers(data || []);
    } catch (err) {
      console.error('Erreur lors du chargement des utilisateurs:', err);
      setError('Erreur lors du chargement des utilisateurs');
    }
  }
  
  async function handleUpdateProfile(e: React.FormEvent) {
    e.preventDefault();
    try {
      setError(null);
      setSuccessMessage(null);
      
      const updates = {
        full_name: formData.full_name,
        avatar_url: formData.avatar_url,
        updated_at: new Date().toISOString(),
      };
      
      // Update profile in the users table
      const { error: updateError } = await supabase
        .from('users')
        .update(updates)
        .eq('id', currentUser?.id);
        
      if (updateError) throw updateError;
      
      // Update password if provided
      if (formData.new_password) {
        if (formData.new_password !== formData.confirm_password) {
          setError('Les mots de passe ne correspondent pas');
          return;
        }
        
        const { error: passwordError } = await supabase.auth.updateUser({
          password: formData.new_password
        });
        
        if (passwordError) throw passwordError;
      }
      
      setSuccessMessage('Profil mis à jour avec succès');
      setIsEditing(false);
      loadUserProfile();
      
      // Clear password fields
      setFormData({
        ...formData,
        current_password: '',
        new_password: '',
        confirm_password: '',
      });
      
    } catch (err) {
      console.error('Erreur lors de la mise à jour du profil:', err);
      setError('Erreur lors de la mise à jour du profil');
    }
  }
  
  async function handleUpdateUserRole(userId: string, newRole: 'user' | 'admin') {
    try {
      setError(null);
      setSuccessMessage(null);
      
      const { error } = await supabase
        .from('users')
        .update({ role: newRole })
        .eq('id', userId);
        
      if (error) throw error;
      
      setSuccessMessage(`Rôle de l'utilisateur mis à jour avec succès`);
      loadAllUsers();
    } catch (err) {
      console.error('Erreur lors de la mise à jour du rôle:', err);
      setError('Erreur lors de la mise à jour du rôle');
    }
  }
  
  if (loading) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900">
            Gestion de compte
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Gérez vos informations personnelles et vos préférences
          </p>
        </div>
      </div>
      
      {error && (
        <div className="rounded-md bg-red-50 p-4 border border-red-100 animate-fadeIn">
          <div className="flex">
            <div className="flex-shrink-0">
              <AlertCircle className="h-5 w-5 text-red-400" />
            </div>
            <div className="ml-3 flex-1">
              <h3 className="text-sm font-medium text-red-800">{error}</h3>
            </div>
            <button 
              onClick={() => setError(null)}
              className="text-red-500 hover:text-red-600"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}

      {successMessage && (
        <div className="rounded-md bg-green-50 p-4 border border-green-100 animate-fadeIn">
          <div className="flex">
            <div className="flex-shrink-0">
              <CheckCircle className="h-5 w-5 text-green-500" />
            </div>
            <div className="ml-3 flex-1">
              <h3 className="text-sm font-medium text-green-800">{successMessage}</h3>
            </div>
            <button 
              onClick={() => setSuccessMessage(null)}
              className="text-green-500 hover:text-green-600"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}
      
      <div className="bg-white shadow rounded-lg overflow-hidden border border-gray-100">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center">
              <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
                {currentUser?.avatar_url ? (
                  <img 
                    src={currentUser.avatar_url} 
                    alt={currentUser.full_name || 'Avatar'} 
                    className="h-12 w-12 rounded-full object-cover"
                  />
                ) : (
                  <User className="h-6 w-6 text-blue-600" />
                )}
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-medium text-gray-900">
                  {currentUser?.full_name || 'Utilisateur'}
                </h3>
                <p className="text-sm text-gray-500">
                  {formData.email}
                </p>
              </div>
            </div>
            <div>
              <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${
                currentUser?.role === 'admin' 
                  ? 'bg-purple-100 text-purple-800' 
                  : 'bg-blue-100 text-blue-800'
              }`}>
                {currentUser?.role === 'admin' ? 'Administrateur' : 'Utilisateur'}
              </span>
            </div>
          </div>
          
          {isEditing ? (
            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <div>
                <label htmlFor="full_name" className="block text-sm font-medium text-gray-700">
                  Nom complet
                </label>
                <input
                  type="text"
                  id="full_name"
                  value={formData.full_name}
                  onChange={(e) => setFormData({...formData, full_name: e.target.value})}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                />
              </div>
              
              <div>
                <label htmlFor="avatar_url" className="block text-sm font-medium text-gray-700">
                  URL de l'avatar
                </label>
                <input
                  type="text"
                  id="avatar_url"
                  value={formData.avatar_url}
                  onChange={(e) => setFormData({...formData, avatar_url: e.target.value})}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                />
              </div>
              
              <div className="border-t border-gray-200 pt-4 mt-4">
                <h4 className="text-sm font-medium text-gray-900 mb-3">Changer le mot de passe</h4>
                
                <div className="space-y-3">
                  <div>
                    <label htmlFor="new_password" className="block text-sm font-medium text-gray-700">
                      Nouveau mot de passe
                    </label>
                    <input
                      type="password"
                      id="new_password"
                      value={formData.new_password}
                      onChange={(e) => setFormData({...formData, new_password: e.target.value})}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="confirm_password" className="block text-sm font-medium text-gray-700">
                      Confirmer le mot de passe
                    </label>
                    <input
                      type="password"
                      id="confirm_password"
                      value={formData.confirm_password}
                      onChange={(e) => setFormData({...formData, confirm_password: e.target.value})}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                    />
                  </div>
                </div>
              </div>
              
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setIsEditing(false);
                    setFormData({
                      full_name: currentUser?.full_name || '',
                      email: formData.email,
                      avatar_url: currentUser?.avatar_url || '',
                      current_password: '',
                      new_password: '',
                      confirm_password: '',
                    });
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-800 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors duration-150"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md shadow-sm transition-colors duration-150"
                >
                  Enregistrer
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="text-sm font-medium text-gray-500">Nom complet</h4>
                  <p className="mt-1 text-sm text-gray-900">{currentUser?.full_name || '-'}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-500">Email</h4>
                  <p className="mt-1 text-sm text-gray-900">{formData.email}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-500">Niveau actuel</h4>
                  <p className="mt-1 text-sm text-gray-900">{currentUser?.current_level || 1}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-500">Dernière mise à jour</h4>
                  <p className="mt-1 text-sm text-gray-900">
                    {currentUser?.updated_at 
                      ? new Date(currentUser.updated_at).toLocaleDateString('fr-FR')
                      : '-'}
                  </p>
                </div>
              </div>
              
              <div className="pt-4 flex justify-end">
                <button
                  onClick={() => setIsEditing(true)}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 transition-colors duration-200"
                >
                  <Settings className="h-4 w-4 mr-2" />
                  Modifier le profil
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Admin section - only visible to admins */}
      {isAdmin && (
        <div className="bg-white shadow rounded-lg overflow-hidden border border-gray-100 mt-8">
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-medium text-gray-900 flex items-center">
                <UserCog className="h-5 w-5 mr-2 text-gray-500" />
                Gestion des utilisateurs
              </h3>
            </div>
            
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Utilisateur
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Email
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Niveau
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Rôle
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {users.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-10 text-center text-gray-500">
                        Aucun utilisateur trouvé.
                      </td>
                    </tr>
                  ) : (
                    users.map((user) => (
                      <tr key={user.id} className={`hover:bg-gray-50 transition-colors duration-150 ${user.id === currentUser?.id ? 'bg-blue-50' : ''}`}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="flex-shrink-0">
                              <div className="h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center">
                                {user.avatar_url ? (
                                  <img 
                                    src={user.avatar_url} 
                                    alt={user.full_name || 'Avatar'} 
                                    className="h-10 w-10 rounded-full object-cover"
                                  />
                                ) : (
                                  <User className="h-5 w-5 text-gray-500" />
                                )}
                              </div>
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900">
                                {user.full_name || 'Utilisateur sans nom'}
                                {user.id === currentUser?.id && (
                                  <span className="ml-2 text-xs text-gray-500">(Vous)</span>
                                )}
                              </div>
                              <div className="text-xs text-gray-500">
                                ID: {user.id.substring(0, 8)}...
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {user.email || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {user.current_level || 1}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${
                            user.role === 'admin' 
                              ? 'bg-purple-100 text-purple-800' 
                              : 'bg-blue-100 text-blue-800'
                          }`}>
                            {user.role === 'admin' ? 'Administrateur' : 'Utilisateur'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          {user.id !== currentUser?.id && (
                            <div className="flex items-center justify-end space-x-3">
                              {user.role === 'user' ? (
                                <button
                                  onClick={() => handleUpdateUserRole(user.id, 'admin')}
                                  className="text-purple-600 hover:text-purple-700 transition-colors duration-150 px-2 py-1 rounded hover:bg-purple-50"
                                  title="Promouvoir en administrateur"
                                >
                                  Promouvoir
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleUpdateUserRole(user.id, 'user')}
                                  className="text-gray-600 hover:text-gray-700 transition-colors duration-150 px-2 py-1 rounded hover:bg-gray-50"
                                  title="Rétrograder en utilisateur"
                                >
                                  Rétrograder
                                </button>
                              )}
                            </div>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}