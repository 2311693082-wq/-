import test from "node:test";
import assert from "node:assert/strict";
import { summarizeLighthouse } from "./lighthouse-summary.mjs";

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
