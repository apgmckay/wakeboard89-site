-- Wakeboard 1989 global leaderboard (Cloudflare D1)
CREATE TABLE IF NOT EXISTS scores (
  id       INTEGER PRIMARY KEY AUTOINCREMENT,
  lake     TEXT    NOT NULL,          -- e.g. home, mangrove, mangroveplus, home-dark
  initials TEXT    NOT NULL,          -- three letters / digits
  score    INTEGER NOT NULL,
  tapes    INTEGER NOT NULL DEFAULT 0,
  falls    INTEGER NOT NULL DEFAULT 0,
  dur      REAL    NOT NULL DEFAULT 0, -- seconds the run took
  created  INTEGER NOT NULL,          -- ms since 1970
  hidden   INTEGER NOT NULL DEFAULT 0  -- 1 = removed by you (cheat, rude initials)
);
CREATE INDEX IF NOT EXISTS idx_scores_board ON scores (lake, hidden, score DESC, created);

-- light rate limiting: one row per accepted submission, keyed on a salted hash of the address (never the address itself)
CREATE TABLE IF NOT EXISTS hits (
  k  TEXT    NOT NULL,
  ts INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_hits ON hits (k, ts);
