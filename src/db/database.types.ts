export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  graphql_public: {
    Tables: Record<never, never>;
    Views: Record<never, never>;
    Functions: {
      graphql: {
        Args: {
          extensions?: Json;
          operationName?: string;
          query?: string;
          variables?: Json;
        };
        Returns: Json;
      };
    };
    Enums: Record<never, never>;
    CompositeTypes: Record<never, never>;
  };
  public: {
    Tables: {
      ai_generation_events: {
        Row: {
          completion_tokens: number | null;
          created_at: string;
          day_utc: string | null;
          id: string;
          is_random: boolean;
          latency_ms: number | null;
          model: string | null;
          prompt_tokens: number | null;
          random_domain_label: string | null;
          status: string;
          topic_id: string | null;
          user_id: string;
        };
        Insert: {
          completion_tokens?: number | null;
          created_at?: string;
          day_utc?: string | null;
          id?: string;
          is_random?: boolean;
          latency_ms?: number | null;
          model?: string | null;
          prompt_tokens?: number | null;
          random_domain_label?: string | null;
          status: string;
          topic_id?: string | null;
          user_id: string;
        };
        Update: {
          completion_tokens?: number | null;
          created_at?: string;
          day_utc?: string | null;
          id?: string;
          is_random?: boolean;
          latency_ms?: number | null;
          model?: string | null;
          prompt_tokens?: number | null;
          random_domain_label?: string | null;
          status?: string;
          topic_id?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "ai_generation_events_topic_id_fkey";
            columns: ["topic_id"];
            isOneToOne: false;
            referencedRelation: "topics";
            referencedColumns: ["id"];
          },
        ];
      };
      collections: {
        Row: {
          created_at: string;
          id: string;
          name: string;
          system_key: string | null;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          name: string;
          system_key?: string | null;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          name?: string;
          system_key?: string | null;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      flashcards: {
        Row: {
          back: string;
          created_at: string;
          edited_by_user: boolean;
          front: string;
          id: string;
          is_favorite: boolean;
          source: string;
          topic_id: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          back: string;
          created_at?: string;
          edited_by_user?: boolean;
          front: string;
          id?: string;
          is_favorite?: boolean;
          source: string;
          topic_id: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          back?: string;
          created_at?: string;
          edited_by_user?: boolean;
          front?: string;
          id?: string;
          is_favorite?: boolean;
          source?: string;
          topic_id?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "flashcards_fk_topic_owner";
            columns: ["topic_id", "user_id"];
            isOneToOne: false;
            referencedRelation: "topics";
            referencedColumns: ["id", "user_id"];
          },
        ];
      };
      profiles: {
        Row: {
          created_at: string;
          id: string;
          is_admin: boolean;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          id: string;
          is_admin?: boolean;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          is_admin?: boolean;
          updated_at?: string;
        };
        Relationships: [];
      };
      topics: {
        Row: {
          collection_id: string;
          created_at: string;
          description: string;
          id: string;
          name: string;
          system_key: string | null;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          collection_id: string;
          created_at?: string;
          description?: string;
          id?: string;
          name: string;
          system_key?: string | null;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          collection_id?: string;
          created_at?: string;
          description?: string;
          id?: string;
          name?: string;
          system_key?: string | null;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "topics_fk_collection_owner";
            columns: ["collection_id", "user_id"];
            isOneToOne: false;
            referencedRelation: "collections";
            referencedColumns: ["id", "user_id"];
          },
        ];
      };
    };
    Views: Record<never, never>;
    Functions: {
      get_admin_metrics_daily: {
        Args: { p_from: string; p_to: string };
        Returns: {
          accepted: number;
          day_utc: string;
          failed: number;
          non_random_events: number;
          random_events: number;
          rejected: number;
          skipped: number;
        }[];
      };
      is_admin: { Args: never; Returns: boolean };
    };
    Enums: Record<never, never>;
    CompositeTypes: Record<never, never>;
  };
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const;
