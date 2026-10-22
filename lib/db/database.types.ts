
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
            "categories": {
                  Row: {
                    "blurb": string | null,"id": string,"name": string,"sort": number
                  }
                  ComputedFields: never
                  Insert: {
                    "blurb"?: string | null,"id": string,"name": string,"sort"?: number
                  }
                  Update: {
                    "blurb"?: string | null,"id"?: string,"name"?: string,"sort"?: number
                  }
                  Relationships: [
                    
                  ]
                },"gift_cards": {
                  Row: {
                    "activated_at": string | null,"content": NonNullable<Json>,"created_at": string,"design": string | null,"id": string,"product_id": string,"slug": string,"status": Database["public"]['Enums']["gift_status"],"template": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "activated_at"?: string | null,"content": NonNullable<Json>,"created_at"?: string,"design"?: string | null,"id"?: string,"product_id": string,"slug": string,"status"?: Database["public"]['Enums']["gift_status"],"template": string,"updated_at"?: string
                  }
                  Update: {
                    "activated_at"?: string | null,"content"?: NonNullable<Json>,"created_at"?: string,"design"?: string | null,"id"?: string,"product_id"?: string,"slug"?: string,"status"?: Database["public"]['Enums']["gift_status"],"template"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "gift_cards_product_id_fkey"
      columns: ["product_id"]
isOneToOne: false
      referencedRelation: "products"
      referencedColumns: ["id"]
    }
                  ]
                },"orders": {
                  Row: {
                    "access_token_hash": string,"amount_vnd": number,"buyer_email": string | null,"buyer_name": string | null,"buyer_phone": string | null,"code": string,"created_at": string,"gift_card_id": string,"id": string,"paid_at": string | null,"payment_provider": string | null,"payment_ref": string | null,"product_id": string,"status": Database["public"]['Enums']["order_status"],"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "access_token_hash": string,"amount_vnd": number,"buyer_email"?: string | null,"buyer_name"?: string | null,"buyer_phone"?: string | null,"code": string,"created_at"?: string,"gift_card_id": string,"id"?: string,"paid_at"?: string | null,"payment_provider"?: string | null,"payment_ref"?: string | null,"product_id": string,"status"?: Database["public"]['Enums']["order_status"],"updated_at"?: string
                  }
                  Update: {
                    "access_token_hash"?: string,"amount_vnd"?: number,"buyer_email"?: string | null,"buyer_name"?: string | null,"buyer_phone"?: string | null,"code"?: string,"created_at"?: string,"gift_card_id"?: string,"id"?: string,"paid_at"?: string | null,"payment_provider"?: string | null,"payment_ref"?: string | null,"product_id"?: string,"status"?: Database["public"]['Enums']["order_status"],"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "orders_gift_card_id_fkey"
      columns: ["gift_card_id"]
isOneToOne: false
      referencedRelation: "gift_cards"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "orders_product_id_fkey"
      columns: ["product_id"]
isOneToOne: false
      referencedRelation: "products"
      referencedColumns: ["id"]
    }
                  ]
                },"payments": {
                  Row: {
                    "amount_vnd": number,"created_at": string,"id": string,"order_id": string,"provider": string,"provider_ref": string,"raw": Json | null,"status": string
                  }
                  ComputedFields: never
                  Insert: {
                    "amount_vnd": number,"created_at"?: string,"id"?: string,"order_id": string,"provider": string,"provider_ref": string,"raw"?: Json | null,"status": string
                  }
                  Update: {
                    "amount_vnd"?: number,"created_at"?: string,"id"?: string,"order_id"?: string,"provider"?: string,"provider_ref"?: string,"raw"?: Json | null,"status"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "payments_order_id_fkey"
      columns: ["order_id"]
isOneToOne: false
      referencedRelation: "orders"
      referencedColumns: ["id"]
    }
                  ]
                },"product_categories": {
                  Row: {
                    "category_id": string,"product_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "category_id": string,"product_id": string
                  }
                  Update: {
                    "category_id"?: string,"product_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "product_categories_category_id_fkey"
      columns: ["category_id"]
isOneToOne: false
      referencedRelation: "categories"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "product_categories_product_id_fkey"
      columns: ["product_id"]
isOneToOne: false
      referencedRelation: "products"
      referencedColumns: ["id"]
    }
                  ]
                },"products": {
                  Row: {
                    "active": boolean,"blurb": string | null,"created_at": string,"design": string | null,"id": string,"kind": string,"name": string,"price_vnd": number,"search": unknown,"sort": number,"tags": (string)[],"template": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "active"?: boolean,"blurb"?: string | null,"created_at"?: string,"design"?: string | null,"id": string,"kind": string,"name": string,"price_vnd": number,"search"?: unknown,"sort"?: number,"tags"?: (string)[],"template": string,"updated_at"?: string
                  }
                  Update: {
                    "active"?: boolean,"blurb"?: string | null,"created_at"?: string,"design"?: string | null,"id"?: string,"kind"?: string,"name"?: string,"price_vnd"?: number,"search"?: unknown,"sort"?: number,"tags"?: (string)[],"template"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                }
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "cleanup_abandoned":
{ Args: { "p_older_than"?: string }; Returns: Json
                           },
"confirm_order_payment":
{ Args: { "p_amount": number,"p_order_id": string,"p_paid_at": string,"p_provider": string,"p_raw": Json,"p_ref": string }; Returns: Json
                           },
"content_photos":
{ Args: { "c": Json }; Returns: string[]
                           },
"fold":
{ Args: { "t": string }; Returns: string
                           },
"photos_in_use":
{ Args: { "p_paths": (string)[] }; Returns: (string)[]
                           },
"product_search_doc":
{ Args: { "p_blurb": string,"p_id": string,"p_name": string,"p_tags": (string)[] }; Returns: unknown
                           },
"search_products":
{ Args: { "p_category"?: string,"p_query"?: string }; Returns: {
              "active": boolean,"blurb": string,"categories": (string)[],"design": string,"id": string,"kind": string,"name": string,"price_vnd": number,"rank": number,"sort": number,"tags": (string)[],"template": string
            }[]
                           },
"search_query":
{ Args: { "p_text": string }; Returns: unknown
                           },
"search_words":
{ Args: { "t": string }; Returns: string
                           },
"shelf_categories":
{ Args: Record<PropertyKey, never>; Returns: {
              "blurb": string,"id": string,"name": string,"products": number,"sort": number
            }[]
                           }
          }
          Enums: {
            "gift_status": "draft"|"active"|"disabled","order_status": "pending"|"paid"|"failed"|"cancelled"|"refunded"
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
            "gift_status": ["draft", "active", "disabled"],"order_status": ["pending", "paid", "failed", "cancelled", "refunded"]
          }
        }
} as const
