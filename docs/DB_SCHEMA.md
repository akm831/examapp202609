# StudyItem DBスキーマ仕様 v1

`sourceItemKey` を外部安定キー、`id` を決定的UUIDとして扱う。インポートは `sourceItemKey` でupsertし、回答履歴は `study_item_id` を参照する。原Markdownとの自動同期は行わない。

```sql
CREATE TABLE study_items (
  id UUID PRIMARY KEY,
  source_item_key TEXT NOT NULL UNIQUE,
  subject TEXT NOT NULL,
  question_group TEXT NOT NULL,
  source_type TEXT NOT NULL,
  item_type TEXT NOT NULL,
  statement TEXT NOT NULL,
  correct_judgment BOOLEAN NOT NULL,
  judgment_source TEXT NOT NULL,
  explanation TEXT NOT NULL,
  explanation_type TEXT NOT NULL CHECK (explanation_type IN ('ITEM_SPECIFIC','GROUP_SHARED')),
  source_reference TEXT NOT NULL,
  verification_status TEXT NOT NULL CHECK (verification_status IN (
    'CONFIRMED','JUDGMENT_CONFIRMED_REASON_UNVERIFIED','PAST_EXAM_ONLY','SOURCE_UNCERTAIN'
  )),
  review_eligible BOOLEAN NOT NULL,
  judgment_as_of DATE,
  historical_judgment BOOLEAN,
  historical_context TEXT,
  time_sensitive BOOLEAN NOT NULL DEFAULT FALSE,
  caution TEXT CHECK (caution IS NULL OR caution = 'AMENDMENT'),
  source_document TEXT NOT NULL,
  source_question_number TEXT NOT NULL,
  source_item_number INTEGER NOT NULL CHECK (source_item_number > 0),
  source_heading TEXT NOT NULL,
  source_order INTEGER NOT NULL CHECK (source_order > 0),
  source_metadata JSON NOT NULL,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  CHECK (verification_status <> 'SOURCE_UNCERTAIN' OR review_eligible = FALSE),
  CHECK (historical_judgment IS NULL OR historical_context IS NOT NULL)
);

CREATE INDEX study_items_review_pool_idx
  ON study_items(subject, active, review_eligible);
CREATE INDEX study_items_flags_idx
  ON study_items(time_sensitive, caution);
```

アプリ層では通常出題を `active = true AND review_eligible = true` に限定する。要確認問題を含める設定時だけ `SOURCE_UNCERTAIN` を追加する。`GROUP_SHARED` は同じ原文解説が各StudyItemに格納されているため、表示側で「この問題群に共通する解説」と明示する。
