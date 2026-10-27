/**
 * Static HTML performance regression gate. Not a Lighthouse/LCP measurement.
 * Run after: node preview-server.mjs --write
 */
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';

const file = process.argv[2] || 'dist/index.html';
const html = readFileSync(file, 'utf8');
const bytes = Buffer.byteLength(html, 'utf8');
const maxBytes = 28 * 1024;
assert.ok(bytes <= maxBytes, `HTML exceeded ${maxBytes} byte budget: ${bytes}`);
assert.doesNotMatch(html, /<script\b/i, 'Static landing page should not ship JavaScript');
assert.doesNotMatch(html, /<link\b[^>]*rel=["']stylesheet["']/i, 'Do not add render-blocking external stylesheets');
assert.doesNotMatch(html, /@import\s+(?:url\()?\s*["']?https?:/i, 'Avoid remote CSS imports');
const images = [...html.matchAll(/<img\b[^>]*>/gi)].map(m => m[0]);
assert.equal(images.length, 7, 'Unexpected image count; review image loading budget');
assert.equal(images.filter(x => /\bloading=["']lazy["']/i.test(x)).length, 6, 'All below-the-fold images must be lazy');
assert.equal(images.filter(x => /\bfetchpriority=["']high["']/i.test(x)).length, 1, 'Only hero should have high fetch priority');
for (const tag of images) {
  assert.match(tag, /\bwidth=["']\d+["']/i, 'Image width prevents layout shift');
  assert.match(tag, /\bheight=["']\d+["']/i, 'Image height prevents layout shift');
  assert.match(tag, /\bdecoding=["']async["']/i);
}
const preloads = [...html.matchAll(/<link\b[^>]*rel=["']preload["'][^>]*as=["']image["'][^>]*>/gi)];
assert.equal(preloads.length, 2, 'Use separate desktop and mobile hero preload hints');
assert.match(html, /imagesrcset=["'][^"']+640w, [^"']+1200w["']/i);
const urls = [...html.matchAll(/https:\/\/images\.unsplash\.com\/[^\s"'<>)]*/g)].map(x => x[0]);
assert.ok(urls.length >= 7, 'Expected remote image references');
for (const url of urls) {
  const parsed = new URL(url.replaceAll('&amp;', '&'));
  const width = Number(parsed.searchParams.get('w'));
  const quality = Number(parsed.searchParams.get('q'));
  assert.ok(width > 0 && width <= 1200, `Image exceeds width budget: ${url}`);
  assert.ok(quality > 0 && quality <= 75, `Image exceeds quality budget: ${url}`);
}

const hero = images.find(x => /\\bfetchpriority=["']high["']/i.test(x));
const attr = (tag, name) => tag.match(new RegExp('\\\\b' + name + '=["\\']([^"\\']+)["\\']', 'i'))?.[1];
const desktopPreload = preloads.find(x => /media=["']\\(min-width: 901px\\)["']/i.test(x[0]))?.[0];
assert.ok(desktopPreload, 'Desktop preload must be present');
assert.equal(attr(desktopPreload, 'imagesrcset'), attr(hero, 'srcset'),
  'Desktop preload must select the same responsive resource as hero img');
assert.equal(attr(desktopPreload, 'imagesizes'), attr(hero, 'sizes'),
  'Desktop preload and hero img sizes must match');
const background = html.match(/class=["']hero-bg["'][^>]*style=["']background-image:url\\('([^']+)'\\)/i)?.[1];
assert.ok(background, 'Expected hero background');
const backgroundWidth = Number(new URL(background).searchParams.get('w'));
assert.ok(backgroundWidth > 0 && backgroundWidth <= 640,
  'Decorative hero background should use a low-resolution image');

console.log(JSON.stringify({result:'pass',htmlBytes:bytes,maxBytes,images:images.length,
  lazyImages:6,preloads:preloads.length,externalScripts:0,externalStylesheets:0}));
