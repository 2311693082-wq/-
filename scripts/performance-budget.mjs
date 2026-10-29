/**
 * Static HTML performance regression gate. Not a Lighthouse/LCP measurement.
 * Run after: node preview-server.mjs --write
 */
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';

const file = process.argv[2] || 'dist/index.html';
const html = readFileSync(file, 'utf8');
assert.ok(html.includes('<a class="skip-link" href="#main">跳转到主要内容</a>'), 'Keyboard skip link must target main');
assert.ok(html.includes('<main id="main">') && html.includes('</main>'), 'Main landmark required');
assert.ok(html.includes('a:focus-visible{outline:3px solid'), 'Keyboard focus outline must remain visible');
// Unsplash <img> and CSS background requests are non-CORS. A crossorigin
// preconnect may warm a different connection pool and waste a socket.
assert.ok(html.includes('<link rel="preconnect" href="https://images.unsplash.com">'),
  'Image CDN preconnect must match non-CORS image requests');
assert.doesNotMatch(html, /<link\b[^>]*rel=["']preconnect["'][^>]*crossorigin/i,
  'Avoid a CORS preconnect for non-CORS images');
// The hero image wrapper must fill a stable grid track before the image loads.
assert.ok(html.includes('.hero-card{position:relative;max-width:520px;width:100%;margin:auto'),
  'Hero card must have an explicit width to avoid intrinsic-size layout shifts');
// Mobile fixed overlays and backdrop blurs can trigger extra paint/composite
// work on constrained devices; keep the mobile surface opaque and cheap.
assert.ok(html.includes('@media (max-width:900px){body:before{display:none}.glass,.card,.hero-card,.nav,.dock{backdrop-filter:none}.nav,.dock{background:rgba(8,7,10,.96)}}'),
  'Mobile UI must avoid fixed grid texture and backdrop-filter compositing');
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
// The five below-the-fold play cards use a 360w candidate on small/1x
// screens, while retaining 640w for higher-density displays.
const playImages = images.filter(tag => /width="640" height="440"/.test(tag));
assert.equal(playImages.length, 5, 'Expected five play-card images');
for (const tag of playImages) {
  const source = tag.match(/\bsrc="([^"]+)"/)?.[1];
  const srcset = tag.match(/\bsrcset="([^"]+)"/)?.[1];
  assert.ok(source && srcset, 'Play cards need responsive srcset');
  assert.equal(srcset, `${source.replace('w=640&q=72', 'w=360&q=64')} 360w, ${source} 640w`,
    'Play-card srcset must use the same photo at bounded sizes');
  assert.ok(tag.includes('sizes="(max-width: 900px) calc(100vw - 40px), (max-width: 1180px) calc(33.333vw - 24px), 370px"'), 'Play-card sizes must reflect actual grid widths');
}
// Creator section is below the fold: allow a smaller 480w candidate on
// narrow/low-density displays instead of always fetching the 960w source.
const creator = images.find(tag => tag.includes('alt="年轻人聚会举杯场景"'));
assert.ok(creator, 'Creator photo must exist');
assert.match(creator, /srcset="[^"]+w=480[^"]+ 480w, [^"]+w=640[^"]+ 640w, [^"]+w=960[^"]+ 960w"/);
// Mobile creator fills the 20px-padded container; desktop uses a .95fr / 1.05fr
// grid with a 42px gap, giving (viewport - 82px) * .475 until 1180px.
assert.ok(creator.includes('sizes="(max-width: 900px) calc(100vw - 40px), (max-width: 1180px) calc(47.5vw - 38.95px), 522px"'), 'Creator responsive sizes must match the layout');
assert.match(creator, /loading="lazy"/);
const preloads = [...html.matchAll(/<link\b[^>]*rel=["']preload["'][^>]*as=["']image["'][^>]*>/gi)];
assert.equal(preloads.length, 2, 'Use separate desktop and mobile hero preload hints');
assert.match(html, /imagesrcset=["'][^"']+640w, [^"']+960w, [^"']+1200w["']/i);
const urls = [...html.matchAll(/https:\/\/images\.unsplash\.com\/[^\s"'<>)]*/g)].map(x => x[0]);
assert.ok(urls.length >= 7, 'Expected remote image references');
for (const url of urls) {
  const parsed = new URL(url.replaceAll('&amp;', '&'));
  const width = Number(parsed.searchParams.get('w'));
  const quality = Number(parsed.searchParams.get('q'));
  assert.ok(width > 0 && width <= 1200, `Image exceeds width budget: ${url}`);
  assert.ok(quality > 0 && quality <= 75, `Image exceeds quality budget: ${url}`);
}

const hero = images.find(tag => tag.includes('fetchpriority="high"'));
const attr = (tag, name) => tag?.split(name + '="')[1]?.split('"')[0];
const desktopPreload = preloads.find(match => match[0].includes('media="(min-width: 901px)"'))?.[0];
assert.ok(desktopPreload, 'Desktop preload must be present');
assert.equal(attr(desktopPreload, 'imagesrcset'), attr(hero, 'srcset'),
  'Desktop preload must select the same responsive resource as hero img');
assert.equal(attr(desktopPreload, 'imagesizes'), attr(hero, 'sizes'),
  'Desktop preload and hero img sizes must match');
// The mobile hero card has a 440px max-width. Matching the actual slot
// avoids selecting a 1200w file solely because the viewport is tablet-sized.
const expectedHeroSizes = '(max-width: 900px) min(calc(100vw - 40px), 440px), 520px';
assert.equal(attr(hero, 'sizes'), expectedHeroSizes);
const mobilePreload = preloads.find(match => match[0].includes('media="(max-width: 900px)"'))?.[0];
assert.ok(mobilePreload, 'Mobile preload must exist');
assert.match(attr(hero, 'srcset'), /w=640[^,]* 640w, [^,]*w=960[^,]* 960w, [^,]*w=1200[^,]* 1200w$/);
for (const preload of [desktopPreload, mobilePreload]) {
  assert.equal(attr(preload, 'imagesrcset'), attr(hero, 'srcset'));
  assert.equal(attr(preload, 'imagesizes'), expectedHeroSizes);
}
const bgTag = html.match(/<div class="hero-bg"[^>]*>/)?.[0];
const background = bgTag?.split("url('")[1]?.split("')")[0];
assert.ok(background, 'Expected hero background');
const backgroundWidth = Number(new URL(background).searchParams.get('w'));
assert.ok(backgroundWidth > 0 && backgroundWidth <= 640,
  'Decorative hero background should use a low-resolution image');
// On modern browsers the decorative background and hero card share the same
// 1x/2x URLs, so the browser cache can reuse the selected image response.
assert.match(bgTag, /background-image:image-set\(/);
const mobileHeroUrl = attr(hero, 'srcset').split(', ')[0].split(' 640w')[0];
assert.ok(bgTag.includes(`url('${mobileHeroUrl}') 1x`), 'Background 1x must reuse hero 640w candidate');
assert.ok(bgTag.includes(`url('${attr(hero, 'src')}') 2x`), 'Background 2x must reuse hero desktop candidate');

console.log(JSON.stringify({result:'pass',htmlBytes:bytes,maxBytes,images:images.length,
  lazyImages:6,preloads:preloads.length,externalScripts:0,externalStylesheets:0}));
