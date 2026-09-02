import { expect, test } from '@fixtures/test-fixtures';

test.describe('CI notification verification', () => {
  test(
    'TC_CI_001 | Verify the failure email is sent when a test fails',
    { tag: ['@smoke', '@auth', '@negative', '@ui'] },
    async () => {
      // Deliberate failure. This spec exists only to prove the notify-failure
      // job delivers mail, and is deleted once that is confirmed.
      expect(true, 'intentional failure to trigger the CI failure email').toBe(
        false,
      );
    },
  );
});
