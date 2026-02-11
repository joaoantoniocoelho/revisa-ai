const JWT_EXPIRE = process.env.JWT_EXPIRE!;

export const AUTH_COOKIE_NAME = 'token';

function getCookieMaxAgeMs(): number {
  const match = JWT_EXPIRE.match(/^(\d+)([smhd])$/);
  if (!match) return 60 * 60 * 1000;
  const n = parseInt(match[1], 10);
  const unit = match[2];
  const multipliers: Record<string, number> = {
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
  };
  return n * (multipliers[unit] ?? 60 * 60 * 1000);
}

export function getAuthCookieOptions() {
  const isProduction = process.env.NODE_ENV === 'production';
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax' as const,
    maxAge: getCookieMaxAgeMs(),
    path: '/',
  };
}
