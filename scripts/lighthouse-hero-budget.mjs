/**
 * Regression guard for the actual hero image requested by mobile Lighthouse.
 * A responsive srcset in HTML alone does not prove which resource was fetched.
 * This verifies network evidence from each synthetic run; it is not a real-user
 * bandwidth or LCP guarantee.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERO_PHOTO_ID = "photo-1558501649-ffd87be06251";
const MAX_MOBILE_HERO_WIDTH = 640;

export function inspectMobileHero(report) {
  const requests = report?.audits?.["network-requests"]?.details?.items;
  if (!Array.isArray(requests)) throw new Error("Lighthouse network-requests audit is missing");
  const heroRequests = requests.filter((request) => {
    try {
      const url = new URL(request.url);
      return url.hostname === "images.unsplash.com" && url.pathname.includes(HERO_PHOTO_ID)
        && request.resourceType === "Image";
    } catch {
      return false;
    }
  });
  if (heroRequests.length !== 1) {
    throw new Error(`Expected one hero image request, found ${heroRequests.length} (possible duplicate preload)`);
  }
  const request = heroRequests[0];
  if (request.statusCode !== 200 || request.finished !== true) {
    throw new Error(`Hero image did not finish successfully (status ${request.statusCode ?? "unknown"})`);
  }
  const width = Number(new URL(request.url).searchParams.get("w"));
  if (!Number.isInteger(width) || width < 1 || width > MAX_MOBILE_HERO_WIDTH) {
    throw new Error(`Mobile hero selected ${width || "unknown"}w; expected at most ${MAX_MOBILE_HERO_WIDTH}w`);
  }
  const bytes = request.transferSize;
  if (!Number.isFinite(bytes) || bytes < 0) throw new Error("Hero transfer size missing");
  return { width, bytes };
}

export function summarizeMobileHero(reports) {
  if (!Array.isArray(reports) || reports.length < 1) throw new Error("No Lighthouse reports supplied");
  const results = reports.map(inspectMobileHero);
  return [
    "### Mobile hero image network regression",
    "",
    "| Run | Requested image | Transferred |",
    "| --- | ---: | ---: |",
    ...results.map((result, index) => `| ${index + 1} | ${result.width}w | ${(result.bytes / 1024).toFixed(1)} KiB |`),
    "",
    `All ${results.length} mobile audits requested one successful hero image at no more than ${MAX_MOBILE_HERO_WIDTH}w.`,
    "Synthetic Lighthouse network observations; not production bandwidth or LCP measurements.",
    ""
  ].join("\n");
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const paths = process.argv.slice(2);
  if (!paths.length) throw new Error("Pass Lighthouse JSON report paths");
  const reports = paths.map((path) => JSON.parse(readFileSync(path, "utf8")));
  process.stdout.write(summarizeMobileHero(reports));
}
