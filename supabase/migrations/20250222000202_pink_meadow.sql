-- Création du bucket de stockage pour les captures d'écran
INSERT INTO storage.buckets (id, name, public)
VALUES ('screenshots', 'screenshots', true);

-- Politique pour permettre aux utilisateurs authentifiés de télécharger des fichiers
CREATE POLICY "Users can upload screenshots"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'screenshots' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Politique pour permettre à tout le monde de lire les fichiers
CREATE POLICY "Anyone can view screenshots"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'screenshots');

-- Politique pour permettre aux utilisateurs de supprimer leurs propres fichiers
CREATE POLICY "Users can delete own screenshots"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'screenshots' AND
  auth.uid()::text = (storage.foldername(name))[1]
);