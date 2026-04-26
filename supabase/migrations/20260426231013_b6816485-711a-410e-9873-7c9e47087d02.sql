-- Merge two adjacent columns2 blocks in the most recent funnel step into a single columns2 block.
-- Children are interleaved so that round-robin distribution places:
--   col 0 (left)  = [heading, text, form]
--   col 1 (right) = [image, countdown]
UPDATE public.funnel_steps
SET page_content = jsonb_set(
  page_content,
  '{blocks,0,children}',
  jsonb_build_array(
    jsonb_build_object(
      'id', 'merged_cols_' || substr(md5(random()::text), 1, 10),
      'type', 'columns2',
      'props', jsonb_build_object(
        'gap', '24px',
        'columnStyles', jsonb_build_array('{}'::jsonb, '{}'::jsonb),
        'columnWidths', '50/50',
        'customWidths', '',
        'stackOnMobile', true,
        'verticalAlign', 'top'
      ),
      'children', jsonb_build_array(
        page_content #> '{blocks,0,children,0,children,0}',  -- heading
        page_content #> '{blocks,0,children,0,children,1}',  -- image
        page_content #> '{blocks,0,children,1,children,0}',  -- text
        page_content #> '{blocks,0,children,1,children,1}',  -- countdown
        page_content #> '{blocks,0,children,1,children,2}'   -- form
      )
    )
  )
)
WHERE id = '61a0f651-ee29-4e51-9287-120ba02ab102';