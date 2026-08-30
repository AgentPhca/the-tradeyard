export type UserRole = "collector" | "retailer" | "streamer";
export type CardStatus = "personal_collection" | "for_trade";
export type TradeStatus = "pending" | "accepted" | "completed" | "declined";

export type Profile = {
  id: string;
  username: string;
  full_name: string | null;
  avatar_url: string | null;
  role: UserRole;
  bio: string | null;
  created_at: string;
};

export type Card = {
  id: string;
  owner_id: string;
  player_name: string;
  team: string | null;
  set_name: string | null;
  insert_set: string | null;
  is_variation_of_base: boolean;
  parallel: string | null;
  serial_number: string | null;
  print_run: number | null;
  condition: string | null;
  is_autograph: boolean;
  is_relic: boolean;
  status: CardStatus;
  image_url: string | null;
  notes: string | null;
  created_at: string;
};

export type Trade = {
  id: string;
  initiator_id: string;
  receiver_id: string;
  initiator_card_id: string;
  receiver_card_id: string;
  status: TradeStatus;
  created_at: string;
  completed_at: string | null;
};

export type Conversation = {
  id: string;
  participant_1: string;
  participant_2: string;
  created_at: string;
  last_message_at: string;
};

export type Message = {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  created_at: string;
};

export type Wishlist = {
  id: string;
  user_id: string;
  player_name: string;
  team: string | null;
  set_name: string | null;
  insert_set: string | null;
  parallel: string | null;
  notes: string | null;
  created_at: string;
};

export type SavedCard = {
  id: string;
  user_id: string;
  card_id: string;
  created_at: string;
};

export type CardCatalogEntry = {
  id: string;
  set_name: string;
  insert_set: string | null;
  parallel: string | null;
  player_name: string;
  team: string | null;
  card_number: string | null;
  is_rookie: boolean;
  print_run: number | null;
  product_year: number | null;
  category: string | null;
  class_segment: string | null;
  is_variation_of_base: boolean;
  is_autograph: boolean;
  is_relic: boolean;
  qualifier: string | null;
  needs_review: boolean;
  source_file: string | null;
  source_page: number | null;
  raw_line: string | null;
};

export type CardCatalogInsertSet = {
  set_name: string;
  insert_set: string;
  category: string | null;
  is_variation_of_base: boolean;
  is_autograph: boolean;
  is_relic: boolean;
};

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: Partial<Profile> & Pick<Profile, "id" | "username">;
        Update: Partial<Profile>;
        Relationships: [];
      };
      cards: {
        Row: Card;
        Insert: Partial<Card> & Pick<Card, "owner_id" | "player_name">;
        Update: Partial<Card>;
        Relationships: [
          {
            foreignKeyName: "cards_owner_id_fkey";
            columns: ["owner_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      trades: {
        Row: Trade;
        Insert: Partial<Trade> &
          Pick<
            Trade,
            "initiator_id" | "receiver_id" | "initiator_card_id" | "receiver_card_id"
          >;
        Update: Partial<Trade>;
        Relationships: [
          {
            foreignKeyName: "trades_initiator_id_fkey";
            columns: ["initiator_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "trades_receiver_id_fkey";
            columns: ["receiver_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "trades_initiator_card_id_fkey";
            columns: ["initiator_card_id"];
            isOneToOne: false;
            referencedRelation: "cards";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "trades_receiver_card_id_fkey";
            columns: ["receiver_card_id"];
            isOneToOne: false;
            referencedRelation: "cards";
            referencedColumns: ["id"];
          },
        ];
      };
      conversations: {
        Row: Conversation;
        Insert: Partial<Conversation> &
          Pick<Conversation, "participant_1" | "participant_2">;
        Update: Partial<Conversation>;
        Relationships: [
          {
            foreignKeyName: "conversations_participant_1_fkey";
            columns: ["participant_1"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "conversations_participant_2_fkey";
            columns: ["participant_2"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      messages: {
        Row: Message;
        Insert: Partial<Message> &
          Pick<Message, "conversation_id" | "sender_id" | "content">;
        Update: Partial<Message>;
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey";
            columns: ["conversation_id"];
            isOneToOne: false;
            referencedRelation: "conversations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "messages_sender_id_fkey";
            columns: ["sender_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      wishlist: {
        Row: Wishlist;
        Insert: Partial<Wishlist> & Pick<Wishlist, "user_id" | "player_name">;
        Update: Partial<Wishlist>;
        Relationships: [
          {
            foreignKeyName: "wishlist_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      card_catalog: {
        Row: CardCatalogEntry;
        Insert: Partial<CardCatalogEntry> &
          Pick<CardCatalogEntry, "set_name" | "player_name">;
        Update: Partial<CardCatalogEntry>;
        Relationships: [];
      };
      saved_cards: {
        Row: SavedCard;
        Insert: Partial<SavedCard> & Pick<SavedCard, "user_id" | "card_id">;
        Update: Partial<SavedCard>;
        Relationships: [
          {
            foreignKeyName: "saved_cards_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "saved_cards_card_id_fkey";
            columns: ["card_id"];
            isOneToOne: false;
            referencedRelation: "cards";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      card_catalog_insert_sets: {
        Row: CardCatalogInsertSet;
        Relationships: [];
      };
    };
    Functions: Record<string, never>;
  };
}
