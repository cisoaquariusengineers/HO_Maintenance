export function badRequest(error: string, status = 400): Response {
  return Response.json({ error }, { status });
}

export function str(value: unknown, max = 2000): string {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

export function appUrl(req: Request): string {
  return (process.env.APP_URL || new URL(req.url).origin).replace(/\/$/, '');
}

export function serverError(err: unknown): Response {
  console.error(err);
  return Response.json({ error: 'Something went wrong on the server. Please try again.' }, { status: 500 });
}
