# Supabase setup

1. Create a Supabase project.
2. Run `migrations/20260807_initial_schema.sql` in the project SQL editor, or apply it with the Supabase CLI.
3. Copy the project URL and anonymous key into `apps/web/.env.local`, using `apps/web/.env.example` as the template.
4. Enable email/password authentication in Supabase Auth and configure the app URL as an allowed redirect URL.

The anonymous key is intended for the client app. Never add a service-role key to the web application.
