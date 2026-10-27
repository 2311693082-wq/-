/**
 * Static HTML copy regression gate, NOT a legal audit or backend authorization.
 * Check visible text instead of source markup so comments cannot satisfy notices,
 * and basic entity/tag obfuscation cannot bypass promotion checks.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const REQUIRED_NOTICE = '活动记分不可购买、出售、转让、借用，也不可兑换现金、实物或有价券。';
const FORBIDDEN_PROMOTIONS = [
  /(?:积分|计分牌|筹码)(?:可以|能够|可用于|可用来|可|能|支持|直接|允许|用于|用来)?(?:购买|充值|兑换|出售|转让|交易|提现|抵扣)/i,
  /(?:现金|实物|有价券)(?:奖励|兑换|返还)/i,
  /(?:购买|充值)(?:积分|计分牌|筹码)/i,
  /(?:积分|筹码|计分牌)(?:可以|能够|可|能|直接)?(?:换取|换成|换)(?:现金|奖品|实物|有价券|酒水|饮品|餐食)/i
];
const ENTITY_NAMES = Object.freeze({
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ',
  zwj: '', zwnj: '', zerowidthspace: '', thinspace: ' ', shy: '', lrm: '', rlm: '',
  tab: ' ', newline: ' '
});

function decodeEntities(input) {
  let result = input;
  // Bounded passes handle e.g. &amp;#x5151; without unbounded expansion.
  for (let pass = 0; pass < 3; pass++) {
    const next = result.replace(/&(#(?:x[0-9a-f]+|\d+);?|[a-z][a-z0-9]+;)/gi, (match, entity) => {
      if (entity[0] !== '#') return ENTITY_NAMES[entity.slice(0, -1).toLowerCase()] ?? match;
      const numeric = entity.endsWith(';') ? entity.slice(0, -1) : entity;
      const hex = /^#x/i.test(numeric);
      const codepoint = Number.parseInt(numeric.slice(hex ? 2 : 1), hex ? 16 : 10);
      return codepoint > 0 && codepoint <= 0x10ffff && !(codepoint >= 0xd800 && codepoint <= 0xdfff)
        ? String.fromCodePoint(codepoint) : match;
    });
    if (next === result) break;
    result = next;
  }
  return result;
}

const BLOCK_TAGS = new Set(['p', 'div', 'section', 'article', 'li', 'main', 'footer', 'header', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6']);
const VOID_TAGS = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr']);

function attribute(attrs, name) {
  // Require a whitespace boundary: data-hidden must not count as hidden.
  const match = new RegExp('(?:^|\\s)' + name + '(?:\\s*=\\s*(?:"([^"]*)"|\\x27([^\\x27]*)\\x27|([^\\s>]+)))?(?=\\s|$)', 'i').exec(attrs);
  return match ? { present: true, value: match[1] ?? match[2] ?? match[3] ?? '' } : { present: false, value: '' };
}

function isHiddenTag(attrs) {
  if (attribute(attrs, 'hidden').present || attribute(attrs, 'inert').present) return true;
  if (attribute(attrs, 'aria-hidden').value.toLowerCase() === 'true') return true;
  const style = attribute(attrs, 'style').value;
  return /(?:^|;)\s*(?:display\s*:\s*none|visibility\s*:\s*hidden|content-visibility\s*:\s*hidden|opacity\s*:\s*0+(?:\.0+)?(?:\s*!important)?(?=;|$))/i.test(style);
}

/**
 * Lightweight static-HTML extractor. This is NOT a browser rendering engine:
 * stylesheet-driven visibility still requires a browser-level audit.
 * Hidden promotions remain subject to the copy check, but only visible notices
 * can satisfy the mandatory disclosure requirement.
 */
export function extractVisibleLines(html, { includeHidden = false } = {}) {
  assert.equal(typeof html, 'string', 'Generated HTML must be text');
  const source = html
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<(script|style|template|svg|head|noscript)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, '');
  const tokens = source.match(/<(?:(?:"[^"]*"|'[^']*'|[^'">])*)>|[^<]+/g) || [];
  const stack = [];
  const output = [];
  for (const token of tokens) {
    if (!token.startsWith('<')) {
      if (!stack.some(frame => frame.hidden)) output.push(token);
      continue;
    }
    if (/^<\s*!/.test(token)) continue;
    const closing = /^<\s*\/\s*([a-z][\w:-]*)/i.exec(token);
    if (closing) {
      const name = closing[1].toLowerCase();
      const index = stack.findLastIndex(frame => frame.name === name);
      if (index !== -1) {
        const wasHidden = stack.some(frame => frame.hidden);
        stack.length = index;
        if (BLOCK_TAGS.has(name) && !wasHidden) output.push(null);
      }
      continue;
    }
    const opening = /^<\s*([a-z][\w:-]*)\b([\s\S]*?)\/?>$/i.exec(token);
    if (!opening) continue;
    const name = opening[1].toLowerCase();
    const attrs = opening[2];
    const hidden = !includeHidden && isHiddenTag(attrs);
    const parentHidden = stack.some(frame => frame.hidden);
    if (name === 'br' && !hidden && !parentHidden) output.push(' ');
    if (!VOID_TAGS.has(name) && !/\/\s*>$/.test(token)) stack.push({ name, hidden });
  }
  // Only structural block boundaries separate lines. Whitespace inside a
  // text node, <br>, or an encoded newline must never split a promotion in two.
  const lines = [];
  let chunk = '';
  const flush = () => {
    const normalized = decodeEntities(chunk).normalize('NFKC')
      .replace(/[\p{Cf}\u034F\uFE0E\uFE0F]/gu, '')
      .replace(/\s+/g, '');
    if (normalized) lines.push(normalized);
    chunk = '';
  };
  for (const part of output) {
    if (part === null) flush();
    else chunk += part;
  }
  flush();
  return lines;
}

// Accessible names and search/social snippets are public-facing copy too.
// They must be scanned for prohibited promotions, but never count as the
// on-page visible disclosure. This deliberately ignores non-copy attributes.
function extractPromotionalAttributes(html) {
  const source = html.replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<(script|style|template|svg|noscript)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, '');
  const tags = source.match(/<(?:(?:"[^"]*"|'[^']*'|[^'">])*)>/g) || [];
  const values = [];
  // Document titles are exposed in tabs and search results, not on-page notices.
  for (const match of source.matchAll(/<title\b[^>]*>([\s\S]*?)<\/title\s*>/gi)) {
    values.push(match[1].replace(/<[^>]*>/g, ''));
  }
  for (const tag of tags) {
    const opening = /^<\s*([a-z][\w:-]*)\b([\s\S]*?)\/?>$/i.exec(tag);
    if (!opening) continue;
    const name = opening[1].toLowerCase();
    const attrs = opening[2];
    for (const key of ['alt', 'title', 'aria-label', 'aria-description', 'placeholder']) {
      const found = attribute(attrs, key);
      if (found.present && found.value) values.push(found.value);
    }
    if (name === 'meta') {
      const kind = (attribute(attrs, 'name').value || attribute(attrs, 'property').value).trim();
      if (/^(?:description|keywords|og:title|og:description|twitter:title|twitter:description)$/i.test(kind)) {
        const content = attribute(attrs, 'content');
        if (content.present && content.value) values.push(content.value);
      }
    }
  }
  return values.map(value => decodeEntities(value).normalize('NFKC')
    .replace(/[\p{Cf}\u034F\uFE0E\uFE0F]/gu, '')
    .replace(/\s+/g, ''));
}

export function checkCompliance(html) {
  const lines = extractVisibleLines(html);
  const notice = REQUIRED_NOTICE.normalize('NFKC').replace(/\s+/g, '');
  assert.ok(lines.some(line => line.includes(notice)), 'Mandatory entertainment-points restriction missing from visible text');
  for (const line of [...extractVisibleLines(html, { includeHidden: true }), ...extractPromotionalAttributes(html)]) {
    for (const pattern of FORBIDDEN_PROMOTIONS) {
      assert.doesNotMatch(line, pattern, `Prohibited points/prize promotion: ${pattern}`);
    }
  }
  return { noticePresent: true, promotionPatternsChecked: FORBIDDEN_PROMOTIONS.length };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const html = readFileSync(process.argv[2] || 'dist/index.html', 'utf8');
  console.log(JSON.stringify({ result: 'pass', ...checkCompliance(html) }));
}
