-- Ensure critical functions execute with a fixed search_path for security hardening
alter function public.archive_measurement_change() set search_path = public;
alter function public.handle_new_user() set search_path = public;
alter function public.get_brands_for_garment_type(public.garment_type) set search_path = public;
alter function public.has_role(public.user_role) set search_path = public;
alter function public.touch_body_measurements_updated() set search_path = public;
alter function public.has_sg_access(uuid, uuid, public.category) set search_path = public;
alter function public.expire_old_sg_requests() set search_path = public;
alter function public.expire_approved_sg_requests() set search_path = public;
alter function public.refresh_stale_wishlist_metadata(integer) set search_path = public;
alter function public.current_profile_id() set search_path = public;
alter function public.current_profile_email() set search_path = public;
alter function public.touch_updated_at() set search_path = public;
alter function public.refresh_measurement_summary() set search_path = public;
