# 黑桃党 CHECK RAISE BAR 官网系统

黑桃党官网已经重构为「高级白底交互官网 + 比赛预约 + 积分排行榜 + 运营后台」的一体化 v1。

当前可运行能力：

- 官网首页读取统一数据源：`data/store.json`
- 官网展示：品牌故事、积分排行榜、德州扑克比赛预约、达人探店、地址导航
- 赛事记录：近期 5 场公开记录、奖励、冠亚季军领奖台图片位
- 前台交互：白底点阵、动态排版 Hero、磁吸光标、滚动转场、数字增长动画
- 后台管理：比赛场次、预约情况、会员积分加减、员工账号
- 会员数据：积分榜、全局积分流水、单个会员积分流水详情、比赛预约记录
- 青提后台适配层仍保留在代码中，但当前主流程先聚焦黑桃党自己的运营后台
- 微信原生小程序骨架：`miniprogram/`
- Prisma 正式数据库结构：`prisma/schema.prisma`

说明：本地 v1 先用 `data/store.json` 作为轻量数据库，方便马上演示；正式上线时按 `prisma/schema.prisma` 切换 PostgreSQL。

## 本地运行

最简单方式：双击项目里的 `start-site.command`。它会自动下载本项目专用的 Node.js/npm、安装依赖并打开浏览器。

也可以手动运行：

```bash
npm install
npm run dev
```

打开浏览器访问：

```text
http://localhost:3000
```

后台地址：

```text
http://localhost:3000/admin
```

演示账号：

```text
账号：admin
密码：heitaodang888
```

## 常用修改位置

- 运营数据、会员、积分、比赛、预约、探店线索：`data/store.json`
- 初始品牌文案备份：`data/siteContent.js`
- 页面结构：`app/page.js`
- 前台交互体验：`components/HomeExperience.jsx`
- 比赛预约表单：`components/TournamentBookingForm.jsx`
- 后台页面：`app/admin/page.js`
- 微信二维码素材：`public/contact/wechat-qr.jpg`
- 青提适配器：`lib/qingti.js`
- API 接口：`app/api/**/route.js`
- 微信小程序：`miniprogram/`
- 正式数据库模型：`prisma/schema.prisma`
- 全局视觉风格：`app/globals.css`
- Tailwind 主题色和动效：`tailwind.config.js`

## 小程序开发

1. 打开微信开发者工具。
2. 导入 `miniprogram/` 目录。
3. 在 `miniprogram/project.config.json` 替换真实小程序 AppID。
4. 开发阶段可关闭域名校验，接口默认请求 `http://localhost:3000`。
5. 真机和上线前需要把 `miniprogram/app.js` 里的 `apiBase` 改成 HTTPS 正式域名，并在微信公众平台配置 request 合法域名。

## 主要 API

- `GET /api/public/content`：官网和小程序首页内容
- `GET /api/public/leaderboard`：积分排行榜
- `GET /api/public/tournaments`：可预约比赛场次
- `POST /api/public/reservations`：官网预约
- `POST /api/creator-leads`：探店合作线索
- `POST /api/wechat/login`：小程序微信登录，未配置微信密钥时使用本地 mock openid
- `POST /api/member/login`：官网手机号会员登录，尝试绑定青提会员
- `GET /api/member/me`：会员资料
- `GET /api/member/wallet`：储值金、积分和资产变动记录
- `GET /api/member/coupons`：我的券和可领取券
- `POST /api/member/coupons/claim`：领券
- `GET /api/member/reservations`：我的预约
- `POST /api/member/reservations`：小程序预约
- `POST /api/admin/login`：后台登录
- `GET /api/admin/summary`：后台总览
- `PUT /api/admin/content`：保存官网 / 小程序内容
- `GET /api/admin/members`：会员列表
- `GET / PATCH /api/admin/reservations`：预约管理
- `GET / POST / PATCH /api/admin/tournaments`：比赛场次管理
- `GET / POST /api/admin/points`：积分流水 / 积分加减
- `GET / POST /api/admin/coupons`：优惠券列表 / 发券
- `POST /api/admin/coupons/redeem`：券码核销
- `GET / PATCH /api/admin/leads`：探店线索管理
- `POST /api/admin/stored-value`：储值金录入
- `POST /api/admin/sync/qingti`：手动同步青提会员数据
- `GET /api/admin/sync/logs`：青提连接配置和同步日志

## 青提后台嫁接

当前版本不会直接嵌入青提后台页面，而是在本项目里保留统一会员中心和后台同步页。先在 `.env` 里配置青提信息：

```bash
QINGTI_BASE_URL=https://i.qingtiwaimai.com
QINGTI_USERNAME=
QINGTI_PASSWORD=
QINGTI_STORE_ID=
QINGTI_API_TOKEN=
QINGTI_MEMBER_LOOKUP_PATH=
QINGTI_MEMBER_SYNC_PATH=
QINGTI_OUTBOUND_PATH=
```

只有后台账号、没有 API 文档时，先登录青提后台并检查浏览器网络请求；确认会员查询/列表接口后，把接口路径填到 `QINGTI_MEMBER_LOOKUP_PATH` 和 `QINGTI_MEMBER_SYNC_PATH`。未填接口前，后台「青提同步」页会记录待配置/待审计，不会覆盖本地数据。

## 免费前台展示 + 本地后台

如果暂时不买域名、不买服务器，推荐先采用这个方式：

1. 前台展示页部署到 Vercel 免费链接，例如 `https://你的项目.vercel.app`。
2. Vercel 部署环境变量设置 `PUBLIC_ONLY_DEPLOY=1`，线上会关闭 `/admin` 和后台接口。
3. 后台继续在你这台电脑本地使用：双击 `start-site.command`，再访问 `http://localhost:端口/admin`。
4. 所有可编辑数据仍存放在本机 `data/store.json`，请定期备份这个文件。
5. 后台修改积分、比赛或预约后，Vercel 前台不会自动读取你电脑里的新数据；需要重新发布一次，或后续升级成云数据库。
6. 公开展示页只承担品牌展示和引流，不作为实时会员后台。

Vercel 免费部署时，建议在项目设置里添加：

```bash
PUBLIC_ONLY_DEPLOY=1
```

本地后台使用时保持：

```bash
PUBLIC_ONLY_DEPLOY=0
```

## 正式长期上线准备

以后如果要让前台和后台都长期公网访问，并实时同步数据，建议再升级为：

1. 购买国内云服务器和域名，并按要求完成备案。
2. 服务器安装 Node.js 20+，上传项目代码，运行 `npm install` 和 `npm run build`。
3. 用 `npm run start` 或进程管理工具运行网站，并用 Nginx 反向代理到 HTTPS 域名。
4. 修改后台默认密码，不要使用演示账号。
5. 将 `data/store.json` 做定期备份；正式长期运营建议迁移到 PostgreSQL，并接入 `prisma/schema.prisma`。
6. 小程序正式发布必须使用 HTTPS API 域名，并在微信公众平台配置 request 合法域名。
7. 公众号内嵌网站时，直接使用正式 HTTPS 域名；当前不需要接公众号 OAuth。
