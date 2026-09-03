import { defineConfig } from 'allure';

/**
 * The shareable build of the report: one self-contained HTML file.
 *
 * The everyday report in allurerc.mjs is a directory of files that fetch each
 * other, so it only works behind a web server — which is what `allure open`
 * quietly provides. That is fine for whoever ran the tests and useless for
 * anyone they want to send it to.
 *
 * This build inlines everything into a single page that opens by double-clicking
 * it, on a machine with no Node, no npm and no checkout.
 */
export default defineConfig({
  name: 'blu2green — E2E',
  output: 'allure-share',

  // Inside the throwaway output directory, deliberately, and never `.allure`.
  // `generate` appends the run it has just drawn to whatever history it is
  // pointed at, so building a shareable copy from the same results would record
  // that run a second time and put a phantom point on the real trend.
  //
  // The cost is that a shared snapshot carries no trend line. That is the right
  // trade: a trend drawn from a single point says nothing, and the question this
  // report answers for someone outside the team is "how did this run go".
  historyPath: 'allure-share/.history.jsonl',

  plugins: {
    awesome: {
      options: {
        reportName: 'blu2green E2E',
        reportLanguage: 'en',
        singleFile: true,
        groupBy: ['epic', 'feature', 'story'],
        categories: [
          { name: 'Product defect', matchedStatuses: ['failed'] },
          { name: 'Test infrastructure', matchedStatuses: ['broken'] },
        ],
      },
    },
  },
});
