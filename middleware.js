import { NextResponse } from "next/server";

const publicOnly = process.env.PUBLIC_ONLY_DEPLOY === "1";

export function middleware(request) {
  if (!publicOnly) return NextResponse.next();

  const { pathname } = request.nextUrl;
  if (pathname.startsWith("/api/")) {
    return NextResponse.json(
      { ok: false, message: "公开展示模式已关闭后台接口" },
      { status: 404 }
    );
  }

  return new NextResponse("后台仅限本地电脑使用", {
    status: 404,
    headers: { "Content-Type": "text/plain; charset=utf-8" }
  });
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/api/admin/:path*",
    "/api/wechat-official/reservations/notify"
  ]
};
