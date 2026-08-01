-- Supabase auto-grants EXECUTE on new public-schema functions to anon and
-- authenticated separately from the PUBLIC pseudo-role — REVOKE ALL FROM
-- PUBLIC alone does not remove those. Confirmed via the Supabase advisor
-- that all three credential functions were callable by anon/authenticated
-- over PostgREST before this fix (anon could have called
-- get_business_twilio_credentials with an arbitrary user id and received
-- another business's real decrypted Twilio Auth Token). Explicitly revoke
-- from both roles by name.
revoke execute on function public.set_business_twilio_credentials(uuid, text, text, text) from anon, authenticated;
revoke execute on function public.get_business_twilio_credentials(uuid) from anon, authenticated;
revoke execute on function public.get_business_twilio_by_number(text) from anon, authenticated;
