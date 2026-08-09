const DIRECTIVES = {
  base: [
    "default-src 'self'",
    "font-src 'self' data: https://fonts.gstatic.com",
    "img-src 'self' data:",
    "object-src 'none'",
    "base-uri 'none'",
    "frame-src 'none'",
    "form-action 'none'",
  ],
  development: [
    "script-src 'self' 'unsafe-inline'",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "connect-src 'self' ws: http://localhost:*",
  ],
  production: [
    "script-src 'self'",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "connect-src 'none'",
  ],
} as const;

export function buildContentSecurityPolicy(isDevelopment: boolean): string {
  const environmentDirectives = isDevelopment ? DIRECTIVES.development : DIRECTIVES.production;
  return [...DIRECTIVES.base, ...environmentDirectives].join('; ');
}
