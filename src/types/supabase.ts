export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          full_name: string
          email: string
          longrich_code: string
          office: 'yop-canaris' | 'cocody-insacc' | 'annani' | 'attingier'
          created_at: string
          updated_at: string
          role: 'user' | 'admin'
        }
        Insert: {
          id?: string
          full_name: string
          email: string
          longrich_code: string
          office: 'yop-canaris' | 'cocody-insacc' | 'annani' | 'attingier'
          created_at?: string
          updated_at?: string
          role?: 'user' | 'admin'
        }
        Update: {
          id?: string
          full_name?: string
          email?: string
          longrich_code?: string
          office?: 'yop-canaris' | 'cocody-insacc' | 'annani' | 'attingier'
          created_at?: string
          updated_at?: string
          role?: 'user' | 'admin'
        }
      }
      matrix_submissions: {
        Row: {
          id: string
          user_id: string
          mxf: number
          mxm: number
          mx: number
          mx_global: number
          screenshot_url: string
          submission_date: string
          status: 'pending' | 'validated' | 'rejected'
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          mxf: number
          mxm: number
          mx: number
          screenshot_url: string
          submission_date?: string
          status?: 'pending' | 'validated' | 'rejected'
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          mxf?: number
          mxm?: number
          mx?: number
          screenshot_url?: string
          submission_date?: string
          status?: 'pending' | 'validated' | 'rejected'
          created_at?: string
        }
      }
      challenges: {
        Row: {
          id: string
          title: string
          description: string
          level: number
          start_date: string
          end_date: string
          submission_start: string
          submission_end: string
          submission_days: string[]
          min_points: number
          status: 'draft' | 'active' | 'completed'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          title: string
          description: string
          level: number
          start_date: string
          end_date: string
          submission_start: string
          submission_end: string
          submission_days: string[]
          min_points?: number
          status?: 'draft' | 'active' | 'completed'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          title?: string
          description?: string
          level?: number
          start_date?: string
          end_date?: string
          submission_start?: string
          submission_end?: string
          submission_days?: string[]
          min_points?: number
          status?: 'draft' | 'active' | 'completed'
          created_at?: string
          updated_at?: string
        }
      }
      rewards: {
        Row: {
          id: string
          challenge_id: string
          title: string
          description: string
          image_url: string | null
          type: 'product' | 'badge' | 'bonus'
          min_points: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          challenge_id: string
          title: string
          description: string
          image_url?: string | null
          type: 'product' | 'badge' | 'bonus'
          min_points?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          challenge_id?: string
          title?: string
          description?: string
          image_url?: string | null
          type?: 'product' | 'badge' | 'bonus'
          min_points?: number
          created_at?: string
          updated_at?: string
        }
      }
      challenge_participants: {
        Row: {
          id: string
          user_id: string
          challenge_id: string
          current_points: number
          status: 'active' | 'completed' | 'failed'
          completed_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          challenge_id: string
          current_points?: number
          status?: 'active' | 'completed' | 'failed'
          completed_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          challenge_id?: string
          current_points?: number
          status?: 'active' | 'completed' | 'failed'
          completed_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
    }
    Functions: {
      is_submission_allowed: {
        Args: {
          challenge_id: string
        }
        Returns: boolean
      }
    }
  }
}