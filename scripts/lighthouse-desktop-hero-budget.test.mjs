import test from "node:test";
import assert from "node:assert/strict";
import { inspectDesktopHero, summarizeDesktopHero } from "./lighthouse-desktop-hero-budget.mjs";

const image = (width, extra = {}) => ({
  url: `https://images.unsplash.com/photo-1558501649-ffd87be06251?auto=format&fit=crop&w=${width}&q=68`,
  resourceType: "Image", statusCode: 200, finished: true, transferSize: 48000, ...extra,
});
const report = items => ({ audits: { "network-requests": { details: { items } } } });

test("accepts one DPR1 desktop 640w image and reports bytes", () => {
  const r = report([image(640)]);
  assert.deepEqual(inspectDesktopHero(r), { width:640, bytes:48000 });
  assert.match(summarizeDesktopHero([r]), /46.9 KiB/);
});
test("rejects duplicate desktop hero variants", () => {
  assert.throws(() => inspectDesktopHero(report([image(640),image(960)])), /found 2/);
});
test("rejects oversized DPR1 resource", () => {
  assert.throws(() => inspectDesktopHero(report([image(960)])), /oversized/);
});
test("rejects missing, incomplete, and failed network evidence", () => {
  assert.throws(() => inspectDesktopHero({}), /missing/);
  assert.throws(() => inspectDesktopHero(report([])), /found 0/);
  assert.throws(() => inspectDesktopHero(report([image(640,{statusCode:404})])), /failed/);
  assert.throws(() => inspectDesktopHero(report([image(640,{finished:false})])), /failed/);
  assert.throws(() => inspectDesktopHero(report([image(640,{transferSize:NaN})])), /transfer size/);
});
