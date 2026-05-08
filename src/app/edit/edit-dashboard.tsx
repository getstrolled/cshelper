"use client";

import type { Role } from "@/lib/session";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

type MapRow = {
  id: number;
  slug: string;
  name: string;
  imagePath: string | null;
  calloutsImagePath: string | null;
  sortOrder: number;
};

type SubmissionRow = {
  id: number;
  status: string;
  kind: string;
  payload: string;
  createdAt: string;
};

type LineupRow = {
  id: number;
  mapId: number;
  grenadeType: string;
  title: string;
  description: string;
  videoPath: string;
};

export default function EditDashboard({
  initialLoggedIn,
  initialRole,
}: {
  initialLoggedIn: boolean;
  initialRole: Role | null;
}) {
  const router = useRouter();
  const [loggedIn, setLoggedIn] = useState(initialLoggedIn);
  const [role, setRole] = useState<Role | null>(initialRole);
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [maps, setMaps] = useState<MapRow[]>([]);
  const [pending, setPending] = useState<SubmissionRow[]>([]);
  const [lineups, setLineups] = useState<LineupRow[]>([]);

  const loadMaps = useCallback(async () => {
    const r = await fetch("/api/maps");
    if (!r.ok) return;
    const j = await r.json();
    setMaps(j.maps ?? []);
  }, []);

  const loadPending = useCallback(async () => {
    const r = await fetch("/api/submissions");
    if (r.status === 401) return;
    if (!r.ok) return;
    const j = await r.json();
    setPending(j.submissions ?? []);
  }, []);

  const loadLineups = useCallback(async () => {
    const r = await fetch("/api/lineups");
    if (!r.ok) return;
    const j = await r.json();
    setLineups(j.lineups ?? []);
  }, []);

  useEffect(() => {
    if (!loggedIn || !role) return;
    const t = window.setTimeout(() => {
      void loadMaps();
      if (role === "helper" || role === "admin") void loadPending();
      if (role === "trusted" || role === "admin") void loadLineups();
    }, 0);
    return () => window.clearTimeout(t);
  }, [loggedIn, role, loadMaps, loadPending, loadLineups]);

  async function login(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    const r = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) {
      setMsg(j.error ?? "login failed");
      return;
    }
    setPassword("");
    setLoggedIn(true);
    setRole(j.role ?? null);
    router.refresh();
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    setLoggedIn(false);
    setRole(null);
    router.refresh();
  }

  if (!loggedIn || !role) {
    return (
      <main className="mx-auto max-w-md rounded-xl border border-stone-700 bg-stone-900 p-6 shadow-sm">
        <h1 className="text-xl font-semibold text-stone-100">edit</h1>
        <p className="mt-2 text-sm text-stone-400">
          helper, trusted, and admin each have their own password.
        </p>
        <form onSubmit={login} className="mt-6 flex flex-col gap-3">
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="rounded-lg border border-stone-600 bg-stone-950 px-3 py-2 text-stone-100 placeholder:text-stone-500"
            placeholder="password"
            autoComplete="current-password"
          />
          <button
            type="submit"
            className="rounded-lg bg-stone-200 py-2 text-sm font-medium text-stone-950 hover:bg-stone-100"
          >
            log in
          </button>
          {msg ? <p className="text-sm text-red-400">{msg}</p> : null}
        </form>
      </main>
    );
  }

  return (
    <main className="flex flex-col gap-10">
      {msg ? (
        <p className="rounded-lg border border-amber-900/40 bg-amber-950/60 px-3 py-2 text-sm text-amber-200">{msg}</p>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-stone-100">edit</h1>
          <p className="text-sm text-stone-400">
            you&apos;re <span className="font-medium text-stone-100">{role}</span> rn
          </p>
        </div>
        <button
          type="button"
          onClick={() => void logout()}
          className="rounded-lg border border-stone-600 px-3 py-1.5 text-sm text-stone-200 hover:bg-stone-800"
        >
          log out
        </button>
      </div>

      {role === "helper" ? (
        <HelperPanel maps={maps} onDone={() => void loadPending()} setMsg={setMsg} />
      ) : null}

      {(role === "helper" || role === "admin") && (
        <PendingPanel
          rows={pending}
          role={role}
          onChange={() => void loadPending()}
          setMsg={setMsg}
        />
      )}

      {(role === "trusted" || role === "admin") && (
        <TrustedPanel
          maps={maps}
          lineups={lineups}
          onRefresh={() => {
            void loadMaps();
            void loadLineups();
          }}
          setMsg={setMsg}
        />
      )}

      {role === "admin" && (
        <AdminPanel maps={maps} onRefresh={() => void loadMaps()} setMsg={setMsg} />
      )}
    </main>
  );
}

function HelperPanel({
  maps,
  onDone,
  setMsg,
}: {
  maps: MapRow[];
  onDone: () => void;
  setMsg: (s: string | null) => void;
}) {
  const [kind, setKind] = useState("lineup_create");
  const [mapId, setMapId] = useState("");
  const [grenade, setGrenade] = useState("smoke");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [videoPath, setVideoPath] = useState("");
  const [lineupId, setLineupId] = useState("");
  const [callName, setCallName] = useState("");
  const [calloutId, setCalloutId] = useState("");

  async function uploadVideo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setMsg(null);
    const fd = new FormData();
    fd.append("file", file);
    const r = await fetch("/api/upload", { method: "POST", body: fd });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) {
      setMsg(j.error ?? "upload failed");
      return;
    }
    setVideoPath(j.path ?? "");
    setMsg(`video uploaded (${j.path})`);
    e.target.value = "";
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    const mid = Number(mapId);
    let body: Record<string, unknown>;

    if (kind === "lineup_create") {
      body = {
        kind: "lineup_create",
        mapId: mid,
        grenadeType: grenade,
        title,
        description,
        videoPath,
      };
    } else if (kind === "lineup_update") {
      body = {
        kind: "lineup_update",
        id: Number(lineupId),
        mapId: mid,
        grenadeType: grenade,
        title,
        description,
        videoPath,
      };
    } else if (kind === "lineup_delete") {
      body = { kind: "lineup_delete", id: Number(lineupId) };
    } else if (kind === "callout_create") {
      body = { kind: "callout_create", mapId: mid, name: callName };
    } else {
      body = { kind: "callout_delete", id: Number(calloutId) };
    }

    const r = await fetch("/api/submissions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) {
      setMsg(j.error ?? "submit failed");
      return;
    }
    setMsg("sent, waiting for admin");
    onDone();
  }

  return (
    <section className="rounded-xl border border-stone-700 bg-stone-900 p-5 shadow-sm">
      <h2 className="font-semibold text-stone-100">helper</h2>
      <p className="mt-1 text-sm text-stone-400">
        nothing goes live until an admin approves it.
      </p>
      <form onSubmit={submit} className="mt-4 flex flex-col gap-3 text-sm">
        <label className="flex flex-col gap-1">
          <span className="text-stone-500">what kind</span>
          <select
            value={kind}
            onChange={(e) => setKind(e.target.value)}
            className="rounded-lg border border-stone-600 bg-stone-950 px-3 py-2 text-stone-100 placeholder:text-stone-500"
          >
            <option value="lineup_create">new lineup</option>
            <option value="lineup_update">edit lineup</option>
            <option value="lineup_delete">delete lineup</option>
            <option value="callout_create">new call</option>
            <option value="callout_delete">delete call</option>
          </select>
        </label>

        {(kind === "lineup_create" ||
          kind === "lineup_update" ||
          kind === "callout_create") && (
          <label className="flex flex-col gap-1">
            <span className="text-stone-500">map</span>
            <select
              value={mapId}
              onChange={(e) => setMapId(e.target.value)}
              required
              className="rounded-lg border border-stone-600 bg-stone-950 px-3 py-2 text-stone-100 placeholder:text-stone-500"
            >
              <option value="">pick…</option>
              {maps.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </label>
        )}

        {(kind === "lineup_create" || kind === "lineup_update") && (
          <>
            <label className="flex flex-col gap-1">
              <span className="text-stone-500">grenade</span>
              <select
                value={grenade}
                onChange={(e) => setGrenade(e.target.value)}
                className="rounded-lg border border-stone-600 bg-stone-950 px-3 py-2 text-stone-100 placeholder:text-stone-500"
              >
                <option value="smoke">smoke</option>
                <option value="flash">flash</option>
                <option value="molly">molly</option>
                <option value="he">he</option>
              </select>
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-stone-500">title</span>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="rounded-lg border border-stone-600 bg-stone-950 px-3 py-2 text-stone-100 placeholder:text-stone-500"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-stone-500">description</span>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="rounded-lg border border-stone-600 bg-stone-950 px-3 py-2 text-stone-100 placeholder:text-stone-500"
                rows={2}
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-stone-500">video (cap 50mb)</span>
              <input
                type="file"
                accept="video/mp4,video/webm,video/quicktime,video/x-matroska,.mp4,.webm,.mov,.mkv,.m4v"
                onChange={(e) => void uploadVideo(e)}
                className="text-xs text-stone-300 file:mr-2 file:rounded file:border file:border-stone-600 file:bg-stone-950 file:px-2 file:py-1"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-stone-500">video path</span>
              <input
                value={videoPath}
                onChange={(e) => setVideoPath(e.target.value)}
                placeholder="/uploads/….mp4"
                className="rounded-lg border border-stone-600 bg-stone-950 px-3 py-2 text-stone-100 placeholder:text-stone-500"
              />
            </label>
          </>
        )}

        {(kind === "lineup_update" || kind === "lineup_delete") && (
          <label className="flex flex-col gap-1">
            <span className="text-stone-500">lineup id</span>
            <input
              value={lineupId}
              onChange={(e) => setLineupId(e.target.value)}
              className="rounded-lg border border-stone-600 bg-stone-950 px-3 py-2 text-stone-100 placeholder:text-stone-500"
              required
            />
          </label>
        )}

        {kind === "callout_create" && (
          <label className="flex flex-col gap-1">
            <span className="text-stone-500">call name</span>
            <input
              value={callName}
              onChange={(e) => setCallName(e.target.value)}
              className="rounded-lg border border-stone-600 bg-stone-950 px-3 py-2 text-stone-100 placeholder:text-stone-500"
              required
            />
          </label>
        )}

        {kind === "callout_delete" && (
          <label className="flex flex-col gap-1">
            <span className="text-stone-500">callout id</span>
            <input
              value={calloutId}
              onChange={(e) => setCalloutId(e.target.value)}
              className="rounded-lg border border-stone-600 bg-stone-950 px-3 py-2 text-stone-100 placeholder:text-stone-500"
              required
            />
          </label>
        )}

        <button
          type="submit"
          className="mt-2 rounded-lg bg-stone-200 py-2 text-sm font-medium text-stone-950 hover:bg-stone-100"
        >
          submit
        </button>
      </form>
    </section>
  );
}

function PendingPanel({
  rows,
  role,
  onChange,
  setMsg,
}: {
  rows: SubmissionRow[];
  role: Role;
  onChange: () => void;
  setMsg: (s: string | null) => void;
}) {
  async function approve(id: number) {
    setMsg(null);
    const r = await fetch(`/api/submissions/${id}/approve`, { method: "POST" });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) setMsg(j.error ?? "nope");
    onChange();
  }

  async function reject(id: number) {
    setMsg(null);
    const r = await fetch(`/api/submissions/${id}/reject`, { method: "POST" });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) setMsg(j.error ?? "nope");
    onChange();
  }

  return (
    <section className="rounded-xl border border-stone-700 bg-stone-900 p-5 shadow-sm">
      <h2 className="font-semibold text-stone-100">pending</h2>
      {rows.length === 0 ? (
        <p className="mt-2 text-sm text-stone-400">nothing here.</p>
      ) : (
        <ul className="mt-4 flex flex-col gap-4 text-sm">
          {rows.map((s) => (
            <li key={s.id} className="rounded-lg border border-stone-700 bg-stone-950 p-3">
              <div className="font-medium">
                #{s.id} {s.kind}
              </div>
              <pre className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap break-all text-xs text-stone-400">
                {s.payload}
              </pre>
              {role === "admin" ? (
                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    className="rounded bg-emerald-900 px-3 py-1 text-emerald-100 hover:bg-emerald-800"
                    onClick={() => void approve(s.id)}
                  >
                    approve
                  </button>
                  <button
                    type="button"
                    className="rounded bg-red-950 px-3 py-1 text-red-100 hover:bg-red-900"
                    onClick={() => void reject(s.id)}
                  >
                    reject
                  </button>
                </div>
              ) : (
                <p className="mt-2 text-xs text-stone-500">admin approves these, not you</p>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function TrustedPanel({
  maps,
  lineups,
  onRefresh,
  setMsg,
}: {
  maps: MapRow[];
  lineups: LineupRow[];
  onRefresh: () => void;
  setMsg: (s: string | null) => void;
}) {
  const [mapId, setMapId] = useState("");
  const [grenade, setGrenade] = useState("smoke");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [videoPath, setVideoPath] = useState("");
  const [patchMapId, setPatchMapId] = useState("");
  const [imagePath, setImagePath] = useState("");
  const [patchCallsMapId, setPatchCallsMapId] = useState("");
  const [calloutsImagePath, setCalloutsImagePath] = useState("");

  async function uploadLineupVideo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setMsg(null);
    const fd = new FormData();
    fd.append("file", file);
    const r = await fetch("/api/upload", { method: "POST", body: fd });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) {
      setMsg(j.error ?? "upload failed");
      return;
    }
    setVideoPath(j.path ?? "");
    setMsg(`video uploaded (${j.path})`);
    e.target.value = "";
  }

  async function postLineup(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    const r = await fetch("/api/lineups", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mapId: Number(mapId),
        grenadeType: grenade,
        title,
        description,
        videoPath,
      }),
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) {
      setMsg(j.error ?? "failed");
      return;
    }
    setMsg("lineup added");
    onRefresh();
  }

  async function patchMap(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    const r = await fetch(`/api/maps/${patchMapId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ imagePath: imagePath || null }),
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) {
      setMsg(j.error ?? "failed");
      return;
    }
    setMsg("screenshot saved");
    onRefresh();
  }

  async function patchCalloutsMap(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    const r = await fetch(`/api/maps/${patchCallsMapId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ calloutsImagePath: calloutsImagePath || null }),
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) {
      setMsg(j.error ?? "failed");
      return;
    }
    setMsg("calls image saved");
    onRefresh();
  }

  async function uploadFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setMsg(null);
    const fd = new FormData();
    fd.append("file", file);
    const r = await fetch("/api/upload", { method: "POST", body: fd });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) {
      setMsg(j.error ?? "upload failed");
      return;
    }
    setImagePath(j.path ?? "");
    setMsg(`upload done (${j.path})`);
    e.target.value = "";
  }

  async function uploadCallsFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setMsg(null);
    const fd = new FormData();
    fd.append("file", file);
    const r = await fetch("/api/upload", { method: "POST", body: fd });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) {
      setMsg(j.error ?? "upload failed");
      return;
    }
    setCalloutsImagePath(j.path ?? "");
    setMsg(`calls pic uploaded (${j.path})`);
    e.target.value = "";
  }

  return (
    <section className="flex flex-col gap-8">
      <div className="rounded-xl border border-stone-700 bg-stone-900 p-5 shadow-sm">
        <h2 className="font-semibold text-stone-100">add lineup</h2>
        <p className="mt-1 text-sm text-stone-400">shows up right away.</p>
        <form onSubmit={postLineup} className="mt-4 flex flex-col gap-2 text-sm">
          <select
            value={mapId}
            onChange={(e) => setMapId(e.target.value)}
            required
            className="rounded-lg border border-stone-600 bg-stone-950 px-3 py-2 text-stone-100 placeholder:text-stone-500"
          >
            <option value="">map…</option>
            {maps.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
          <select
            value={grenade}
            onChange={(e) => setGrenade(e.target.value)}
            className="rounded-lg border border-stone-600 bg-stone-950 px-3 py-2 text-stone-100 placeholder:text-stone-500"
          >
            <option value="smoke">smoke</option>
            <option value="flash">flash</option>
            <option value="molly">molly</option>
            <option value="he">he</option>
          </select>
          <input
            placeholder="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="rounded-lg border border-stone-600 bg-stone-950 px-3 py-2 text-stone-100 placeholder:text-stone-500"
            required
          />
          <textarea
            placeholder="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="rounded-lg border border-stone-600 bg-stone-950 px-3 py-2 text-stone-100 placeholder:text-stone-500"
            rows={2}
          />
          <label className="flex flex-col gap-1 text-stone-500">
            <span>video (cap 50mb)</span>
            <input
              type="file"
              accept="video/mp4,video/webm,video/quicktime,video/x-matroska,.mp4,.webm,.mov,.mkv,.m4v"
              onChange={(e) => void uploadLineupVideo(e)}
              className="text-xs text-stone-300 file:mr-2 file:rounded file:border file:border-stone-600 file:bg-stone-950 file:px-2 file:py-1"
            />
          </label>
          <input
            placeholder="/uploads/….mp4"
            value={videoPath}
            onChange={(e) => setVideoPath(e.target.value)}
            className="rounded-lg border border-stone-600 bg-stone-950 px-3 py-2 text-stone-100 placeholder:text-stone-500"
            required
          />
          <button
            type="submit"
            className="rounded-lg bg-stone-200 py-2 font-medium text-stone-950 hover:bg-stone-100"
          >
            add lineup
          </button>
        </form>
      </div>

      <div className="rounded-xl border border-stone-700 bg-stone-900 p-5 shadow-sm">
        <h2 className="font-semibold text-stone-100">map screenshot</h2>
        <p className="mt-1 text-sm text-stone-400">
          upload an image, then put the path below and save. paths look like /uploads/whatever.png
        </p>
        <input type="file" accept="image/*" onChange={(e) => void uploadFile(e)} className="mt-3 text-sm" />
        <form onSubmit={patchMap} className="mt-4 flex flex-col gap-2 text-sm">
          <select
            value={patchMapId}
            onChange={(e) => setPatchMapId(e.target.value)}
            required
            className="rounded-lg border border-stone-600 bg-stone-950 px-3 py-2 text-stone-100 placeholder:text-stone-500"
          >
            <option value="">map…</option>
            {maps.map((m) => (
              <option key={m.id} value={String(m.id)}>
                {m.name}
              </option>
            ))}
          </select>
          <input
            placeholder="/uploads/whatever.png"
            value={imagePath}
            onChange={(e) => setImagePath(e.target.value)}
            className="rounded-lg border border-stone-600 bg-stone-950 px-3 py-2 text-stone-100 placeholder:text-stone-500"
          />
          <button
            type="submit"
            className="rounded-lg bg-stone-200 py-2 font-medium text-stone-950 hover:bg-stone-100"
          >
            save
          </button>
        </form>
      </div>

      <div className="rounded-xl border border-stone-700 bg-stone-900 p-5 shadow-sm">
        <h2 className="font-semibold text-stone-100">calls / radar</h2>
        <p className="mt-1 text-sm text-stone-400">
          optional image that replaces the small callout chips on the map page. clear the path and save to remove it.
        </p>
        <input
          type="file"
          accept="image/*"
          onChange={(e) => void uploadCallsFile(e)}
          className="mt-3 text-sm"
        />
        <form onSubmit={patchCalloutsMap} className="mt-4 flex flex-col gap-2 text-sm">
          <select
            value={patchCallsMapId}
            onChange={(e) => setPatchCallsMapId(e.target.value)}
            required
            className="rounded-lg border border-stone-600 bg-stone-950 px-3 py-2 text-stone-100 placeholder:text-stone-500"
          >
            <option value="">map…</option>
            {maps.map((m) => (
              <option key={m.id} value={String(m.id)}>
                {m.name}
              </option>
            ))}
          </select>
          <input
            placeholder="/uploads/calls-mirage.png"
            value={calloutsImagePath}
            onChange={(e) => setCalloutsImagePath(e.target.value)}
            className="rounded-lg border border-stone-600 bg-stone-950 px-3 py-2 text-stone-100 placeholder:text-stone-500"
          />
          <button
            type="submit"
            className="rounded-lg bg-stone-200 py-2 font-medium text-stone-950 hover:bg-stone-100"
          >
            save
          </button>
        </form>
      </div>

      <div className="rounded-xl border border-stone-700 bg-stone-900 p-5 shadow-sm">
        <h2 className="font-semibold text-stone-100">lineup ids</h2>
        <ul className="mt-2 max-h-40 overflow-auto text-xs text-stone-400">
          {lineups.map((l) => (
            <li key={l.id}>
              #{l.id} {l.title}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function AdminPanel({
  maps,
  onRefresh,
  setMsg,
}: {
  maps: MapRow[];
  onRefresh: () => void;
  setMsg: (s: string | null) => void;
}) {
  const [slug, setSlug] = useState("");
  const [name, setName] = useState("");
  const [delMapId, setDelMapId] = useState("");
  const [delLineupId, setDelLineupId] = useState("");

  async function addMap(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    const r = await fetch("/api/maps", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug, name, sortOrder: 100 }),
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) {
      setMsg(j.error ?? "failed");
      return;
    }
    setSlug("");
    setName("");
    setMsg("map added");
    onRefresh();
  }

  async function delMap(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    const r = await fetch(`/api/maps/${delMapId}`, { method: "DELETE" });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) {
      setMsg(j.error ?? "failed");
      return;
    }
    setMsg("map removed");
    onRefresh();
  }

  async function delLineup(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    const r = await fetch(`/api/lineups/${delLineupId}`, { method: "DELETE" });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) {
      setMsg(j.error ?? "failed");
      return;
    }
    setMsg("lineup removed");
  }

  async function backup() {
    setMsg(null);
    const r = await fetch("/api/backup", { method: "POST" });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) {
      setMsg(j.note ?? j.error ?? "backup failed");
      return;
    }
    setMsg(j.note ?? "backup sent");
  }

  return (
    <section className="flex flex-col gap-8">
      <div className="rounded-xl border border-stone-700 bg-stone-900 p-5 shadow-sm">
        <h2 className="font-semibold text-stone-100">add new map</h2>
        <form onSubmit={addMap} className="mt-4 flex flex-col gap-2 text-sm">
          <input
            placeholder="slug (like ancient)"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            className="rounded-lg border border-stone-600 bg-stone-950 px-3 py-2 text-stone-100 placeholder:text-stone-500"
            required
          />
          <input
            placeholder="name on the site"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="rounded-lg border border-stone-600 bg-stone-950 px-3 py-2 text-stone-100 placeholder:text-stone-500"
            required
          />
          <button
            type="submit"
            className="rounded-lg bg-stone-200 py-2 font-medium text-stone-950 hover:bg-stone-100"
          >
            add map
          </button>
        </form>
      </div>

      <div className="rounded-xl border border-stone-700 bg-stone-900 p-5 shadow-sm">
        <h2 className="font-semibold text-stone-100">delete map</h2>
        <form onSubmit={delMap} className="mt-4 flex flex-col gap-2 text-sm">
          <select
            value={delMapId}
            onChange={(e) => setDelMapId(e.target.value)}
            required
            className="rounded-lg border border-stone-600 bg-stone-950 px-3 py-2 text-stone-100 placeholder:text-stone-500"
          >
            <option value="">pick…</option>
            {maps.map((m) => (
              <option key={m.id} value={String(m.id)}>
                {m.name}
              </option>
            ))}
          </select>
          <button
            type="submit"
            className="rounded-lg bg-red-950 py-2 font-medium text-red-100 hover:bg-red-900"
          >
            delete map (no undo)
          </button>
        </form>
      </div>

      <div className="rounded-xl border border-stone-700 bg-stone-900 p-5 shadow-sm">
        <h2 className="font-semibold text-stone-100">delete lineup by id</h2>
        <form onSubmit={delLineup} className="mt-4 flex gap-2 text-sm">
          <input
            placeholder="lineup id"
            value={delLineupId}
            onChange={(e) => setDelLineupId(e.target.value)}
            className="flex-1 rounded-lg border border-stone-600 bg-stone-950 px-3 py-2 text-stone-100 placeholder:text-stone-500"
            required
          />
          <button
            type="submit"
            className="rounded-lg bg-red-950 px-3 py-2 text-red-100 hover:bg-red-900"
          >
            delete
          </button>
        </form>
      </div>

      <div className="rounded-xl border border-stone-700 bg-stone-900 p-5 shadow-sm">
        <h2 className="font-semibold text-stone-100">backup to discord</h2>
        <p className="mt-1 text-sm text-stone-400">
          sends a copy of the sqlite db to your webhook. dont spam it.
        </p>
        <button
          type="button"
          onClick={() => void backup()}
          className="mt-4 rounded-lg bg-stone-200 px-4 py-2 text-sm font-medium text-stone-950 hover:bg-stone-100"
        >
          run backup
        </button>
      </div>
    </section>
  );
}
