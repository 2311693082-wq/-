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
  zwj: '', zwnj: '', ZeroWidthSpace: '', ThinSpace: ' '
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

export function extractVisibleLines(html) {
  assert.equal(typeof html, 'string', 'Generated HTML must be text');
  const text = html
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<(script|style|template|svg)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, '')
    .replace(/<\s*br\b[^>]*\/?\s*>/gi, '\n')
    .replace(/<\/\s*(?:p|div|section|article|li|h[1-6]|main|footer|header)\s*>/gi, '\n')
    .replace(/<[^>]*>/g, '');
  return decodeEntities(text).normalize('NFKC')
    .replace(/[\u200B-\u200D\uFEFF\u2060]/g, '')
    .split(/\r?\n/)
    .map(line => line.replace(/\s+/g, ''))
    .filter(Boolean);
}

export function checkCompliance(html) {
  const lines = extractVisibleLines(html);
  const notice = REQUIRED_NOTICE.normalize('NFKC').replace(/\s+/g, '');
  assert.ok(lines.some(line => line.includes(notice)), 'Mandatory entertainment-points restriction missing from visible text');
  for (const line of lines) {
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
