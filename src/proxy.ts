import { NextResponse, type NextRequest } from 'next/server';
import { ACCESS } from './lib/access';

const DENIED_HTML = `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>Access denied</title></head>
<body style="font-family:Segoe UI,Arial,sans-serif;display:flex;min-height:100vh;align-items:center;justify-content:center;background:#f1f5f9;margin:0;padding:16px">
<div style="background:#fff;padding:28px;border-radius:12px;max-width:380px;text-align:center;box-shadow:0 1px 3px rgba(0,0,0,.1)">
<h2 style="margin:0 0 8px;color:#0f172a">Access denied</h2>
<p style="color:#475569;margin:0">Please open the full link that was shared with you.</p>
</div></body></html>`;

/**
 * /supervisor and /admin are opened with ?key=<secret> once; the key is then kept in a cookie
 * and stripped from the address bar. No key configured = open access (local testing).
 */
export function proxy(req: NextRequest) {
  const role = req.nextUrl.pathname.startsWith(ACCESS.admin.path) ? ACCESS.admin : ACCESS.supervisor;
  const expected = process.env[role.envKey];
  if (!expected) return NextResponse.next();

  const given = req.nextUrl.searchParams.get('key');
  if (given === expected) {
    const clean = req.nextUrl.clone();
    clean.searchParams.delete('key');
    const res = NextResponse.redirect(clean);
    res.cookies.set(role.cookie, expected, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 60 * 60 * 24 * 365,
    });
    return res;
  }

  if (req.cookies.get(role.cookie)?.value === expected) return NextResponse.next();

  return new NextResponse(DENIED_HTML, { status: 403, headers: { 'content-type': 'text/html; charset=utf-8' } });
}

export const config = {
  matcher: ['/supervisor/:path*', '/admin/:path*'],
};
