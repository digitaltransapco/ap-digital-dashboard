export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      offices_master: {
        Row: {
          office_id: number;
          office_name: string;
          office_type_code: string;
          pincode: number | null;
          division_name: string;
          region_name: string;
          ho_id: number | null;
          ho_name: string | null;
          so_id: number | null;
          so_name: string | null;
          created_at: string | null;
        };
        Insert: {
          office_id: number;
          office_name: string;
          office_type_code: string;
          pincode?: number | null;
          division_name: string;
          region_name: string;
          ho_id?: number | null;
          ho_name?: string | null;
          so_id?: number | null;
          so_name?: string | null;
          created_at?: string | null;
        };
        Update: {
          office_id?: number;
          office_name?: string;
          office_type_code?: string;
          pincode?: number | null;
          division_name?: string;
          region_name?: string;
          ho_id?: number | null;
          ho_name?: string | null;
          so_id?: number | null;
          so_name?: string | null;
          created_at?: string | null;
        };
        Relationships: [];
      };
      upload_snapshots: {
        Row: {
          id: string;
          snapshot_date: string;
          period_start: string;
          period_end: string;
          uploaded_at: string | null;
          source_filename: string | null;
          row_count: number | null;
          matched_offices: number | null;
          orphan_offices: number | null;
          total_cnt: number | null;
          total_amt: number | null;
          digital_cnt: number | null;
          digital_amt: number | null;
          notes: string | null;
        };
        Insert: {
          id?: string;
          snapshot_date: string;
          period_start: string;
          period_end: string;
          uploaded_at?: string | null;
          source_filename?: string | null;
          row_count?: number | null;
          matched_offices?: number | null;
          orphan_offices?: number | null;
          total_cnt?: number | null;
          total_amt?: number | null;
          digital_cnt?: number | null;
          digital_amt?: number | null;
          notes?: string | null;
        };
        Update: {
          id?: string;
          snapshot_date?: string;
          period_start?: string;
          period_end?: string;
          uploaded_at?: string | null;
          source_filename?: string | null;
          row_count?: number | null;
          matched_offices?: number | null;
          orphan_offices?: number | null;
          total_cnt?: number | null;
          total_amt?: number | null;
          digital_cnt?: number | null;
          digital_amt?: number | null;
          notes?: string | null;
        };
        Relationships: [];
      };
      office_transactions: {
        Row: {
          id: number;
          snapshot_id: string;
          office_id: number;
          manual_cnt: number;
          manual_amt: number;
          digital_cnt: number;
          digital_amt: number;
          other_cnt: number;
          other_amt: number;
          total_cnt: number;
          total_amt: number;
          digital_pct_cnt: number | null;
          digital_pct_amt: number | null;
          modes: Json;
        };
        Insert: {
          id?: number;
          snapshot_id: string;
          office_id: number;
          manual_cnt?: number;
          manual_amt?: number;
          digital_cnt?: number;
          digital_amt?: number;
          other_cnt?: number;
          other_amt?: number;
          total_cnt?: number;
          total_amt?: number;
          digital_pct_cnt?: number | null;
          digital_pct_amt?: number | null;
          modes?: Json;
        };
        Update: {
          id?: number;
          snapshot_id?: string;
          office_id?: number;
          manual_cnt?: number;
          manual_amt?: number;
          digital_cnt?: number;
          digital_amt?: number;
          other_cnt?: number;
          other_amt?: number;
          total_cnt?: number;
          total_amt?: number;
          digital_pct_cnt?: number | null;
          digital_pct_amt?: number | null;
          modes?: Json;
        };
        Relationships: [
          {
            foreignKeyName: 'office_transactions_snapshot_id_fkey';
            columns: ['snapshot_id'];
            isOneToOne: false;
            referencedRelation: 'upload_snapshots';
            referencedColumns: ['id'];
          }
        ];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

export type OfficeMaster = Database['public']['Tables']['offices_master']['Row'];
export type UploadSnapshot = Database['public']['Tables']['upload_snapshots']['Row'];
export type OfficeTransaction = Database['public']['Tables']['office_transactions']['Row'];
