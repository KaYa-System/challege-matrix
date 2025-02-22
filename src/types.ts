export type Office = 'yop-canaris' | 'cocody-insacc' | 'annani' | 'attingier';

export interface User {
  id: string;
  fullName: string;
  email: string;
  longrichCode: string;
  office: Office;
}

export interface MatrixData {
  mxf: number; // Branche Forte
  mxm: number; // Pied de paiement 1
  mx: number;  // Dernier pied de paiement
  mxGlobal: number; // Total
  screenshot: string;
  submissionDate: Date;
}