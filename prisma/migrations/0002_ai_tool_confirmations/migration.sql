-- One-time token (nonce) untuk konfirmasi aksi agent AI. Tersimpan di DB agar tetap sekali pakai
-- walaupun server Next.js restart / hot reload.
CREATE TABLE IF NOT EXISTS ai_tool_confirmations (
  nonce TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  conversation_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ai_tool_confirmations_created_at_idx
  ON ai_tool_confirmations (created_at);
