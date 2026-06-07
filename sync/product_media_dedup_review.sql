-- product_media duplicate cleanup review script.
-- Safe boundary:
-- - Review and run only when product_media writes are stopped.
-- - Dry-run SELECT first.
-- - The DELETE is idempotent and removes only duplicate
--   (supplier_product_id, original_url) rows.
-- - It never removes the keeper row for a duplicate group, so it never deletes
--   the last media row for that product/url group.

-- DRY RUN: projected duplicate rows that would be removed.
WITH ranked AS (
  SELECT
    id,
    supplier_product_id,
    original_url,
    ROW_NUMBER() OVER (
      PARTITION BY supplier_product_id, original_url
      ORDER BY id ASC
    ) AS duplicate_rank,
    COUNT(*) OVER (
      PARTITION BY supplier_product_id, original_url
    ) AS duplicate_group_size,
    MIN(id) OVER (
      PARTITION BY supplier_product_id, original_url
    ) AS keeper_id
  FROM public.product_media
  WHERE supplier_product_id IS NOT NULL
    AND original_url IS NOT NULL
    AND BTRIM(original_url) <> ''
),
doomed AS (
  SELECT *
  FROM ranked
  WHERE duplicate_group_size > 1
    AND duplicate_rank > 1
)
SELECT
  COUNT(*) AS rows_would_remove,
  COUNT(DISTINCT supplier_product_id) AS products_affected,
  COUNT(DISTINCT supplier_product_id::text || '|' || original_url) AS duplicate_groups,
  MIN(id) AS first_duplicate_id,
  MAX(id) AS last_duplicate_id
FROM doomed;

-- REVIEW DETAIL: exact rows marked for removal and their keeper row.
WITH ranked AS (
  SELECT
    id,
    supplier_product_id,
    original_url,
    ROW_NUMBER() OVER (
      PARTITION BY supplier_product_id, original_url
      ORDER BY id ASC
    ) AS duplicate_rank,
    COUNT(*) OVER (
      PARTITION BY supplier_product_id, original_url
    ) AS duplicate_group_size,
    MIN(id) OVER (
      PARTITION BY supplier_product_id, original_url
    ) AS keeper_id
  FROM public.product_media
  WHERE supplier_product_id IS NOT NULL
    AND original_url IS NOT NULL
    AND BTRIM(original_url) <> ''
)
SELECT
  supplier_product_id,
  original_url,
  keeper_id,
  id AS duplicate_id,
  duplicate_group_size
FROM ranked
WHERE duplicate_group_size > 1
  AND duplicate_rank > 1
ORDER BY supplier_product_id, original_url, duplicate_id;

-- EXECUTION BLOCK FOR THE LIVE AGENT, ONLY AFTER DRY RUN REVIEW.
-- Keep this transaction explicit; run COMMIT only after checking RETURNING rows.
BEGIN;

WITH ranked AS (
  SELECT
    id,
    supplier_product_id,
    original_url,
    ROW_NUMBER() OVER (
      PARTITION BY supplier_product_id, original_url
      ORDER BY id ASC
    ) AS duplicate_rank,
    COUNT(*) OVER (
      PARTITION BY supplier_product_id, original_url
    ) AS duplicate_group_size
  FROM public.product_media
  WHERE supplier_product_id IS NOT NULL
    AND original_url IS NOT NULL
    AND BTRIM(original_url) <> ''
),
doomed AS (
  SELECT id
  FROM ranked
  WHERE duplicate_group_size > 1
    AND duplicate_rank > 1
)
DELETE FROM public.product_media AS pm
USING doomed
WHERE pm.id = doomed.id
RETURNING pm.id, pm.supplier_product_id, pm.original_url;

-- Post-delete verification should return zero rows.
WITH duplicate_groups AS (
  SELECT supplier_product_id, original_url, COUNT(*) AS row_count
  FROM public.product_media
  WHERE supplier_product_id IS NOT NULL
    AND original_url IS NOT NULL
    AND BTRIM(original_url) <> ''
  GROUP BY supplier_product_id, original_url
  HAVING COUNT(*) > 1
)
SELECT COUNT(*) AS duplicate_groups_remaining
FROM duplicate_groups;

-- Use ROLLBACK during review; replace with COMMIT only when approved.
ROLLBACK;
