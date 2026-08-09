-- Allow a signed-in user to create only the profile row that belongs to them.
-- This is needed as a safe fallback if the account-creation trigger has not
-- created the profile row before the app saves first-run preferences.

drop policy if exists "Users can create their profile" on public.profiles;
create policy "Users can create their profile"
  on public.profiles for insert
  with check (auth.uid() = id);
