// e2e specs boot Nest directly via Test.createTestingModule and never import
// src/main.ts, so nothing else loads env vars for this test run. Loads
// apps/api/.env.test specifically, never apps/api/.env (dev) -- CONVENTIONS.md
// -> "Testing" requires e2e to target db-test (port 5433), never the dev
// database on 5432, which bootstrap:demo may have already populated with
// real-ticker demo data that collides with these suites' own fixtures.
import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(__dirname, '../.env.test') });
