-- Keep inventory visibility aligned with the original CRM own-vs-all scope.
alter policy properties_read on public.properties
  using (
    public.has_permission('properties','v')
    and (public.is_manager_or_admin() or assigned_agent_id = auth.uid())
  );
