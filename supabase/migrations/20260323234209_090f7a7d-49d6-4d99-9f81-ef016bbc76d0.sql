DELETE FROM scheduled_jobs
WHERE id IN (
  SELECT id FROM (
    SELECT id,
      ROW_NUMBER() OVER (
        PARTITION BY automation_id, lead_id, step_index
        ORDER BY created_at ASC
      ) as rn
    FROM scheduled_jobs
    WHERE status = 'pending'
  ) ranked
  WHERE rn > 1
)