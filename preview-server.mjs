import http from "node:http";
import { mkdir, writeFile } from "node:fs/promises";
import { benefits, creatorOffers, introStats, plays, site } from "./data/siteContent.js";

const css = `
.skip-link{position:fixed;z-index:100;top:8px;left:12px;transform:translateY(-160%);background:#f8e4b0;color:#08070a;padding:10px 16px;border-radius:8px;font-weight:800}.skip-link:focus{transform:none}a:focus-visible{outline:3px solid #f8e4b0;outline-offset:4px}*{box-sizing:border-box}html{scroll-behavior:smooth}body{margin:0;background:radial-gradient(circle at 22% 6%,rgba(214,170,84,.18),transparent 32rem),radial-gradient(circle at 78% 18%,rgba(181,69,47,.18),transparent 28rem),linear-gradient(180deg,#08070a 0%,#120c12 38%,#08070a 100%);color:#fbf4e3;font-family:Inter,"PingFang SC","Hiragino Sans GB","Microsoft YaHei",sans-serif}body:before{position:fixed;inset:0;z-index:-2;pointer-events:none;content:"";background-image:linear-gradient(rgba(255,255,255,.035) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.035) 1px,transparent 1px);background-size:44px 44px;mask-image:linear-gradient(to bottom,rgba(0,0,0,.7),transparent 72%)}a{color:inherit;text-decoration:none}.container{width:100%;max-width:1180px;margin:0 auto;padding:0 20px}.nav{position:fixed;inset:0 0 auto;z-index:50;height:64px;border-bottom:1px solid rgba(255,255,255,.08);background:rgba(8,7,10,.72);backdrop-filter:blur(22px)}.nav .container{height:64px;display:flex;align-items:center;justify-content:space-between}.brand{display:flex;align-items:center;gap:12px;font-weight:900;letter-spacing:.24em}.spade{display:inline-flex;align-items:center;justify-content:center;aspect-ratio:1;width:38px;border-radius:999px;border:1px solid rgba(214,170,84,.42);background:rgba(214,170,84,.1);color:#d6aa54;box-shadow:0 0 60px rgba(214,170,84,.24);font-family:Georgia,serif}.links{display:flex;gap:28px;color:rgba(255,255,255,.66);font-size:14px;font-weight:700}.hero{position:relative;min-height:100vh;overflow:hidden;padding-top:64px}.hero-bg{position:absolute;inset:0;z-index:-2;background-size:cover;background-position:center}.hero:after{position:absolute;inset:0;z-index:-1;content:"";background:radial-gradient(circle at 52% 34%,rgba(214,170,84,.22),transparent 24rem),linear-gradient(90deg,rgba(8,7,10,.94),rgba(8,7,10,.72) 48%,rgba(8,7,10,.48))}.hero-grid{min-height:calc(100vh - 64px);display:grid;grid-template-columns:1.08fr .92fr;gap:44px;align-items:center;padding-block:56px}.pill{display:inline-flex;align-items:center;gap:12px;border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.08);border-radius:999px;padding:9px 16px;color:#f8e4b0;font-size:12px;font-weight:800}.dot{width:8px;height:8px;border-radius:50%;background:#d6aa54;box-shadow:0 0 20px rgba(214,170,84,.9)}h1{font-family:Georgia,"Times New Roman",serif;font-size:clamp(64px,9vw,116px);line-height:.92;margin:28px 0 0;color:#fff;letter-spacing:0}.gold{background:linear-gradient(90deg,#f8e4b0,#d6aa54,#9e7030);-webkit-background-clip:text;background-clip:text;color:transparent}.slogan{font-size:clamp(26px,4vw,44px);font-weight:900;margin:18px 0}.lead{max-width:680px;color:rgba(255,255,255,.72);font-size:18px;line-height:1.9}.actions{display:flex;gap:12px;flex-wrap:wrap;margin-top:34px}.btn{display:inline-flex;align-items:center;justify-content:center;border-radius:999px;padding:14px 25px;font-weight:900;font-size:14px;transition:.25s}.btn.primary{border:1px solid rgba(214,170,84,.6);background:#d6aa54;color:#08070a;box-shadow:0 0 60px rgba(214,170,84,.24)}.btn.ghost{border:1px solid rgba(255,255,255,.15);background:rgba(255,255,255,.05);color:#f8e4b0}.btn:hover,.card:hover{transform:translateY(-5px)}.hero-card{position:relative;max-width:520px;width:100%;margin:auto;border:1px solid rgba(255,255,255,.1);background:rgba(255,255,255,.055);box-shadow:0 24px 80px rgba(0,0,0,.45);backdrop-filter:blur(22px);border-radius:32px;padding:20px}.hero-card-inner{position:relative;aspect-ratio:4/5;overflow:hidden;border-radius:24px}.hero-card img,.play-card img,.creator-img img{width:100%;height:100%;object-fit:cover}.hero-card-inner:after{position:absolute;inset:0;content:"";background:linear-gradient(to top,#08070a,transparent 70%)}.hero-caption{position:absolute;left:20px;right:20px;bottom:20px;z-index:2}.hero-caption small,.eyebrow{color:rgba(214,170,84,.84);font-size:12px;font-weight:900;text-transform:uppercase;letter-spacing:.32em}.section{padding:86px 0}.intro{display:grid;grid-template-columns:.85fr 1.15fr;gap:36px;align-items:end}.title{font-size:clamp(34px,5vw,56px);line-height:1.12;margin:16px 0 0;color:#fff;font-weight:950}.desc{color:rgba(255,255,255,.62);line-height:2;font-size:17px}.stats{display:grid;grid-template-columns:repeat(3,1fr);gap:14px}.glass,.card{border:1px solid rgba(255,255,255,.1);background:rgba(255,255,255,.055);box-shadow:0 24px 80px rgba(0,0,0,.45);backdrop-filter:blur(22px);border-radius:22px}.stat{padding:24px;text-align:center}.stat strong{font-size:38px}.center{text-align:center;max-width:780px;margin:0 auto}.play-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin-top:42px}.play-card{position:relative;overflow:hidden;min-height:390px;transition:.35s}.play-card .image{height:250px;overflow:hidden}.play-card:after{position:absolute;inset:0;content:"";background:linear-gradient(to top,#08070a,rgba(8,7,10,.45),transparent)}.play-content{position:relative;z-index:2;margin-top:-92px;padding:24px}.play-content h3,.benefit h3{font-size:26px;margin:14px 0;color:#fff}.play-content p,.benefit p,.creator li{color:rgba(255,255,255,.66);line-height:1.9}.creator{display:grid;grid-template-columns:.95fr 1.05fr;gap:42px;align-items:center}.creator-img{min-height:360px;overflow:hidden;border-radius:32px;border:1px solid rgba(255,255,255,.1);box-shadow:0 24px 80px rgba(0,0,0,.45)}.creator ul{list-style:none;padding:0;margin:28px 0;display:grid;gap:12px}.creator li{border:1px solid rgba(255,255,255,.1);background:rgba(255,255,255,.045);border-radius:18px;padding:16px}.benefit-grid,.contact-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin-top:42px}.benefit{position:relative;min-height:260px;padding:26px;overflow:hidden;transition:.35s}.benefit:after{position:absolute;right:18px;top:6px;content:"♠";font-family:Georgia,serif;font-size:110px;color:rgba(255,255,255,.035)}.contact{border-block:1px solid rgba(214,170,84,.12);background:linear-gradient(135deg,rgba(214,170,84,.14),rgba(255,255,255,.035) 36%,rgba(85,31,47,.2));padding-bottom:112px}.contact-item{padding:22px}.dock{display:none}@media (max-width:900px){.links,.nav .btn{display:none}.hero-grid,.intro,.creator{grid-template-columns:1fr}.hero-grid{padding-block:38px}.hero-bg{display:none}.hero-card{max-width:440px}.play-grid,.benefit-grid,.contact-grid{grid-template-columns:1fr}.section{padding:64px 0}.stats{gap:10px}.stat{padding:18px 8px}.stat strong{font-size:28px}.dock{display:grid;position:fixed;z-index:80;left:0;right:0;bottom:0;grid-template-columns:1fr auto;gap:10px;padding:12px;background:rgba(8,7,10,.82);border-top:1px solid rgba(255,255,255,.1);backdrop-filter:blur(22px)}}@supports (content-visibility:auto){.section{content-visibility:auto;contain-intrinsic-size:auto 700px}}@media (max-width:900px){body:before{display:none}.glass,.card,.hero-card,.nav,.dock{backdrop-filter:none}.nav,.dock{background:rgba(8,7,10,.96)}}@media (prefers-reduced-motion:reduce){html{scroll-behavior:auto}.btn,.card{transition:none}.btn:hover,.card:hover{transform:none}}`;

const playCards = plays
  .map(
    (play, index) => `
      <article class="card play-card">
        <div class="image"><img src="${play.image}" srcset="${play.image.replace("w=640&q=72", "w=360&q=64")} 360w, ${play.image} 640w" alt="${play.title}" width="640" height="440" loading="lazy" decoding="async" sizes="(max-width: 900px) calc(100vw - 40px), (max-width: 1180px) calc(33.333vw - 24px), 370px"></div>
        <div class="play-content">
          <div class="eyebrow">${play.kicker} · 0${index + 1}</div>
          <h3>${play.title}</h3>
          <p>${play.description}</p>
        </div>
      </article>`
  )
  .join("");

const html = `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>黑桃党 | 无锡酒馆扑克麻将聚会空间</title>
  <meta name="description" content="黑桃党是无锡面向年轻人的黑金酒馆、专业赛事扑克、酒局麻将、萌宠陪玩和探店合作聚会空间。">
  <link rel="preconnect" href="https://images.unsplash.com">
  <link rel="preload" as="image" href="${site.heroImage}" imagesrcset="${site.heroMobileImage} 640w, ${site.heroImage} 1200w" imagesizes="(max-width: 900px) calc(100vw - 40px), 520px" media="(min-width: 901px)" fetchpriority="high">
  <link rel="preload" as="image" imagesrcset="${site.heroMobileImage} 640w, ${site.heroImage} 1200w" imagesizes="(max-width: 900px) calc(100vw - 40px), 520px" media="(max-width: 900px)" fetchpriority="high">
  <style>${css}</style>
</head>
<body>
  <a class="skip-link" href="#main">跳转到主要内容</a>
  <header class="nav">
    <div class="container">
      <a class="brand" href="#top"><span class="spade">♠</span><span>${site.brand}</span></a>
      <div class="links"><a href="#play">玩法</a><a href="#creator">探店</a><a href="#benefits">须知</a><a href="#contact">联系</a></div>
      <a class="btn primary" href="#contact">${site.bookingText}</a>
    </div>
  </header>
  <main id="main">
  <section id="top" class="hero">
    <div class="hero-bg" style="background-image:url('${site.heroMobileImage}');background-image:image-set(url('${site.heroMobileImage}') 1x,url('${site.heroImage}') 2x)"></div>
    <div class="container hero-grid">
      <div>
        <div class="pill"><span class="dot"></span>${site.city} · Cocktail / Poker / Mahjong</div>
        <h1>${site.brand}</h1>
        <div class="slogan gold">${site.slogan}</div>
        <p class="lead">${site.heroLead}</p>
        <div class="actions"><a class="btn primary" href="#contact">${site.bookingText}</a><a class="btn ghost" href="#play">看看今晚玩法</a></div>
      </div>
      <div class="hero-card">
        <div class="hero-card-inner">
          <img src="${site.heroImage}" srcset="${site.heroMobileImage} 640w, ${site.heroImage} 1200w" sizes="(max-width: 900px) calc(100vw - 40px), 520px" alt="黑金酒吧空间氛围" width="900" height="1125" fetchpriority="high" decoding="async">
          <div class="hero-caption"><small>Members Night</small><h2>酒局开始前，先入座。 <span class="spade">♠</span></h2></div>
        </div>
      </div>
    </div>
  </section>
  <section class="section">
    <div class="container intro">
      <div><div class="eyebrow">About</div><h2 class="title">不是普通酒馆，是把夜生活做成一场局。</h2><p class="desc">黑桃党面向无锡年轻人，把吧台、牌桌、麻将、萌宠陪伴和社交聚会放进同一个黑金空间。这里适合微醺开局，也适合朋友约局、达人探店、生日小聚和深夜续摊。</p></div>
      <div class="stats">${introStats.map((stat) => `<div class="glass stat"><strong class="gold">${stat.value}</strong><p>${stat.label}</p></div>`).join("")}</div>
    </div>
  </section>
  <section id="play" class="section">
    <div class="container">
      <div class="center"><div class="eyebrow">Play</div><h2 class="title">一晚上，可以有五种打开方式。</h2><p class="desc">从第一杯鸡尾酒到一桌牌局，从麻将声到萌宠陪伴，黑桃党把社交气氛做得更轻松、更好拍，也更容易把朋友聚起来。</p></div>
      <div class="play-grid">${playCards}</div>
    </div>
  </section>
  <section id="creator" class="section">
    <div class="container creator">
      <div class="creator-img"><img src="${site.creatorImage}" srcset="${site.creatorMobileImage} 480w, ${site.creatorMediumImage} 640w, ${site.creatorImage} 960w" sizes="(max-width: 900px) calc(100vw - 40px), (max-width: 1180px) calc(47.5vw - 38.95px), 522px" alt="年轻人聚会举杯场景" width="960" height="720" loading="lazy" decoding="async"></div>
      <div><div class="eyebrow">Collab</div><h2 class="title">小红书 / 大众点评达人，欢迎来探店。</h2><p class="desc">我们提供更有镜头感的黑金灯光、吧台场景、牌桌氛围和聚会内容，适合城市夜生活、酒馆、棋牌、宠物友好和年轻社交方向内容。</p><ul>${creatorOffers.map((offer) => `<li>${offer}</li>`).join("")}</ul><a class="btn primary" href="#contact">预约探店合作</a></div>
    </div>
  </section>
  <section id="benefits" class="section">
    <div class="container">
      <div class="center"><div class="eyebrow">Guest Info</div><h2 class="title">到店之前，先了解服务与活动规则。</h2><p class="desc">以下为到店服务与娱乐活动说明，具体项目和规则以门店当日公告为准。</p></div>
      <div class="benefit-grid">${benefits.map((benefit, index) => `<article class="glass benefit"><div class="eyebrow">Card 0${index + 1}</div><h3>${benefit.title}</h3><p>${benefit.text}</p></article>`).join("")}</div>
    </div>
  </section>
  <section id="contact" class="section contact">
    <div class="container">
      <div><div class="eyebrow">Contact</div><h2 class="title">今晚约在黑桃党。</h2><p class="desc">适合朋友小聚与休闲交流。到店前请先确认地址、营业时间及预约方式，以门店官方信息为准。</p></div>
      <div class="contact-grid"><div class="glass contact-item"><div class="eyebrow">地址</div><p>${site.contact.address}</p></div><div class="glass contact-item"><div class="eyebrow">营业时间</div><p>${site.contact.hours}</p></div><div class="glass contact-item"><div class="eyebrow">预约方式</div><p>${site.contact.booking}</p></div></div>
      <div class="actions"><a class="btn ghost" href="#top">回到顶部</a></div>
    </div>
  </section>
  </main>
  <div class="dock"><a class="btn ghost" href="#play">看玩法</a><a class="btn primary" href="#contact">预约</a></div>
</body>
</html>`;

const port = Number(process.env.PORT || 3000);

if (process.argv.includes("--write")) {
  await mkdir("dist", { recursive: true });
  await Promise.all([
    writeFile("preview.html", html, "utf8"),
    writeFile("dist/index.html", html, "utf8")
  ]);
  console.log("已生成 preview.html 和 dist/index.html，可用于静态部署。");
  process.exit(0);
}

const server = http.createServer((request, response) => {
  const method = request.method || "GET";
  const headers = {
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff"
  };
  if (method !== "GET" && method !== "HEAD") {
    response.writeHead(405, { ...headers, Allow: "GET, HEAD" });
    response.end();
    return;
  }
  const path = (request.url || "/").split("?")[0];
  if (path === "/favicon.ico") {
    response.writeHead(204, headers);
    response.end();
    return;
  }
  if (path !== "/" && path !== "/index.html") {
    response.writeHead(404, { ...headers, "Content-Type": "text/plain; charset=utf-8" });
    response.end(method === "HEAD" ? undefined : "Not Found");
    return;
  }
  response.writeHead(200, {
    ...headers,
    "Content-Type": "text/html; charset=utf-8",
    "Content-Length": Buffer.byteLength(html)
  });
  response.end(method === "HEAD" ? undefined : html);
});

server.listen(port, process.env.HOST || "127.0.0.1", () => {
  console.log(`黑桃党预览已启动：http://localhost:${port}`);
});
