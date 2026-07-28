// Shared root ESLint config (flat config, ESLint 9+).
//
// `apps/web`, `apps/api`, and `packages/shared` each import this and extend
// it with their own package-specific overrides, rather than declaring their
// own rules from scratch:
//
//   import rootConfig from '../../eslint.config.mjs';
//   export default [...rootConfig, /* package-specific overrides */];

import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import eslintConfigPrettier from 'eslint-config-prettier';

export default tseslint.config(
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/.next/**',
      '**/out/**',
      '**/coverage/**',
      'resources/**',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  eslintConfigPrettier,
);
