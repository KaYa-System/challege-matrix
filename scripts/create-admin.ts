import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import type { Database } from '../src/types/supabase';

// Lire le fichier .env
const envPath = resolve(process.cwd(), '.env');
const envContent = readFileSync(envPath, 'utf-8');

// Parser les variables d'environnement
const env = Object.fromEntries(
  envContent
    .split('\n')
    .filter(Boolean)
    .map(line => line.split('='))
);

const supabase = createClient<Database>(
  env.VITE_SUPABASE_URL,
  env.VITE_SUPABASE_ANON_KEY
);

async function createAdminAccount() {
  try {
    // 1. Créer le compte dans Auth
    const { data: authData, error: signUpError } = await supabase.auth.signUp({
      email: 'admin@matrix-challenge.com',
      password: 'Admin123!',
      options: {
        data: {
          full_name: 'Administrateur Matrix',
        },
      },
    });

    if (signUpError) throw signUpError;
    if (!authData.user) throw new Error('Erreur lors de la création du compte');

    console.log('✓ Compte Auth créé');

    // 2. Créer le profil utilisateur avec le rôle admin
    const { error: profileError } = await supabase
      .from('users')
      .insert({
        id: authData.user.id,
        full_name: 'Administrateur Matrix',
        email: 'admin@matrix-challenge.com',
        longrich_code: 'ADMIN2024',
        office: 'yop-canaris',
        role: 'admin'
      });

    if (profileError) {
      // En cas d'erreur, supprimer le compte auth créé
      await supabase.auth.admin.deleteUser(authData.user.id);
      throw profileError;
    }

    console.log('✓ Profil admin créé');
    console.log('\nCompte administrateur créé avec succès !');
    console.log('Email: admin@matrix-challenge.com');
    console.log('Mot de passe: Admin123!');

  } catch (err) {
    console.error('Erreur lors de la création du compte admin:', err);
  }
}

createAdminAccount();