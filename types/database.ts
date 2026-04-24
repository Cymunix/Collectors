export type UserRole = "collector" | "store";
export type InventoryStatus = "active" | "reserved" | "sold" | "archived";
export type TransactionStatus = "pending" | "paid" | "shipped" | "completed" | "canceled";

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type UserProfile = {
  id: string;
  email: string;
  role: UserRole;
  display_name: string | null;
  store_name: string | null;
  created_at: string;
  updated_at: string;
};

type Row<T> = T;
type Insert<T> = Partial<T>;
type Update<T> = Partial<T>;

export type Database = {
  public: {
    Tables: {
      users: {
        Row: Row<UserProfile>;
        Insert: Insert<UserProfile> & Pick<UserProfile, "id" | "email">;
        Update: Update<UserProfile>;
        Relationships: [];
      };
      catalog_items: {
        Row: {
          id: string;
          title: string;
          category: string;
          brand: string | null;
          description: string | null;
          image_url: string | null;
          estimated_value: number | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          category: string;
          brand?: string | null;
          description?: string | null;
          image_url?: string | null;
          estimated_value?: number | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          category?: string;
          brand?: string | null;
          description?: string | null;
          image_url?: string | null;
          estimated_value?: number | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      store_inventory: {
        Row: {
          id: string;
          store_id: string;
          catalog_item_id: string;
          sku: string | null;
          condition: string | null;
          quantity: number;
          price: number;
          status: InventoryStatus;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          store_id: string;
          catalog_item_id: string;
          sku?: string | null;
          condition?: string | null;
          quantity?: number;
          price: number;
          status?: InventoryStatus;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["store_inventory"]["Insert"]>;
        Relationships: [];
      };
      user_collections: {
        Row: {
          id: string;
          collector_id: string;
          catalog_item_id: string;
          condition: string | null;
          quantity: number;
          acquired_at: string | null;
          notes: string | null;
          visibility: "private" | "public";
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          collector_id: string;
          catalog_item_id: string;
          condition?: string | null;
          quantity?: number;
          acquired_at?: string | null;
          notes?: string | null;
          visibility?: "private" | "public";
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["user_collections"]["Insert"]>;
        Relationships: [];
      };
      transactions: {
        Row: {
          id: string;
          buyer_id: string;
          seller_id: string;
          inventory_item_id: string | null;
          catalog_item_id: string;
          quantity: number;
          unit_price: number;
          status: TransactionStatus;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          buyer_id: string;
          seller_id: string;
          inventory_item_id?: string | null;
          catalog_item_id: string;
          quantity?: number;
          unit_price: number;
          status?: TransactionStatus;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["transactions"]["Insert"]>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      current_user_role: {
        Args: Record<string, never>;
        Returns: UserRole | null;
      };
    };
    Enums: {
      user_role: UserRole;
      inventory_status: InventoryStatus;
      transaction_status: TransactionStatus;
    };
    CompositeTypes: Record<string, never>;
  };
};
