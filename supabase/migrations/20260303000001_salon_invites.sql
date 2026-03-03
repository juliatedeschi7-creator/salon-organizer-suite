
-- Fix salon_members role check constraint to include 'cliente'
ALTER TABLE public.salon_members DROP CONSTRAINT IF EXISTS salon_members_role_check;
ALTER TABLE public.salon_members ADD CONSTRAINT salon_members_role_check
  CHECK (role IN ('dono', 'funcionario', 'cliente'));

-- Team invites table
CREATE TABLE public.salon_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  salon_id uuid NOT NULL REFERENCES public.salons(id) ON DELETE CASCADE,
  token text NOT NULL UNIQUE DEFAULT gen_random_uuid()::text,
  role text NOT NULL CHECK (role IN ('dono', 'funcionario')),
  invited_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email text,
  used_at timestamptz,
  used_by uuid REFERENCES auth.users(id),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.salon_invites ENABLE ROW LEVEL SECURITY;

-- Only salon owner can manage invites
CREATE POLICY "Owner can manage invites" ON public.salon_invites
  FOR ALL TO authenticated
  USING (is_salon_owner(auth.uid(), salon_id));

-- Security definer: get invite metadata by token (no auth required)
CREATE OR REPLACE FUNCTION public.get_team_invite_by_token(_token text)
RETURNS TABLE(
  id uuid,
  salon_id uuid,
  salon_name text,
  salon_logo_url text,
  role text,
  expires_at timestamptz,
  used_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT i.id, i.salon_id, s.name AS salon_name, s.logo_url AS salon_logo_url,
         i.role, i.expires_at, i.used_at
  FROM public.salon_invites i
  JOIN public.salons s ON s.id = i.salon_id
  WHERE i.token = _token
  LIMIT 1;
$$;

-- Security definer: consume a team invite for an already-authenticated user
CREATE OR REPLACE FUNCTION public.consume_team_invite(_token text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _invite public.salon_invites%ROWTYPE;
  _user_id uuid;
BEGIN
  _user_id := auth.uid();
  IF _user_id IS NULL THEN
    RETURN jsonb_build_object('error', 'Not authenticated');
  END IF;

  SELECT * INTO _invite FROM public.salon_invites WHERE token = _token FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Invite not found');
  END IF;

  IF _invite.used_at IS NOT NULL THEN
    RETURN jsonb_build_object('error', 'Invite already used');
  END IF;

  IF _invite.expires_at < now() THEN
    RETURN jsonb_build_object('error', 'Invite expired');
  END IF;

  -- Mark invite as used
  UPDATE public.salon_invites
  SET used_at = now(), used_by = _user_id
  WHERE id = _invite.id;

  -- Add to salon_members (upsert)
  INSERT INTO public.salon_members (salon_id, user_id, role)
  VALUES (_invite.salon_id, _user_id, _invite.role)
  ON CONFLICT (salon_id, user_id) DO UPDATE SET role = EXCLUDED.role;

  -- Assign user_role (upsert)
  INSERT INTO public.user_roles (user_id, role)
  VALUES (_user_id, _invite.role::app_role)
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN jsonb_build_object('success', true, 'salon_id', _invite.salon_id, 'role', _invite.role);
END;
$$;

-- Update handle_new_user to handle team invite tokens on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _salon_link text;
  _salon_id uuid;
  _team_token text;
  _invite public.salon_invites%ROWTYPE;
BEGIN
  _salon_link  := NEW.raw_user_meta_data->>'salon_client_link';
  _team_token  := NEW.raw_user_meta_data->>'salon_team_invite_token';

  -- Insert profile
  INSERT INTO public.profiles (user_id, name, email, is_approved)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', ''),
    NEW.email,
    CASE
      WHEN NEW.email = 'juliatedeschi7@gmail.com' THEN true
      WHEN _salon_link IS NOT NULL               THEN true
      -- team invite: not auto-approved, requires admin approval
      ELSE false
    END
  );

  -- Admin auto-role
  IF NEW.email = 'juliatedeschi7@gmail.com' THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin');
  END IF;

  -- Client via salon link: assign cliente role + salon membership
  IF _salon_link IS NOT NULL THEN
    SELECT s.id INTO _salon_id FROM public.salons s WHERE s.client_link = _salon_link LIMIT 1;
    IF _salon_id IS NOT NULL THEN
      INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'cliente');
      INSERT INTO public.salon_members (salon_id, user_id, role)
      VALUES (_salon_id, NEW.id, 'cliente')
      ON CONFLICT (salon_id, user_id) DO NOTHING;
    END IF;
  END IF;

  -- Team invite: assign role + salon membership, mark invite used
  IF _team_token IS NOT NULL THEN
    SELECT * INTO _invite
    FROM public.salon_invites
    WHERE token = _team_token
      AND used_at IS NULL
      AND expires_at > now()
    LIMIT 1;

    IF FOUND THEN
      UPDATE public.salon_invites
      SET used_at = now(), used_by = NEW.id
      WHERE id = _invite.id;

      INSERT INTO public.user_roles (user_id, role)
      VALUES (NEW.id, _invite.role::app_role)
      ON CONFLICT (user_id, role) DO NOTHING;

      INSERT INTO public.salon_members (salon_id, user_id, role)
      VALUES (_invite.salon_id, NEW.id, _invite.role)
      ON CONFLICT (salon_id, user_id) DO UPDATE SET role = EXCLUDED.role;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

NOTIFY pgrst, 'reload schema';
