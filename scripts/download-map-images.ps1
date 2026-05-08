# downloads CS2 map preview PNGs into public/maps/{slug}.png
# source: MurkyYT/cs2-map-icons main images/ (official-style icons, ~200KB each)
# Note: FACEIT matchmaking needs login — their CDN can't be scraped from automation.
$ErrorActionPreference = "Stop"
$base = "https://raw.githubusercontent.com/MurkyYT/cs2-map-icons/main/images"
$pairs = @{
  "dust2"    = "de_dust2.png"
  "mirage"   = "de_mirage.png"
  "inferno"  = "de_inferno.png"
  "nuke"     = "de_nuke.png"
  "ancient"  = "de_ancient.png"
  "anubis"   = "de_anubis.png"
  "cache"    = "de_cache.png"
  "overpass" = "de_overpass.png"
}
New-Item -ItemType Directory -Force -Path "public/maps" | Out-Null
foreach ($slug in $pairs.Keys) {
  $url = "$base/$($pairs[$slug])"
  $out = Join-Path "public/maps" "$slug.png"
  Invoke-WebRequest -Uri $url -OutFile $out -UseBasicParsing
  Write-Host "ok $slug"
}
