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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      abandoned_carts: {
        Row: {
          cart_items: Json
          cart_total: number
          converted: boolean
          converted_at: string | null
          created_at: string
          email: string
          id: string
          reminder_sent: boolean
          reminder_sent_at: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          cart_items?: Json
          cart_total?: number
          converted?: boolean
          converted_at?: string | null
          created_at?: string
          email: string
          id?: string
          reminder_sent?: boolean
          reminder_sent_at?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          cart_items?: Json
          cart_total?: number
          converted?: boolean
          converted_at?: string | null
          created_at?: string
          email?: string
          id?: string
          reminder_sent?: boolean
          reminder_sent_at?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      announcement_settings: {
        Row: {
          created_at: string
          id: string
          setting_key: string
          setting_value: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          setting_key: string
          setting_value: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          setting_key?: string
          setting_value?: string
          updated_at?: string
        }
        Relationships: []
      }
      announcements: {
        Row: {
          created_at: string
          display_order: number | null
          icon: string | null
          id: string
          is_active: boolean | null
          text: string
          text_ar: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_order?: number | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          text: string
          text_ar: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_order?: number | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          text?: string
          text_ar?: string
          updated_at?: string
        }
        Relationships: []
      }
      bundle_items: {
        Row: {
          bundle_id: string
          id: string
          product_id: string
          quantity: number | null
        }
        Insert: {
          bundle_id: string
          id?: string
          product_id: string
          quantity?: number | null
        }
        Update: {
          bundle_id?: string
          id?: string
          product_id?: string
          quantity?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "bundle_items_bundle_id_fkey"
            columns: ["bundle_id"]
            isOneToOne: false
            referencedRelation: "bundles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bundle_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      bundles: {
        Row: {
          created_at: string
          description: string | null
          description_ar: string | null
          display_order: number | null
          id: string
          image: string | null
          images: string[] | null
          is_active: boolean | null
          is_featured: boolean | null
          name: string
          name_ar: string
          occasion_id: string | null
          original_price: number | null
          price: number
          slug: string
          tags: string[] | null
          tier: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          description_ar?: string | null
          display_order?: number | null
          id?: string
          image?: string | null
          images?: string[] | null
          is_active?: boolean | null
          is_featured?: boolean | null
          name: string
          name_ar: string
          occasion_id?: string | null
          original_price?: number | null
          price: number
          slug: string
          tags?: string[] | null
          tier?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          description_ar?: string | null
          display_order?: number | null
          id?: string
          image?: string | null
          images?: string[] | null
          is_active?: boolean | null
          is_featured?: boolean | null
          name?: string
          name_ar?: string
          occasion_id?: string | null
          original_price?: number | null
          price?: number
          slug?: string
          tags?: string[] | null
          tier?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bundles_occasion_id_fkey"
            columns: ["occasion_id"]
            isOneToOne: false
            referencedRelation: "occasions"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          created_at: string
          description: string | null
          description_ar: string | null
          display_order: number | null
          id: string
          image: string | null
          is_active: boolean | null
          name: string
          name_ar: string
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          description_ar?: string | null
          display_order?: number | null
          id?: string
          image?: string | null
          is_active?: boolean | null
          name: string
          name_ar: string
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          description_ar?: string | null
          display_order?: number | null
          id?: string
          image?: string | null
          is_active?: boolean | null
          name?: string
          name_ar?: string
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      coupon_usages: {
        Row: {
          coupon_id: string
          created_at: string
          discount_amount: number
          id: string
          order_id: string | null
          user_id: string | null
        }
        Insert: {
          coupon_id: string
          created_at?: string
          discount_amount: number
          id?: string
          order_id?: string | null
          user_id?: string | null
        }
        Update: {
          coupon_id?: string
          created_at?: string
          discount_amount?: number
          id?: string
          order_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "coupon_usages_coupon_id_fkey"
            columns: ["coupon_id"]
            isOneToOne: false
            referencedRelation: "coupons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coupon_usages_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      coupons: {
        Row: {
          applies_to: string | null
          applies_to_ids: string[] | null
          code: string
          created_at: string
          description: string | null
          description_ar: string | null
          end_date: string | null
          id: string
          is_active: boolean | null
          max_discount: number | null
          max_uses: number | null
          max_uses_per_user: number | null
          min_order_amount: number | null
          name: string
          name_ar: string
          start_date: string | null
          type: string
          updated_at: string
          used_count: number | null
          value: number
        }
        Insert: {
          applies_to?: string | null
          applies_to_ids?: string[] | null
          code: string
          created_at?: string
          description?: string | null
          description_ar?: string | null
          end_date?: string | null
          id?: string
          is_active?: boolean | null
          max_discount?: number | null
          max_uses?: number | null
          max_uses_per_user?: number | null
          min_order_amount?: number | null
          name: string
          name_ar: string
          start_date?: string | null
          type?: string
          updated_at?: string
          used_count?: number | null
          value: number
        }
        Update: {
          applies_to?: string | null
          applies_to_ids?: string[] | null
          code?: string
          created_at?: string
          description?: string | null
          description_ar?: string | null
          end_date?: string | null
          id?: string
          is_active?: boolean | null
          max_discount?: number | null
          max_uses?: number | null
          max_uses_per_user?: number | null
          min_order_amount?: number | null
          name?: string
          name_ar?: string
          start_date?: string | null
          type?: string
          updated_at?: string
          used_count?: number | null
          value?: number
        }
        Relationships: []
      }
      customer_addresses: {
        Row: {
          apartment: string | null
          building: string | null
          city: string
          created_at: string
          district: string | null
          id: string
          is_default: boolean | null
          notes: string | null
          street: string
          user_id: string
        }
        Insert: {
          apartment?: string | null
          building?: string | null
          city: string
          created_at?: string
          district?: string | null
          id?: string
          is_default?: boolean | null
          notes?: string | null
          street: string
          user_id: string
        }
        Update: {
          apartment?: string | null
          building?: string | null
          city?: string
          created_at?: string
          district?: string | null
          id?: string
          is_default?: boolean | null
          notes?: string | null
          street?: string
          user_id?: string
        }
        Relationships: []
      }
      email_events: {
        Row: {
          created_at: string
          email_id: string
          email_type: string
          event_type: string
          id: string
          metadata: Json | null
          order_id: string | null
          recipient_email: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          email_id: string
          email_type: string
          event_type: string
          id?: string
          metadata?: Json | null
          order_id?: string | null
          recipient_email: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          email_id?: string
          email_type?: string
          event_type?: string
          id?: string
          metadata?: Json | null
          order_id?: string | null
          recipient_email?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "email_events_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      gift_boxes: {
        Row: {
          created_at: string
          dimensions: string | null
          dimensions_ar: string | null
          display_order: number | null
          id: string
          image: string | null
          is_active: boolean
          max_items: number
          name: string
          name_ar: string
          price: number
          size: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          dimensions?: string | null
          dimensions_ar?: string | null
          display_order?: number | null
          id?: string
          image?: string | null
          is_active?: boolean
          max_items?: number
          name: string
          name_ar: string
          price: number
          size: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          dimensions?: string | null
          dimensions_ar?: string | null
          display_order?: number | null
          id?: string
          image?: string | null
          is_active?: boolean
          max_items?: number
          name?: string
          name_ar?: string
          price?: number
          size?: string
          updated_at?: string
        }
        Relationships: []
      }
      gift_items: {
        Row: {
          category: string
          category_ar: string
          created_at: string
          display_order: number | null
          id: string
          image: string | null
          is_active: boolean
          name: string
          name_ar: string
          price: number
          updated_at: string
        }
        Insert: {
          category: string
          category_ar: string
          created_at?: string
          display_order?: number | null
          id?: string
          image?: string | null
          is_active?: boolean
          name: string
          name_ar: string
          price: number
          updated_at?: string
        }
        Update: {
          category?: string
          category_ar?: string
          created_at?: string
          display_order?: number | null
          id?: string
          image?: string | null
          is_active?: boolean
          name?: string
          name_ar?: string
          price?: number
          updated_at?: string
        }
        Relationships: []
      }
      gift_wraps: {
        Row: {
          color: string | null
          created_at: string
          display_order: number | null
          id: string
          image: string | null
          is_active: boolean
          name: string
          name_ar: string
          price: number
          updated_at: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          display_order?: number | null
          id?: string
          image?: string | null
          is_active?: boolean
          name: string
          name_ar: string
          price: number
          updated_at?: string
        }
        Update: {
          color?: string | null
          created_at?: string
          display_order?: number | null
          id?: string
          image?: string | null
          is_active?: boolean
          name?: string
          name_ar?: string
          price?: number
          updated_at?: string
        }
        Relationships: []
      }
      occasion_reminders: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          is_recurring: boolean
          last_reminded_at: string | null
          notes: string | null
          occasion_date: string
          occasion_type: string | null
          recipient_name: string | null
          reminder_days_before: number
          title: string
          title_ar: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          is_recurring?: boolean
          last_reminded_at?: string | null
          notes?: string | null
          occasion_date: string
          occasion_type?: string | null
          recipient_name?: string | null
          reminder_days_before?: number
          title: string
          title_ar: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          is_recurring?: boolean
          last_reminded_at?: string | null
          notes?: string | null
          occasion_date?: string
          occasion_type?: string | null
          recipient_name?: string | null
          reminder_days_before?: number
          title?: string
          title_ar?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      occasions: {
        Row: {
          created_at: string
          description: string | null
          description_ar: string | null
          display_order: number | null
          icon: string | null
          id: string
          is_active: boolean | null
          name: string
          name_ar: string
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          description_ar?: string | null
          display_order?: number | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          name_ar: string
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          description_ar?: string | null
          display_order?: number | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          name_ar?: string
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      order_items: {
        Row: {
          created_at: string
          id: string
          order_id: string
          product_id: string
          product_image: string | null
          product_name: string
          product_name_ar: string
          quantity: number
          total_price: number
          unit_price: number
          variant_id: string | null
          variant_name: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          order_id: string
          product_id: string
          product_image?: string | null
          product_name: string
          product_name_ar: string
          quantity: number
          total_price: number
          unit_price: number
          variant_id?: string | null
          variant_name?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          order_id?: string
          product_id?: string
          product_image?: string | null
          product_name?: string
          product_name_ar?: string
          quantity?: number
          total_price?: number
          unit_price?: number
          variant_id?: string | null
          variant_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      order_timeline: {
        Row: {
          created_at: string
          id: string
          message: string
          message_ar: string
          order_id: string
          status: string
          status_ar: string
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          message_ar: string
          order_id: string
          status: string
          status_ar: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          message_ar?: string
          order_id?: string
          status?: string
          status_ar?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_timeline_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          coupon_code: string | null
          coupon_discount: number | null
          created_at: string
          delivery_type: string
          discount: number
          estimated_delivery: string | null
          gift_message: string | null
          gift_wrap_fee: number
          guest_email: string | null
          guest_phone: string | null
          hide_invoice: boolean | null
          id: string
          internal_notes: string | null
          is_gift: boolean | null
          lookup_token: string | null
          notes: string | null
          order_number: string
          payment_method: string
          payment_status: Database["public"]["Enums"]["payment_status"]
          recipient_name: string
          recipient_phone: string
          scheduled_date: string | null
          scheduled_time: string | null
          shipping_apartment: string | null
          shipping_building: string | null
          shipping_city: string
          shipping_district: string | null
          shipping_fee: number
          shipping_notes: string | null
          shipping_street: string
          status: Database["public"]["Enums"]["order_status"]
          subtotal: number
          total: number
          updated_at: string
          user_id: string | null
        }
        Insert: {
          coupon_code?: string | null
          coupon_discount?: number | null
          created_at?: string
          delivery_type?: string
          discount?: number
          estimated_delivery?: string | null
          gift_message?: string | null
          gift_wrap_fee?: number
          guest_email?: string | null
          guest_phone?: string | null
          hide_invoice?: boolean | null
          id?: string
          internal_notes?: string | null
          is_gift?: boolean | null
          lookup_token?: string | null
          notes?: string | null
          order_number: string
          payment_method: string
          payment_status?: Database["public"]["Enums"]["payment_status"]
          recipient_name: string
          recipient_phone: string
          scheduled_date?: string | null
          scheduled_time?: string | null
          shipping_apartment?: string | null
          shipping_building?: string | null
          shipping_city: string
          shipping_district?: string | null
          shipping_fee?: number
          shipping_notes?: string | null
          shipping_street: string
          status?: Database["public"]["Enums"]["order_status"]
          subtotal: number
          total: number
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          coupon_code?: string | null
          coupon_discount?: number | null
          created_at?: string
          delivery_type?: string
          discount?: number
          estimated_delivery?: string | null
          gift_message?: string | null
          gift_wrap_fee?: number
          guest_email?: string | null
          guest_phone?: string | null
          hide_invoice?: boolean | null
          id?: string
          internal_notes?: string | null
          is_gift?: boolean | null
          lookup_token?: string | null
          notes?: string | null
          order_number?: string
          payment_method?: string
          payment_status?: Database["public"]["Enums"]["payment_status"]
          recipient_name?: string
          recipient_phone?: string
          scheduled_date?: string | null
          scheduled_time?: string | null
          shipping_apartment?: string | null
          shipping_building?: string | null
          shipping_city?: string
          shipping_district?: string | null
          shipping_fee?: number
          shipping_notes?: string | null
          shipping_street?: string
          status?: Database["public"]["Enums"]["order_status"]
          subtotal?: number
          total?: number
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      product_occasions: {
        Row: {
          id: string
          occasion_id: string
          product_id: string
        }
        Insert: {
          id?: string
          occasion_id: string
          product_id: string
        }
        Update: {
          id?: string
          occasion_id?: string
          product_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_occasions_occasion_id_fkey"
            columns: ["occasion_id"]
            isOneToOne: false
            referencedRelation: "occasions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_occasions_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          category_id: string | null
          created_at: string
          description: string | null
          description_ar: string | null
          id: string
          image: string | null
          images: string[] | null
          in_stock: boolean | null
          is_active: boolean | null
          is_bestseller: boolean | null
          is_express: boolean | null
          is_last_minute: boolean | null
          is_new: boolean | null
          name: string
          name_ar: string
          order_count: number | null
          original_price: number | null
          price: number
          price_tier: string | null
          sku: string
          slug: string
          stock_count: number | null
          tags: string[] | null
          target_audience: string[] | null
          updated_at: string
          view_count: number | null
        }
        Insert: {
          category_id?: string | null
          created_at?: string
          description?: string | null
          description_ar?: string | null
          id?: string
          image?: string | null
          images?: string[] | null
          in_stock?: boolean | null
          is_active?: boolean | null
          is_bestseller?: boolean | null
          is_express?: boolean | null
          is_last_minute?: boolean | null
          is_new?: boolean | null
          name: string
          name_ar: string
          order_count?: number | null
          original_price?: number | null
          price: number
          price_tier?: string | null
          sku: string
          slug: string
          stock_count?: number | null
          tags?: string[] | null
          target_audience?: string[] | null
          updated_at?: string
          view_count?: number | null
        }
        Update: {
          category_id?: string | null
          created_at?: string
          description?: string | null
          description_ar?: string | null
          id?: string
          image?: string | null
          images?: string[] | null
          in_stock?: boolean | null
          is_active?: boolean | null
          is_bestseller?: boolean | null
          is_express?: boolean | null
          is_last_minute?: boolean | null
          is_new?: boolean | null
          name?: string
          name_ar?: string
          order_count?: number | null
          original_price?: number | null
          price?: number
          price_tier?: string | null
          sku?: string
          slug?: string
          stock_count?: number | null
          tags?: string[] | null
          target_audience?: string[] | null
          updated_at?: string
          view_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          first_name: string | null
          id: string
          last_name: string | null
          phone: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          first_name?: string | null
          id: string
          last_name?: string | null
          phone?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          first_name?: string | null
          id?: string
          last_name?: string | null
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      ribbons: {
        Row: {
          color: string | null
          created_at: string
          display_order: number | null
          id: string
          is_active: boolean
          name: string
          name_ar: string
          price: number
          updated_at: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          display_order?: number | null
          id?: string
          is_active?: boolean
          name: string
          name_ar: string
          price: number
          updated_at?: string
        }
        Update: {
          color?: string | null
          created_at?: string
          display_order?: number | null
          id?: string
          is_active?: boolean
          name?: string
          name_ar?: string
          price?: number
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      email_stats: {
        Row: {
          bounced_count: number | null
          click_rate: number | null
          clicked_count: number | null
          delivered_count: number | null
          email_type: string | null
          open_rate: number | null
          opened_count: number | null
          sent_count: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role:
        | "admin"
        | "orders_manager"
        | "content_editor"
        | "customer_support"
      order_status:
        | "pending"
        | "confirmed"
        | "processing"
        | "shipped"
        | "delivered"
        | "cancelled"
      payment_status: "pending" | "paid" | "failed" | "refunded"
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
      app_role: [
        "admin",
        "orders_manager",
        "content_editor",
        "customer_support",
      ],
      order_status: [
        "pending",
        "confirmed",
        "processing",
        "shipped",
        "delivered",
        "cancelled",
      ],
      payment_status: ["pending", "paid", "failed", "refunded"],
    },
  },
} as const
