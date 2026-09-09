UPDATE public.leads SET status = 'New', updated_at = now() WHERE lower(trim(status)) IN ('new', 'new lead', 'lead') AND status <> 'New';
UPDATE public.leads SET status = 'Warm', updated_at = now() WHERE lower(trim(status)) = 'warm' AND status <> 'Warm';
UPDATE public.leads SET status = 'Hot', updated_at = now() WHERE lower(trim(status)) = 'hot' AND status <> 'Hot';
UPDATE public.leads SET status = 'Won', updated_at = now() WHERE lower(trim(status)) IN ('won','customer') AND status <> 'Won';
UPDATE public.leads SET status = 'Lost', updated_at = now() WHERE lower(trim(status)) IN ('lost','unqualified') AND status <> 'Lost';