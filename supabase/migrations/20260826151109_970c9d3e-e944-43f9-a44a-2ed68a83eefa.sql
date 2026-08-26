REVOKE EXECUTE ON FUNCTION public.is_platform_staff(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.has_platform_permission(uuid, text) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.my_platform_permissions() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.guard_platform_staff_changes() FROM anon, public, authenticated;
GRANT EXECUTE ON FUNCTION public.is_platform_staff(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.has_platform_permission(uuid, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.my_platform_permissions() TO authenticated, service_role;