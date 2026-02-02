import { NextResponse } from "next/server";

export const config = {
  matcher: "/integrations/:path*",
};

export function middleware(request) {
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-createxyz-project-id", "4eeee769-d163-4188-b2c2-fc671c54a3cd");
  requestHeaders.set("x-createxyz-project-group-id", "bcc83eec-2405-40db-b0ed-30164b88ad31");


  request.nextUrl.href = `https://www.anything.com/${request.nextUrl.pathname}`;

  return NextResponse.rewrite(request.nextUrl, {
    request: {
      headers: requestHeaders,
    },
  });
}