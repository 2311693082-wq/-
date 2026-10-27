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
  /(?:积分|计分牌|筹码)(?:可|能|支持|直接)?(?:购买|充值|兑换|出售|转让|交易|提现|抵扣)/i,
  /(?:现金|实物|有价券)(?:奖励|兑换|返还)/i,
  /(?:购买|充值)(?:积分|计分牌|筹码)/i,
  /(?:积分|筹码|计分牌)(?:换取|换成|换)(?:现金|奖品|实物|有价券|酒水|饮品|餐食)/i
];
const ENTITY_NAMES = Object.freeze({
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ',
  zwj: '', zwnj: '', ZeroWidthSpace: '', ThinSpace: ' ', shy: '', lrm: '', rlm: ''
});

function decodeEntities(input) {
  let result = input;
  // Bounded passes handle e.g. &amp;#x5151; without unbounded expansion.
  for (let pass = 0; pass < 3; pass++) {
    const next = result.replace(/&(#(?:x[0-9a-f]+|\d+)|[a-z][a-z0-9]+);/gi, (match, entity) => {
      if (entity[0] !== '#') return ENTITY_NAMES[entity] ?? match;
      const hex = /^#x/i.test(entity);
      const codepoint = Number.parseInt(entity.slice(hex ? 2 : 1), hex ? 16 : 10);
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
  if (attribute(attrs, 'hidden').present) return true;
  if (attribute(attrs, 'aria-hidden').value.toLowerCase() === 'true') return true;
  const style = attribute(attrs, 'style').value;
  return /(?:^|;)\s*(?:display\s*:\s*none|visibility\s*:\s*hidden|content-visibility\s*:\s*hidden|opacity\s*:\s*0(?:\s|!|;|$))/i.test(style);
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
        if (BLOCK_TAGS.has(name) && !wasHidden) output.push('\n');
      }
      continue;
    }
    const opening = /^<\s*([a-z][\w:-]*)\b([\s\S]*?)\/?>$/i.exec(token);
    if (!opening) continue;
    const name = opening[1].toLowerCase();
    const attrs = opening[2];
    const hidden = !includeHidden && isHiddenTag(attrs);
    const parentHidden = stack.some(frame => frame.hidden);
    if (name === 'br' && !hidden && !parentHidden) output.push('\n');
    if (!VOID_TAGS.has(name) && !/\/\s*>$/.test(token)) stack.push({ name, hidden });
  }
  return decodeEntities(output.join('')).normalize('NFKC')
    .replace(/[\p{Cf}\u034F\uFE0E\uFE0F]/gu, '')
    .split(/\r?\n/)
    .map(line => line.replace(/\s+/g, ''))
    .filter(Boolean);
}

export function checkCompliance(html) {
  const lines = extractVisibleLines(html);
  const notice = REQUIRED_NOTICE.normalize('NFKC').replace(/\s+/g, '');
  assert.ok(lines.some(line => line.includes(notice)), 'Mandatory entertainment-points restriction missing from visible text');
  for (const line of extractVisibleLines(html, { includeHidden: true })) {
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
