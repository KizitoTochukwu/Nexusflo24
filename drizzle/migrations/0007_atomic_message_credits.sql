ALTER TABLE public.message_credits
  ADD COLUMN IF NOT EXISTS unlimited boolean NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.deduct_message_credit(
  _workspace_id uuid,
  _channel text,
  _amount integer DEFAULT 1,
  _reason text DEFAULT 'message_sent',
  _reference_id text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _row public.message_credits%ROWTYPE;
  _remaining integer;
BEGIN
  IF _channel NOT IN ('email','sms','whatsapp') THEN
    RETURN jsonb_build_object('allowed', false, 'remaining', 0, 'status', 'invalid_channel');
  END IF;

  SELECT * INTO _row FROM public.message_credits WHERE workspace_id = _workspace_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('allowed', false, 'remaining', 0, 'status', 'no_row');
  END IF;

  IF _row.unlimited THEN
    INSERT INTO public.credit_transactions (workspace_id, channel, amount, reason, reference_id)
    VALUES (_workspace_id, _channel::text, 0, 'unlimited_exempt', _reference_id);
    RETURN jsonb_build_object('allowed', true, 'remaining', -1, 'status', 'unlimited');
  END IF;

  IF _amount <= 0 THEN
    RETURN jsonb_build_object('allowed', true, 'remaining',
      CASE _channel WHEN 'email' THEN _row.email_balance WHEN 'sms' THEN _row.sms_balance ELSE _row.whatsapp_balance END,
      'status', 'no_charge');
  END IF;

  IF _channel = 'email' THEN
    UPDATE public.message_credits
      SET email_balance = email_balance - _amount, email_used = email_used + _amount
      WHERE workspace_id = _workspace_id AND email_balance >= _amount
      RETURNING email_balance INTO _remaining;
  ELSIF _channel = 'sms' THEN
    UPDATE public.message_credits
      SET sms_balance = sms_balance - _amount, sms_used = sms_used + _amount
      WHERE workspace_id = _workspace_id AND sms_balance >= _amount
      RETURNING sms_balance INTO _remaining;
  ELSE
    UPDATE public.message_credits
      SET whatsapp_balance = whatsapp_balance - _amount, whatsapp_used = whatsapp_used + _amount
      WHERE workspace_id = _workspace_id AND whatsapp_balance >= _amount
      RETURNING whatsapp_balance INTO _remaining;
  END IF;

  IF _remaining IS NULL THEN
    RETURN jsonb_build_object('allowed', false, 'remaining',
      CASE _channel WHEN 'email' THEN _row.email_balance WHEN 'sms' THEN _row.sms_balance ELSE _row.whatsapp_balance END,
      'status', 'insufficient');
  END IF;

  INSERT INTO public.credit_transactions (workspace_id, channel, amount, reason, reference_id)
  VALUES (_workspace_id, _channel::text, -_amount, COALESCE(_reason, 'message_sent'), _reference_id);

  RETURN jsonb_build_object('allowed', true, 'remaining', _remaining, 'status', 'deducted');
END;
$$;

CREATE OR REPLACE FUNCTION public.add_message_credit(
  _workspace_id uuid,
  _channel text,
  _amount integer,
  _reason text DEFAULT 'topup',
  _reference_id text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _remaining integer;
BEGIN
  IF _channel NOT IN ('email','sms','whatsapp') OR _amount <= 0 THEN
    RETURN jsonb_build_object('ok', false, 'status', 'invalid');
  END IF;

  INSERT INTO public.message_credits (workspace_id) VALUES (_workspace_id)
  ON CONFLICT (workspace_id) DO NOTHING;

  IF _channel = 'email' THEN
    UPDATE public.message_credits SET email_balance = email_balance + _amount
      WHERE workspace_id = _workspace_id RETURNING email_balance INTO _remaining;
  ELSIF _channel = 'sms' THEN
    UPDATE public.message_credits SET sms_balance = sms_balance + _amount
      WHERE workspace_id = _workspace_id RETURNING sms_balance INTO _remaining;
  ELSE
    UPDATE public.message_credits SET whatsapp_balance = whatsapp_balance + _amount
      WHERE workspace_id = _workspace_id RETURNING whatsapp_balance INTO _remaining;
  END IF;

  INSERT INTO public.credit_transactions (workspace_id, channel, amount, reason, reference_id)
  VALUES (_workspace_id, _channel::text, _amount, COALESCE(_reason, 'topup'), _reference_id);

  RETURN jsonb_build_object('ok', true, 'remaining', _remaining);
END;
$$;

REVOKE ALL ON FUNCTION public.deduct_message_credit(uuid, text, integer, text, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.add_message_credit(uuid, text, integer, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.deduct_message_credit(uuid, text, integer, text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.add_message_credit(uuid, text, integer, text, text) TO service_role;