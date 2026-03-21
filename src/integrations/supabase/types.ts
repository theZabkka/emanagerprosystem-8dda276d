export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      activity_log: {
        Row: {
          action: string
          created_at: string | null
          details: Json | null
          entity_id: string | null
          entity_name: string | null
          entity_type: string | null
          id: string
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          details?: Json | null
          entity_id?: string | null
          entity_name?: string | null
          entity_type?: string | null
          id?: string
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          details?: Json | null
          entity_id?: string | null
          entity_name?: string | null
          entity_type?: string | null
          id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "activity_log_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      channel_members: {
        Row: {
          channel_id: string
          joined_at: string | null
          user_id: string
        }
        Insert: {
          channel_id: string
          joined_at?: string | null
          user_id: string
        }
        Update: {
          channel_id?: string
          joined_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "channel_members_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "channels"
            referencedColumns: ["id"]
          },
        ]
      }
      channels: {
        Row: {
          created_at: string | null
          id: string
          is_direct: boolean
          name: string
          type: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_direct?: boolean
          name: string
          type?: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_direct?: boolean
          name?: string
          type?: string
        }
        Relationships: []
      }
      checklist_items: {
        Row: {
          checklist_id: string
          created_at: string | null
          evidence_url: string | null
          id: string
          is_completed: boolean | null
          is_na: boolean | null
          title: string
        }
        Insert: {
          checklist_id: string
          created_at?: string | null
          evidence_url?: string | null
          id?: string
          is_completed?: boolean | null
          is_na?: boolean | null
          title: string
        }
        Update: {
          checklist_id?: string
          created_at?: string | null
          evidence_url?: string | null
          id?: string
          is_completed?: boolean | null
          is_na?: boolean | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "checklist_items_checklist_id_fkey"
            columns: ["checklist_id"]
            isOneToOne: false
            referencedRelation: "checklists"
            referencedColumns: ["id"]
          },
        ]
      }
      checklists: {
        Row: {
          created_at: string | null
          id: string
          task_id: string
          title: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          task_id: string
          title: string
        }
        Update: {
          created_at?: string | null
          id?: string
          task_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "checklists_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      client_contracts: {
        Row: {
          client_id: string
          created_at: string | null
          created_by: string | null
          end_date: string | null
          file_url: string | null
          id: string
          name: string
          start_date: string | null
          status: string
          type: string
          value: number | null
        }
        Insert: {
          client_id: string
          created_at?: string | null
          created_by?: string | null
          end_date?: string | null
          file_url?: string | null
          id?: string
          name: string
          start_date?: string | null
          status?: string
          type?: string
          value?: number | null
        }
        Update: {
          client_id?: string
          created_at?: string | null
          created_by?: string | null
          end_date?: string | null
          file_url?: string | null
          id?: string
          name?: string
          start_date?: string | null
          status?: string
          type?: string
          value?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "client_contracts_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_contracts_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      client_conversations: {
        Row: {
          client_id: string
          created_at: string | null
          id: string
          participant_id: string | null
          summary: string | null
          type: string
        }
        Insert: {
          client_id: string
          created_at?: string | null
          id?: string
          participant_id?: string | null
          summary?: string | null
          type?: string
        }
        Update: {
          client_id?: string
          created_at?: string | null
          id?: string
          participant_id?: string | null
          summary?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_conversations_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_conversations_participant_id_fkey"
            columns: ["participant_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      client_files: {
        Row: {
          client_id: string
          created_at: string | null
          id: string
          name: string
          size: number | null
          uploaded_by: string | null
          url: string | null
        }
        Insert: {
          client_id: string
          created_at?: string | null
          id?: string
          name: string
          size?: number | null
          uploaded_by?: string | null
          url?: string | null
        }
        Update: {
          client_id?: string
          created_at?: string | null
          id?: string
          name?: string
          size?: number | null
          uploaded_by?: string | null
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_files_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_files_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      client_ideas: {
        Row: {
          client_id: string
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          status: string
          title: string
          votes: number | null
        }
        Insert: {
          client_id: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          status?: string
          title: string
          votes?: number | null
        }
        Update: {
          client_id?: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          status?: string
          title?: string
          votes?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "client_ideas_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_ideas_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      client_invoice_data: {
        Row: {
          city: string | null
          client_id: string
          company_name: string | null
          id: string
          nip: string | null
          postal_code: string | null
          street: string | null
          updated_at: string | null
        }
        Insert: {
          city?: string | null
          client_id: string
          company_name?: string | null
          id?: string
          nip?: string | null
          postal_code?: string | null
          street?: string | null
          updated_at?: string | null
        }
        Update: {
          city?: string | null
          client_id?: string
          company_name?: string | null
          id?: string
          nip?: string | null
          postal_code?: string | null
          street?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_invoice_data_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: true
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      client_offers: {
        Row: {
          client_id: string
          created_at: string | null
          created_by: string | null
          file_url: string | null
          id: string
          name: string
          status: string
          value: number | null
        }
        Insert: {
          client_id: string
          created_at?: string | null
          created_by?: string | null
          file_url?: string | null
          id?: string
          name: string
          status?: string
          value?: number | null
        }
        Update: {
          client_id?: string
          created_at?: string | null
          created_by?: string | null
          file_url?: string | null
          id?: string
          name?: string
          status?: string
          value?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "client_offers_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_offers_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      client_orders: {
        Row: {
          client_id: string
          created_at: string | null
          created_by: string | null
          due_date: string | null
          id: string
          name: string
          status: string
          value: number | null
        }
        Insert: {
          client_id: string
          created_at?: string | null
          created_by?: string | null
          due_date?: string | null
          id?: string
          name: string
          status?: string
          value?: number | null
        }
        Update: {
          client_id?: string
          created_at?: string | null
          created_by?: string | null
          due_date?: string | null
          id?: string
          name?: string
          status?: string
          value?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "client_orders_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_orders_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      client_social_accounts: {
        Row: {
          client_id: string
          created_at: string | null
          followers: number | null
          handle: string
          id: string
          last_post_at: string | null
          platform: string
          url: string | null
        }
        Insert: {
          client_id: string
          created_at?: string | null
          followers?: number | null
          handle: string
          id?: string
          last_post_at?: string | null
          platform: string
          url?: string | null
        }
        Update: {
          client_id?: string
          created_at?: string | null
          followers?: number | null
          handle?: string
          id?: string
          last_post_at?: string | null
          platform?: string
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_social_accounts_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          address: string | null
          city: string | null
          contact_person: string | null
          country: string | null
          created_at: string | null
          email: string | null
          id: string
          monthly_value: number | null
          name: string
          nip: string | null
          onboarding_steps: Json | null
          phone: string | null
          postal_code: string | null
          public_status_token: string | null
          score: number | null
          status: Database["public"]["Enums"]["client_status"] | null
          tags: string[] | null
          voivodeship: string | null
        }
        Insert: {
          address?: string | null
          city?: string | null
          contact_person?: string | null
          country?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          monthly_value?: number | null
          name: string
          nip?: string | null
          onboarding_steps?: Json | null
          phone?: string | null
          postal_code?: string | null
          public_status_token?: string | null
          score?: number | null
          status?: Database["public"]["Enums"]["client_status"] | null
          tags?: string[] | null
          voivodeship?: string | null
        }
        Update: {
          address?: string | null
          city?: string | null
          contact_person?: string | null
          country?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          monthly_value?: number | null
          name?: string
          nip?: string | null
          onboarding_steps?: Json | null
          phone?: string | null
          postal_code?: string | null
          public_status_token?: string | null
          score?: number | null
          status?: Database["public"]["Enums"]["client_status"] | null
          tags?: string[] | null
          voivodeship?: string | null
        }
        Relationships: []
      }
      comments: {
        Row: {
          client_reply: string | null
          content: string
          created_at: string | null
          id: string
          requires_client_reply: boolean | null
          task_id: string
          type: string | null
          user_id: string
        }
        Insert: {
          client_reply?: string | null
          content: string
          created_at?: string | null
          id?: string
          requires_client_reply?: boolean | null
          task_id: string
          type?: string | null
          user_id: string
        }
        Update: {
          client_reply?: string | null
          content?: string
          created_at?: string | null
          id?: string
          requires_client_reply?: boolean | null
          task_id?: string
          type?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "comments_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      internal_task_ratings: {
        Row: {
          created_at: string
          id: string
          rating: number
          task_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          rating: number
          task_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          rating?: number
          task_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "internal_task_ratings_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "internal_tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "internal_task_ratings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      internal_tasks: {
        Row: {
          completed_at: string | null
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          status: string
          title: string
          type: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          status?: string
          title: string
          type?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          status?: string
          title?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "internal_tasks_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      message_reactions: {
        Row: {
          created_at: string | null
          emoji: string
          id: string
          message_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          emoji: string
          id?: string
          message_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          emoji?: string
          id?: string
          message_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_reactions_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          attachment_name: string | null
          attachment_type: string | null
          attachment_url: string | null
          channel_id: string
          content: string
          created_at: string | null
          id: string
          sender_id: string
        }
        Insert: {
          attachment_name?: string | null
          attachment_type?: string | null
          attachment_url?: string | null
          channel_id: string
          content: string
          created_at?: string | null
          id?: string
          sender_id: string
        }
        Update: {
          attachment_name?: string | null
          attachment_type?: string | null
          attachment_url?: string | null
          channel_id?: string
          content?: string
          created_at?: string | null
          id?: string
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "channels"
            referencedColumns: ["id"]
          },
        ]
      }
      pipeline_deals: {
        Row: {
          assigned_to: string | null
          client_id: string | null
          created_at: string | null
          days_in_stage: number | null
          expected_close_date: string | null
          id: string
          last_contact_date: string | null
          next_action: string | null
          probability: number | null
          stage: Database["public"]["Enums"]["pipeline_stage"] | null
          status_updated_at: string | null
          title: string
          value: number | null
        }
        Insert: {
          assigned_to?: string | null
          client_id?: string | null
          created_at?: string | null
          days_in_stage?: number | null
          expected_close_date?: string | null
          id?: string
          last_contact_date?: string | null
          next_action?: string | null
          probability?: number | null
          stage?: Database["public"]["Enums"]["pipeline_stage"] | null
          status_updated_at?: string | null
          title: string
          value?: number | null
        }
        Update: {
          assigned_to?: string | null
          client_id?: string | null
          created_at?: string | null
          days_in_stage?: number | null
          expected_close_date?: string | null
          id?: string
          last_contact_date?: string | null
          next_action?: string | null
          probability?: number | null
          stage?: Database["public"]["Enums"]["pipeline_stage"] | null
          status_updated_at?: string | null
          title?: string
          value?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "pipeline_deals_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pipeline_deals_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          client_id: string | null
          created_at: string | null
          department: string | null
          email: string | null
          full_name: string | null
          id: string
          phone: string | null
          position: string | null
          role: string | null
          status: string | null
          website: string | null
        }
        Insert: {
          avatar_url?: string | null
          client_id?: string | null
          created_at?: string | null
          department?: string | null
          email?: string | null
          full_name?: string | null
          id: string
          phone?: string | null
          position?: string | null
          role?: string | null
          status?: string | null
          website?: string | null
        }
        Update: {
          avatar_url?: string | null
          client_id?: string | null
          created_at?: string | null
          department?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          phone?: string | null
          position?: string | null
          role?: string | null
          status?: string | null
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          ai_summary: string | null
          brief_data: Json | null
          client_id: string | null
          created_at: string | null
          description: string | null
          end_date: string | null
          id: string
          manager_id: string | null
          name: string
          start_date: string | null
          status: string | null
        }
        Insert: {
          ai_summary?: string | null
          brief_data?: Json | null
          client_id?: string | null
          created_at?: string | null
          description?: string | null
          end_date?: string | null
          id?: string
          manager_id?: string | null
          name: string
          start_date?: string | null
          status?: string | null
        }
        Update: {
          ai_summary?: string | null
          brief_data?: Json | null
          client_id?: string | null
          created_at?: string | null
          description?: string | null
          end_date?: string | null
          id?: string
          manager_id?: string | null
          name?: string
          start_date?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "projects_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      role_permissions: {
        Row: {
          can_view: boolean
          created_at: string | null
          id: string
          module_name: string
          role_name: string
        }
        Insert: {
          can_view?: boolean
          created_at?: string | null
          id?: string
          module_name: string
          role_name: string
        }
        Update: {
          can_view?: boolean
          created_at?: string | null
          id?: string
          module_name?: string
          role_name?: string
        }
        Relationships: []
      }
      subtasks: {
        Row: {
          assigned_to: string | null
          created_at: string | null
          id: string
          is_completed: boolean | null
          task_id: string
          title: string
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string | null
          id?: string
          is_completed?: boolean | null
          task_id: string
          title: string
        }
        Update: {
          assigned_to?: string | null
          created_at?: string | null
          id?: string
          is_completed?: boolean | null
          task_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "subtasks_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subtasks_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      task_assignments: {
        Row: {
          role: Database["public"]["Enums"]["assignment_role"] | null
          task_id: string
          user_id: string
        }
        Insert: {
          role?: Database["public"]["Enums"]["assignment_role"] | null
          task_id: string
          user_id: string
        }
        Update: {
          role?: Database["public"]["Enums"]["assignment_role"] | null
          task_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_assignments_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_assignments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      task_corrections: {
        Row: {
          created_at: string | null
          created_by: string | null
          description: string
          id: string
          resolved_at: string | null
          severity: string
          status: string
          task_id: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          description: string
          id?: string
          resolved_at?: string | null
          severity?: string
          status?: string
          task_id: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          description?: string
          id?: string
          resolved_at?: string | null
          severity?: string
          status?: string
          task_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_corrections_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_corrections_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      task_materials: {
        Row: {
          created_at: string | null
          id: string
          is_visible_to_client: boolean | null
          name: string
          task_id: string
          type: string | null
          uploaded_by: string | null
          url: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_visible_to_client?: boolean | null
          name: string
          task_id: string
          type?: string | null
          uploaded_by?: string | null
          url?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_visible_to_client?: boolean | null
          name?: string
          task_id?: string
          type?: string | null
          uploaded_by?: string | null
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "task_materials_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_materials_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      task_status_history: {
        Row: {
          changed_by: string | null
          created_at: string | null
          duration_seconds: number | null
          id: string
          new_status: string
          note: string | null
          old_status: string | null
          status_entered_at: string | null
          status_exited_at: string | null
          task_id: string
        }
        Insert: {
          changed_by?: string | null
          created_at?: string | null
          duration_seconds?: number | null
          id?: string
          new_status: string
          note?: string | null
          old_status?: string | null
          status_entered_at?: string | null
          status_exited_at?: string | null
          task_id: string
        }
        Update: {
          changed_by?: string | null
          created_at?: string | null
          duration_seconds?: number | null
          id?: string
          new_status?: string
          note?: string | null
          old_status?: string | null
          status_entered_at?: string | null
          status_exited_at?: string | null
          task_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_status_history_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_status_history_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          accepted_responsibility_by: string | null
          brief_deliverable: string | null
          brief_dont_do: string | null
          brief_format: string | null
          brief_goal: string | null
          brief_input_materials: string | null
          brief_inspiration: string | null
          bug_description: string | null
          bug_reason: string | null
          bug_severity: string | null
          client_id: string | null
          client_review_accepted_by: string | null
          correction_severity: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          due_date: string | null
          estimated_time: number | null
          id: string
          is_archived: boolean
          is_client_visible: boolean | null
          is_video_task: boolean | null
          logged_time: number | null
          not_understood: boolean | null
          not_understood_at: string | null
          parent_task_id: string | null
          priority: Database["public"]["Enums"]["task_priority"] | null
          project_id: string | null
          status: Database["public"]["Enums"]["task_status"] | null
          status_updated_at: string | null
          title: string
          type: string | null
          updated_at: string | null
          verification_start_time: string | null
        }
        Insert: {
          accepted_responsibility_by?: string | null
          brief_deliverable?: string | null
          brief_dont_do?: string | null
          brief_format?: string | null
          brief_goal?: string | null
          brief_input_materials?: string | null
          brief_inspiration?: string | null
          bug_description?: string | null
          bug_reason?: string | null
          bug_severity?: string | null
          client_id?: string | null
          client_review_accepted_by?: string | null
          correction_severity?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          estimated_time?: number | null
          id?: string
          is_archived?: boolean
          is_client_visible?: boolean | null
          is_video_task?: boolean | null
          logged_time?: number | null
          not_understood?: boolean | null
          not_understood_at?: string | null
          parent_task_id?: string | null
          priority?: Database["public"]["Enums"]["task_priority"] | null
          project_id?: string | null
          status?: Database["public"]["Enums"]["task_status"] | null
          status_updated_at?: string | null
          title: string
          type?: string | null
          updated_at?: string | null
          verification_start_time?: string | null
        }
        Update: {
          accepted_responsibility_by?: string | null
          brief_deliverable?: string | null
          brief_dont_do?: string | null
          brief_format?: string | null
          brief_goal?: string | null
          brief_input_materials?: string | null
          brief_inspiration?: string | null
          bug_description?: string | null
          bug_reason?: string | null
          bug_severity?: string | null
          client_id?: string | null
          client_review_accepted_by?: string | null
          correction_severity?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          estimated_time?: number | null
          id?: string
          is_archived?: boolean
          is_client_visible?: boolean | null
          is_video_task?: boolean | null
          logged_time?: number | null
          not_understood?: boolean | null
          not_understood_at?: string | null
          parent_task_id?: string | null
          priority?: Database["public"]["Enums"]["task_priority"] | null
          project_id?: string | null
          status?: Database["public"]["Enums"]["task_status"] | null
          status_updated_at?: string | null
          title?: string
          type?: string | null
          updated_at?: string | null
          verification_start_time?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tasks_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_parent_task_id_fkey"
            columns: ["parent_task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      time_logs: {
        Row: {
          created_at: string | null
          description: string | null
          duration: number
          id: string
          phase: string | null
          task_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          duration?: number
          id?: string
          phase?: string | null
          task_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          duration?: number
          id?: string
          phase?: string | null
          task_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "time_logs_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "time_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_task_positions: {
        Row: {
          id: string
          position: number
          task_id: string
          user_id: string
        }
        Insert: {
          id?: string
          position?: number
          task_id: string
          user_id: string
        }
        Update: {
          id?: string
          position?: number
          task_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_task_positions_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_task_positions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      change_task_status: {
        Args: {
          _changed_by: string
          _new_status: Database["public"]["Enums"]["task_status"]
          _note?: string
          _task_id: string
        }
        Returns: undefined
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_project_member: {
        Args: { _project_id: string; _user_id: string }
        Returns: boolean
      }
      is_staff: { Args: { _user_id: string }; Returns: boolean }
      is_task_member: {
        Args: { _task_id: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user" | "superadmin"
      assignment_role: "primary" | "collaborator" | "reviewer"
      client_status:
        | "active"
        | "potential"
        | "negotiations"
        | "project"
        | "inactive"
      pipeline_stage:
        | "potential"
        | "contact"
        | "offer_sent"
        | "negotiations"
        | "won"
        | "lost"
      task_priority: "critical" | "high" | "medium" | "low"
      task_status:
        | "new"
        | "todo"
        | "in_progress"
        | "review"
        | "corrections"
        | "client_review"
        | "done"
        | "cancelled"
        | "client_verified"
        | "closed"
        | "waiting_for_client"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "moderator", "user", "superadmin"],
      assignment_role: ["primary", "collaborator", "reviewer"],
      client_status: [
        "active",
        "potential",
        "negotiations",
        "project",
        "inactive",
      ],
      pipeline_stage: [
        "potential",
        "contact",
        "offer_sent",
        "negotiations",
        "won",
        "lost",
      ],
      task_priority: ["critical", "high", "medium", "low"],
      task_status: [
        "new",
        "todo",
        "in_progress",
        "review",
        "corrections",
        "client_review",
        "done",
        "cancelled",
        "client_verified",
        "closed",
        "waiting_for_client",
      ],
    },
  },
} as const
