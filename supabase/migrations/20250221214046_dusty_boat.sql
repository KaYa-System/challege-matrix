/*
  # Ajout de nouveaux challenges

  1. Nouveaux Challenges
    - Challenge Matrix Niveau 2 (Intermédiaire)
    - Challenge Matrix Niveau 3 (Expert)

  2. Nouvelles Récompenses
    - 3 récompenses pour chaque nouveau challenge
    - Récompenses progressives basées sur les points
*/

-- Challenge Niveau 2
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
  'Challenge Matrix - Niveau 2',
  'Développez votre réseau et atteignez un MX Global de 600 points en optimisant vos trois branches principales.',
  2,
  '2024-04-01 00:00:00+00',
  '2024-04-30 23:59:59+00',
  '17:00:00',
  '18:00:00',
  ARRAY['SUNDAY', 'MONDAY', 'TUESDAY'],
  600,
  'draft'
);

-- Challenge Niveau 3
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
  'Challenge Matrix - Niveau 3',
  'Devenez un expert Matrix en atteignant un MX Global de 1000 points et développez un réseau solide et équilibré.',
  3,
  '2024-05-01 00:00:00+00',
  '2024-05-31 23:59:59+00',
  '17:00:00',
  '18:00:00',
  ARRAY['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY'],
  1000,
  'draft'
);

-- Récompenses pour le Challenge Niveau 2
WITH challenge_2 AS (
  SELECT id FROM challenges WHERE level = 2 LIMIT 1
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
  challenge_2.id,
  title,
  description,
  type,
  min_points,
  image_url
FROM challenge_2, (
  VALUES
    (
      'Badge Matrix Argent',
      'Débloquez le prestigieux badge Matrix Argent',
      'badge',
      200,
      'https://images.unsplash.com/photo-1635439340461-5c5a262bff7a?w=800&auto=format&fit=crop&q=60'
    ),
    (
      'Pack Formation Premium',
      'Accédez à des formations exclusives pour développer votre réseau',
      'bonus',
      400,
      'https://images.unsplash.com/photo-1524178232363-1fb2b075b655?w=800&auto=format&fit=crop&q=60'
    ),
    (
      'Pack Business Elite',
      'Un ensemble complet d''outils et produits pour votre développement',
      'product',
      600,
      'https://images.unsplash.com/photo-1626285861696-9f0bf5a49c6d?w=800&auto=format&fit=crop&q=60'
    )
) AS r(title, description, type, min_points, image_url);

-- Récompenses pour le Challenge Niveau 3
WITH challenge_3 AS (
  SELECT id FROM challenges WHERE level = 3 LIMIT 1
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
  challenge_3.id,
  title,
  description,
  type,
  min_points,
  image_url
FROM challenge_3, (
  VALUES
    (
      'Badge Matrix Or',
      'Le badge ultime réservé aux experts Matrix',
      'badge',
      400,
      'https://images.unsplash.com/photo-1635439340237-299277c3c230?w=800&auto=format&fit=crop&q=60'
    ),
    (
      'Programme Mentor Elite',
      'Devenez mentor et bénéficiez d''avantages exclusifs',
      'bonus',
      700,
      'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=800&auto=format&fit=crop&q=60'
    ),
    (
      'Pack Leader Suprême',
      'Le package le plus complet pour les leaders Matrix',
      'product',
      1000,
      'https://images.unsplash.com/photo-1620288627223-53302f4e8c74?w=800&auto=format&fit=crop&q=60'
    )
) AS r(title, description, type, min_points, image_url);