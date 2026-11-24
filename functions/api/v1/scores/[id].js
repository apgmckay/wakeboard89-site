// DELETE /api/v1/scores/:id   (Authorization: Bearer <ADMIN_TOKEN>)  -> hides a score from the boards
// POST   /api/v1/scores/:id/restore isn't needed: to bring one back, set hidden = 0 in the D1 console.
import {cors, json} from '../../../../lib/scores.js';

export async function onRequestOptions({request}){
  return new Response(null, {status: 204, headers: cors(request)});
}

export async function onRequestDelete({request, env, params}){
  const auth = request.headers.get('Authorization') || '';
  if (!env.ADMIN_TOKEN || auth !== 'Bearer ' + env.ADMIN_TOKEN) return json(request, {error: 'no'}, 401);
  const id = parseInt(params.id, 10);
  if (!Number.isInteger(id)) return json(request, {error: 'id'}, 400);
  await env.DB.prepare('UPDATE scores SET hidden = 1 WHERE id = ?').bind(id).run();
  return json(request, {ok: true, id});
}
