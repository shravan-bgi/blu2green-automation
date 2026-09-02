import jsdoc from 'eslint-plugin-jsdoc';
import playwright from 'eslint-plugin-playwright';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: [
      'node_modules',
      'test-results',
      'playwright-report',
      'blob-report',
      'allure-report',
      'allure-results',
      '.allure',
      '.claude',
    ],
  },
  {
    files: ['**/*.ts'],
    languageOptions: { parser: tseslint.parser },
    plugins: { playwright },
    rules: {
      // The prose bans from the playwright-automation skill, enforced.
      'playwright/no-wait-for-timeout': 'error',
      'playwright/no-force-option': 'error',
      'playwright/no-element-handle': 'error',
      'playwright/no-page-pause': 'error',
      'playwright/no-focused-test': 'error',
      // Conditional skips are legitimate; unconditional ones are the smell.
      'playwright/no-skipped-test': ['warn', { allowConditional: true }],
      'playwright/no-useless-await': 'error',
      'playwright/prefer-web-first-assertions': 'error',
      'playwright/valid-expect': 'error',
    },
  },
  {
    // The comment convention, enforced. Framework code only — a spec describes
    // itself through its test titles.
    files: ['**/*.ts'],
    ignores: ['tests/**', '*.config.ts'],
    plugins: { jsdoc },
    rules: {
      'jsdoc/require-jsdoc': [
        'error',
        {
          require: {
            FunctionDeclaration: true,
          },
          // Exports match on the `export` node — a block above `export const`
          // attaches there, not to the declaration inside.
          // Classes omitted: the plugin cannot see through `export abstract
          // class` and reports false missings.
          // Constructors omitted: every page object has one that only stores
          // `page`.
          contexts: [
            'MethodDefinition[kind="method"]',
            'MethodDefinition[kind="get"]',
            'MethodDefinition[kind="set"]',
            'ExportNamedDeclaration[declaration.type="VariableDeclaration"]',
            'ExportNamedDeclaration[declaration.type="FunctionDeclaration"]',
          ],
          publicOnly: false,
        },
      ],
      // An empty block must not satisfy the rule above.
      'jsdoc/require-description': 'error',
      // No require-param / require-returns: the convention is one plain sentence.
    },
  },
);
