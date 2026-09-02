import { expect, test } from '@fixtures/test-fixtures';

test.describe('CI notification verification', () => {
  test(
    'TC_CI_001 | Verify the failure email renders correctly',
    { tag: ['@regression', '@auth', '@negative', '@ui'] },
    async () => {
      // Deliberate failure, deleted once the email template is confirmed.
      expect(true, 'intentional failure to trigger the CI failure email').toBe(
        false,
      );
    },
  );
});
