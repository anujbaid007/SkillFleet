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
      families: {
        Row: {
          id: string
          parent_full_name: string | null
          parent_email: string
          parent_phone: string | null
          created_at: string
        }
        Insert: {
          id?: string
          parent_full_name?: string | null
          parent_email: string
          parent_phone?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          parent_full_name?: string | null
          parent_email?: string
          parent_phone?: string | null
          created_at?: string
        }
        Relationships: []
      }
      wallets: {
        Row: { family_id: string; balance_paise: number; updated_at: string }
        Insert: { family_id: string; balance_paise?: number; updated_at?: string }
        Update: { family_id?: string; balance_paise?: number; updated_at?: string }
        Relationships: []
      }
      wallet_transactions: {
        Row: {
          id: string
          family_id: string
          student_id: string | null
          booking_id: string | null
          amount_paise: number
          type: string
          description: string | null
          created_at: string
        }
        Insert: {
          id?: string
          family_id: string
          student_id?: string | null
          booking_id?: string | null
          amount_paise: number
          type: string
          description?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          family_id?: string
          student_id?: string | null
          booking_id?: string | null
          amount_paise?: number
          type?: string
          description?: string | null
          created_at?: string
        }
        Relationships: []
      }
      cart_items: {
        Row: { id: string; family_id: string; student_id: string; offering_id: string; added_by: string | null; created_at: string }
        Insert: { id?: string; family_id: string; student_id: string; offering_id: string; added_by?: string | null; created_at?: string }
        Update: { id?: string; family_id?: string; student_id?: string; offering_id?: string; added_by?: string | null; created_at?: string }
        Relationships: []
      }
      orders: {
        Row: {
          id: string
          family_id: string
          placed_by: string | null
          item_count: number
          subtotal_paise: number
          discount_percent: number
          discount_paise: number
          total_paise: number
          wallet_paise: number
          gateway_paise: number
          status: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          family_id: string
          placed_by?: string | null
          item_count: number
          subtotal_paise: number
          discount_percent?: number
          discount_paise?: number
          total_paise: number
          wallet_paise?: number
          gateway_paise?: number
          status?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          family_id?: string
          placed_by?: string | null
          item_count?: number
          subtotal_paise?: number
          discount_percent?: number
          discount_paise?: number
          total_paise?: number
          wallet_paise?: number
          gateway_paise?: number
          status?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      bookings: {
        Row: {
          booked_by: string
          cancelled_at: string | null
          completion_marked_at: string | null
          completion_marked_by: string | null
          created_at: string
          id: string
          offering_id: string
          order_id: string | null
          package_id: string | null
          paid_paise: number | null
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
          cancelled_at?: string | null
          completion_marked_at?: string | null
          completion_marked_by?: string | null
          created_at?: string
          id?: string
          offering_id: string
          order_id?: string | null
          package_id?: string | null
          paid_paise?: number | null
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
          cancelled_at?: string | null
          completion_marked_at?: string | null
          completion_marked_by?: string | null
          created_at?: string
          id?: string
          offering_id?: string
          order_id?: string | null
          package_id?: string | null
          paid_paise?: number | null
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
      isc_consent: {
        Row: {
          id: string
          student_id: string
          season: string
          guardian_name: string
          given_at: string
          consented_by: string | null
          consent_version: string | null
          promo_use: boolean | null
          brainweave_sharing: boolean | null
        }
        Insert: {
          id?: string
          student_id: string
          season?: string
          guardian_name: string
          given_at?: string
          consented_by?: string | null
          consent_version?: string | null
          promo_use?: boolean | null
          brainweave_sharing?: boolean | null
        }
        Update: {
          id?: string
          student_id?: string
          season?: string
          guardian_name?: string
          given_at?: string
          consented_by?: string | null
          consent_version?: string | null
          promo_use?: boolean | null
          brainweave_sharing?: boolean | null
        }
        Relationships: []
      }
      isc_entry_revisions: {
        Row: {
          id: string
          entry_id: string
          edited_by: string | null
          changed: Json
          edited_at: string
        }
        Insert: {
          id?: string
          entry_id: string
          edited_by?: string | null
          changed: Json
          edited_at?: string
        }
        Update: {
          id?: string
          entry_id?: string
          edited_by?: string | null
          changed?: Json
          edited_at?: string
        }
        Relationships: []
      }
      isc_entries: {
        Row: {
          id: string
          track: string
          school_id: string
          created_by: string
          status: string
          submission: Json
          /**
           * 'group1' (Classes 5-8) | 'group2' (Classes 9-12) | null.
           * Set by the isc_entries_division_trg trigger from the leader's
           * class; null when the leader sits outside Classes 5-12, and null on
           * every row until docs/admin-scale-migration.sql has been run.
           */
          division: string | null
          consent_given_at: string | null
          submitted_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          track: string
          school_id: string
          created_by: string
          status?: string
          submission?: Json
          /** Leave it out: the insert trigger derives it from the leader's class. */
          division?: string | null
          consent_given_at?: string | null
          submitted_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          track?: string
          school_id?: string
          created_by?: string
          status?: string
          submission?: Json
          division?: string | null
          consent_given_at?: string | null
          submitted_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      isc_entry_members: {
        Row: {
          id: string
          entry_id: string
          track: string
          user_id: string | null
          invited_email: string | null
          invite_token: string | null
          is_leader: boolean
          created_at: string
          accepted_at: string | null
        }
        Insert: {
          id?: string
          entry_id: string
          track: string
          user_id?: string | null
          invited_email?: string | null
          invite_token?: string | null
          is_leader?: boolean
          created_at?: string
          accepted_at?: string | null
        }
        Update: {
          id?: string
          entry_id?: string
          track?: string
          user_id?: string | null
          invited_email?: string | null
          invite_token?: string | null
          is_leader?: boolean
          created_at?: string
          accepted_at?: string | null
        }
        Relationships: []
      }
      support_conversations: {
        Row: {
          id: string
          coordinator_id: string
          created_at: string
          last_message_at: string
        }
        Insert: {
          id?: string
          coordinator_id: string
          created_at?: string
          last_message_at?: string
        }
        Update: {
          id?: string
          coordinator_id?: string
          created_at?: string
          last_message_at?: string
        }
        Relationships: []
      }
      support_messages: {
        Row: {
          id: string
          conversation_id: string
          sender_id: string
          sender_role: string
          body: string
          created_at: string
          read_at: string | null
        }
        Insert: {
          id?: string
          conversation_id: string
          sender_id: string
          sender_role: string
          body: string
          created_at?: string
          read_at?: string | null
        }
        Update: {
          id?: string
          conversation_id?: string
          sender_id?: string
          sender_role?: string
          body?: string
          created_at?: string
          read_at?: string | null
        }
        Relationships: []
      }
      support_config: {
        Row: {
          id: string
          admin_contact_email: string | null
          admin_contact_phone: string | null
          updated_at: string
        }
        Insert: {
          id?: string
          admin_contact_email?: string | null
          admin_contact_phone?: string | null
          updated_at?: string
        }
        Update: {
          id?: string
          admin_contact_email?: string | null
          admin_contact_phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      isc_config: {
        Row: { track: string; screening_deadline: string }
        Insert: { track: string; screening_deadline: string }
        Update: { track?: string; screening_deadline?: string }
        Relationships: []
      }
      schools: {
        Row: {
          id: string
          affiliation_no: string | null
          name: string
          state: string
          district: string
          address: string | null
          pincode: string | null
          level: string | null
          source: string
          review_status: string
          review_notes: string | null
          reviewed_by: string | null
          reviewed_at: string | null
          created_by: string | null
          created_at: string
          coordinator_id: string | null
          coordinator_status: string
          coordinator_notes: string | null
          board: string | null
          student_count_range: string | null
        }
        Insert: {
          id?: string
          affiliation_no?: string | null
          name: string
          state: string
          district: string
          address?: string | null
          pincode?: string | null
          level?: string | null
          source?: string
          review_status?: string
          review_notes?: string | null
          reviewed_by?: string | null
          reviewed_at?: string | null
          created_by?: string | null
          created_at?: string
          coordinator_id?: string | null
          coordinator_status?: string
          coordinator_notes?: string | null
          board?: string | null
          student_count_range?: string | null
        }
        Update: {
          id?: string
          affiliation_no?: string | null
          name?: string
          state?: string
          district?: string
          address?: string | null
          pincode?: string | null
          level?: string | null
          source?: string
          review_status?: string
          review_notes?: string | null
          reviewed_by?: string | null
          reviewed_at?: string | null
          created_by?: string | null
          created_at?: string
          coordinator_id?: string | null
          coordinator_status?: string
          coordinator_notes?: string | null
          board?: string | null
          student_count_range?: string | null
        }
        Relationships: []
      }
      user_profiles: {
        Row: {
          family_id: string | null
          family_status: string
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
          school_district: string | null
          terms_agreed_at: string | null
          terms_version: string | null
          marketing_skillfleet: boolean | null
          marketing_brainweave: boolean | null
          school_id: string | null
          school_name: string | null
          school_state: string | null
          updated_at: string
        }
        Insert: {
          family_id?: string | null
          family_status?: string
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
          school_district?: string | null
          terms_agreed_at?: string | null
          terms_version?: string | null
          marketing_skillfleet?: boolean | null
          marketing_brainweave?: boolean | null
          school_id?: string | null
          school_name?: string | null
          school_state?: string | null
          updated_at?: string
        }
        Update: {
          family_id?: string | null
          family_status?: string
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
          school_district?: string | null
          terms_agreed_at?: string | null
          terms_version?: string | null
          marketing_skillfleet?: boolean | null
          marketing_brainweave?: boolean | null
          school_id?: string | null
          school_name?: string | null
          school_state?: string | null
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
      get_family_students: {
        Args: Record<string, never>
        Returns: {
          student_id: string
          full_name: string | null
          email: string
          date_of_birth: string | null
          is_self: boolean
        }[]
      }
      get_pending_family_members: {
        Args: Record<string, never>
        Returns: { student_id: string; full_name: string | null; email: string; date_of_birth: string | null }[]
      }
      decide_family_member: { Args: { p_student_id: string; p_approve: boolean }; Returns: string }
      get_school_states: { Args: Record<string, never>; Returns: { state: string }[] }
      get_school_districts: { Args: { p_state: string }; Returns: { district: string }[] }
      find_similar_schools: {
        Args: { p_school_id: string }
        Returns: {
          id: string
          name: string
          address: string | null
          review_status: string
          score: number
        }[]
      }
      admin_review_school: {
        Args: {
          p_school_id: string
          p_decision: string
          p_notes?: string | null
          p_merge_into?: string | null
        }
        Returns: string
      }
      get_my_school_review_status: {
        Args: Record<string, never>
        Returns: { school_name: string; review_status: string; review_notes: string | null }[]
      }
      add_pending_school: {
        Args: { p_name: string; p_state: string; p_district: string }
        Returns: string
      }
      isc_claim_invites: { Args: Record<string, never>; Returns: Json }
      isc_add_member: { Args: { p_entry_id: string; p_email: string }; Returns: Json }
      isc_remove_member: { Args: { p_entry_id: string; p_member_id: string }; Returns: Json }
      isc_start_entry: { Args: { p_track: string }; Returns: Json }
      isc_save_entry: { Args: { p_entry_id: string; p_submission: Json }; Returns: Json }
      isc_submit_entry: { Args: { p_entry_id: string }; Returns: Json }
      isc_has_consent: { Args: Record<string, never>; Returns: boolean }
      isc_give_consent: { Args: { p_guardian_name: string }; Returns: Json }
      isc_get_my_entries: { Args: Record<string, never>; Returns: Json }
      isc_get_my_invites: { Args: Record<string, never>; Returns: Json }
      isc_leave_entry: { Args: { p_entry_id: string }; Returns: Json }
      isc_leave_team: { Args: { p_entry_id: string }; Returns: Json }
      isc_respond_to_invite: {
        Args: { p_member_id: string; p_accept: boolean }
        Returns: Json
      }
      isc_get_entry: { Args: { p_entry_id: string }; Returns: Json }
      isc_get_entry_revisions: { Args: { p_entry_id: string }; Returns: Json }
      support_coordinator_send_message: { Args: { p_body: string }; Returns: string }
      support_admin_send_message: {
        Args: { p_coordinator_id: string; p_body: string }
        Returns: string
      }
      support_mark_thread_read: { Args: { p_conversation_id: string }; Returns: string }
      apply_as_coordinator: {
        Args: { p_school_id: string; p_board: string; p_student_count_range: string }
        Returns: string
      }
      admin_review_coordinator_claim: {
        Args: { p_school_id: string; p_decision: string; p_notes?: string | null }
        Returns: string
      }
      get_my_coordinator_school: {
        Args: Record<string, never>
        Returns: {
          school_id: string
          school_name: string
          coordinator_status: string
          review_notes: string | null
        }[]
      }
      get_school_roster: {
        Args: Record<string, never>
        Returns: {
          student_id: string
          full_name: string | null
          school_class: string | null
          isc_status: Json
        }[]
      }
      get_my_family: {
        Args: Record<string, never>
        Returns: {
          family_id: string
          parent_full_name: string
          parent_email: string
          parent_phone: string | null
          my_status: string
          member_count: number
        }[]
      }
      update_family_parent_details: {
        Args: { p_full_name: string; p_phone: string }
        Returns: string
      }
      my_family_id: { Args: Record<string, never>; Returns: string | null }
      same_family: { Args: { p_student_id: string }; Returns: boolean }
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
      get_switch_targets: {
        Args: Record<string, never>
        Returns: { user_id: string; full_name: string | null; email: string; role: string }[]
      }
      accounts_are_linked: { Args: { p_a: string; p_b: string }; Returns: boolean }
      get_student_rank: {
        Args: { p_student_id: string }
        Returns: {
          total_points: number
          student_rank: number
          cohort_size: number
          percentile: number
          band_label: string
        }[]
      }
      bulk_discount_percent: { Args: { p_count: number }; Returns: number }
      add_to_cart: { Args: { p_student_id: string; p_offering_id: string }; Returns: string }
      remove_from_cart: { Args: { p_cart_item_id: string }; Returns: string }
      clear_cart: { Args: Record<string, never>; Returns: string }
      checkout_cart: {
        Args: { p_use_wallet?: boolean }
        Returns: { status: string; order_id: string | null }[]
      }
      settle_order_payment: { Args: { p_order_id: string; p_success: boolean }; Returns: string }
      cancel_booking_refund: {
        Args: { p_booking_id: string }
        Returns: { status: string; refunded_paise: number }[]
      }
      create_package_upgrade: {
        Args: { p_package_id: string; p_new_tier_id: string }
        Returns: { status: string; cost_paise: number | null }[]
      }
      settle_package_upgrade: {
        Args: { p_package_id: string; p_success: boolean; p_order_id: string; p_payment_id: string }
        Returns: string
      }

      // ---------------------------------------------------------------
      // Admin at scale -- docs/admin-scale-migration.sql.
      //
      // All fifteen are `security definer` and gated on is_admin(); a non-admin
      // gets the Postgres error 'admin only', not an empty result. Until the
      // founder has pasted that file into the SQL editor they do not exist,
      // and PostgREST answers PGRST202 -- which src/lib/admin/errors.ts maps
      // to the 'migration-missing' result kind. The last five are section G,
      // the coordinator half -- see src/lib/admin/coordinators.ts.
      //
      // Two shapes of trap are encoded below and must not be "tidied":
      //   * `p_district` without `p_state` RAISES. District names repeat
      //     across states, so the SQL refuses to guess. src/lib/admin/scope.ts
      //     drops the orphan district before it can reach here.
      //   * Every count is a SQL `bigint` and is typed `number` here because
      //     that is what PostgREST sends. Other drivers send a string or a
      //     BigInt, so the readers still coerce -- see src/lib/admin/coerce.ts.
      // ---------------------------------------------------------------

      /** jsonb. See IscSummary in src/lib/admin/isc.ts for the shape. */
      admin_isc_summary: {
        Args: { p_state?: string | null; p_district?: string | null; p_school_id?: string | null }
        Returns: Json
      }
      /**
       * One level per call: () -> states, (state) -> its districts,
       * (state, district) -> its schools, where `key` is the school id as text
       * and `label` is its name.
       */
      admin_isc_breakdown: {
        Args: { p_state?: string | null; p_district?: string | null }
        Returns: {
          key: string
          label: string
          eligible: number
          started: number
          submitted: number
          schools: number
        }[]
      }
      /** Exactly greatest(p_days, 1) rows, oldest first, zero-filled. `day` is a date. */
      admin_isc_timeline: {
        Args: {
          p_state?: string | null
          p_district?: string | null
          p_school_id?: string | null
          p_days?: number
        }
        Returns: { day: string; started: number; submitted: number }[]
      }
      /** p_page is 1-based; p_size is clamped to 200 in SQL. `total` is count(*) over (). */
      admin_isc_roster: {
        Args: {
          p_state?: string | null
          p_district?: string | null
          p_school_id?: string | null
          p_track?: string | null
          p_status?: string | null
          p_division?: string | null
          p_language?: string | null
          p_q?: string | null
          p_page?: number
          p_size?: number
        }
        Returns: {
          id: string
          track: string
          status: string
          division: string | null
          language: string | null
          school_id: string
          school_name: string
          leader_id: string
          leader_name: string | null
          member_count: number
          created_at: string
          submitted_at: string | null
          total: number
        }[]
      }
      /**
       * The roster's columns minus `total`, walked by keyset instead of offset.
       * Raises without a state or a school (a national export is refused), and
       * raises on half a cursor: pass both p_after_created and p_after_id, or
       * neither.
       */
      admin_isc_export_chunk: {
        Args: {
          p_state?: string | null
          p_district?: string | null
          p_school_id?: string | null
          p_track?: string | null
          p_status?: string | null
          p_division?: string | null
          p_language?: string | null
          p_q?: string | null
          p_after_created?: string | null
          p_after_id?: string | null
          p_size?: number
        }
        Returns: {
          id: string
          track: string
          status: string
          division: string | null
          language: string | null
          school_id: string
          school_name: string
          leader_id: string
          leader_name: string | null
          member_count: number
          created_at: string
          submitted_at: string | null
        }[]
      }
      /** Schools with eligible students and no entry. Only lists eligible >= 1. */
      admin_isc_cold_schools: {
        Args: {
          p_state?: string | null
          p_district?: string | null
          p_page?: number
          p_size?: number
        }
        Returns: {
          id: string
          name: string
          state: string
          district: string
          eligible: number
          coordinator_status: string
          total: number
        }[]
      }
      /**
       * `email` is NULLABLE: auth.users is LEFT joined, so a profile whose auth
       * row has gone is listed with a null email rather than vanishing.
       * p_sort is 'created_desc' | 'created_asc' | 'name_asc'; anything else
       * quietly falls back to created_desc. p_onboarded is tri-state.
       */
      admin_users_page: {
        Args: {
          p_q?: string | null
          p_role?: string | null
          p_onboarded?: boolean | null
          p_sort?: string | null
          p_page?: number
          p_size?: number
        }
        Returns: {
          id: string
          full_name: string | null
          email: string | null
          role: string
          school_name: string | null
          school_state: string | null
          school_class: string | null
          onboarding_completed: boolean
          created_at: string
          total: number
        }[]
      }
      /**
       * Three top-N lists in one round trip, up to 3 * p_limit rows; group them
       * by `kind`. Under two characters it returns nothing at all. `subtitle`
       * is never null but may be the empty string.
       */
      admin_search: {
        Args: { p_q: string; p_limit?: number }
        Returns: { kind: string; id: string; title: string; subtitle: string }[]
      }
      /** jsonb. See the task-4-5 report for the shape; ~5s at target scale. */
      admin_dashboard: {
        Args: Record<string, never>
        Returns: Json
      }
      /** At most 200 ids per call, or it raises. A school with no near-duplicate returns no row. */
      admin_similar_schools_batch: {
        Args: { p_school_ids: string[] }
        Returns: {
          school_id: string
          similar_id: string
          similar_name: string
          similar_address: string | null
          similar_review_status: string
          score: number
        }[]
      }

      // ---------------------------------------------------------------
      // Section G -- coordinators. Three units live in these five functions
      // and mixing them is how this screen goes wrong: `coordinators`,
      // `approved`, `pending` and `rejected` count PEOPLE; every `schools_*`
      // counts SCHOOLS; every `students_*` counts STUDENTS. `students` is
      // REACH -- every student registered at the school -- and NOT section
      // C's Classes 5-12 `eligible`.
      // ---------------------------------------------------------------

      /**
       * jsonb, thirteen keys, never null. See CoordinatorSummary in
       * src/lib/admin/coordinators.ts. `entered_pct` is a true subset over its
       * own superset and so is safe to draw as a percentage, unlike
       * admin_dashboard's submitted/eligible. p_district without p_state
       * RAISES, like every other scoped function here.
       */
      admin_coordinator_summary: {
        Args: { p_state?: string | null; p_district?: string | null }
        Returns: Json
      }
      /**
       * States nationally, one state's districts with p_state -- there is NO
       * p_district on this one. Every state with a school is listed, including
       * those with no coordinator, because that row is the answer to "where is
       * there no coverage". Ordered students_covered desc, key.
       */
      admin_coordinator_breakdown: {
        Args: { p_state?: string | null }
        Returns: {
          key: string
          label: string
          coordinators: number
          approved: number
          schools_claimed: number
          schools_total: number
          students_covered: number
          students_entered: number
        }[]
      }
      /**
       * A SIGNUP COHORT, not an event chart: `schools` carries no claim date,
       * so every claim and approval is plotted on the day its coordinator
       * signed up. The `cohort_` prefixes are the contract -- renamed to
       * `claims`/`approvals` on a day axis they would read as events, and a
       * 30-day window would look like recruitment had stopped.
       * greatest(p_days, 1) rows, oldest first, zero-filled, ending today.
       */
      admin_coordinator_trend: {
        Args: { p_state?: string | null; p_days?: number }
        Returns: {
          day: string
          coordinators: number
          cohort_claimed: number
          cohort_approved: number
        }[]
      }
      /**
       * p_page is 1-based; p_size is clamped to 200 in SQL. `email` is
       * NULLABLE (auth.users is LEFT joined). p_sort is 'students_desc' |
       * 'students_asc' | 'name_asc' | 'joined_desc' and anything else quietly
       * falls back to students_desc. p_state excludes every coordinator who
       * has claimed nothing, since a claim is the only thing that gives them a
       * state. `students` sums over EVERY school they hold while school_name
       * shows one -- `schools_claimed` says how many.
       */
      admin_coordinators_page: {
        Args: {
          p_q?: string | null
          p_status?: string | null
          p_state?: string | null
          p_sort?: string | null
          p_page?: number
          p_size?: number
        }
        Returns: {
          id: string
          full_name: string | null
          email: string | null
          phone: string | null
          school_id: string | null
          school_name: string | null
          state: string | null
          district: string | null
          claim_status: string
          schools_claimed: number
          students: number
          students_entered: number
          joined_at: string
          total: number
        }[]
      }
      /**
       * jsonb, or SQL NULL when the id is not a coordinator profile -- a
       * student's id and an unknown uuid both answer null rather than raising.
       * See CoordinatorDetail in src/lib/admin/coordinators.ts. `by_track`
       * counts ENTRIES and sums to `entries`; admin_isc_summary's by_track
       * counts distinct STUDENTS and does not.
       */
      admin_coordinator_detail: {
        Args: { p_coordinator_id: string }
        Returns: Json
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
