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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      bot_games: {
        Row: {
          bot_elo: number
          bot_id: string
          created_at: string
          id: string
          pgn: string
          plies: number
          rated: boolean
          rating_applied_at: string | null
          reason: string
          result: string
          user_color: string
          user_id: string
        }
        Insert: {
          bot_elo: number
          bot_id: string
          created_at?: string
          id?: string
          pgn: string
          plies: number
          rated?: boolean
          rating_applied_at?: string | null
          reason: string
          result: string
          user_color: string
          user_id: string
        }
        Update: {
          bot_elo?: number
          bot_id?: string
          created_at?: string
          id?: string
          pgn?: string
          plies?: number
          rated?: boolean
          rating_applied_at?: string | null
          reason?: string
          result?: string
          user_color?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bot_games_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      friendships: {
        Row: {
          created_at: string
          friend_id: string
          id: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          friend_id: string
          id?: string
          status: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          friend_id?: string
          id?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      game_invites: {
        Row: {
          color_preference: string
          created_at: string
          expires_at: string
          game_id: string | null
          id: string
          increment_ms: number
          initial_ms: number
          receiver_id: string
          sender_id: string
          status: string
          tc: string
        }
        Insert: {
          color_preference?: string
          created_at?: string
          expires_at?: string
          game_id?: string | null
          id?: string
          increment_ms: number
          initial_ms: number
          receiver_id: string
          sender_id: string
          status?: string
          tc: string
        }
        Update: {
          color_preference?: string
          created_at?: string
          expires_at?: string
          game_id?: string | null
          id?: string
          increment_ms?: number
          initial_ms?: number
          receiver_id?: string
          sender_id?: string
          status?: string
          tc?: string
        }
        Relationships: [
          {
            foreignKeyName: "game_invites_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
        ]
      }
      game_moves: {
        Row: {
          black_ms: number
          created_at: string
          fen: string
          game_id: string
          player_id: string | null
          ply: number
          san: string
          uci: string
          white_ms: number
        }
        Insert: {
          black_ms: number
          created_at?: string
          fen: string
          game_id: string
          player_id?: string | null
          ply: number
          san: string
          uci: string
          white_ms: number
        }
        Update: {
          black_ms?: number
          created_at?: string
          fen?: string
          game_id?: string
          player_id?: string | null
          ply?: number
          san?: string
          uci?: string
          white_ms?: number
        }
        Relationships: [
          {
            foreignKeyName: "game_moves_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
        ]
      }
      games: {
        Row: {
          ai_color: string | null
          ai_engine: string | null
          ai_level: number | null
          black_avatar: string | null
          black_id: string | null
          black_ms: number
          black_name: string | null
          created_at: string
          draw_offer_by: string | null
          ended_at: string | null
          fen: string
          id: string
          increment_ms: number
          initial_ms: number
          mode: string
          pgn: string
          ply: number
          rating_applied_at: string | null
          result: string | null
          revision: number
          started_at: string | null
          status: string
          tc: string
          termination: string | null
          turn: string
          turn_started_at: string | null
          updated_at: string
          white_avatar: string | null
          white_id: string | null
          white_ms: number
          white_name: string | null
        }
        Insert: {
          ai_color?: string | null
          ai_engine?: string | null
          ai_level?: number | null
          black_avatar?: string | null
          black_id?: string | null
          black_ms: number
          black_name?: string | null
          created_at?: string
          draw_offer_by?: string | null
          ended_at?: string | null
          fen?: string
          id?: string
          increment_ms: number
          initial_ms: number
          mode: string
          pgn?: string
          ply?: number
          rating_applied_at?: string | null
          result?: string | null
          revision?: number
          started_at?: string | null
          status?: string
          tc: string
          termination?: string | null
          turn?: string
          turn_started_at?: string | null
          updated_at?: string
          white_avatar?: string | null
          white_id?: string | null
          white_ms: number
          white_name?: string | null
        }
        Update: {
          ai_color?: string | null
          ai_engine?: string | null
          ai_level?: number | null
          black_avatar?: string | null
          black_id?: string | null
          black_ms?: number
          black_name?: string | null
          created_at?: string
          draw_offer_by?: string | null
          ended_at?: string | null
          fen?: string
          id?: string
          increment_ms?: number
          initial_ms?: number
          mode?: string
          pgn?: string
          ply?: number
          rating_applied_at?: string | null
          result?: string | null
          revision?: number
          started_at?: string | null
          status?: string
          tc?: string
          termination?: string | null
          turn?: string
          turn_started_at?: string | null
          updated_at?: string
          white_avatar?: string | null
          white_id?: string | null
          white_ms?: number
          white_name?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string
          country: string | null
          created_at: string
          description: string
          display_name: string
          draws: number
          email: string | null
          games_played: number
          id: string
          losses: number
          peak_rating: number
          rating: number
          theme_pref: string
          updated_at: string
          username: string
          username_changed_at: string | null
          wins: number
        }
        Insert: {
          avatar_url?: string | null
          bio?: string
          country?: string | null
          created_at?: string
          description?: string
          display_name: string
          draws?: number
          email?: string | null
          games_played?: number
          id: string
          losses?: number
          peak_rating?: number
          rating?: number
          theme_pref?: string
          updated_at?: string
          username: string
          username_changed_at?: string | null
          wins?: number
        }
        Update: {
          avatar_url?: string | null
          bio?: string
          country?: string | null
          created_at?: string
          description?: string
          display_name?: string
          draws?: number
          email?: string | null
          games_played?: number
          id?: string
          losses?: number
          peak_rating?: number
          rating?: number
          theme_pref?: string
          updated_at?: string
          username?: string
          username_changed_at?: string | null
          wins?: number
        }
        Relationships: []
      }
      rating_history: {
        Row: {
          bot_game_id: string | null
          created_at: string
          delta: number
          game_id: string | null
          id: number
          mode: string
          opening: string | null
          opponent_label: string
          opponent_rating: number
          pgn: string | null
          rating_after: number
          rating_before: number
          result: string
          time_control: string | null
          user_id: string
        }
        Insert: {
          bot_game_id?: string | null
          created_at?: string
          delta: number
          game_id?: string | null
          id?: never
          mode: string
          opening?: string | null
          opponent_label: string
          opponent_rating: number
          pgn?: string | null
          rating_after: number
          rating_before: number
          result: string
          time_control?: string | null
          user_id: string
        }
        Update: {
          bot_game_id?: string | null
          created_at?: string
          delta?: number
          game_id?: string | null
          id?: never
          mode?: string
          opening?: string | null
          opponent_label?: string
          opponent_rating?: number
          pgn?: string | null
          rating_after?: number
          rating_before?: number
          result?: string
          time_control?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "rating_history_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rating_history_user_id_fkey"
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
      accept_game_invite: { Args: { p_invite_id: string }; Returns: Json }
      apply_online_game_rating: { Args: { p_game_id: string }; Returns: Json }
      cancel_game_invite: { Args: { p_invite_id: string }; Returns: Json }
      commit_move: {
        Args: {
          p_black_ms: number
          p_expected_rev: number
          p_fen: string
          p_game: string
          p_pgn: string
          p_player: string
          p_ply: number
          p_result: string
          p_san: string
          p_termination: string
          p_turn: string
          p_uci: string
          p_white_ms: number
        }
        Returns: {
          ai_color: string | null
          ai_engine: string | null
          ai_level: number | null
          black_avatar: string | null
          black_id: string | null
          black_ms: number
          black_name: string | null
          created_at: string
          draw_offer_by: string | null
          ended_at: string | null
          fen: string
          id: string
          increment_ms: number
          initial_ms: number
          mode: string
          pgn: string
          ply: number
          rating_applied_at: string | null
          result: string | null
          revision: number
          started_at: string | null
          status: string
          tc: string
          termination: string | null
          turn: string
          turn_started_at: string | null
          updated_at: string
          white_avatar: string | null
          white_id: string | null
          white_ms: number
          white_name: string | null
        }
        SetofOptions: {
          from: "*"
          to: "games"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      create_game_invite: {
        Args: { p_color?: string; p_receiver_id: string; p_tc: string }
        Returns: Json
      }
      decline_game_invite: { Args: { p_invite_id: string }; Returns: Json }
      leaderboard: {
        Args: { p_limit?: number }
        Returns: {
          avatar_url: string
          display_name: string
          draws: number
          games_played: number
          id: string
          losses: number
          peak_rating: number
          rating: number
          username: string
          wins: number
        }[]
      }
      queue_game: {
        Args: {
          p_avatar: string
          p_inc: number
          p_initial: number
          p_name: string
          p_tc: string
          p_user: string
        }
        Returns: {
          ai_color: string | null
          ai_engine: string | null
          ai_level: number | null
          black_avatar: string | null
          black_id: string | null
          black_ms: number
          black_name: string | null
          created_at: string
          draw_offer_by: string | null
          ended_at: string | null
          fen: string
          id: string
          increment_ms: number
          initial_ms: number
          mode: string
          pgn: string
          ply: number
          rating_applied_at: string | null
          result: string | null
          revision: number
          started_at: string | null
          status: string
          tc: string
          termination: string | null
          turn: string
          turn_started_at: string | null
          updated_at: string
          white_avatar: string | null
          white_id: string | null
          white_ms: number
          white_name: string | null
        }
        SetofOptions: {
          from: "*"
          to: "games"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      remove_friend: { Args: { p_target_id: string }; Returns: Json }
      respond_friend_request: {
        Args: { p_action: string; p_friendship_id: string }
        Returns: Json
      }
      search_players: {
        Args: { p_limit?: number; p_query: string }
        Returns: {
          avatar_url: string
          display_name: string
          id: string
          username: string
        }[]
      }
      send_friend_request: { Args: { p_target_id: string }; Returns: Json }
    }
    Enums: {
      [_ in never]: never
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
