-- Allow users to delete their own chat messages (reactions cascade via FK).
drop policy if exists messages_delete on public.messages;
create policy messages_delete on public.messages for delete to authenticated
  using (user_id = auth.uid());
