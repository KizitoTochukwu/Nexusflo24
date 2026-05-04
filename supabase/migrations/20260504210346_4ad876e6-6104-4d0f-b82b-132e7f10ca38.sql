DO $$
DECLARE
  _normalized_count integer := 0;
  _merged_count integer := 0;
  _rec record;
  _new_phone text;
  _existing record;
BEGIN
  -- Phase 1: walk every lead with a phone, compute normalized E.164.
  FOR _rec IN
    SELECT id, user_id, phone, full_name, email, notes, tags, created_at
    FROM public.leads
    WHERE phone IS NOT NULL AND phone <> ''
  LOOP
    -- Build normalized phone from raw value
    DECLARE
      _cleaned text := regexp_replace(_rec.phone, '[\s\-\(\)\.]', '', 'g');
    BEGIN
      _new_phone := NULL;

      IF _cleaned ~ '^\+[1-9][0-9]{7,14}$' THEN
        _new_phone := _cleaned;
      ELSIF _cleaned ~ '^00[1-9][0-9]{6,13}$' THEN
        _new_phone := '+' || substring(_cleaned from 3);
      ELSIF _cleaned ~ '^0[0-9]{10}$' THEN
        _new_phone := '+44' || substring(_cleaned from 2);
      ELSIF _cleaned ~ '^[1-9][0-9]{7,14}$' THEN
        _new_phone := '+' || _cleaned;
      END IF;

      -- Skip if cannot normalize or already normalized
      IF _new_phone IS NULL OR _new_phone = _rec.phone THEN
        CONTINUE;
      END IF;

      -- Check whether (user_id, _new_phone) already exists on a DIFFERENT lead
      SELECT id, full_name, email, notes, tags, created_at
      INTO _existing
      FROM public.leads
      WHERE user_id = _rec.user_id
        AND phone = _new_phone
        AND id <> _rec.id
      LIMIT 1;

      IF _existing.id IS NULL THEN
        -- Safe to update in place
        BEGIN
          UPDATE public.leads SET phone = _new_phone, updated_at = now() WHERE id = _rec.id;
          _normalized_count := _normalized_count + 1;
        EXCEPTION WHEN unique_violation THEN
          -- Race or hidden conflict; skip
          NULL;
        END;
      ELSE
        -- Merge: keep the older row
        DECLARE
          _keep_id uuid;
          _drop_id uuid;
          _keep_tags text[];
          _drop_tags text[];
        BEGIN
          IF _existing.created_at <= _rec.created_at THEN
            _keep_id := _existing.id;
            _drop_id := _rec.id;
            _keep_tags := COALESCE(_existing.tags, '{}');
            _drop_tags := COALESCE(_rec.tags, '{}');
          ELSE
            _keep_id := _rec.id;
            _drop_id := _existing.id;
            _keep_tags := COALESCE(_rec.tags, '{}');
            _drop_tags := COALESCE(_existing.tags, '{}');
            -- The kept row needs the normalized phone too
            UPDATE public.leads SET phone = _new_phone, updated_at = now() WHERE id = _keep_id;
          END IF;

          -- Union tags + backfill non-null fields from the dropped row
          UPDATE public.leads
          SET
            tags = ARRAY(SELECT DISTINCT unnest(_keep_tags || _drop_tags)),
            full_name = COALESCE(full_name, (SELECT full_name FROM public.leads WHERE id = _drop_id)),
            email     = COALESCE(email,     (SELECT email     FROM public.leads WHERE id = _drop_id)),
            notes     = COALESCE(notes,     (SELECT notes     FROM public.leads WHERE id = _drop_id)),
            updated_at = now()
          WHERE id = _keep_id;

          -- Re-point child rows that don't ON DELETE CASCADE-by-default
          UPDATE public.lead_activities SET lead_id = _keep_id WHERE lead_id = _drop_id;
          BEGIN
            UPDATE public.scheduled_jobs SET lead_id = _keep_id WHERE lead_id = _drop_id;
          EXCEPTION WHEN undefined_table OR undefined_column THEN NULL;
          END;

          DELETE FROM public.leads WHERE id = _drop_id;
          _merged_count := _merged_count + 1;
        END;
      END IF;
    END;
  END LOOP;

  RAISE NOTICE 'Phone normalization complete: % rows normalized, % duplicates merged', _normalized_count, _merged_count;
END $$;