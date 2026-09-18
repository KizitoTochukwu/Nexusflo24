-- Keyword retrieval over approved voice knowledge (semantic search arrives once
-- the vector extension is available). Runs as the caller, so workspace RLS on
-- voice_knowledge_chunks/sources still applies.
CREATE OR REPLACE FUNCTION public.voice_search_knowledge(
  _workspace_id uuid,
  _query text,
  _assistant_id uuid DEFAULT NULL,
  _limit integer DEFAULT 5
)
RETURNS TABLE (
  source_id uuid,
  source_title text,
  source_type text,
  chunk_id uuid,
  content text,
  rank real
)
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT
    s.id,
    s.title,
    s.source_type,
    c.id,
    c.content,
    ts_rank(
      to_tsvector('english', coalesce(s.title, '') || ' ' || c.content),
      websearch_to_tsquery('english', coalesce(nullif(btrim(_query), ''), 'zzzznomatch'))
    )::real AS rank
  FROM public.voice_knowledge_chunks c
  JOIN public.voice_knowledge_sources s ON s.id = c.source_id
  WHERE c.workspace_id = _workspace_id
    AND s.status = 'ready'
    AND (_assistant_id IS NULL OR s.assistant_id IS NULL OR s.assistant_id = _assistant_id)
    AND to_tsvector('english', coalesce(s.title, '') || ' ' || c.content)
        @@ websearch_to_tsquery('english', coalesce(nullif(btrim(_query), ''), 'zzzznomatch'))
  ORDER BY rank DESC
  LIMIT greatest(1, least(coalesce(_limit, 5), 20));
$$;

GRANT EXECUTE ON FUNCTION public.voice_search_knowledge(uuid, text, uuid, integer) TO authenticated, service_role;

-- Members may log an unanswered question (the gateway does this during a call);
-- admins may clear the queue.
CREATE POLICY "Members insert unanswered questions"
  ON public.voice_unanswered_questions FOR INSERT
  WITH CHECK (public.is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "Admins delete unanswered questions"
  ON public.voice_unanswered_questions FOR DELETE
  USING (public.is_workspace_admin(auth.uid(), workspace_id));