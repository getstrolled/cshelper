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
