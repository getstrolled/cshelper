import type { NextConfig } from "next";

function r2ImageRemotePatterns(): NonNullable<
  NextConfig["images"]
>["remotePatterns"] {
  const raw = process.env.R2_PUBLIC_BASE_URL?.trim();
  if (!raw) return [];
  try {
    const u = new URL(raw);
    const protocol = u.protocol.replace(":", "") as "http" | "https";
    return [{ protocol, hostname: u.hostname, pathname: "/**" }];
  } catch {
    return [];
  }
}

const nextConfig: NextConfig = {
  serverExternalPackages: ["better-sqlite3"],
  devIndicators: false,
  images: {
    remotePatterns: r2ImageRemotePatterns(),
  },
};

export default nextConfig;
