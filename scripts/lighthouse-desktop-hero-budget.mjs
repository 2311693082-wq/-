/** Desktop DPR1 local-preview hero network regression guard.
 * Synthetic Lighthouse evidence only; does not prove real-user LCP improvement.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

export function inspectDesktopHero(report) {
  const requests = report?.audits?.["network-requests"]?.details?.items;
  if (!Array.isArray(requests)) throw new Error("Lighthouse network-requests audit is missing");
  const hero = requests.filter(item => {
    try {
      const url = new URL(item.url);
      return url.hostname === "images.unsplash.com"
        && url.pathname.includes("photo-1558501649-ffd87be06251")
        && item.resourceType === "Image";
    } catch { return false; }
  });
  if (hero.length !== 1) throw new Error(`Expected one desktop hero image request, found ${hero.length}`);
  const request = hero[0];
  if (request.statusCode !== 200 || request.finished !== true) throw new Error("Desktop hero image failed");
  const width = Number(new URL(request.url).searchParams.get("w"));
  if (!Number.isInteger(width) || width < 1 || width > 640)
    throw new Error(`DPR1 desktop hero selected oversized ${width}w resource`);
  const bytes = request.transferSize;
  if (!Number.isFinite(bytes) || bytes < 0) throw new Error("Hero transfer size missing");
  return { width, bytes };
}
export function summarizeDesktopHero(reports) {
  if (!Array.isArray(reports) || reports.length < 1) throw new Error("No reports");
  const results = reports.map(inspectDesktopHero);
  return ["### Desktop DPR1 hero network check (local preview)", "",
    "| Run | Image | Transferred |", "| --- | ---: | ---: |",
    ...results.map((r,i) => `| ${i+1} | ${r.width}w | ${(r.bytes/1024).toFixed(1)} KiB |`),
    "", "No duplicate responsive hero requests detected in these synthetic DPR1 desktop runs.",
    "This does not measure DPR2, production traffic, or real-user Core Web Vitals.", ""].join("\n");
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const paths = process.argv.slice(2);
  if (!paths.length) throw new Error("Pass Lighthouse JSON paths");
  process.stdout.write(summarizeDesktopHero(paths.map(path => JSON.parse(readFileSync(path,"utf8")))));
}
