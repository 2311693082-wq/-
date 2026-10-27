import test from 'node:test';
import assert from 'node:assert/strict';
import { checkCompliance, REQUIRED_NOTICE } from './compliance-budget.mjs';

test('allows a neutral bar event and the mandatory notice', () => {
  assert.deepEqual(checkCompliance(`<html><p>周末社交活动</p><p>${REQUIRED_NOTICE}</p></html>`), {
    noticePresent: true, promotionPatternsChecked: 4
  });
});
test('fails closed if the entertainment-points notice is missing', () => {
  assert.throws(() => checkCompliance('<html>周末社交活动</html>'), /restriction missing/);
});
test('rejects marketing for points purchase, transfer, redemption and cash prizes', () => {
  for (const promotion of ['积分购买', '筹码充值', '积分可兑换实物', '现金奖励', '实物奖励', '积分换取现金', '充值计分牌']) {
    assert.throws(() => checkCompliance(`${REQUIRED_NOTICE}<p>${promotion}</p>`), /Prohibited points\/prize promotion/, promotion);
  }
});
