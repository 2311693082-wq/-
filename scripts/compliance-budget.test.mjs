import test from 'node:test';
import assert from 'node:assert/strict';
import { checkCompliance, extractVisibleLines, REQUIRED_NOTICE } from './compliance-budget.mjs';

const html = (body) => `<html><head><style>.notice{display:block}</style></head><body><p>${REQUIRED_NOTICE}</p>${body}</body></html>`;

test('allows a neutral bar event and the mandatory visible notice', () => {
  assert.deepEqual(checkCompliance(html('<p>周末社交活动</p>')), {
    noticePresent: true, promotionPatternsChecked: 4
  });
});
test('fails closed if the entertainment-points notice is missing', () => {
  assert.throws(() => checkCompliance('<html>周末社交活动</html>'), /restriction missing/);
});
test('rejects points purchase, transfer, redemption and cash prizes', () => {
  for (const promotion of ['积分购买', '筹码充值', '积分可兑换实物', '现金奖励', '实物奖励', '积分换取现金', '充值计分牌', '积分换酒水']) {
    assert.throws(() => checkCompliance(html(`<p>${promotion}</p>`)), /Prohibited points\/prize promotion/, promotion);
  }
});
test('notice hidden in an HTML comment or style is not sufficient', () => {
  assert.throws(() => checkCompliance(`<!--${REQUIRED_NOTICE}--><p>周末聚会</p>`), /restriction missing/);
  assert.throws(() => checkCompliance(`<style>${REQUIRED_NOTICE}</style><p>周末聚会</p>`), /restriction missing/);
});
test('tag splits, numeric entities and invisible characters cannot hide a promotion', () => {
  for (const promotion of [
    '积分可<span>兑换</span>现金',
    '积&#x5206;可&#x5151;换现金',
    '积&amp;#20998;可兑换现金',
    '积\u200B分可兑换现金',
    '积 分 可 兑 换 现 金',
    '积分换餐食'
  ]) assert.throws(() => checkCompliance(html(`<p>${promotion}</p>`)), /Prohibited points\/prize promotion/, promotion);
});
test('extracts only visible text and decodes escaped Chinese text', () => {
  assert.deepEqual(extractVisibleLines('<p>积&#20998;<span>可</span>兑&#25442;现金</p>'), ['积分可兑换现金']);
});
