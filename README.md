# StayFlow

StayFlow is an early-stage hospitality operations app for small guesthouses, boutique hotels, and lodges. The working app covers staff sign-in, property-scoped room management, and manual guest check-in. The Design Lab contains a light reception dashboard and a guest QR concept with synthetic data. Guest requests and QR actions in the Lab are prototypes.

## Try the Design Lab

With [Node.js](https://nodejs.org/) installed, run this from the repository root:

```sh
node scripts/design-lab-server.mjs
```

Open the [Design Lab](http://127.0.0.1:4173/), the [light reception dashboard](http://127.0.0.1:4173/frame.html?design=glass), or the [guest QR concept](http://127.0.0.1:4173/glass/guest.html). The Lab runs locally without a database. The Ledger comparison uses CSS from an application build.

## Run the app locally

The lockfile targets Node.js 22.22.3 and npm 10.9.8. A local app instance also uses Docker, Supabase, and a Wrangler Worker. The supplied backend setup script targets Windows with Docker Desktop using Linux containers.

1. Install the project dependencies from the verified Git root with `node scripts/project-npm.mjs ci`.
2. Place the official Windows Supabase CLI (version 3.2.0) at `work/local-tools/supabase/supabase.exe`, and start Docker Desktop.
3. From PowerShell, run `powershell -File scripts/local-backend.ps1 start` to start the local backend with synthetic seed data and configure the local Worker.
4. Run `node scripts/project-npm.mjs dev` and open [127.0.0.1:8787](http://127.0.0.1:8787/). Use the local demo accounts defined in `supabase/seed.sql`.

Use a disposable local environment and synthetic data to try the app. Run `powershell -File scripts/local-backend.ps1 stop` when finished.

## Tests

Use `node scripts/project-npm.mjs test` for unit tests. The `typecheck` and `lint` commands use the same wrapper. Database tests (`test:db`) and browser tests (`test:e2e`) require the seeded local backend. Browser tests also require Playwright Chromium.

## Contributing

Open a GitHub issue for a bug or proposal. Include reproduction steps and synthetic sample data when reporting a problem.

## License

Original StayFlow code is released under the [MIT License](LICENSE). Bundled fonts keep their [SIL Open Font License notices](prototypes/stayflow/fonts/README.md). Dependencies keep their respective licenses.
