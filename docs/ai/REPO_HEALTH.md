# Repo Health

## Snapshot

- Repository: `A-awd/calapres`
- Visibility: public
- Type: React/Vite/Supabase app
- Maturity: generated app with test scripts present
- Risk: medium, due to Supabase dependency and public visibility

## Observed

- README is Lovable boilerplate with placeholder project ID.
- Root package includes Vitest scripts.
- Supabase dependency is present.

## Required Hardening

- [ ] Replace Lovable boilerplate with product-specific README.
- [ ] Add `.env.example` with safe placeholders.
- [ ] Verify Supabase client key exposure is safe.
- [ ] Add CI for lint, test, and build.
- [ ] Document production deployment path.
- [ ] Use this repo's test posture as a reference for sibling app hardening.

## AI Notes

This is a good candidate for a reusable React/Vite/Supabase hardening template.
