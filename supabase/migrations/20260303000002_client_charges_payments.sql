
-- Client charges (pendências) – amounts owed by clients
CREATE TABLE public.client_charges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  salon_id uuid NOT NULL REFERENCES public.salons(id) ON DELETE CASCADE,
  client_user_id uuid NOT NULL,
  description text NOT NULL DEFAULT '',
  amount numeric(10,2) NOT NULL DEFAULT 0,
  due_date date,
  status text NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'pago', 'cancelado')),
  reference_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.client_charges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner can manage client_charges" ON public.client_charges
  FOR ALL TO authenticated
  USING (is_salon_owner(auth.uid(), salon_id));

CREATE POLICY "Client can view own charges" ON public.client_charges
  FOR SELECT TO authenticated
  USING (client_user_id = auth.uid());

-- Client payments
CREATE TABLE public.client_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  salon_id uuid NOT NULL REFERENCES public.salons(id) ON DELETE CASCADE,
  client_user_id uuid NOT NULL,
  charge_id uuid REFERENCES public.client_charges(id) ON DELETE SET NULL,
  amount numeric(10,2) NOT NULL DEFAULT 0,
  method text NOT NULL DEFAULT 'dinheiro'
    CHECK (method IN ('dinheiro', 'cartao_credito', 'cartao_debito', 'pix', 'outro')),
  notes text DEFAULT '',
  paid_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.client_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner can manage client_payments" ON public.client_payments
  FOR ALL TO authenticated
  USING (is_salon_owner(auth.uid(), salon_id));

CREATE POLICY "Client can view own payments" ON public.client_payments
  FOR SELECT TO authenticated
  USING (client_user_id = auth.uid());

-- updated_at trigger for charges
CREATE TRIGGER update_client_charges_updated_at
  BEFORE UPDATE ON public.client_charges
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Notification trigger: client notified when a charge is created
CREATE OR REPLACE FUNCTION public.notify_client_on_charge()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.notifications (user_id, salon_id, type, title, message, reference_id)
  VALUES (
    NEW.client_user_id,
    NEW.salon_id,
    'nova_cobranca',
    'Nova pendência registrada 💰',
    'O salão registrou uma cobrança de R$ ' || to_char(NEW.amount, 'FM999990.00') || ': ' || NEW.description,
    NEW.id
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_client_charge_created
  AFTER INSERT ON public.client_charges
  FOR EACH ROW EXECUTE FUNCTION public.notify_client_on_charge();

-- Notification trigger: client notified when a payment is registered
CREATE OR REPLACE FUNCTION public.notify_client_on_payment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.notifications (user_id, salon_id, type, title, message, reference_id)
  VALUES (
    NEW.client_user_id,
    NEW.salon_id,
    'pagamento_registrado',
    'Pagamento registrado ✅',
    'Seu pagamento de R$ ' || to_char(NEW.amount, 'FM999990.00') || ' foi registrado com sucesso.',
    NEW.id
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_client_payment_created
  AFTER INSERT ON public.client_payments
  FOR EACH ROW EXECUTE FUNCTION public.notify_client_on_payment();

-- Allow inserts from security-definer triggers (notifications table)
-- Already handled by "Members can insert notifications" policy if owner inserts
-- But triggers are SECURITY DEFINER so they bypass RLS – no extra policy needed.

NOTIFY pgrst, 'reload schema';
