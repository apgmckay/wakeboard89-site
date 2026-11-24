WAKEBOARD 1989 on Cloudflare: the game + its global leaderboard
================================================================

This folder is one Cloudflare Pages project:
  public/                    the game (index.html + music) - what players load
  functions/api/v1/          the score API (runs on Cloudflare, not in the browser)
  lib/scores.js              shared bits for the API (allowed lakes, initials filter, CORS)
  schema.sql                 the database tables
  wrangler.toml              project settings

The game lives at   https://wakeboard89.pixelmullet.co.uk/
The scores API at   https://wakeboard89.pixelmullet.co.uk/api/v1/scores

You need Node.js installed (the same one you use for the Android build).
Run these in a terminal, from inside this folder.

ONE-OFF SET-UP
--------------
1. Log in to Cloudflare (opens your browser):
     npx wrangler login

2. Make the database:
     npx wrangler d1 create wakeboard89-scores
   It prints a block with a  database_id = "...."  line. Copy that id into
   wrangler.toml, replacing PASTE-THE-DATABASE-ID-HERE.

3. Create the tables in it:
     npx wrangler d1 execute wakeboard89-scores --remote --file=schema.sql

4. Make the Pages project:
     npx wrangler pages project create wakeboard89 --production-branch=main

5. Set two secrets (each one asks you to type a value; make them long and random,
   and keep the ADMIN_TOKEN somewhere safe - it's what lets you delete scores):
     npx wrangler pages secret put ADMIN_TOKEN --project-name wakeboard89
     npx wrangler pages secret put RATE_SALT --project-name wakeboard89

6. Put it live:
     npx wrangler pages deploy

7. In the Cloudflare dashboard: Workers & Pages -> wakeboard89 -> Custom domains
   -> Set up a custom domain -> wakeboard89.pixelmullet.co.uk
   (pixelmullet.co.uk is already on Cloudflare, so it sets the DNS for you.)

UPDATING THE GAME LATER
-----------------------
Drop the new index.html into public/ and run:
     npx wrangler pages deploy

ADDING MORE MUSIC (no new build of the game needed)
----------------------------------------------------
1. Put the new mp3 in public/music/   (keep names simple: lowercase, dashes, no spaces)
2. Add it to public/music/tracks.json, e.g.
     {
       "tracks": [
         {"file": "new-track.mp3", "title": "New Track", "artist": "Pangolin"}
       ]
     }
   ("artist" is optional - it says Pangolin if you leave it out.)
3. npx wrangler pages deploy
Every copy of the game (website and Android app) picks it up next time it's opened and deals it into
the shuffle. The three built-in tracks stay in the game itself, so it still has music with no signal.
Each file can be up to 25 MB.

LOOKING AFTER THE BOARD
-----------------------
See the latest scores:
     npx wrangler d1 execute wakeboard89-scores --remote --command "SELECT id, lake, initials, score, dur, datetime(created/1000,'unixepoch') FROM scores ORDER BY id DESC LIMIT 30"

Hide a cheat or a rude one (use its id from above):
     curl -X DELETE -H "Authorization: Bearer YOUR_ADMIN_TOKEN" https://wakeboard89.pixelmullet.co.uk/api/v1/scores/123

Bring one back:
     npx wrangler d1 execute wakeboard89-scores --remote --command "UPDATE scores SET hidden = 0 WHERE id = 123"

THE LIGHT CHECKS THE API MAKES
------------------------------
- the lake must be one the game has (each lake, its Dark Side, Mangrove+)
- initials: exactly 3 letters/digits, a short list of rude ones refused
- whole numbers only; tapes 0-12; score no more than 5,000,000
- the run must have taken at least as long as the lake can be ridden (length / 25 m/s),
  and the score can't be more than 20,000 a second of riding
- at most 20 scores an hour from one connection (counted with a daily-salted one-way
  hash of the address; the address itself is never stored)
