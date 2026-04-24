# Supabase Setup

1. Create a Supabase project.
2. Open SQL Editor and run `supabase/schema.sql`.
3. In Project Settings > API, copy the Project URL and publishable key.
4. Create `F:\Collectorhub\.env.local` with:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_your_key
```

5. In Authentication > URL Configuration, add `http://localhost:3000`.
6. In Authentication > Email Templates > Confirm signup, set the confirmation link to:

```txt
{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email
```

Store accounts are intentionally not self-service. Create them from the Supabase dashboard, an admin backend, or SQL using the service role, then set `public.users.role = 'store'` and `store_name`.
