/**
 * Static website compliance regression gate (NOT a legal audit).
 * Check the final generated HTML, not only the editable content module.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const REQUIRED_NOTICE = '活动记分不可购买、出售、转让、借用，也不可兑换现金、实物或有价券。';
const FORBIDDEN_PROMOTIONS = [
  /(?:积分|计分牌|筹码)\s*(?:可|能|支持|直接)?\s*(?:购买|充值|兑换|出售|转让|交易|提现|抵扣)/i,
  /(?:现金|实物|有价券)\s*(?:奖励|兑换|返还)/i,
  /(?:购买|充值)\s*(?:积分|计分牌|筹码)/i,
  /(?:积分|筹码|计分牌)\s*(?:换取|换成)\s*(?:现金|奖品|实物|有价券)/i
];

export function checkCompliance(html) {
  assert.equal(typeof html, 'string', 'Generated HTML must be text');
  assert.ok(html.includes(REQUIRED_NOTICE), 'Mandatory entertainment-points restriction missing');
  for (const pattern of FORBIDDEN_PROMOTIONS) {
    assert.doesNotMatch(html, pattern, `Prohibited points/prize promotion: ${pattern}`);
  }
  return { noticePresent: true, promotionPatternsChecked: FORBIDDEN_PROMOTIONS.length };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const html = readFileSync(process.argv[2] || 'dist/index.html', 'utf8');
  console.log(JSON.stringify({ result: 'pass', ...checkCompliance(html) }));
}
