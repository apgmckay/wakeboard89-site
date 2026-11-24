// Shared bits for the Wakeboard 1989 score API (Cloudflare Pages Functions + D1).

// every board the game keeps: each lake, Mangrove+, and each one's Dark Side
const LAKES = {sandbar: 800, home: 1200, kelp: 1100, deep: 1500, squall: 1400, typhoon: 1500, mangrove: 1300, mangroveplus: 2700};
export function lakeLen(id){
  const base = String(id || '').replace(/-dark$/, '');
  return Object.prototype.hasOwnProperty.call(LAKES, base) ? LAKES[base] : 0;
}

// three letters or digits, nothing rude
const BLOCK = new Set(['ASS', 'FUK', 'FUC', 'FCK', 'CUM', 'COK', 'CNT', 'KUN', 'DIK', 'DIC', 'FAG', 'JIZ', 'KKK', 'NIG', 'NGR', 'PIS', 'SEX', 'SHT', 'SHI', 'TIT', 'TWT', 'VAG', 'WTF', 'XXX', 'NAZ', 'FKU', 'WNK', 'PUS', 'PNS', 'COC', 'KYS', 'RAP']);
export function cleanInitials(v){
  const s = String(v || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 3);
  if (s.length !== 3 || BLOCK.has(s)) return null;
  return s;
}

// who may call the API: the site itself, the Android app, and local testing
const ORIGINS = ['https://wakeboard89.pixelmullet.co.uk', 'https://pixelmullet.co.uk', 'https://www.pixelmullet.co.uk', 'https://localhost', 'capacitor://localhost', 'http://localhost'];
export function cors(request){
  const o = request.headers.get('Origin') || '';
  const ok = ORIGINS.includes(o) || /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(o) || /^https:\/\/[a-z0-9-]+\.wakeboard89\.pages\.dev$/.test(o);
  return {
    'Access-Control-Allow-Origin': ok ? o : ORIGINS[0],
    'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400',
    'Vary': 'Origin'
  };
}
export function json(request, body, status = 200, extra = {}){
  return new Response(JSON.stringify(body), {status, headers: {'Content-Type': 'application/json', ...cors(request), ...extra}});
}

// a salted, one-way hash of the caller's address, for rate limiting only (the salt changes daily)
export async function callerKey(request, env){
  const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
  const day = new Date().toISOString().slice(0, 10);
  const data = new TextEncoder().encode((env.RATE_SALT || 'wb89') + '|' + day + '|' + ip);
  const h = await crypto.subtle.digest('SHA-256', data);
  return [...new Uint8Array(h)].slice(0, 12).map(b => b.toString(16).padStart(2, '0')).join('');
}
