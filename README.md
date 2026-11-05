# Either

Either lets anyone create a two-option visual poll with their own question, labels, descriptions, and uploaded photos. Each new poll opens at a shareable `/?poll=<id>` link. The homepage keeps the original mountains-or-ocean poll. Each option pairs photography with a text label, a vote button, an animated flip counter, and its share of the vote. Results refresh every two seconds. Votes persist in Netlify Database, with one vote per browser enforced by a cookie and a database primary key.

Built with React 19, TypeScript, TanStack Start, Vite, CSS, Lucide icons, Netlify Functions, and Drizzle ORM with Netlify Database. Default photography is stored in `public/img` and served through Netlify Image CDN. Uploaded JPEG, PNG, and WebP images (up to 1.5 MB each) persist in Netlify Blobs. Poll definitions and per-poll votes persist in Netlify Database. The original `votes` table remains intact; custom polls use `polls` and `poll_votes`. Options are fixed after publishing.

## Local development

Use Node 22.13+ and pnpm. Install dependencies with `pnpm install`, then run `netlify dev --port 8889` to include Functions, Database, and image transformations. Link the project to its Netlify site when working outside the platform workspace. Open http://localhost:8889.

The schema lives in `db/schema.ts`. After schema changes, generate a migration with `pnpm exec drizzle-kit generate --name describe_your_change`. Netlify applies migrations at deployment. Do not apply them manually.

The platform runs production validation and deployment. `pnpm build` is the production build command.

## Verification

Run `pnpm typecheck` and `pnpm exec vitest run src/poll-api.test.ts src/poll-creation.test.ts src/poll-voting.test.tsx` for the vote-counting, duplicate-submission, poll-isolation, upload, and refresh-race checks. With a platform preview database connection, `RUN_POLL_DATABASE_TEST=1 pnpm exec vitest run src/poll-runtime.test.ts` also verifies real database reads. The agent connection is read-only; real submissions and new-table integration require the deployment migration and runtime connection.
