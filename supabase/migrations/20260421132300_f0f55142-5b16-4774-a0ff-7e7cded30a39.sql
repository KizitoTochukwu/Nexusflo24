ALTER TABLE public.message_credits REPLICA IDENTITY FULL;
ALTER TABLE public.credit_transactions REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.message_credits;
ALTER PUBLICATION supabase_realtime ADD TABLE public.credit_transactions;