-- ============================================================
-- user_figures 테이블
-- Supabase SQL Editor 에서 실행하세요.
-- ============================================================

CREATE TABLE IF NOT EXISTS user_figures (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        TEXT        NOT NULL,
  generation_id  TEXT        NOT NULL UNIQUE,
  status         TEXT        NOT NULL DEFAULT 'queued'
                             CHECK (status IN ('queued','dreaming','completed','failed')),
  model_url      TEXT,           -- Luma AI 결과 영상/모델 URL
  thumbnail_url  TEXT,           -- 썸네일 또는 원본 이미지 URL
  prompt         TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 인덱스
CREATE INDEX IF NOT EXISTS user_figures_user_id_idx
  ON user_figures (user_id);
CREATE INDEX IF NOT EXISTS user_figures_status_idx
  ON user_figures (status);

-- updated_at 자동 갱신 트리거
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS user_figures_updated_at ON user_figures;
CREATE TRIGGER user_figures_updated_at
  BEFORE UPDATE ON user_figures
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- RLS 활성화 (백엔드는 service_role key 로 우회)
ALTER TABLE user_figures ENABLE ROW LEVEL SECURITY;
