# cshelper

little cs2 helper for friends: map pages with callouts + a lineups section.

the seeded sqlite db already has **callouts** in a good state, and **mirage smokes** are wired up in there too. change whatever you want from `/edit` once you're logged in.

## local dev

1. copy `.env.example` to `.env.local` and fill it in (`SESSION_SECRET` must be 32+ chars or sessions break)
2. `npm install`
3. `npm run db:push`
4. `npm run seed` if you want the default maps bootstrapped
5. `npm run dev` → http://localhost:1337

`/edit` passwords come from env (`CSHELPER_HELPER_PASSWORD`, etc.). they're not the same across roles.

videos for lineups are mp4/webm/etc in `public/uploads/`, not an embed service.

## env

full list + placeholders: **`.env.example`**

### pm2 on the server

Put **`SESSION_SECRET`** (32+ chars) and passwords in **`.env.local`** or **`.env.production`** in the **project root** next to `package.json`. Next.js loads those files when `next start` runs from that directory.

After you change env vars:

```bash
pm2 restart cshelper --update-env
```

If `/edit` still complains about `SESSION_SECRET`, Node is not seeing the file (wrong cwd, file in the wrong folder, typo in name, or secret shorter than 32 characters after trimming spaces).

**check length on the server** (from project root; prints length only, not the value):

```bash
node <<'EOF'
const fs = require("fs");
for (const f of [".env.local", ".env.production"]) {
  try {
    const t = fs.readFileSync(f, "utf8");
    const m = t.match(/^SESSION_SECRET=(.*)$/m);
    if (!m) continue;
    let v = m[1].trim();
    if (v.length >= 2 && ((v[0] === '"' && v.endsWith('"')) || (v[0] === "'" && v.endsWith("'")))) {
      v = v.slice(1, -1).trim();
    }
    console.log(f + ": length=" + v.length);
    process.exit(0);
  } catch (_) {}
}
console.log("no SESSION_SECRET= line found");
process.exit(1);
EOF
```

Run **`pm2 restart cshelper --update-env`** as its **own** command after you save env files. Do not paste `pm2 ...` inside `node -e "..."` (that causes a SyntaxError).

### sqlite data looks empty on the server but works locally

The app opens **one file**: path from **`DATABASE_URL`** resolved against PM2 **`cwd`** (project root). If that file is empty or not your copy, maps/lineups look blank.

1. **Confirm what Node opens** — after deploy, check logs once:
   ```bash
   pm2 logs cshelper --lines 30
   ```
   You should see a line like `[cshelper] sqlite: /var/www/cshelper/data/cshelper.db`. That path must be where you uploaded your real `.db`.

2. **Confirm rows in that exact file** (same path as step 1):
   ```bash
   sqlite3 /var/www/cshelper/data/cshelper.db "SELECT COUNT(*) FROM maps;"
   sqlite3 /var/www/cshelper/data/cshelper.db "SELECT COUNT(*) FROM lineups;"
   ```
   If `no such table`, run **`npm run db:push`** once, or you copied a corrupt/old file. If counts are **0**, you’re looking at the wrong file or an empty copy.

3. **Replace DB safely**
   ```bash
   pm2 stop cshelper
   # copy your PC’s data/cshelper.db over this path (scp/rsync)
   chown root:root /var/www/cshelper/data/cshelper.db   # or your service user
   pm2 start cshelper
   ```

4. **`DATABASE_URL` vs cwd** — Using `file:./data/cshelper.db` means **`/var/www/cshelper/data/cshelper.db`**. Using `file:/var/www/cshelper/data/cshelper.db` is fine too; both must point at the file you actually copied.

5. **Media** — Lineup videos and **radar/callouts images** both use DB paths like `/uploads/....` (`videoPath`, `calloutsImagePath`). Copy your whole **`public/uploads/`** folder from PC to the server (`scp -r` or rsync). If the DB says `/uploads/foo.png` but that file isn’t on disk, the radar clip won’t show. Map hero thumbnails are **`public/maps/{slug}.png`** (usually in git); uploads usually are not unless you commit them.

#### snapshot / “import” (sqlite is already a single file)

There’s no separate database import step like Postgres. **Your whole DB is `data/cshelper.db`** — copying that file **is** the snapshot. “Import” on the server means: stop PM2, overwrite `data/cshelper.db`, optionally delete `*.db-wal` / `*.db-shm`, start PM2.

What **cannot** fit inside that file are the **actual video/image bytes**. The DB only stores **paths** (strings). So you always copy **`public/uploads/`** too, or radar/lineups break even with a perfect DB copy — unless you use **cloudflare r2** (below).

### cloudflare r2 (optional)

Use this when you want lineup clips and map images served from **Cloudflare R2** instead of copying **`public/uploads/`** onto the VPS. The SQLite DB **does not change**: it still stores paths like **`/uploads/uuid.mp4`** and **`/maps/dust2.png`**. The app prepends **`R2_PUBLIC_BASE_URL`** when rendering and uploads new files to the bucket when all R2 variables are set.

#### 1. Create the bucket (Cloudflare dashboard)

1. Log in → **R2 Object Storage** → **Create bucket**. Pick a name (e.g. `cshelper-media`). Location default is fine.
2. Note your **Account ID**: R2 overview sidebar shows **Account ID** (32-char hex). That value is **`R2_ACCOUNT_ID`**.

#### 2. API token for S3-compatible access

1. **R2** → **Overview** → **Manage R2 API Tokens** (or **Account API Tokens** with R2 scope).
2. Create a token with **Object Read & Write** on this bucket (or all buckets). Save **Access Key ID** and **Secret Access Key** — they map to **`R2_ACCESS_KEY_ID`** and **`R2_SECRET_ACCESS_KEY`**.
3. **`R2_BUCKET_NAME`** is exactly the bucket name you chose in step 1.

The app uses the S3 API against **`https://<R2_ACCOUNT_ID>.r2.cloudflarestorage.com`** (handled in code; you only need the env vars).

#### 3. Public URL so browsers can load images and videos

R2 buckets are private until you expose them:

- **R2** → your bucket → **Settings** → **Public access** → enable **R2.dev subdomain** (you get a URL like **`https://pub-xxxxxxxx.r2.dev`**), **or** attach a **custom domain** under the same bucket settings.

Set **`R2_PUBLIC_BASE_URL`** to that base URL **with no trailing slash**, e.g.:

```env
R2_PUBLIC_BASE_URL=https://pub-xxxxxxxx.r2.dev
```

Rebuild/restart is not strictly required for env-only changes, but after editing env on the server run **`pm2 restart cshelper --update-env`** so **`next.config`** picks up the hostname for **`next/image`** if you changed the public URL.

If **`R2_PUBLIC_BASE_URL`** is missing, the app keeps using relative paths (files must exist under **`public/`** on the server).

#### 4. Env vars (copy into `.env.local` or server `.env.production`)

| Variable | What it is |
|----------|------------|
| `R2_ACCOUNT_ID` | Cloudflare account ID from R2 overview |
| `R2_ACCESS_KEY_ID` | From the R2 API token |
| `R2_SECRET_ACCESS_KEY` | From the R2 API token |
| `R2_BUCKET_NAME` | Bucket name |
| `R2_PUBLIC_BASE_URL` | Public base URL (`https://pub-….r2.dev` or your custom domain), **no trailing slash** |

See **`.env.example`** for commented placeholders.

#### 5. Migrate files already on disk (one-time)

From the machine that has **`public/uploads/`** and **`public/maps/`** filled (usually your PC or the VPS before you delete copies):

1. Put the same **`R2_*`** values in **`.env`** or **`.env.local`** next to **`package.json`**.
2. Run:

```bash
npm run r2:migrate
```

That uploads **`public/uploads/**`** as keys **`uploads/...`** and **`public/maps/**`** as **`maps/...`**, matching the paths stored in the DB. **No SQL migration.**

3. Deploy env to production and **`pm2 restart cshelper --update-env`**.

New uploads from **`/edit`** go straight to R2 when all five variables (including **`R2_PUBLIC_BASE_URL`**) are set; otherwise uploads fall back to **`public/uploads/`** on disk.

#### 6. Quick checks

- Open a lineup page: video should load from **`R2_PUBLIC_BASE_URL`** + **`/uploads/...`** (check DevTools → Network).
- Map thumbnails and callouts images should load from the same base + **`/maps/...`**.
- If **`next/image`** blocks R2 URLs, confirm **`R2_PUBLIC_BASE_URL`** was set **before** **`npm run build`** on the server ( **`next.config.ts`** reads it at build time for **`remotePatterns`** ), or rebuild once after setting it.

**One archive with DB + uploads** (from project root on your PC):

```powershell
tar -czvf cshelper-state.tgz data/cshelper.db public/uploads
```

Copy `cshelper-state.tgz` to the VPS, then:

```bash
pm2 stop cshelper
cd /var/www/cshelper
tar -xzvf ~/cshelper-state.tgz
rm -f data/cshelper.db-wal data/cshelper.db-shm
pm2 start cshelper
```

Adjust paths if your app lives somewhere other than `/var/www/cshelper`.

## map thumbnails

files are `public/maps/{slug}.png`. they're based on [MurkyYT/cs2-map-icons](https://github.com/MurkyYT/cs2-map-icons). after you swap pngs:

```bash
npm run maps:images:apply
```

redownload on windows:

```powershell
pwsh -File scripts/download-map-images.ps1
```

## throwing it on a vps

### grab the repo on the server

**first time** (pick a folder, e.g. `/var/www` or your home dir):

```bash
git clone https://github.com/getstrolled/cshelper.git
cd cshelper
```

uses the same ssh/https setup you already use for other repos. if you use ssh remotes:

```bash
git clone git@github.com:getstrolled/cshelper.git
cd cshelper
```

**later, when you already cloned it** (ssh into vps, go to the project folder):

```bash
cd /path/to/cshelper
git pull origin master
```

then reinstall/build if `package-lock.json` changed:

```bash
npm ci
npm run build
# restart whatever runs `npm start` (systemd, pm2, etc.)
```

### run it

```bash
npm ci
npm run db:push
npm run seed   # if empty
npm run build
NODE_ENV=production npm start
```

put nginx (or caddy, whatever) in front and proxy to the node port. dont commit `.env.local`; copy env vars on the server (e.g. `.env.production` or systemd `Environment=`).

### nginx + Next.js (read this if `/maps` or client nav breaks)

This app is **not** a static SPA. Use **one** block like:

```nginx
location / {
    proxy_pass http://127.0.0.1:3001;
    ...
}
```

Use **`proxy_pass http://127.0.0.1:3001`** with **no trailing slash** after the port. If you use `http://127.0.0.1:3001/` (slash at the end), paths like `/maps` and `/_next/static/...` break and you only see the home page work.

Do **not** add `try_files ... /index.html` for this project.

optional: `POST /api/backup` with `Authorization: Bearer <secret>` if `BACKUP_CRON_SECRET` is set. dont spam it.
