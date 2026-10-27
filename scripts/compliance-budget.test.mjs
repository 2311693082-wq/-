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


test('hidden, aria-hidden, inline-style and head notices do not satisfy disclosure', () => {
  for (const notice of [
    '<p hidden>' + REQUIRED_NOTICE + '</p>',
    '<div><section hidden><p>' + REQUIRED_NOTICE + '</p></section></div>',
    '<p aria-hidden="true">' + REQUIRED_NOTICE + '</p>',
    '<p style="display: none">' + REQUIRED_NOTICE + '</p>',
    "<p style='visibility:hidden'>" + REQUIRED_NOTICE + '</p>',
    '<p style="opacity:0">' + REQUIRED_NOTICE + '</p>',
    '<head><title>' + REQUIRED_NOTICE + '</title></head>',
    '<template>' + REQUIRED_NOTICE + '</template>'
  ]) assert.throws(() => checkCompliance('<html><body>' + notice + '<p>周末聚会</p></body></html>'), /restriction missing/, notice);
});

test('hidden prohibited promotions remain blocked, including obfuscated characters', () => {
  for (const promotion of [
    '<p hidden>积分可兑换现金</p>',
    '<p aria-hidden="true">积\u00ad分可兑换现金</p>',
    '<p style="display:none">积分可兑\u2063换现金</p>',
    '<p>积&shy;分可兑换现金</p>'
  ]) assert.throws(() => checkCompliance(html(promotion)), /Prohibited points\/prize promotion/, promotion);
});

test('data-hidden does not hide visible notice; nested inline markup stays readable', () => {
  assert.equal(checkCompliance('<p data-hidden="true">活动记分不可购买、<span>出售、转让、借用，也不可兑换现金、实物或有价券。</span></p>').noticePresent, true);
  assert.deepEqual(extractVisibleLines('<div><p hidden>隐藏</p><p>公开<span>活动</span></p></div>'), ['公开活动']);
});

test('newlines, HTML line breaks and encoded whitespace cannot split a prohibited phrase', () => {
  for (const promotion of [
    '积分可\n兑换现金',
    '积分可\r\n兑换现金',
    '积分可&#10;兑换现金',
    '积分可<br>兑换现金',
    '积分可<span>\n</span>兑换现金',
    '积分可&#x9;兑换现金'
  ]) assert.throws(() => checkCompliance(html(`<p>${promotion}</p>`)), /Prohibited points\/prize promotion/, promotion);
  assert.deepEqual(extractVisibleLines('<p>积分可\n兑换现金</p><p>普通活动</p>'), ['积分可兑换现金', '普通活动']);
});


test('rejects prohibited promotions in accessible attributes and social previews', () => {
  for (const markup of [
    '<img alt="积分可兑&#x6362;现金" src="/example.png">',
    '<a aria-label="现金&#x5956;励" href="#">查看</a>',
    '<div title="积分可\u200b转让">活动</div>',
    '<input placeholder="筹码充值">',
    '<meta name="description" content="积分可兑换现金">',
    '<meta property="og:description" content="积分可兑换现金">',
    '<meta name="twitter:title" content="实物奖励">'
  ]) assert.throws(() => checkCompliance(html(markup)), /Prohibited points\/prize promotion/, markup);
});

test('metadata and accessibility attributes cannot satisfy visible disclosure', () => {
  for (const markup of [
    `<img alt="${REQUIRED_NOTICE}">`,
    `<meta name="description" content="${REQUIRED_NOTICE}">`,
    `<a aria-label="${REQUIRED_NOTICE}">预约</a>`
  ]) assert.throws(() => checkCompliance(`<html><head>${markup}</head><body>活动</body></html>`), /restriction missing/);
});

test('neutral metadata and accessible names remain allowed', () => {
  assert.equal(checkCompliance(html('<meta name="description" content="无锡夜生活与朋友聚会"><img alt="酒馆环境">')).noticePresent, true);
});


test('document title cannot advertise points exchange or serve as visible disclosure', () => {
  const doc = title => '<html><head><title>' + title + '</title></head><body><p>' + REQUIRED_NOTICE + '</p>酒馆活动</body></html>';
  for (const title of ['积分可以兑换现金', '积&#x5206;能够换实物', '计分牌可用于兑换酒水']) {
    assert.throws(() => checkCompliance(doc(title)), /Prohibited points\/prize promotion/, title);
  }
  assert.equal(checkCompliance(doc('黑桃酒馆社交聚会')).noticePresent, true);
  assert.throws(() => checkCompliance('<html><head><title>' + REQUIRED_NOTICE + '</title></head><body>酒馆活动</body></html>'), /restriction missing/);
});

test('natural-language points trading claims are blocked while restrictions remain allowed', () => {
  for (const phrase of ['积分可以兑换现金', '筹码能够换酒水', '计分牌可用于兑换实物', '积分允许转让']) {
    assert.throws(() => checkCompliance(html('<p>' + phrase + '</p>')), /Prohibited points\/prize promotion/, phrase);
  }
  assert.equal(checkCompliance(html('<p>活动记分不可兑换现金，也不可转让。</p>')).noticePresent, true);
});


test('HTML character references and named whitespace normalize visible disclosure', () => {
  for (const markup of [
    REQUIRED_NOTICE.replace('记', '&#x8bb0'),
    REQUIRED_NOTICE.replace('记', '&#35760'),
    REQUIRED_NOTICE.replace('记', '记&Tab;'),
    REQUIRED_NOTICE.replace('记', '记&NewLine;')
  ]) assert.equal(checkCompliance(`<html><body><p>${markup}</p></body></html>`).noticePresent, true);
});

test('inert and fully transparent notices cannot satisfy visible disclosure', () => {
  for (const markup of [
    `<section inert><p>${REQUIRED_NOTICE}</p></section>`,
    `<p style="opacity:0.0">${REQUIRED_NOTICE}</p>`,
    `<p style="opacity: 0.00 !important">${REQUIRED_NOTICE}</p>`
  ]) assert.throws(() => checkCompliance(`<html><body>${markup}<p>普通活动</p></body></html>`), /restriction missing/, markup);
});
