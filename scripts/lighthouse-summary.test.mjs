import test from "node:test";
import assert from "node:assert/strict";
import { summarizeLighthouse, summarizeLighthouseRuns } from "./lighthouse-summary.mjs";

test("prints mobile performance score and key numeric metrics", () => {
  const summary = summarizeLighthouse({
    categories: { performance: { score: 0.83 } },
    audits: {
      "first-contentful-paint": { numericValue: 1342.8 },
      "largest-contentful-paint": { numericValue: 2412.2 },
      "speed-index": { numericValue: 1800.1 },
      "total-blocking-time": { numericValue: 16.7 },
      "cumulative-layout-shift": { numericValue: 0.0431 }
    }
  });
  assert.match(summary, /Performance score: 83\/100/);
  assert.match(summary, /First Contentful Paint \| 1343 ms/);
  assert.match(summary, /Largest Contentful Paint \| 2412 ms/);
  assert.match(summary, /Total Blocking Time \| 17 ms/);
  assert.match(summary, /Cumulative Layout Shift \| 0\.043/);
  assert.match(summary, /not a production/);
});

test("handles missing or nonnumeric audits without claiming a score", () => {
  const summary = summarizeLighthouse({ categories: { performance: { score: null } }, audits: {} });
  assert.match(summary, /Performance score: N\/A/);
  assert.equal((summary.match(/\| N\/A \|/g) || []).length, 5);
  assert.match(summarizeLighthouse(null), /Performance score: N\/A/);
});

test("reports medians and ranges from three sequential mobile audits", () => {
  const report = (score, lcp, tbt, cls) => ({
    categories: { performance: { score } },
    audits: {
      "largest-contentful-paint": { numericValue: lcp },
      "total-blocking-time": { numericValue: tbt },
      "cumulative-layout-shift": { numericValue: cls }
    }
  });
  const summary = summarizeLighthouseRuns([
    report(0.69, 2753, 305, 0.49),
    report(0.83, 2432, 594, 0),
    report(0.88, 2300, 410, 0.01)
  ]);
  assert.match(summary, /Performance score \(median\): 83\/100/);
  assert.match(summary, /range 69–88\/100; 3\/3 scored/);
  assert.match(summary, /Largest Contentful Paint \| 2432 ms \| 2300 ms – 2753 ms \| 3\/3/);
  assert.match(summary, /Total Blocking Time \| 410 ms \| 305 ms – 594 ms \| 3\/3/);
  assert.match(summary, /Cumulative Layout Shift \| 0\.010 \| 0\.000 – 0\.490 \| 3\/3/);
  assert.doesNotMatch(summary, /fewer than three/);
});

test("makes missing metrics and partial runs explicit", () => {
  const summary = summarizeLighthouseRuns([
    { categories: { performance: { score: 0.7 } }, audits: { "largest-contentful-paint": { numericValue: 2100 } } },
    { categories: { performance: { score: null } }, audits: {} }
  ]);
  assert.match(summary, /Performance score \(median\): 70\/100/);
  assert.match(summary, /1\/2 scored/);
  assert.match(summary, /Largest Contentful Paint \| 2100 ms \| 2100 ms – 2100 ms \| 1\/2/);
  assert.match(summary, /Total Blocking Time \| N\/A \| N\/A \| 0\/2/);
  assert.match(summary, /Warning: fewer than three audit reports/);
});
