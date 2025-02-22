/*
  # Données initiales pour le challenge Matrix

  1. Données ajoutées
    - Challenge de niveau 1 actif
    - Trois récompenses associées au challenge
    
  2. Période
    - Du 1er mars au 31 mars 2024
    - Soumissions autorisées du dimanche au lundi
    - Horaires : 17h00 à 18h00
*/

-- Insertion du premier challenge
INSERT INTO challenges (
  title,
  description,
  level,
  start_date,
  end_date,
  submission_start,
  submission_end,
  submission_days,
  min_points,
  status
) VALUES (
  'Challenge Matrix - Niveau 1',
  'Atteignez un MX Global de 300 points en développant vos trois branches principales.',
  1,
  '2024-03-01 00:00:00+00',
  '2024-03-31 23:59:59+00',
  '17:00:00',
  '18:00:00',
  ARRAY['SUNDAY', 'MONDAY'],
  300,
  'active'
);

-- Insertion des récompenses
WITH challenge AS (
  SELECT id FROM challenges WHERE level = 1 AND status = 'active' LIMIT 1
)
INSERT INTO rewards (
  challenge_id,
  title,
  description,
  type,
  min_points,
  image_url
)
SELECT
  challenge.id,
  title,
  description,
  type,
  min_points,
  image_url
FROM challenge, (
  VALUES
    (
      'Badge Matrix Bronze',
      'Débloquez le badge Matrix Bronze et rejoignez l''élite',
      'badge',
      100,
      'https://images.unsplash.com/photo-1635439340237-299277c3c230?w=800&auto=format&fit=crop&q=60'
    ),
    (
      'Bonus Matrix',
      'Recevez un bonus spécial pour votre performance',
      'bonus',
      200,
      'https://images.unsplash.com/photo-1638913662180-aaa8aef49296?w=800&auto=format&fit=crop&q=60'
    ),
    (
      'Pack Produits Premium',
      'Un assortiment exclusif de produits Longrich',
      'product',
      300,
      'https://images.unsplash.com/photo-1612817288484-6f916006741a?w=800&auto=format&fit=crop&q=60'
    )
) AS r(title, description, type, min_points, image_url);