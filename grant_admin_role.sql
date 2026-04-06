-- Run in Supabase → SQL Editor (as project owner).
-- Lets your signed-in app user insert/update members (RLS checks public.user_roles).

-- 1) Set your ChurchApp login email here:
DO $$
DECLARE
  target_email text := 'kelisharichard@gmail.com';
  uid uuid;
BEGIN
  SELECT id INTO uid FROM auth.users WHERE email = target_email LIMIT 1;
  IF uid IS NULL THEN
    RAISE EXCEPTION 'No user in auth.users with email %. Create the user in Authentication → Users first.', target_email;
  END IF;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (uid, 'admin')
  ON CONFLICT (user_id) DO UPDATE SET role = 'admin';

  RAISE NOTICE 'Granted admin for user_id %', uid;
END $$;

-- 2) Optional: list current role rows
-- SELECT ur.*, u.email FROM public.user_roles ur LEFT JOIN auth.users u ON u.id = ur.user_id;
