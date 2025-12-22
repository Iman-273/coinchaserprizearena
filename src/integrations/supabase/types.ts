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
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      earnings_history: {
        Row: {
          amount: number
          created_at: string | null
          description: string | null
          id: string
          profile_id: string | null
          type: string
          user_id: string | null
        }
        Insert: {
          amount: number
          created_at?: string | null
          description?: string | null
          id?: string
          profile_id?: string | null
          type: string
          user_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          description?: string | null
          id?: string
          profile_id?: string | null
          type?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "earnings_history_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      game_scores: {
        Row: {
          coins_collected: number | null
          coins_earned: number | null
          created_at: string | null
          distance_covered: number | null
          game_duration: number | null
          game_mode: string | null
          id: string
          obstacles_avoided: number | null
          profile_id: string | null
          score: number
          tournament_id: string | null
          user_id: string | null
        }
        Insert: {
          coins_collected?: number | null
          coins_earned?: number | null
          created_at?: string | null
          distance_covered?: number | null
          game_duration?: number | null
          game_mode?: string | null
          id?: string
          obstacles_avoided?: number | null
          profile_id?: string | null
          score: number
          tournament_id?: string | null
          user_id?: string | null
        }
        Update: {
          coins_collected?: number | null
          coins_earned?: number | null
          created_at?: string | null
          distance_covered?: number | null
          game_duration?: number | null
          game_mode?: string | null
          id?: string
          obstacles_avoided?: number | null
          profile_id?: string | null
          score?: number
          tournament_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "game_scores_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_scores_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          customer_name: string | null
          eta: string | null
          id: string
          order_id: string
          product: string
          status: string | null
        }
        Insert: {
          customer_name?: string | null
          eta?: string | null
          id?: string
          order_id: string
          product: string
          status?: string | null
        }
        Update: {
          customer_name?: string | null
          eta?: string | null
          id?: string
          order_id?: string
          product?: string
          status?: string | null
        }
        Relationships: []
      }
      products: {
        Row: {
          category: string | null
          id: string
          name: string
          recommendations: string[] | null
        }
        Insert: {
          category?: string | null
          id?: string
          name: string
          recommendations?: string[] | null
        }
        Update: {
          category?: string | null
          id?: string
          name?: string
          recommendations?: string[] | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bank_account_last4: string | null
          bank_setup_completed: boolean | null
          created_at: string | null
          earnings_balance_usd: number | null
          earnings_history: Json | null
          email: string | null
          full_name: string | null
          gender: string | null
          id: string
          stripe_account_id: string | null
          total_coins: number | null
          total_spent: number | null
          total_winnings: number | null
          tournament_active: boolean | null
          updated_at: string | null
          username: string | null
        }
        Insert: {
          avatar_url?: string | null
          bank_account_last4?: string | null
          bank_setup_completed?: boolean | null
          created_at?: string | null
          earnings_balance_usd?: number | null
          earnings_history?: Json | null
          email?: string | null
          full_name?: string | null
          gender?: string | null
          id: string
          stripe_account_id?: string | null
          total_coins?: number | null
          total_spent?: number | null
          total_winnings?: number | null
          tournament_active?: boolean | null
          updated_at?: string | null
          username?: string | null
        }
        Update: {
          avatar_url?: string | null
          bank_account_last4?: string | null
          bank_setup_completed?: boolean | null
          created_at?: string | null
          earnings_balance_usd?: number | null
          earnings_history?: Json | null
          email?: string | null
          full_name?: string | null
          gender?: string | null
          id?: string
          stripe_account_id?: string | null
          total_coins?: number | null
          total_spent?: number | null
          total_winnings?: number | null
          tournament_active?: boolean | null
          updated_at?: string | null
          username?: string | null
        }
        Relationships: []
      }
      support_tickets: {
        Row: {
          created_at: string | null
          id: string
          issue: string | null
          product: string | null
          status: string | null
          ticket_id: string
          update_notes: string | null
          updated_at: string | null
          user_email: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          issue?: string | null
          product?: string | null
          status?: string | null
          ticket_id: string
          update_notes?: string | null
          updated_at?: string | null
          user_email: string
        }
        Update: {
          created_at?: string | null
          id?: string
          issue?: string | null
          product?: string | null
          status?: string | null
          ticket_id?: string
          update_notes?: string | null
          updated_at?: string | null
          user_email?: string
        }
        Relationships: []
      }
      tournament_participants: {
        Row: {
          entry_payment_id: string | null
          finish_time: string | null
          games_played: number | null
          id: string
          joined_at: string | null
          last_agg_at: string | null
          profile_id: string | null
          total_games: number | null
          total_runs: number | null
          tournament_id: string | null
          user_id: string | null
        }
        Insert: {
          entry_payment_id?: string | null
          finish_time?: string | null
          games_played?: number | null
          id?: string
          joined_at?: string | null
          last_agg_at?: string | null
          profile_id?: string | null
          total_games?: number | null
          total_runs?: number | null
          tournament_id?: string | null
          user_id?: string | null
        }
        Update: {
          entry_payment_id?: string | null
          finish_time?: string | null
          games_played?: number | null
          id?: string
          joined_at?: string | null
          last_agg_at?: string | null
          profile_id?: string | null
          total_games?: number | null
          total_runs?: number | null
          tournament_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tournament_participants_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournament_participants_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
        ]
      }
      tournament_winners: {
        Row: {
          awarded_at: string | null
          created_at: string | null
          final_distance: number | null
          final_score: number
          full_name: string | null
          id: string
          position: number
          prize_amount: number | null
          profile_id: string | null
          tournament_id: string | null
          user_id: string | null
          username: string | null
        }
        Insert: {
          awarded_at?: string | null
          created_at?: string | null
          final_distance?: number | null
          final_score: number
          full_name?: string | null
          id?: string
          position: number
          prize_amount?: number | null
          profile_id?: string | null
          tournament_id?: string | null
          user_id?: string | null
          username?: string | null
        }
        Update: {
          awarded_at?: string | null
          created_at?: string | null
          final_distance?: number | null
          final_score?: number
          full_name?: string | null
          id?: string
          position?: number
          prize_amount?: number | null
          profile_id?: string | null
          tournament_id?: string | null
          user_id?: string | null
          username?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tournament_winners_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournament_winners_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
        ]
      }
      tournaments: {
        Row: {
          created_at: string | null
          end_date: string
          entry_fee: number | null
          first_prize: number | null
          id: string
          join_end_at: string | null
          join_start_at: string | null
          leaderboard_last_recalc_at: string | null
          max_participants: number | null
          name: string
          second_prize: number | null
          start_at: string | null
          state: Database["public"]["Enums"]["tournament_state"] | null
          status: string | null
          third_prize: number | null
          week_key: string | null
          winners: Json | null
        }
        Insert: {
          created_at?: string | null
          end_date: string
          entry_fee?: number | null
          first_prize?: number | null
          id?: string
          join_end_at?: string | null
          join_start_at?: string | null
          leaderboard_last_recalc_at?: string | null
          max_participants?: number | null
          name: string
          second_prize?: number | null
          start_at?: string | null
          state?: Database["public"]["Enums"]["tournament_state"] | null
          status?: string | null
          third_prize?: number | null
          week_key?: string | null
          winners?: Json | null
        }
        Update: {
          created_at?: string | null
          end_date?: string
          entry_fee?: number | null
          first_prize?: number | null
          id?: string
          join_end_at?: string | null
          join_start_at?: string | null
          leaderboard_last_recalc_at?: string | null
          max_participants?: number | null
          name?: string
          second_prize?: number | null
          start_at?: string | null
          state?: Database["public"]["Enums"]["tournament_state"] | null
          status?: string | null
          third_prize?: number | null
          week_key?: string | null
          winners?: Json | null
        }
        Relationships: []
      }
      withdrawal_requests: {
        Row: {
          amount: number
          bank_account_last4: string | null
          created_at: string | null
          expected_arrival_date: string | null
          id: string
          notes: string | null
          processed_at: string | null
          profile_id: string | null
          status: string | null
          stripe_transfer_id: string | null
          user_id: string | null
        }
        Insert: {
          amount: number
          bank_account_last4?: string | null
          created_at?: string | null
          expected_arrival_date?: string | null
          id?: string
          notes?: string | null
          processed_at?: string | null
          profile_id?: string | null
          status?: string | null
          stripe_transfer_id?: string | null
          user_id?: string | null
        }
        Update: {
          amount?: number
          bank_account_last4?: string | null
          created_at?: string | null
          expected_arrival_date?: string | null
          id?: string
          notes?: string | null
          processed_at?: string | null
          profile_id?: string | null
          status?: string | null
          stripe_transfer_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "withdrawal_requests_profile_id_fkey"
            columns: ["profile_id"]
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
      activate_tournament: { Args: never; Returns: undefined }
      can_join_tournament: {
        Args: { p_tournament_id: string; p_user_id: string }
        Returns: boolean
      }
      can_play_tournament: { Args: { user_id: string }; Returns: boolean }
      create_weekly_tournament: { Args: never; Returns: string }
      finalize_tournament: {
        Args: { p_tournament_id: string }
        Returns: undefined
      }
      force_activate_current_tournament: { Args: never; Returns: undefined }
      recompute_leaderboard: {
        Args: { p_tournament_id: string }
        Returns: undefined
      }
      request_withdrawal: {
        Args: { amount: number; user_id: string }
        Returns: string
      }
      save_tournament_progress: {
        Args: {
          p_coins: number
          p_distance: number
          p_score: number
          p_tournament_id: string
          p_user_id: string
        }
        Returns: undefined
      }
    }
    Enums: {
      tournament_state:
        | "UPCOMING"
        | "ACTIVE"
        | "LOCKING"
        | "PAID_OUT"
        | "ARCHIVED"
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
      tournament_state: [
        "UPCOMING",
        "ACTIVE",
        "LOCKING",
        "PAID_OUT",
        "ARCHIVED",
      ],
    },
  },
} as const
