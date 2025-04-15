import { useState, useEffect, ChangeEvent } from 'react';
import { supabase } from '../../lib/supabase';
import { User, Settings, UserCog, Users, AlertCircle, CheckCircle, X, Upload, Camera } from 'lucide-react';
import type { Database } from '../../types/supabase';
import { cn } from '../../utils/cn';
import { Input } from '../ui/Input';

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
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  useEffect(() => {
    loadUserProfile();
  }, []);

  async function loadUserProfile() {
    try {
      setLoading(true);
      setError(null);
      
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setError("Vous n'êtes pas connecté. Veuillez vous connecter pour accéder à votre profil.");
        return;
      }
      
      // Get user profile from the users table
      const { data: profile, error: profileError } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single();
      
      if (profileError) {
        if (profileError.code === 'PGRST116') {
          setError("Votre profil n'a pas été trouvé. Veuillez contacter l'administrateur.");
        } else {
          setError(`Impossible de charger votre profil: ${profileError.message}`);
        }
        throw profileError;
      }
      
      setCurrentUser(profile);
      setFormData({
        full_name: profile.full_name || '',
        email: user.email || '',
        avatar_url: profile.avatar_url || '',
        current_password: '',
        new_password: '',
        confirm_password: '',
      });
      
      // Set avatar preview if exists
      if (profile.avatar_url) {
        setAvatarPreview(profile.avatar_url);
      }
      
      // Check if user is admin
      if (profile.role === 'admin') {
        setIsAdmin(true);
        // Load all users if admin
        await loadAllUsers();
      }
      
    } catch (err: any) {
      console.error('Erreur lors du chargement du profil:', err);
      if (!error) { // Only set if not already set above
        setError(err.message || 'Impossible de charger votre profil. Veuillez réessayer plus tard.');
      }
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
        
      if (error) {
        setError(`Impossible de charger la liste des utilisateurs: ${error.message}`);
        throw error;
      }
      setUsers(data || []);
    } catch (err: any) {
      console.error('Erreur lors du chargement des utilisateurs:', err);
      if (!error) {
        setError('Impossible de charger la liste des utilisateurs. Veuillez réessayer plus tard.');
      }
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
  };

  const handleAvatarChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Vérifier la taille du fichier
      if (file.size > 5 * 1024 * 1024) {
        setError("L'image ne doit pas dépasser 5MB");
        e.target.value = '';
        return;
      }

      // Vérifier le type du fichier
      if (!['image/jpeg', 'image/png', 'image/gif'].includes(file.type)) {
        setError('Format de fichier non supporté. Utilisez JPG, PNG ou GIF');
        e.target.value = '';
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string);
        setError(null);
        setAvatarFile(file);
      };
      reader.readAsDataURL(file);
    } else {
      setAvatarPreview(currentUser?.avatar_url || null);
      setAvatarFile(null);
    }
  };

  async function uploadAvatar() {
    if (!avatarFile || !currentUser) return null;
    
    try {
      setUploadingAvatar(true);
      setError(null);
      
      // Create a unique file path
      const fileExt = avatarFile.name.split('.').pop();
      const fileName = `${currentUser.id}/${Date.now()}.${fileExt}`;
      
      const { error: uploadError, data: uploadData } = await supabase.storage
        .from('avatars')
        .upload(fileName, avatarFile);
        
      if (uploadError) {
        if (uploadError.message.includes('storage quota')) {
          setError("L'espace de stockage est plein. Veuillez contacter l'administrateur.");
        } else if (uploadError.message.includes('permission')) {
          setError("Vous n'avez pas les permissions nécessaires pour télécharger cette image.");
        } else {
          setError(`Erreur lors du téléchargement de l'image: ${uploadError.message}`);
        }
        throw uploadError;
      }
      
      // Get public URL
      const { data: publicURL } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);
        
      if (!publicURL) {
        setError("Impossible de générer l'URL de l'image. Veuillez réessayer.");
        throw new Error("Erreur lors de la récupération de l'URL publique");
      }
      
      return publicURL.publicUrl;
    } catch (err: any) {
      console.error("Erreur lors de l'upload de l'avatar:", err);
      if (!error) {
        setError("Impossible de télécharger l'image. Veuillez vérifier votre connexion et réessayer.");
      }
      return null;
    } finally {
      setUploadingAvatar(false);
    }
  }
  async function handleUpdateProfile(e: React.FormEvent) {
    e.preventDefault();
    try {
      setError(null);
      setSuccessMessage(null);
      
      // Validate form data
      if (!formData.full_name.trim()) {
        setError("Le nom complet est requis.");
        return;
      }
      
      // Upload avatar if selected
      let avatarUrl = formData.avatar_url;
      if (avatarFile) {
        const uploadedUrl = await uploadAvatar();
        if (uploadedUrl) {
          avatarUrl = uploadedUrl;
        }
      }
      
      const updates = {
        full_name: formData.full_name,
        avatar_url: avatarUrl,
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
        
        if (!formData.current_password) {
          setError('Veuillez saisir votre mot de passe actuel');
          return;
        }
        
        // Verify current password
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: formData.email,
          password: formData.current_password,
        });
        
        if (signInError) {
          setError('Le mot de passe actuel est incorrect');
          return;
        }
        
        const { error: passwordError } = await supabase.auth.updateUser({
          password: formData.new_password
        });
        
        if (passwordError) {
          // Check for the specific error code for same password
          if (passwordError.message && passwordError.message.includes('same_password')) {
            setError('Le nouveau mot de passe doit être différent de l\'ancien mot de passe');
            return;
          }
          throw passwordError;
        }
        
        setSuccessMessage('Profil mis à jour avec succès. Vous allez être déconnecté...');
        
        // Set a timeout to log the user out after showing the success message
        setTimeout(async () => {
          await supabase.auth.signOut();
          window.location.href = '/login'; // Redirect to login page
        }, 2000);
        
        return; // Exit early since we're logging out
      }
      
      setSuccessMessage('Profil mis à jour avec succès');
      setIsEditing(false);
      loadUserProfile();
      
      // Clear password fields and avatar file
      setFormData({
        ...formData,
        current_password: '',
        new_password: '',
        confirm_password: '',
      });
      setAvatarFile(null);
      
    } catch (err: any) {
      console.error('Erreur lors de la mise à jour du profil:', err);
      
      // Traitement spécifique pour l'erreur "same_password"
      if (err && typeof err === 'object') {
        // Vérifier si l'erreur est directement un objet avec un code
        if (err.code === 'same_password') {
          setError('Le nouveau mot de passe doit être différent de l\'ancien mot de passe');
          return;
        }
        
        // Vérifier si l'erreur est dans le message et peut être parsée
        if (typeof err.message === 'string') {
          try {
            const errorData = JSON.parse(err.message);
            if (errorData && errorData.code === 'same_password') {
              setError('Le nouveau mot de passe doit être différent de l\'ancien mot de passe');
              return;
            }
          } catch (parseError) {
            // Si le parsing échoue, ce n'est pas un JSON valide
          }
        }
      }
      
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
        
      if (error) {
        if (error.code === '42501') {
          setError("Vous n'avez pas les permissions nécessaires pour modifier les rôles des utilisateurs.");
        } else {
          setError(`Impossible de modifier le rôle de l'utilisateur: ${error.message}`);
        }
        throw error;
      }
      
      setSuccessMessage(`Le rôle de l'utilisateur a été modifié avec succès en "${newRole === 'admin' ? 'Administrateur' : 'Utilisateur'}".`);
      loadAllUsers();
    } catch (err: any) {
      console.error('Erreur lors de la mise à jour du rôle:', err);
      if (!error) {
        setError("Une erreur est survenue lors de la modification du rôle. Veuillez réessayer.");
      }
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
        <div className="flex items-center">
          <div className={cn("h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center mr-3", 
            currentUser?.avatar_url ? "p-0" : "p-2")}>
            {currentUser?.avatar_url ? (
              <img 
                src={currentUser.avatar_url} 
                alt={currentUser.full_name || 'Avatar'} 
                className="h-10 w-10 rounded-full object-cover"
              />
            ) : (
              <User className="h-5 w-5 text-blue-600" />
            )}
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">
              Gestion de compte
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              Gérez vos informations personnelles et vos préférences
            </p>
          </div>
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
      
      <div className={cn("bg-white shadow rounded-lg overflow-hidden border border-gray-100")}>
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center">
              <div className={cn("h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center", 
                currentUser?.avatar_url ? "p-0" : "p-3")}>
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
              <span className={cn("px-2.5 py-1 text-xs font-medium rounded-full",
                currentUser?.role === 'admin' 
                  ? 'bg-purple-100 text-purple-800' 
                  : 'bg-blue-100 text-blue-800'
              )}>
                {currentUser?.role === 'admin' ? 'Administrateur' : 'Utilisateur'}
              </span>
            </div>
          </div>
          
          {isEditing ? (
            <form onSubmit={handleUpdateProfile} className="space-y-4">
              {/* Avatar upload section */}
              <div className="flex flex-col items-center mb-6">
                <div className="relative group">
                  <div className={cn(
                    "h-24 w-24 rounded-full overflow-hidden border-2 flex items-center justify-center bg-gray-100",
                    avatarPreview ? "border-blue-500" : "border-gray-300"
                  )}>
                    {avatarPreview ? (
                      <img 
                        src={avatarPreview} 
                        alt="Avatar" 
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <User className="h-12 w-12 text-gray-400" />
                    )}
                  </div>
                  <label 
                    htmlFor="avatar-upload" 
                    className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 text-white rounded-full opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity"
                  >
                    <Camera className="h-6 w-6" />
                  </label>
                  <input 
                    id="avatar-upload" 
                    type="file" 
                    className="sr-only" 
                    accept="image/jpeg,image/png,image/gif"
                    onChange={handleAvatarChange}
                  />
                </div>
                <p className="text-sm text-gray-500 mt-2">Cliquez pour changer votre photo</p>
              </div>
              
              <div className="grid grid-cols-1 gap-6">
                <Input
                  type="text"
                  name="full_name"
                  label="Nom complet"
                  value={formData.full_name}
                  onChange={handleInputChange}
                  required
                />
                
                <Input
                  type="email"
                  name="email"
                  label="Email"
                  value={formData.email}
                  disabled
                  className="bg-gray-50 text-gray-500"
                />
                
                <div className="pt-4 border-t">
                  <h3 className="text-lg font-medium text-gray-800 mb-4">Changer le mot de passe</h3>
                  
                  <div className="space-y-4">
                    <Input
                      type="password"
                      name="current_password"
                      label="Mot de passe actuel"
                      value={formData.current_password}
                      onChange={handleInputChange}
                    />
                    
                    <Input
                      type="password"
                      name="new_password"
                      label="Nouveau mot de passe"
                      value={formData.new_password}
                      onChange={handleInputChange}
                    />
                    
                    <Input
                      type="password"
                      name="confirm_password"
                      label="Confirmer le mot de passe"
                      value={formData.confirm_password}
                      onChange={handleInputChange}
                      error={
                        formData.new_password && 
                        formData.confirm_password && 
                        formData.new_password !== formData.confirm_password 
                          ? 'Les mots de passe ne correspondent pas' 
                          : undefined
                      }
                    />
                  </div>
                </div>
              </div>
              
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setIsEditing(false);
                    setAvatarFile(null);
                    setAvatarPreview(currentUser?.avatar_url || null);
                    setFormData({
                      full_name: currentUser?.full_name || '',
                      email: formData.email,
                      avatar_url: currentUser?.avatar_url || '',
                      current_password: '',
                      new_password: '',
                      confirm_password: '',
                    });
                  }}
                  className={cn("px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-800 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors duration-150")}
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={uploadingAvatar}
                  className={cn(
                    "px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md shadow-sm transition-colors duration-150",
                    uploadingAvatar && "opacity-70 cursor-not-allowed"
                  )}
                >
                  {uploadingAvatar ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                      Enregistrement...
                    </>
                  ) : (
                    "Enregistrer"
                  )}
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
                  className={cn("inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 transition-colors duration-200")}
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
        <div className={cn("bg-white shadow rounded-lg overflow-hidden border border-gray-100 mt-8")}>
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
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleUpdateUserRole(user.id, 'admin');
                                  }}
                                  className={cn("text-purple-600 hover:text-purple-700 transition-colors duration-150 px-2 py-1 rounded hover:bg-purple-50")}
                                  title="Promouvoir en administrateur"
                                >
                                  Promouvoir
                                </button>
                              ) : (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleUpdateUserRole(user.id, 'user');
                                  }}
                                  className={cn("text-gray-600 hover:text-gray-700 transition-colors duration-150 px-2 py-1 rounded hover:bg-gray-50")}
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
  );}