# Supabase setup

1. Create a Supabase project.
2. Run every file in `migrations/` in filename order in the project SQL editor, or apply them with the Supabase CLI. The second migration adds transfer, balance-check, and savings-goal support to the original schema.
3. Copy the project URL and anonymous key into `apps/web/.env.local`, using `apps/web/.env.example` as the template.
4. Enable email/password authentication in Supabase Auth and configure the app URL as an allowed redirect URL.

The anonymous key is intended for the client app. Never add a service-role key to the web application. Confirm that Row Level Security stays enabled for every table before allowing real user data.
