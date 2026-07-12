
REVOKE ALL ON FUNCTION public.check_v2_readiness(uuid,text,int) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.promote_to_dual(uuid,text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.promote_to_v2_only(uuid,text,int) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.rollback_to_dual(uuid,text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.rollback_to_v1(uuid,text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.precheck_source_system_nome_consistency() FROM PUBLIC, anon;
