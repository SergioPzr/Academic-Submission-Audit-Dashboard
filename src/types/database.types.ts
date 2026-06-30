export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      cursos: {
        Row: {
          ciclo_academico: string
          codigo: string
          created_at: string
          estado: string
          id_curso: string
          id_profesor: string | null
          nombre: string
          seccion: string
        }
        Insert: {
          ciclo_academico: string
          codigo: string
          created_at?: string
          estado?: string
          id_curso?: string
          id_profesor?: string | null
          nombre: string
          seccion: string
        }
        Update: {
          ciclo_academico?: string
          codigo?: string
          created_at?: string
          estado?: string
          id_curso?: string
          id_profesor?: string | null
          nombre?: string
          seccion?: string
        }
        Relationships: [
          {
            foreignKeyName: "cursos_id_profesor_fkey"
            columns: ["id_profesor"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      entregables: {
        Row: {
          admite_extemporaneas: boolean
          created_at: string
          created_by: string | null
          descripcion: string | null
          fecha_apertura: string
          fecha_cierre: string
          id_curso: string
          id_entregable: string
          titulo: string
          updated_at: string
        }
        Insert: {
          admite_extemporaneas?: boolean
          created_at?: string
          created_by?: string | null
          descripcion?: string | null
          fecha_apertura: string
          fecha_cierre: string
          id_curso: string
          id_entregable?: string
          titulo: string
          updated_at?: string
        }
        Update: {
          admite_extemporaneas?: boolean
          created_at?: string
          created_by?: string | null
          descripcion?: string | null
          fecha_apertura?: string
          fecha_cierre?: string
          id_curso?: string
          id_entregable?: string
          titulo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "entregables_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entregables_id_curso_fkey"
            columns: ["id_curso"]
            isOneToOne: false
            referencedRelation: "cursos"
            referencedColumns: ["id_curso"]
          },
        ]
      }
      entregas: {
        Row: {
          constancia_id: string | null
          drive_url: string
          estado_puntualidad: string
          file_hash: string
          id_alumno: string
          id_entrega: string
          id_entregable: string
          nombre_archivo: string
          tamano_bytes: number
          timestamp_servidor: string
        }
        Insert: {
          constancia_id?: string | null
          drive_url: string
          estado_puntualidad: string
          file_hash: string
          id_alumno: string
          id_entrega?: string
          id_entregable: string
          nombre_archivo: string
          tamano_bytes: number
          timestamp_servidor?: string
        }
        Update: {
          constancia_id?: string | null
          drive_url?: string
          estado_puntualidad?: string
          file_hash?: string
          id_alumno?: string
          id_entrega?: string
          id_entregable?: string
          nombre_archivo?: string
          tamano_bytes?: number
          timestamp_servidor?: string
        }
        Relationships: [
          {
            foreignKeyName: "entregas_id_alumno_fkey"
            columns: ["id_alumno"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entregas_id_entregable_fkey"
            columns: ["id_entregable"]
            isOneToOne: false
            referencedRelation: "entregables"
            referencedColumns: ["id_entregable"]
          },
        ]
      }
      hashes_curso: {
        Row: {
          created_at: string
          file_hash: string
          id: string
          id_curso: string
          id_entrega: string | null
        }
        Insert: {
          created_at?: string
          file_hash: string
          id?: string
          id_curso: string
          id_entrega?: string | null
        }
        Update: {
          created_at?: string
          file_hash?: string
          id?: string
          id_curso?: string
          id_entrega?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hashes_curso_id_curso_fkey"
            columns: ["id_curso"]
            isOneToOne: false
            referencedRelation: "cursos"
            referencedColumns: ["id_curso"]
          },
          {
            foreignKeyName: "hashes_curso_id_entrega_fkey"
            columns: ["id_entrega"]
            isOneToOne: false
            referencedRelation: "entregas"
            referencedColumns: ["id_entrega"]
          },
        ]
      }
      logs_auditoria: {
        Row: {
          email_usuario: string | null
          id_log: string
          id_usuario: string | null
          ip_cliente: string | null
          metadata: Json | null
          tabla_afectada: string | null
          timestamp_servidor: string
          tipo_operacion: string
          valor_anterior: Json | null
          valor_nuevo: Json | null
        }
        Insert: {
          email_usuario?: string | null
          id_log?: string
          id_usuario?: string | null
          ip_cliente?: string | null
          metadata?: Json | null
          tabla_afectada?: string | null
          timestamp_servidor?: string
          tipo_operacion: string
          valor_anterior?: Json | null
          valor_nuevo?: Json | null
        }
        Update: {
          email_usuario?: string | null
          id_log?: string
          id_usuario?: string | null
          ip_cliente?: string | null
          metadata?: Json | null
          tabla_afectada?: string | null
          timestamp_servidor?: string
          tipo_operacion?: string
          valor_anterior?: Json | null
          valor_nuevo?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "logs_auditoria_id_usuario_fkey"
            columns: ["id_usuario"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      matriculas: {
        Row: {
          fecha_matricula: string
          id_alumno: string
          id_curso: string
          id_matricula: string
        }
        Insert: {
          fecha_matricula?: string
          id_alumno: string
          id_curso: string
          id_matricula?: string
        }
        Update: {
          fecha_matricula?: string
          id_alumno?: string
          id_curso?: string
          id_matricula?: string
        }
        Relationships: [
          {
            foreignKeyName: "matriculas_id_alumno_fkey"
            columns: ["id_alumno"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matriculas_id_curso_fkey"
            columns: ["id_curso"]
            isOneToOne: false
            referencedRelation: "cursos"
            referencedColumns: ["id_curso"]
          },
        ]
      }
      prorrogas: {
        Row: {
          created_at: string
          id_alumno: string
          id_entregable: string
          id_prorroga: string
          nueva_fecha_cierre: string
          otorgado_por: string | null
        }
        Insert: {
          created_at?: string
          id_alumno: string
          id_entregable: string
          id_prorroga?: string
          nueva_fecha_cierre: string
          otorgado_por?: string | null
        }
        Update: {
          created_at?: string
          id_alumno?: string
          id_entregable?: string
          id_prorroga?: string
          nueva_fecha_cierre?: string
          otorgado_por?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "prorrogas_id_alumno_fkey"
            columns: ["id_alumno"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prorrogas_id_entregable_fkey"
            columns: ["id_entregable"]
            isOneToOne: false
            referencedRelation: "entregables"
            referencedColumns: ["id_entregable"]
          },
          {
            foreignKeyName: "prorrogas_otorgado_por_fkey"
            columns: ["otorgado_por"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      revisiones: {
        Row: {
          fecha_evaluacion: string | null
          id_entrega: string
          id_profesor: string | null
          id_revision: string
          nota: number | null
          retroalimentacion: string | null
          updated_at: string | null
        }
        Insert: {
          fecha_evaluacion?: string | null
          id_entrega: string
          id_profesor?: string | null
          id_revision?: string
          nota?: number | null
          retroalimentacion?: string | null
          updated_at?: string | null
        }
        Update: {
          fecha_evaluacion?: string | null
          id_entrega?: string
          id_profesor?: string | null
          id_revision?: string
          nota?: number | null
          retroalimentacion?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "revisiones_id_entrega_fkey"
            columns: ["id_entrega"]
            isOneToOne: true
            referencedRelation: "entregas"
            referencedColumns: ["id_entrega"]
          },
          {
            foreignKeyName: "revisiones_id_profesor_fkey"
            columns: ["id_profesor"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      roles: {
        Row: {
          id_rol: string
          nombre: string
        }
        Insert: {
          id_rol?: string
          nombre: string
        }
        Update: {
          id_rol?: string
          nombre?: string
        }
        Relationships: []
      }
      usuarios: {
        Row: {
          bloqueado_hasta: string | null
          codigo_institucional: string | null
          created_at: string
          email: string
          estado: string
          facultad: string | null
          id: string
          id_rol: string
          intentos_fallidos: number
          nombre_completo: string
          updated_at: string
        }
        Insert: {
          bloqueado_hasta?: string | null
          codigo_institucional?: string | null
          created_at?: string
          email: string
          estado?: string
          facultad?: string | null
          id: string
          id_rol: string
          intentos_fallidos?: number
          nombre_completo: string
          updated_at?: string
        }
        Update: {
          bloqueado_hasta?: string | null
          codigo_institucional?: string | null
          created_at?: string
          email?: string
          estado?: string
          facultad?: string | null
          id?: string
          id_rol?: string
          intentos_fallidos?: number
          nombre_completo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "usuarios_id_rol_fkey"
            columns: ["id_rol"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id_rol"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_role: { Args: never; Returns: string }
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
    Enums: {},
  },
} as const
