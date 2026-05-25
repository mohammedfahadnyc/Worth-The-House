# Property Scout

A polished personal real estate acquisition notebook for tracking properties, writing tour notes, and running mortgage, cash-to-close, and DTI scenarios before making an offer.

Property Scout is built for individual buyers and investors who want a clean command center for evaluating houses without spreadsheets, clutter, or landlord-management bloat.

## Highlights

- Username/password auth backed by Supabase Auth
- Personal finance setup for income, debt, cash on hand, and default house assumptions
- Property dashboard with status badges for DTI, cash shortfall, and missing numbers
- Detailed property notebook with large, comfortable general notes and tour notes
- Mortgage calculator with principal and interest, taxes, insurance, PMI, HOA, rent, cash to close, and remaining cash
- DTI simulator using 75% of projected rental income and a 45% target DTI
- DTI fixer showing required debt reduction, income increase, or additional down payment
- Responsive dark dashboard UI with a minimal investor-focused aesthetic

## Tech Stack

- Next.js App Router
- TypeScript
- Tailwind CSS
- shadcn-style local UI components
- Supabase Auth
- Supabase Postgres
- Supabase Row Level Security
- lucide-react icons

## Local Setup

Install dependencies:

```bash
npm install
```

Create a Supabase project, then run the SQL in:

```text
supabase/schema.sql
```

In Supabase Auth settings, disable email confirmation for local testing.

Create `.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-sb-publishable-key
```

Use the publishable key that starts with `sb_publishable_...`. Legacy projects can use `NEXT_PUBLIC_SUPABASE_ANON_KEY` instead. Never expose the Supabase secret key in a `NEXT_PUBLIC_*` variable.

Run locally:

```bash
npm run dev
```

Open:

```text
http://localhost:3000
```

## Test Flow

1. Sign up with a username and password.
2. Complete the profile setup.
3. Add a property.
4. Edit mortgage assumptions.
5. Save general notes and tour notes.
6. Return to the dashboard and verify the property status updates.

## Deployment

1. Push this repo to GitHub as `property-scout`.
2. Import the repo into Vercel.
3. Add these environment variables in Vercel:

```bash
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-sb-publishable-key
```

4. Deploy.

## Auth Note

The UI asks for username and password. Internally, usernames are converted to synthetic Supabase emails like:

```text
username@propertyscout.local
```

Users never need to enter or manage an email address.
