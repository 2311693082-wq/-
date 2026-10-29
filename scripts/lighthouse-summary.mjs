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


/**
 * Repeat audits on the same runner and report medians rather than treating
 * a single noisy CI measurement as a verified performance improvement.
 */
function median(values) {
  const sorted = values.filter(Number.isFinite).sort((a, b) => a - b);
  if (!sorted.length) return null;
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

export function summarizeLighthouseRuns(reports) {
  const validReports = reports.filter((report) => report && typeof report === "object");
  const scores = validReports.map((report) => report?.categories?.performance?.score).filter(Number.isFinite);
  const score = median(scores);
  const scoreLabel = score === null ? "N/A" : `${Math.round(score * 100)}/100`;
  const scoreRange = scores.length
    ? `${Math.round(Math.min(...scores) * 100)}–${Math.round(Math.max(...scores) * 100)}/100`
    : "N/A";
  const format = (value, unit) => unit === "score" ? value.toFixed(3) : `${Math.round(value)} ms`;
  const rows = metrics.map(([label, id, unit]) => {
    const values = validReports.map((report) => report?.audits?.[id]?.numericValue).filter(Number.isFinite);
    const middle = median(values);
    const center = middle === null ? "N/A" : format(middle, unit);
    const range = values.length
      ? `${format(Math.min(...values), unit)} – ${format(Math.max(...values), unit)}`
      : "N/A";
    return `| ${label} | ${center} | ${range} | ${values.length}/${validReports.length} |`;
  });
  return [
    "### Lighthouse mobile (repeated local-preview audits)",
    "",
    `**Performance score (median): ${scoreLabel}** (range ${scoreRange}; ${scores.length}/${validReports.length} scored)`,
    "",
    "| Metric | Median | Range | Samples |",
    "| --- | ---: | ---: | ---: |",
    ...rows,
    "",
    validReports.length < 3 ? "Warning: fewer than three audit reports were available." : "Three sequential audits reduce reliance on a single noisy CI run.",
    "Synthetic GitHub-hosted runner measurement of the local static preview.",
    "External image/CDN responses and CI load may vary. This is not a production",
    "Core Web Vitals measurement or a guaranteed real-user speed improvement.",
    ""
  ].join("\n");
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const paths = process.argv.slice(2);
  const reports = (paths.length ? paths : ["lighthouse-mobile.json"])
    .map((path) => JSON.parse(readFileSync(path, "utf8")));
  process.stdout.write(reports.length === 1
    ? summarizeLighthouse(reports[0])
    : summarizeLighthouseRuns(reports));
}
