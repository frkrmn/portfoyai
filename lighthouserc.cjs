const budgets = require("./performance-budgets.json");

module.exports = {
  ci: {
    collect: {
      url: ["http://127.0.0.1:4178/site/performance-fixture"],
      numberOfRuns: 3,
      settings: { preset: "desktop", chromeFlags: "--headless --no-sandbox --disable-dev-shm-usage" },
    },
    assert: {
      assertions: {
        "categories:performance": ["error", { minScore: budgets.lighthouse.minPerformanceScore }],
        "first-contentful-paint": ["error", { maxNumericValue: budgets.lighthouse.maxFirstContentfulPaintMs }],
        "largest-contentful-paint": ["error", { maxNumericValue: budgets.lighthouse.maxLargestContentfulPaintMs }],
        interactive: ["error", { maxNumericValue: budgets.lighthouse.maxInteractiveMs }],
        "total-byte-weight": ["error", { maxNumericValue: budgets.lighthouse.maxTotalByteWeightBytes }],
      },
    },
    upload: { target: "filesystem", outputDir: "reports/lighthouse" },
  },
};
