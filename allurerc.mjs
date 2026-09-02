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
        groupBy: ['parentSuite', 'suite'],
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
