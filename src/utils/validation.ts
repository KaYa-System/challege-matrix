import { z } from 'zod';

export const registrationSchema = z.object({
  fullName: z.string().min(3, 'Le nom complet est requis'),
  email: z.string().email('Email invalide'),
  longrichCode: z.string().min(6, 'Code Longrich invalide'),
  office: z.enum(['yop-canaris', 'cocody-insacc', 'annani', 'attingier'], {
    errorMap: () => ({ message: 'Veuillez sélectionner un bureau' }),
  }),
});

export const loginSchema = z.object({
  email: z.string().email('Email invalide'),
  longrichCode: z.string().min(6, 'Code Longrich invalide'),
});

export const matrixDataSchema = z.object({
  mxf: z.number().min(0, 'La valeur doit être positive'),
  mxm: z.number().min(0, 'La valeur doit être positive'),
  mx: z.number().min(0, 'La valeur doit être positive'),
  screenshot: z.custom<File>((val) => val instanceof File, {
    message: 'La capture d\'écran est requise',
  })
  .refine((file) => file instanceof File && file.size <= 10 * 1024 * 1024, {
    message: 'La taille du fichier ne doit pas dépasser 10MB',
  })
  .refine(
    (file) => 
      file instanceof File && 
      ['image/jpeg', 'image/png', 'image/gif'].includes(file.type),
    {
      message: 'Format de fichier non supporté. Utilisez JPG, PNG ou GIF',
    }
  ),
});

export type RegistrationData = z.infer<typeof registrationSchema>;
export type LoginData = z.infer<typeof loginSchema>;
export type MatrixSubmissionData = z.infer<typeof matrixDataSchema>;