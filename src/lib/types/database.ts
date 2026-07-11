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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      age_bands: {
        Row: {
          display_order: number
          id: string
          label: string
          max_age: number
          min_age: number
        }
        Insert: {
          display_order?: number
          id?: string
          label: string
          max_age: number
          min_age: number
        }
        Update: {
          display_order?: number
          id?: string
          label?: string
          max_age?: number
          min_age?: number
        }
        Relationships: []
      }
      assessment_option_scores: {
        Row: {
          option_id: string
          parameter_id: string
          points: number
        }
        Insert: {
          option_id: string
          parameter_id: string
          points?: number
        }
        Update: {
          option_id?: string
          parameter_id?: string
          points?: number
        }
        Relationships: [
          {
            foreignKeyName: "assessment_option_scores_option_id_fkey"
            columns: ["option_id"]
            isOneToOne: false
            referencedRelation: "assessment_options"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessment_option_scores_parameter_id_fkey"
            columns: ["parameter_id"]
            isOneToOne: false
            referencedRelation: "growth_parameters"
            referencedColumns: ["id"]
          },
        ]
      }
      assessment_options: {
        Row: {
          display_order: number
          id: string
          is_correct: boolean
          question_id: string
          text: string
        }
        Insert: {
          display_order?: number
          id?: string
          is_correct?: boolean
          question_id: string
          text: string
        }
        Update: {
          display_order?: number
          id?: string
          is_correct?: boolean
          question_id?: string
          text?: string
        }
        Relationships: [
          {
            foreignKeyName: "assessment_options_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "assessment_questions"
            referencedColumns: ["id"]
          },
        ]
      }
      assessment_questions: {
        Row: {
          assessment_id: string
          display_order: number
          id: string
          text: string
        }
        Insert: {
          assessment_id: string
          display_order?: number
          id?: string
          text: string
        }
        Update: {
          assessment_id?: string
          display_order?: number
          id?: string
          text?: string
        }
        Relationships: [
          {
            foreignKeyName: "assessment_questions_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "assessments"
            referencedColumns: ["id"]
          },
        ]
      }
      assessment_results: {
        Row: {
          assessment_id: string
          completed_at: string
          id: string
          scores: Json
          student_id: string
        }
        Insert: {
          assessment_id: string
          completed_at?: string
          id?: string
          scores?: Json
          student_id: string
        }
        Update: {
          assessment_id?: string
          completed_at?: string
          id?: string
          scores?: Json
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "assessment_results_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "assessments"
            referencedColumns: ["id"]
          },
        ]
      }
      assessments: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          title: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          title: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          title?: string
        }
        Relationships: []
      }
      baseline_config: {
        Row: {
          cert_provisional_fraction: number
          cert_weight: number
          id: string
          questionnaire_weight: number
          test_weight: number
          updated_at: string
        }
        Insert: {
          cert_provisional_fraction?: number
          cert_weight?: number
          id?: string
          questionnaire_weight?: number
          test_weight?: number
          updated_at?: string
        }
        Update: {
          cert_provisional_fraction?: number
          cert_weight?: number
          id?: string
          questionnaire_weight?: number
          test_weight?: number
          updated_at?: string
        }
        Relationships: []
      }
      bookings: {
        Row: {
          booked_by: string
          completion_marked_at: string | null
          completion_marked_by: string | null
          created_at: string
          id: string
          offering_id: string
          package_id: string | null
          payment_order_id: string | null
          payment_payment_id: string | null
          payment_status: string
          price_paise: number
          score_applied: boolean
          status: string
          student_id: string
          updated_at: string
        }
        Insert: {
          booked_by: string
          completion_marked_at?: string | null
          completion_marked_by?: string | null
          created_at?: string
          id?: string
          offering_id: string
          package_id?: string | null
          payment_order_id?: string | null
          payment_payment_id?: string | null
          payment_status?: string
          price_paise: number
          score_applied?: boolean
          status?: string
          student_id: string
          updated_at?: string
        }
        Update: {
          booked_by?: string
          completion_marked_at?: string | null
          completion_marked_by?: string | null
          created_at?: string
          id?: string
          offering_id?: string
          package_id?: string | null
          payment_order_id?: string | null
          payment_payment_id?: string | null
          payment_status?: string
          price_paise?: number
          score_applied?: boolean
          status?: string
          student_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookings_offering_id_fkey"
            columns: ["offering_id"]
            isOneToOne: false
            referencedRelation: "offerings"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          created_at: string
          description: string | null
          display_order: number
          id: string
          is_active: boolean
          name: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          is_active?: boolean
          name: string
        }
        Update: {
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          is_active?: boolean
          name?: string
        }
        Relationships: []
      }
      certificate_uploads: {
        Row: {
          admin_notes: string | null
          created_at: string
          description: string | null
          file_name: string | null
          file_url: string
          id: string
          parameter_id: string | null
          points_approved: number
          points_provisional: number
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          student_id: string
        }
        Insert: {
          admin_notes?: string | null
          created_at?: string
          description?: string | null
          file_name?: string | null
          file_url: string
          id?: string
          parameter_id?: string | null
          points_approved?: number
          points_provisional?: number
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          student_id: string
        }
        Update: {
          admin_notes?: string | null
          created_at?: string
          description?: string | null
          file_name?: string | null
          file_url?: string
          id?: string
          parameter_id?: string | null
          points_approved?: number
          points_provisional?: number
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "certificate_uploads_parameter_id_fkey"
            columns: ["parameter_id"]
            isOneToOne: false
            referencedRelation: "growth_parameters"
            referencedColumns: ["id"]
          },
        ]
      }
      growth_parameters: {
        Row: {
          created_at: string
          description: string | null
          display_order: number
          id: string
          is_active: boolean
          name: string
          updated_at: string
          weight: number
        }
        Insert: {
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
          weight?: number
        }
        Update: {
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
          weight?: number
        }
        Relationships: []
      }
      vendors: {
        Row: {
          id: string
          org_name: string
          contact_phone: string | null
          about: string | null
          is_active: boolean
          created_at: string
        }
        Insert: {
          id: string
          org_name: string
          contact_phone?: string | null
          about?: string | null
          is_active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          org_name?: string
          contact_phone?: string | null
          about?: string | null
          is_active?: boolean
          created_at?: string
        }
        Relationships: []
      }
      offering_interest: {
        Row: { offering_id: string; user_id: string; created_at: string }
        Insert: { offering_id: string; user_id: string; created_at?: string }
        Update: { offering_id?: string; user_id?: string; created_at?: string }
        Relationships: []
      }
      offering_requests: {
        Row: {
          id: string
          requester_id: string
          title: string
          description: string | null
          category_id: string | null
          status: string
          support_count: number
          admin_notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          requester_id: string
          title: string
          description?: string | null
          category_id?: string | null
          status?: string
          support_count?: number
          admin_notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          requester_id?: string
          title?: string
          description?: string | null
          category_id?: string | null
          status?: string
          support_count?: number
          admin_notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      offering_request_supporters: {
        Row: { request_id: string; user_id: string; created_at: string }
        Insert: { request_id: string; user_id: string; created_at?: string }
        Update: { request_id?: string; user_id?: string; created_at?: string }
        Relationships: []
      }
      offering_meeting_links: {
        Row: {
          offering_id: string
          meeting_url: string
          updated_at: string
        }
        Insert: {
          offering_id: string
          meeting_url: string
          updated_at?: string
        }
        Update: {
          offering_id?: string
          meeting_url?: string
          updated_at?: string
        }
        Relationships: []
      }
      offering_parameter_contributions: {
        Row: {
          offering_id: string
          parameter_id: string
          points: number
        }
        Insert: {
          offering_id: string
          parameter_id: string
          points?: number
        }
        Update: {
          offering_id?: string
          parameter_id?: string
          points?: number
        }
        Relationships: [
          {
            foreignKeyName: "offering_parameter_contributions_offering_id_fkey"
            columns: ["offering_id"]
            isOneToOne: false
            referencedRelation: "offerings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "offering_parameter_contributions_parameter_id_fkey"
            columns: ["parameter_id"]
            isOneToOne: false
            referencedRelation: "growth_parameters"
            referencedColumns: ["id"]
          },
        ]
      }
      offerings: {
        Row: {
          created_at: string
          description: string | null
          duration_minutes: number | null
          id: string
          image_url: string | null
          interest_count: number
          interest_threshold: number
          location: string | null
          max_age: number | null
          min_age: number | null
          mode: string | null
          price_paise: number
          review_notes: string | null
          review_status: string
          reviewed_at: string | null
          reviewed_by: string | null
          scheduled_at: string | null
          source: string
          status: string
          title: string
          topic_id: string | null
          type: string
          updated_at: string
          vendor_id: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          duration_minutes?: number | null
          id?: string
          image_url?: string | null
          interest_count?: number
          interest_threshold?: number
          location?: string | null
          max_age?: number | null
          min_age?: number | null
          mode?: string | null
          price_paise?: number
          review_notes?: string | null
          review_status?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          scheduled_at?: string | null
          source?: string
          status?: string
          title: string
          topic_id?: string | null
          type: string
          updated_at?: string
          vendor_id?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          duration_minutes?: number | null
          id?: string
          image_url?: string | null
          interest_count?: number
          interest_threshold?: number
          location?: string | null
          max_age?: number | null
          min_age?: number | null
          mode?: string | null
          price_paise?: number
          review_notes?: string | null
          review_status?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          scheduled_at?: string | null
          source?: string
          status?: string
          title?: string
          topic_id?: string | null
          type?: string
          updated_at?: string
          vendor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "offerings_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
        ]
      }
      package_tiers: {
        Row: {
          created_at: string
          description: string | null
          display_order: number
          id: string
          is_active: boolean
          name: string
          price_paise: number
          slot_count: number
          validity_days: number
        }
        Insert: {
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          is_active?: boolean
          name: string
          price_paise?: number
          slot_count: number
          validity_days?: number
        }
        Update: {
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          is_active?: boolean
          name?: string
          price_paise?: number
          slot_count?: number
          validity_days?: number
        }
        Relationships: []
      }
      packages: {
        Row: {
          created_at: string
          id: string
          parent_id: string
          payment_order_id: string | null
          payment_payment_id: string | null
          payment_status: string
          pending_upgrade_tier_id: string | null
          price_paise: number
          slot_count: number
          slots_used: number
          status: string
          student_id: string
          tier_id: string | null
          updated_at: string
          valid_from: string | null
          valid_until: string | null
          validity_days: number
        }
        Insert: {
          created_at?: string
          id?: string
          parent_id: string
          payment_order_id?: string | null
          payment_payment_id?: string | null
          payment_status?: string
          pending_upgrade_tier_id?: string | null
          price_paise: number
          slot_count: number
          slots_used?: number
          status?: string
          student_id: string
          tier_id?: string | null
          updated_at?: string
          valid_from?: string | null
          valid_until?: string | null
          validity_days: number
        }
        Update: {
          created_at?: string
          id?: string
          parent_id?: string
          payment_order_id?: string | null
          payment_payment_id?: string | null
          payment_status?: string
          pending_upgrade_tier_id?: string | null
          price_paise?: number
          slot_count?: number
          slots_used?: number
          status?: string
          student_id?: string
          tier_id?: string | null
          updated_at?: string
          valid_from?: string | null
          valid_until?: string | null
          validity_days?: number
        }
        Relationships: []
      }
      parameter_targets: {
        Row: {
          age_band_id: string
          parameter_id: string
          target_max: number
          target_min: number
        }
        Insert: {
          age_band_id: string
          parameter_id: string
          target_max?: number
          target_min?: number
        }
        Update: {
          age_band_id?: string
          parameter_id?: string
          target_max?: number
          target_min?: number
        }
        Relationships: [
          {
            foreignKeyName: "parameter_targets_age_band_id_fkey"
            columns: ["age_band_id"]
            isOneToOne: false
            referencedRelation: "age_bands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "parameter_targets_parameter_id_fkey"
            columns: ["parameter_id"]
            isOneToOne: false
            referencedRelation: "growth_parameters"
            referencedColumns: ["id"]
          },
        ]
      }
      parent_student_links: {
        Row: {
          id: string
          parent_id: string
          relationship: string
          student_id: string
        }
        Insert: {
          id?: string
          parent_id: string
          relationship?: string
          student_id: string
        }
        Update: {
          id?: string
          parent_id?: string
          relationship?: string
          student_id?: string
        }
        Relationships: []
      }
      questionnaire_option_scores: {
        Row: {
          option_id: string
          parameter_id: string
          points: number
        }
        Insert: {
          option_id: string
          parameter_id: string
          points?: number
        }
        Update: {
          option_id?: string
          parameter_id?: string
          points?: number
        }
        Relationships: [
          {
            foreignKeyName: "questionnaire_option_scores_option_id_fkey"
            columns: ["option_id"]
            isOneToOne: false
            referencedRelation: "questionnaire_options"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "questionnaire_option_scores_parameter_id_fkey"
            columns: ["parameter_id"]
            isOneToOne: false
            referencedRelation: "growth_parameters"
            referencedColumns: ["id"]
          },
        ]
      }
      questionnaire_options: {
        Row: {
          display_order: number
          id: string
          question_id: string
          text: string
        }
        Insert: {
          display_order?: number
          id?: string
          question_id: string
          text: string
        }
        Update: {
          display_order?: number
          id?: string
          question_id?: string
          text?: string
        }
        Relationships: [
          {
            foreignKeyName: "questionnaire_options_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questionnaire_questions"
            referencedColumns: ["id"]
          },
        ]
      }
      questionnaire_questions: {
        Row: {
          display_order: number
          id: string
          is_active: boolean
          text: string
        }
        Insert: {
          display_order?: number
          id?: string
          is_active?: boolean
          text: string
        }
        Update: {
          display_order?: number
          id?: string
          is_active?: boolean
          text?: string
        }
        Relationships: []
      }
      questionnaire_responses: {
        Row: {
          created_at: string
          id: string
          option_id: string
          question_id: string
          student_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          option_id: string
          question_id: string
          student_id: string
        }
        Update: {
          created_at?: string
          id?: string
          option_id?: string
          question_id?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "questionnaire_responses_option_id_fkey"
            columns: ["option_id"]
            isOneToOne: false
            referencedRelation: "questionnaire_options"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "questionnaire_responses_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questionnaire_questions"
            referencedColumns: ["id"]
          },
        ]
      }
      score_contributions: {
        Row: {
          created_at: string
          description: string | null
          id: string
          parameter_id: string
          points: number
          source_id: string | null
          source_type: string
          student_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          parameter_id: string
          points: number
          source_id?: string | null
          source_type: string
          student_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          parameter_id?: string
          points?: number
          source_id?: string | null
          source_type?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "score_contributions_parameter_id_fkey"
            columns: ["parameter_id"]
            isOneToOne: false
            referencedRelation: "growth_parameters"
            referencedColumns: ["id"]
          },
        ]
      }
      score_levels: {
        Row: {
          color_class: string
          display_order: number
          id: string
          max_score: number
          min_score: number
          name: string
        }
        Insert: {
          color_class?: string
          display_order?: number
          id?: string
          max_score: number
          min_score: number
          name: string
        }
        Update: {
          color_class?: string
          display_order?: number
          id?: string
          max_score?: number
          min_score?: number
          name?: string
        }
        Relationships: []
      }
      curriculum_plans: {
        Row: {
          id: string
          student_id: string
          generated_at: string
          target_size: number
          model: string
          summary: string | null
          price_total_paise: number
          items: Json
          created_at: string
        }
        Insert: {
          id?: string
          student_id: string
          generated_at?: string
          target_size: number
          model?: string
          summary?: string | null
          price_total_paise?: number
          items?: Json
          created_at?: string
        }
        Update: {
          id?: string
          student_id?: string
          generated_at?: string
          target_size?: number
          model?: string
          summary?: string | null
          price_total_paise?: number
          items?: Json
          created_at?: string
        }
        Relationships: []
      }
      recommendation_runs: {
        Row: {
          id: string
          student_id: string
          generated_at: string
          model: string
          summary: string | null
          items: Json
          created_at: string
        }
        Insert: {
          id?: string
          student_id: string
          generated_at?: string
          model?: string
          summary?: string | null
          items?: Json
          created_at?: string
        }
        Update: {
          id?: string
          student_id?: string
          generated_at?: string
          model?: string
          summary?: string | null
          items?: Json
          created_at?: string
        }
        Relationships: []
      }
      student_shortlist: {
        Row: {
          student_id: string
          offering_id: string
          created_at: string
        }
        Insert: {
          student_id: string
          offering_id: string
          created_at?: string
        }
        Update: {
          student_id?: string
          offering_id?: string
          created_at?: string
        }
        Relationships: []
      }
      student_parameter_scores: {
        Row: {
          accrued_score: number
          baseline_score: number
          parameter_id: string
          student_id: string
          updated_at: string
        }
        Insert: {
          accrued_score?: number
          baseline_score?: number
          parameter_id: string
          student_id: string
          updated_at?: string
        }
        Update: {
          accrued_score?: number
          baseline_score?: number
          parameter_id?: string
          student_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_parameter_scores_parameter_id_fkey"
            columns: ["parameter_id"]
            isOneToOne: false
            referencedRelation: "growth_parameters"
            referencedColumns: ["id"]
          },
        ]
      }
      topic_parameters: {
        Row: {
          parameter_id: string
          topic_id: string
        }
        Insert: {
          parameter_id: string
          topic_id: string
        }
        Update: {
          parameter_id?: string
          topic_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "topic_parameters_parameter_id_fkey"
            columns: ["parameter_id"]
            isOneToOne: false
            referencedRelation: "growth_parameters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "topic_parameters_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
        ]
      }
      topics: {
        Row: {
          category_id: string
          created_at: string
          description: string | null
          display_order: number
          id: string
          is_active: boolean
          name: string
        }
        Insert: {
          category_id: string
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          is_active?: boolean
          name: string
        }
        Update: {
          category_id?: string
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          is_active?: boolean
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "topics_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      user_profiles: {
        Row: {
          avatar_url: string | null
          city: string | null
          created_at: string
          date_of_birth: string | null
          full_name: string | null
          id: string
          onboarding_completed: boolean
          parent_mobile: string | null
          phone: string | null
          role: string
          school_branch: string | null
          school_class: string | null
          school_name: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          city?: string | null
          created_at?: string
          date_of_birth?: string | null
          full_name?: string | null
          id: string
          onboarding_completed?: boolean
          parent_mobile?: string | null
          phone?: string | null
          role: string
          school_branch?: string | null
          school_class?: string | null
          school_name?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          city?: string | null
          created_at?: string
          date_of_birth?: string | null
          full_name?: string | null
          id?: string
          onboarding_completed?: boolean
          parent_mobile?: string | null
          phone?: string | null
          role?: string
          school_branch?: string | null
          school_class?: string | null
          school_name?: string | null
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      complete_onboarding: {
        Args: {
          p_questionnaire_answers: Json
          p_assessment_id: string
          p_assessment_answers: Json
        }
        Returns: string
      }
      is_admin: { Args: never; Returns: boolean }
      is_parent_of: { Args: { p_student_id: string }; Returns: boolean }
      link_student_with_password: {
        Args: { p_email: string; p_password: string }
        Returns: string
      }
      get_my_children: {
        Args: never
        Returns: {
          student_id: string
          full_name: string | null
          email: string
          relationship: string
          date_of_birth: string | null
        }[]
      }
      unlink_student: { Args: { p_student_id: string }; Returns: string }
      admin_approve_cert: {
        Args: {
          p_cert_id: string
          p_points_approved: number
          p_admin_notes?: string | null
          p_parameter_id?: string | null
        }
        Returns: string
      }
      admin_reject_cert: {
        Args: {
          p_cert_id: string
          p_admin_notes?: string | null
        }
        Returns: string
      }
      admin_mark_complete: {
        Args: { p_booking_id: string }
        Returns: string
      }
      admin_get_assessment_options: {
        Args: { p_assessment_id: string }
        Returns: {
          id: string
          question_id: string
          text: string
          display_order: number
          is_correct: boolean
        }[]
      }
      admin_list_users: {
        Args: never
        Returns: {
          id: string
          full_name: string | null
          email: string
          role: string
          onboarding_completed: boolean
          city: string | null
          created_at: string
        }[]
      }
      admin_get_user_email: {
        Args: { p_user_id: string }
        Returns: string | null
      }
      create_booking: {
        Args: { p_student_id: string; p_offering_id: string }
        Returns: { status: string; booking_id: string | null }[]
      }
      settle_booking_payment: {
        Args: {
          p_booking_id: string
          p_success: boolean
          p_order_id: string
          p_payment_id: string
        }
        Returns: string
      }
      create_package: {
        Args: { p_tier_id: string; p_student_id: string }
        Returns: { status: string; package_id: string | null }[]
      }
      settle_package_payment: {
        Args: { p_package_id: string; p_success: boolean; p_order_id: string; p_payment_id: string }
        Returns: string
      }
      book_with_package: {
        Args: { p_package_id: string; p_offering_id: string }
        Returns: { status: string; booking_id: string | null }[]
      }
      book_multiple_with_package: {
        Args: { p_package_id: string; p_offering_ids: string[] }
        Returns: { status: string; booked: number }[]
      }
      toggle_offering_interest: {
        Args: { p_offering_id: string }
        Returns: { interested: boolean; total: number }[]
      }
      create_offering_request: {
        Args: { p_title: string; p_description: string | null; p_category_id: string | null }
        Returns: string
      }
      toggle_request_support: {
        Args: { p_request_id: string }
        Returns: { supporting: boolean; total: number }[]
      }
      admin_promote_vendor: {
        Args: { p_email: string; p_org_name: string; p_phone?: string | null; p_about?: string | null }
        Returns: { status: string; vendor_id: string | null }[]
      }
      admin_review_offering: {
        Args: { p_offering_id: string; p_decision: string; p_notes?: string | null }
        Returns: string
      }
      create_package_upgrade: {
        Args: { p_package_id: string; p_new_tier_id: string }
        Returns: { status: string; cost_paise: number | null }[]
      }
      settle_package_upgrade: {
        Args: { p_package_id: string; p_success: boolean; p_order_id: string; p_payment_id: string }
        Returns: string
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

// =====================================================================
// Application-level literal unions (CHECK constraints in Postgres are
// plain TEXT, so the generated Row types use `string`. Use these unions
// in app logic, forms, and when narrowing values.)
// =====================================================================

export type Role = 'student' | 'parent' | 'admin' | 'vendor'
export type OfferingType = 'workshop' | 'trip' | 'event' | 'competition' | 'internship'
export type OfferingSource = 'own' | 'vendor'
export type OfferingStatus = 'planned' | 'live' | 'completed' | 'retired'
export type BookingStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled'
export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded'
export type CertStatus = 'pending' | 'approved' | 'rejected'
export type ScoreSourceType =
  | 'baseline_test'
  | 'baseline_cert'
  | 'baseline_cert_approval'
  | 'baseline_questionnaire'
  | 'offering_completion'
  | 'cert_rejection'

// Convenience row types used throughout the app
export type GrowthParameter = Database['public']['Tables']['growth_parameters']['Row']
export type AgeBand = Database['public']['Tables']['age_bands']['Row']
export type ScoreLevel = Database['public']['Tables']['score_levels']['Row']
export type BaselineConfig = Database['public']['Tables']['baseline_config']['Row']
export type UserProfile = Database['public']['Tables']['user_profiles']['Row']
export type Offering = Database['public']['Tables']['offerings']['Row']
export type Booking = Database['public']['Tables']['bookings']['Row']
export type CertificateUpload = Database['public']['Tables']['certificate_uploads']['Row']
export type StudentParameterScore = Database['public']['Tables']['student_parameter_scores']['Row']
export type ScoreContribution = Database['public']['Tables']['score_contributions']['Row']
export type PackageTier = Database['public']['Tables']['package_tiers']['Row']
export type Package = Database['public']['Tables']['packages']['Row']
