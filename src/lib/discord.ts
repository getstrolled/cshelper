export async function notifyActivity(text: string): Promise<void> {
  const url = process.env.DISCORD_WEBHOOK_URL;
  if (!url) return;
  try {
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: text.slice(0, 1900) }),
    });
  } catch {
    /* ignore */
  }
}

export async function notifyBackupDiscord(
  filename: string,
  bytes: Buffer,
): Promise<{ ok: boolean; note?: string }> {
  const url = process.env.DISCORD_BACKUP_WEBHOOK_URL;
  if (!url) return { ok: false, note: "no backup webhook set" };

  const form = new FormData();
  form.append(
    "payload_json",
    JSON.stringify({
      content: `db backup — ${filename} (${bytes.length} bytes)`,
    }),
  );
  form.append(
    "files[0]",
    new Blob([new Uint8Array(bytes)]),
    filename,
  );

  try {
    const res = await fetch(url, { method: "POST", body: form });
    if (!res.ok) {
      const t = await res.text();
      return { ok: false, note: `discord said ${res.status}: ${t.slice(0, 200)}` };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, note: e instanceof Error ? e.message : "fetch failed" };
  }
}
