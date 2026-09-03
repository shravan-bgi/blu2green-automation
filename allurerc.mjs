import { defineConfig } from 'allure';

export default defineConfig({
  name: 'blu2green — E2E',
  output: 'allure-report',
  historyPath: '.allure/history.jsonl',
  plugins: {
    awesome: {
      options: {
        reportName: 'blu2green E2E',
        reportLanguage: 'en',
        singleFile: false,
        // Grouped by what the tests are about, not by what ran them. The
        // defaults — parentSuite and suite — resolve to the Playwright project
        // and the spec's file path, so the report reads "chromium" and
        // "e2e\user-operations-hub\divisions\create-division.spec.ts" to an
        // audience that has never seen the repository. Epic, feature and story
        // are set by every spec and say what a reader actually wants to know.
        groupBy: ['epic', 'feature', 'story'],
        // A failed assertion is the application disagreeing with the test; a
        // broken test never got far enough to judge anything. Deliberately not
        // keyed on message text: regexes matched against our own assertion
        // wording break the moment the wording changes, and nothing may be
        // labelled flaky automatically — that hides real breakage.
        categories: [
          { name: 'Product defect', matchedStatuses: ['failed'] },
          { name: 'Test infrastructure', matchedStatuses: ['broken'] },
        ],
      },
    },
  },
});
