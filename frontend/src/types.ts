export interface Fingerprint {
  id: string;
  frame_hash: string;
  client_ts: string;
  created_at: string;
  session_id: string;
  line_no: number;
}

export interface UploadResult {
  session_id: string;
  total: number;
  inserted: number;
  duplicates: number;
  failed: number;
  fingerprints: Fingerprint[];
}

export interface VerifyResponse {
  submitted_hash: string;
  matched: boolean;
  record: Fingerprint | null;
}

export type WSMessage =
  | { type: "fingerprint"; data: Fingerprint }
  | { type: "hello"; data: { message: string } };
