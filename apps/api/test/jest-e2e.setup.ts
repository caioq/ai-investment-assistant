// e2e specs boot Nest directly via Test.createTestingModule and never import
// src/main.ts, so nothing else loads apps/api/.env for this test run. Mirrors
// main.ts's `import 'dotenv/config'` (see CONVENTIONS.md -> "Auth").
import 'dotenv/config';
