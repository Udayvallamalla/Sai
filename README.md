# S.M. Engineers & Architects

Responsive React application for the Hyderabad architecture and engineering consultancy. The public site includes company, service, portfolio, contact, consultation, and legal pages. Supabase is used for authentication, persistence, role checks, and image storage when configured.

## Local development

Requirements: Node.js 20+ and npm.

```sh
npm install
Copy-Item .env.example .env.local
npm run dev
```

Without Supabase variables, public pages remain available, projects show an honest empty state, forms direct visitors to phone/email, and `/admin` explains the missing configuration. No local browser storage is used as a database.

## Supabase setup

1. Create a Supabase project and copy its Project URL and anon/public key into `.env.local` as `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
2. Apply `supabase/migrations/202610150001_initial_schema.sql` using the Supabase CLI (`supabase db push`) or the SQL editor.
3. Create the initial administrator from Supabase Authentication (do not use a source-controlled password). After identity verification, provision the `public.profiles` row for that auth UUID using a trusted operator session. The profile role enum permits only `admin`.
4. Sign in at `/admin`. The database checks administrator membership via RLS; frontend route hiding is not the security boundary.
5. Create published service/project content from the dashboard/database. Storage buckets and RLS policies are created by the migration.

The migration is deliberately not seeded with a default administrator or made-up project records. Project cover image fields accept persistent URLs; upload bucket policies are present, while browser upload management UI is not yet implemented.

## Build and deploy

```sh
npm run build
npm run preview
```

Deploy the Vite app to Vercel with build command `npm run build`, output directory `dist`, and the two public Supabase environment variables. Add a Vercel rewrite so application routes resolve to `/index.html`. Supabase Auth redirect URLs must include the deployed site. Never expose the Supabase service-role key in client environment variables. Configure email notifications and rate limiting using a trusted server/edge function before enabling those integrations; they are not claimed as configured by this frontend.

## Company information and brand assets

Company contact details are initialized from the supplied prompt: S.M. Engineers & Architects, proprietor P. Sai Kumar, 9866608135, smengineers@gmail.com, D.No. 11/2/8/2, Road No. 6, Venkateswara Colony, Saroornagar, Hyderabad – 500035. The supplied original brand identity image is stored at `public/assets/sm-engineers-brand-identity.png` and used throughout the site, footer, and admin screens. Illustrative imagery is not claimed as completed company work.