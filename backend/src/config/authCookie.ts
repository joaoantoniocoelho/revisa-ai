const JWT_EXPIRE = process.env.JWT_EXPIRE ?? '1h';

export const AUTH_COOKIE_NAME = 'token';
type SameSite = 'lax' | 'strict' | 'none';

function getCookieSameSite(isProduction: boolean): SameSite {
  const raw = (process.env.AUTH_COOKIE_SAMESITE ?? '').trim().toLowerCase();
  if (raw === 'lax' || raw === 'strict' || raw === 'none') {
    // Browsers require SameSite=None cookies to also be Secure.
    if (!isProduction && raw === 'none') return 'lax';
    return raw;
  }
  // Default for prod is cross-site compatible (Vercel <-> Railway); dev stays lax.
  return isProduction ? 'none' : 'lax';
}

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
  const sameSite = getCookieSameSite(isProduction);
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite,
    maxAge: getCookieMaxAgeMs(),
    path: '/',
  };
}
