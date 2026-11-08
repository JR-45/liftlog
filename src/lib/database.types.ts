
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "graphql_public": {
          Tables: {
            [_ in never]: never
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "graphql":
{ Args: { "extensions"?: Json,"operationName"?: string,"query"?: string,"variables"?: Json }; Returns: Json
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        },"public": {
          Tables: {
            "body_measurements": {
                  Row: {
                    "arm_cm": number | null,"body_fat_pct": number | null,"calf_cm": number | null,"chest_cm": number | null,"created_at": string,"hips_cm": number | null,"measured_on": string,"neck_cm": number | null,"thigh_cm": number | null,"user_id": string,"waist_cm": number | null,"weight_kg": number | null
                  }
                  ComputedFields: never
                  Insert: {
                    "arm_cm"?: number | null,"body_fat_pct"?: number | null,"calf_cm"?: number | null,"chest_cm"?: number | null,"created_at"?: string,"hips_cm"?: number | null,"measured_on": string,"neck_cm"?: number | null,"thigh_cm"?: number | null,"user_id"?: string,"waist_cm"?: number | null,"weight_kg"?: number | null
                  }
                  Update: {
                    "arm_cm"?: number | null,"body_fat_pct"?: number | null,"calf_cm"?: number | null,"chest_cm"?: number | null,"created_at"?: string,"hips_cm"?: number | null,"measured_on"?: string,"neck_cm"?: number | null,"thigh_cm"?: number | null,"user_id"?: string,"waist_cm"?: number | null,"weight_kg"?: number | null
                  }
                  Relationships: [
                    
                  ]
                },"day_marks": {
                  Row: {
                    "created_at": string,"day": string,"kind": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"day": string,"kind": string,"user_id"?: string
                  }
                  Update: {
                    "created_at"?: string,"day"?: string,"kind"?: string,"user_id"?: string
                  }
                  Relationships: [
                    
                  ]
                },"exercises": {
                  Row: {
                    "created_at": string,"current_weight_kg": number | null,"id": string,"name": string,"tracking_type": string,"user_id": string,"weight_step_kg": number
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"current_weight_kg"?: number | null,"id"?: string,"name": string,"tracking_type": string,"user_id"?: string,"weight_step_kg"?: number
                  }
                  Update: {
                    "created_at"?: string,"current_weight_kg"?: number | null,"id"?: string,"name"?: string,"tracking_type"?: string,"user_id"?: string,"weight_step_kg"?: number
                  }
                  Relationships: [
                    
                  ]
                },"food_scan_usage": {
                  Row: {
                    "last_scan_at": string,"scan_count": number,"usage_date": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "last_scan_at": string,"scan_count": number,"usage_date": string,"user_id"?: string
                  }
                  Update: {
                    "last_scan_at"?: string,"scan_count"?: number,"usage_date"?: string,"user_id"?: string
                  }
                  Relationships: [
                    
                  ]
                },"meal_items": {
                  Row: {
                    "carbs": number,"estimated": boolean,"fat": number,"fiber": number,"grams": number,"id": string,"kcal": number,"meal_id": string,"name": string,"position": number,"protein": number,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "carbs": number,"estimated"?: boolean,"fat": number,"fiber": number,"grams": number,"id"?: string,"kcal": number,"meal_id": string,"name": string,"position": number,"protein": number,"user_id"?: string
                  }
                  Update: {
                    "carbs"?: number,"estimated"?: boolean,"fat"?: number,"fiber"?: number,"grams"?: number,"id"?: string,"kcal"?: number,"meal_id"?: string,"name"?: string,"position"?: number,"protein"?: number,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "meal_items_meal_id_user_id_fkey"
      columns: ["meal_id","user_id"]
isOneToOne: false
      referencedRelation: "meals"
      referencedColumns: ["id","user_id"]
    }
                  ]
                },"meals": {
                  Row: {
                    "consumed_on": string,"created_at": string,"id": string,"title": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "consumed_on": string,"created_at"?: string,"id"?: string,"title": string,"user_id"?: string
                  }
                  Update: {
                    "consumed_on"?: string,"created_at"?: string,"id"?: string,"title"?: string,"user_id"?: string
                  }
                  Relationships: [
                    
                  ]
                },"nutrition_settings": {
                  Row: {
                    "carbs": number | null,"fat": number | null,"fiber": number | null,"kcal": number | null,"photo_consent_at": string | null,"photo_consent_version": string | null,"protein": number | null,"targets_from_profile": boolean,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "carbs"?: number | null,"fat"?: number | null,"fiber"?: number | null,"kcal"?: number | null,"photo_consent_at"?: string | null,"photo_consent_version"?: string | null,"protein"?: number | null,"targets_from_profile"?: boolean,"user_id"?: string
                  }
                  Update: {
                    "carbs"?: number | null,"fat"?: number | null,"fiber"?: number | null,"kcal"?: number | null,"photo_consent_at"?: string | null,"photo_consent_version"?: string | null,"protein"?: number | null,"targets_from_profile"?: boolean,"user_id"?: string
                  }
                  Relationships: [
                    
                  ]
                },"plan_days": {
                  Row: {
                    "created_at": string,"id": string,"name": string,"user_id": string,"weekday": number
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: string,"name": string,"user_id"?: string,"weekday": number
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"name"?: string,"user_id"?: string,"weekday"?: number
                  }
                  Relationships: [
                    
                  ]
                },"plan_exercises": {
                  Row: {
                    "alternative_exercise_id": string | null,"created_at": string,"duration_max": number | null,"duration_min": number | null,"exercise_id": string,"id": string,"plan_day_id": string,"position": number,"reps_max": number | null,"reps_min": number | null,"sets_max": number,"sets_min": number,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "alternative_exercise_id"?: string | null,"created_at"?: string,"duration_max"?: number | null,"duration_min"?: number | null,"exercise_id": string,"id"?: string,"plan_day_id": string,"position": number,"reps_max"?: number | null,"reps_min"?: number | null,"sets_max": number,"sets_min": number,"user_id"?: string
                  }
                  Update: {
                    "alternative_exercise_id"?: string | null,"created_at"?: string,"duration_max"?: number | null,"duration_min"?: number | null,"exercise_id"?: string,"id"?: string,"plan_day_id"?: string,"position"?: number,"reps_max"?: number | null,"reps_min"?: number | null,"sets_max"?: number,"sets_min"?: number,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "plan_exercises_alternative_exercise_id_user_id_fkey"
      columns: ["alternative_exercise_id","user_id"]
isOneToOne: false
      referencedRelation: "exercises"
      referencedColumns: ["id","user_id"]
    },{
      foreignKeyName: "plan_exercises_exercise_id_user_id_fkey"
      columns: ["exercise_id","user_id"]
isOneToOne: false
      referencedRelation: "exercises"
      referencedColumns: ["id","user_id"]
    },{
      foreignKeyName: "plan_exercises_plan_day_id_user_id_fkey"
      columns: ["plan_day_id","user_id"]
isOneToOne: false
      referencedRelation: "plan_days"
      referencedColumns: ["id","user_id"]
    }
                  ]
                },"profiles": {
                  Row: {
                    "activity_level": string | null,"avatar": string | null,"bio": string,"birth_year": number | null,"display_name": string | null,"experience_level": string | null,"goal": string,"height_cm": number | null,"onboarding_completed_at": string | null,"session_minutes": number | null,"sex": string | null,"target_weight_kg": number | null,"training_location": string | null,"updated_at": string,"user_id": string,"weekly_target": number | null
                  }
                  ComputedFields: never
                  Insert: {
                    "activity_level"?: string | null,"avatar"?: string | null,"bio"?: string,"birth_year"?: number | null,"display_name"?: string | null,"experience_level"?: string | null,"goal"?: string,"height_cm"?: number | null,"onboarding_completed_at"?: string | null,"session_minutes"?: number | null,"sex"?: string | null,"target_weight_kg"?: number | null,"training_location"?: string | null,"updated_at"?: string,"user_id"?: string,"weekly_target"?: number | null
                  }
                  Update: {
                    "activity_level"?: string | null,"avatar"?: string | null,"bio"?: string,"birth_year"?: number | null,"display_name"?: string | null,"experience_level"?: string | null,"goal"?: string,"height_cm"?: number | null,"onboarding_completed_at"?: string | null,"session_minutes"?: number | null,"sex"?: string | null,"target_weight_kg"?: number | null,"training_location"?: string | null,"updated_at"?: string,"user_id"?: string,"weekly_target"?: number | null
                  }
                  Relationships: [
                    
                  ]
                },"sets": {
                  Row: {
                    "created_at": string,"distance_km": number | null,"duration_seconds": number | null,"exercise_id": string,"id": string,"is_assisted": boolean,"next_weight_kg": number | null,"reps": number | null,"set_number": number,"user_id": string,"weight_kg": number | null,"workout_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"distance_km"?: number | null,"duration_seconds"?: number | null,"exercise_id": string,"id"?: string,"is_assisted"?: boolean,"next_weight_kg"?: number | null,"reps"?: number | null,"set_number": number,"user_id"?: string,"weight_kg"?: number | null,"workout_id": string
                  }
                  Update: {
                    "created_at"?: string,"distance_km"?: number | null,"duration_seconds"?: number | null,"exercise_id"?: string,"id"?: string,"is_assisted"?: boolean,"next_weight_kg"?: number | null,"reps"?: number | null,"set_number"?: number,"user_id"?: string,"weight_kg"?: number | null,"workout_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "sets_exercise_id_user_id_fkey"
      columns: ["exercise_id","user_id"]
isOneToOne: false
      referencedRelation: "exercises"
      referencedColumns: ["id","user_id"]
    },{
      foreignKeyName: "sets_workout_id_user_id_fkey"
      columns: ["workout_id","user_id"]
isOneToOne: false
      referencedRelation: "workouts"
      referencedColumns: ["id","user_id"]
    }
                  ]
                },"supplement_intakes": {
                  Row: {
                    "supplement_id": string,"taken_on": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "supplement_id": string,"taken_on": string,"user_id"?: string
                  }
                  Update: {
                    "supplement_id"?: string,"taken_on"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "supplement_intakes_supplement_id_user_id_fkey"
      columns: ["supplement_id","user_id"]
isOneToOne: false
      referencedRelation: "supplements"
      referencedColumns: ["id","user_id"]
    }
                  ]
                },"supplements": {
                  Row: {
                    "created_at": string,"dose": string | null,"id": string,"name": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"dose"?: string | null,"id"?: string,"name": string,"user_id"?: string
                  }
                  Update: {
                    "created_at"?: string,"dose"?: string | null,"id"?: string,"name"?: string,"user_id"?: string
                  }
                  Relationships: [
                    
                  ]
                },"training_plan_settings": {
                  Row: {
                    "method": string,"split": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "method": string,"split": string,"user_id"?: string
                  }
                  Update: {
                    "method"?: string,"split"?: string,"user_id"?: string
                  }
                  Relationships: [
                    
                  ]
                },"training_schedule": {
                  Row: {
                    "day_date": string,"is_rest_day": boolean,"plan_day_id": string | null,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "day_date": string,"is_rest_day"?: boolean,"plan_day_id"?: string | null,"user_id"?: string
                  }
                  Update: {
                    "day_date"?: string,"is_rest_day"?: boolean,"plan_day_id"?: string | null,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "training_schedule_plan_day_id_user_id_fkey"
      columns: ["plan_day_id","user_id"]
isOneToOne: false
      referencedRelation: "plan_days"
      referencedColumns: ["id","user_id"]
    }
                  ]
                },"workouts": {
                  Row: {
                    "created_at": string,"finished_at": string | null,"id": string,"performed_on": string,"plan_day_id": string | null,"started_at": string | null,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"finished_at"?: string | null,"id"?: string,"performed_on": string,"plan_day_id"?: string | null,"started_at"?: string | null,"user_id"?: string
                  }
                  Update: {
                    "created_at"?: string,"finished_at"?: string | null,"id"?: string,"performed_on"?: string,"plan_day_id"?: string | null,"started_at"?: string | null,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "workouts_plan_day_id_user_id_fkey"
      columns: ["plan_day_id","user_id"]
isOneToOne: false
      referencedRelation: "plan_days"
      referencedColumns: ["id","user_id"]
    }
                  ]
                }
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "delete_own_account":
{ Args: Record<PropertyKey, never>; Returns: undefined
                           },
"last_performance":
{ Args: { "before_date": string }; Returns: {
              "distance_km": number,"duration_seconds": number,"exercise_id": string,"is_assisted": boolean,"next_weight_kg": number,"performed_on": string,"reps": number,"set_number": number,"weight_kg": number
            }[]
                           },
"reserve_food_scan":
{ Args: { "p_user_id": string }; Returns: boolean
                           },
"save_meal":
{ Args: { "p_date": string,"p_id": string,"p_items": Json,"p_title": string }; Returns: string
                           },
"save_training_plan":
{ Args: { "days": Json }; Returns: undefined
                           },
"save_training_plan_config":
{ Args: { "chosen_method": string,"chosen_split": string,"days": Json }; Returns: undefined
                           },
"save_training_week":
{ Args: { "days": Json,"week_start": string }; Returns: undefined
                           },
"seed_default_plan":
{ Args: Record<PropertyKey, never>; Returns: undefined
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "graphql_public": {
          Enums: {
            
          }
        },"public": {
          Enums: {
            
          }
        }
} as const
