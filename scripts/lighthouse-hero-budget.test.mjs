import test from "node:test";
import assert from "node:assert/strict";
import { inspectMobileHero, summarizeMobileHero } from "./lighthouse-hero-budget.mjs";

const url = (width) => `https://images.unsplash.com/photo-1558501649-ffd87be06251?auto=format&fit=crop&w=${width}&q=68`;
const makeReport = (requests) => ({
  audits: { "network-requests": { details: { items: requests } } }
});
const image = (width, bytes = 48000) => ({
  url: url(width), resourceType: "Image", statusCode: 200, finished: true, transferSize: bytes
});

test("accepts one successfully loaded 640w hero and reports transferred bytes", () => {
  const report = makeReport([image(640), { url: "https://example.com/", resourceType: "Document" }]);
  assert.deepEqual(inspectMobileHero(report), { width: 640, bytes: 48000 });
  assert.ok(summarizeMobileHero([report]).includes("| 1 | 640w | 46.9 KiB |"));
});

test("rejects an oversized 1200w mobile hero", () => {
  assert.throws(() => inspectMobileHero(makeReport([image(1200)])), /at most 640w/);
});

test("rejects duplicate hero requests caused by mismatched preloads", () => {
  assert.throws(() => inspectMobileHero(makeReport([image(640), image(960)])), /found 2/);
});

test("rejects missing, failed or incomplete network evidence", () => {
  assert.throws(() => inspectMobileHero({}), /audit is missing/);
  assert.throws(() => inspectMobileHero(makeReport([])), /found 0/);
  assert.throws(() => inspectMobileHero(makeReport([{ ...image(640), statusCode: 404 }])), /did not finish/);
  assert.throws(() => inspectMobileHero(makeReport([{ ...image(640), finished: false }])), /did not finish/);
});
