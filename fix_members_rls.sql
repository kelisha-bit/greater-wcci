-- Members RLS: staff + admin can insert/update (run in Supabase SQL Editor).
-- Also ensure your app user is signed in (JWT) or you get HTTP 401.
-- Grant a user permission to manage members:
--   INSERT INTO public.user_roles (user_id, role)
--   VALUES ('<auth.users.id uuid>', 'admin')
--   ON CONFLICT (user_id) DO UPDATE SET role = EXCLUDED.role;

CREATE OR REPLACE FUNCTION public.is_staff_or_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = auth.uid()
      AND role IN ('admin', 'staff')
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.is_staff_or_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_staff_or_admin() TO service_role;

DROP POLICY IF EXISTS "Members can be inserted by staff and admins" ON public.members;
CREATE POLICY "Members can be inserted by staff and admins" ON public.members
  FOR INSERT WITH CHECK (public.is_staff_or_admin());

DROP POLICY IF EXISTS "Members can be updated by staff and admins" ON public.members;
CREATE POLICY "Members can be updated by staff and admins" ON public.members
  FOR UPDATE USING (public.is_staff_or_admin());
