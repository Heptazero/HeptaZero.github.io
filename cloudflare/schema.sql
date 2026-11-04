-- 提问箱数据库初始化表结构 (Cloudflare D1 SQLite)
CREATE TABLE IF NOT EXISTS questions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  content TEXT NOT NULL,
  status TEXT DEFAULT 'pending', -- 'pending' (待回复), 'answered' (已公开回答), 'rejected' (已忽略)
  answer TEXT DEFAULT NULL,
  answered_at DATETIME DEFAULT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_questions_status ON questions(status, answered_at DESC);
