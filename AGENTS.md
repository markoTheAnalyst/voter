# Either architecture

Either hosts public, two-option polls built with TanStack Start and React. Its editorial visual design uses warm off-white surfaces, sage accents, travel photography, and dark flip counters.

## Key directories

- `src/routes/index.tsx`: poll UI, two-second result polling, voting, share dialog, and explanation dialog.
- `src/components/poll-creator.tsx`: public poll creation form with validated uploads and local image previews.
- `src/lib/poll.ts`: shared poll types, original poll definition, and limits.
- `netlify/functions/create-poll.mts`: POST `/api/polls`, validates uploads, stores images in Netlify Blobs, and saves poll definitions.
- `netlify/functions/poll-image.mts`: GET `/api/poll-image`, serves uploaded images by validated key.
- `src/routes/__root.tsx`: document shell and finished social metadata.
- `src/styles.css`: global theme, responsive poll layout, counter animations, and reduced-motion support.
- `netlify/functions/poll.mts`: GET and POST `/api/poll`. Returns totals and the visitor's choice. Validates votes and checks POST origin.
- `db/schema.ts`: Drizzle schema. `db/index.ts` creates the Netlify Database client inside the invocation.
- `netlify/database/migrations`: generated schema migrations, applied by the platform.
- `public/img`: local Unsplash photographs, served through Netlify Image CDN.
- `src/components/ui`: available Radix-based primitives; the poll uses Dialog.

## Conventions and decisions

Use TypeScript and React hooks. Keep browser APIs out of server render. The internal choice IDs remain `mountains` and `ocean` for option A and B; user-facing titles and images are arbitrary. Anyone can create a poll with a question, two options and two image uploads. Polls use shareable `/?poll=<uuid>` links. The homepage keeps the original shared poll. There is no administration or editing after publication.

Vote totals start at zero and always come from the database. Do not fabricate initial vote totals. A persistent HTTP-only cookie identifies each browser; its ID is the original votes table primary key. Custom polls use a composite primary key of poll ID and voter ID in `poll_votes`. Insert-on-conflict prevents duplicate votes, including concurrent submissions. This provides browser-level deduplication, not verified human identity. Votes cannot be changed through the UI.

Use `@netlify/database` and `drizzle-orm@beta` with the native `drizzle-orm/netlify-db` adapter. Schema changes require a generated migration: `pnpm exec drizzle-kit generate --name descriptive_name`. Do not apply migrations yourself.

Results refresh every two seconds with uncached requests. A shared busy ref prevents overlapping vote and refresh requests. A vote clicked during refresh waits for that refresh and submits once; never silently discard the click. The UI handles initial loading, request failure, pending submission, and successful votes. Preserve keyboard access and reduced-motion support.

Run locally through `netlify dev --port 8889` for Functions, Database, and Image CDN support. In platform agent runs, follow platform validation restrictions; the deployment pipeline validates builds.

Uploads are JPEG, PNG, or WebP, capped at 1.5 MB per image with server-side signature checks. Store files in the `poll-images` Netlify Blobs store using strong consistency so newly created polls can immediately display images. Store structured poll definitions in Netlify Database. Preserve all applied migrations.
