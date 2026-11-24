// /api/v1/scores
//   GET  ?lake=home[&limit=10][&score=12345]  -> { lake, top: [{id, initials, score, tapes, created}], rank? }
//   POST {lake, initials, score, tapes, falls, dur}  -> { ok, id, rank }
import {lakeLen, cleanInitials, cors, json, callerKey} from '../../../lib/scores.js';

export async function onRequestOptions({request}){
  return new Response(null, {status: 204, headers: cors(request)});
}

export async function onRequestGet({request, env}){
  const url = new URL(request.url);
  const lake = url.searchParams.get('lake') || '';
  if (!lakeLen(lake)) return json(request, {error: 'unknown lake'}, 400);
  const limit = Math.max(1, Math.min(50, parseInt(url.searchParams.get('limit') || '10', 10) || 10));
  const {results} = await env.DB.prepare(
    'SELECT id, initials, score, tapes, created FROM scores WHERE lake = ? AND hidden = 0 ORDER BY score DESC, created ASC LIMIT ?'
  ).bind(lake, limit).all();
  const out = {lake, top: results};
  const s = parseInt(url.searchParams.get('score') || '', 10);
  if (Number.isFinite(s)) {
    const r = await env.DB.prepare('SELECT COUNT(*) AS n FROM scores WHERE lake = ? AND hidden = 0 AND score > ?').bind(lake, s).first();
    out.rank = (r ? r.n : 0) + 1;
  }
  const total = await env.DB.prepare('SELECT COUNT(*) AS n FROM scores WHERE lake = ? AND hidden = 0').bind(lake).first();
  out.total = total ? total.n : 0;
  return json(request, out, 200, {'Cache-Control': 'public, max-age=15'});
}

export async function onRequestPost({request, env}){
  // the game sends JSON; a sendBeacon on page close arrives as text/plain, so parse either way
  let b;
  try { b = JSON.parse(await request.text()); } catch (e) { return json(request, {error: 'bad body'}, 400); }
  const lake = String(b.lake || ''), len = lakeLen(lake);
  if (!len) return json(request, {error: 'unknown lake'}, 400);
  const initials = cleanInitials(b.initials);
  if (!initials) return json(request, {error: 'initials'}, 400);
  const score = Number(b.score), tapes = Number(b.tapes || 0), falls = Number(b.falls || 0), dur = Number(b.dur || 0);
  // light checks: whole, sensible numbers, a run that took at least as long as the lake could be ridden, and a score
  // that isn't more than the game could hand out in that time
  if (!Number.isInteger(score) || score < 0 || score > 5000000) return json(request, {error: 'score'}, 400);
  if (!Number.isInteger(tapes) || tapes < 0 || tapes > 12) return json(request, {error: 'tapes'}, 400);
  if (!Number.isInteger(falls) || falls < 0 || falls > 500) return json(request, {error: 'falls'}, 400);
  if (!Number.isFinite(dur) || dur < len / 25 || dur > 3600) return json(request, {error: 'duration'}, 400);
  if (score > dur * 20000) return json(request, {error: 'score'}, 400);

  // rate limit: no more than 20 scores an hour from one place
  const key = await callerKey(request, env), now = Date.now();
  const hr = await env.DB.prepare('SELECT COUNT(*) AS n FROM hits WHERE k = ? AND ts > ?').bind(key, now - 3600000).first();
  if (hr && hr.n >= 20) return json(request, {error: 'slow down'}, 429);

  const res = await env.DB.prepare('INSERT INTO scores (lake, initials, score, tapes, falls, dur, created) VALUES (?, ?, ?, ?, ?, ?, ?)')
    .bind(lake, initials, score, tapes, falls, Math.round(dur * 10) / 10, now).run();
  await env.DB.batch([
    env.DB.prepare('INSERT INTO hits (k, ts) VALUES (?, ?)').bind(key, now),
    env.DB.prepare('DELETE FROM hits WHERE ts < ?').bind(now - 86400000)
  ]);
  const r = await env.DB.prepare('SELECT COUNT(*) AS n FROM scores WHERE lake = ? AND hidden = 0 AND score > ?').bind(lake, score).first();
  return json(request, {ok: true, id: res.meta.last_row_id, rank: (r ? r.n : 0) + 1});
}
