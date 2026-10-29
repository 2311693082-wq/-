/**
 * Summarize synthetic Lighthouse mobile metrics for a GitHub Actions job.
 * This is a local-preview diagnostic, not a production speed guarantee.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const metrics = [
  ["First Contentful Paint", "first-contentful-paint", "ms"],
  ["Largest Contentful Paint", "largest-contentful-paint", "ms"],
  ["Speed Index", "speed-index", "ms"],
  ["Total Blocking Time", "total-blocking-time", "ms"],
  ["Cumulative Layout Shift", "cumulative-layout-shift", "score"]
];

export function summarizeLighthouse(report) {
  const score = report?.categories?.performance?.score;
  const scoreLabel = Number.isFinite(score) ? `${Math.round(score * 100)}/100` : "N/A";
  const rows = metrics.map(([label, id, unit]) => {
    const value = report?.audits?.[id]?.numericValue;
    const display = Number.isFinite(value)
      ? unit === "score" ? value.toFixed(3) : `${Math.round(value)} ms`
      : "N/A";
    return `| ${label} | ${display} |`;
  });
  return [
    "### Lighthouse mobile (local preview)",
    "",
    `**Performance score: ${scoreLabel}**`,
    "",
    "| Metric | Result |",
    "| --- | ---: |",
    ...rows,
    "",
    "Synthetic GitHub-hosted runner measurement of the local static preview.",
    "External image/CDN responses and CI load may vary. This is not a production",
    "Core Web Vitals measurement or a guaranteed real-user speed improvement.",
    ""
  ].join("\n");
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const report = JSON.parse(readFileSync(process.argv[2] || "lighthouse-mobile.json", "utf8"));
  process.stdout.write(summarizeLighthouse(report));
}
