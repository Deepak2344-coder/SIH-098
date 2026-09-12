# Builds standalone.html — double-clickable, no local server needed.
# The GLB is embedded as base64 and parsed from memory, so no file:// fetch
# is required. three.js itself still loads from CDN (internet needed once).
$ErrorActionPreference = 'Stop'
$dir = $PSScriptRoot
$src = Join-Path $dir 'index.html'
$glb = Join-Path $dir 'ArtilleryShell.glb'
$out = Join-Path $dir 'standalone.html'

$html = Get-Content -LiteralPath $src -Raw -Encoding UTF8
$bytes = [IO.File]::ReadAllBytes($glb)
Write-Output ("GLB bytes: " + $bytes.Length)
$magic = [Text.Encoding]::ASCII.GetString($bytes[0..3])
Write-Output ("GLB magic: " + $magic)
if ($magic -ne 'glTF') { throw 'Not a GLB file' }
$b64 = [Convert]::ToBase64String($bytes)
Write-Output ("base64 chars: " + $b64.Length)

$oldLoad = "loader.load('./ArtilleryShell.glb', (gltf) => {"
if (-not $html.Contains($oldLoad)) { throw 'loader hook not found — index.html changed?' }

# 1. Embed the model data before the module script (base64 has no < or & so it is safe inline)
$embed = '<script id="glb-data" type="text/plain">' + $b64 + '</script>'
$html = $html.Replace('<script type="module">', $embed + '<script type="module">')

# 2. Load from embedded memory instead of fetch (GLTFLoader.parse needs no server)
$newLoad = @'
try {
  var __buf = (function (b) {
    b = b.replace(/\s+/g, '');
    var bin = atob(b), n = bin.length, u = new Uint8Array(n);
    for (var i = 0; i < n; i++) u[i] = bin.charCodeAt(i);
    return u.buffer;
  })(document.getElementById('glb-data').textContent);
} catch (__e) {
  statusEl.textContent = 'Embedded model missing or corrupt: ' + __e.message;
  throw __e;
}
loader.parse(__buf, '', (gltf) => {
'@
$html = $html.Replace($oldLoad, $newLoad)

# 3. parse() has no progress slot: load(url, onLoad, onProgress, onError) -> parse(buf, path, onLoad, onError)
$html = $html.Replace('}, undefined, (err) => {', '}, (err) => {')

# 4. Error text should not tell users to start a server anymore
$html = $html.Replace(
  "'Failed to load ./ArtilleryShell.glb",
  "'Failed to show embedded model (this file needs no server"
)
$html = $html.Replace(
  "and keep index.html next to the .glb. ' + err.message;",
  ". ' + err.message;"
)
$html = $html.Replace(
  '(file:// + modules is blocked by CORS; use a local server)',
  '(needs internet access for the three.js CDN)'
)
$html = $html.Replace(
  '9 Parts Viewer</title>',
  '9 Parts Viewer (standalone)</title>'
)

$utf8 = New-Object Text.UTF8Encoding $false
[IO.File]::WriteAllText($out, $html, $utf8)
Write-Output ("wrote: " + $out)

# 5. Verify the output
$chk = Get-Content -LiteralPath $out -Raw -Encoding UTF8
$m = [regex]::Match($chk, '<script id="glb-data" type="text/plain">([A-Za-z0-9+/=]+)</script>')
if (-not $m.Success) { throw 'embedded data block missing' }
$raw = [Convert]::FromBase64String($m.Groups[1].Value.Substring(0, 64))
Write-Output ("embedded magic: " + [Text.Encoding]::ASCII.GetString($raw[0..3]))
if ($chk.Contains($oldLoad)) { throw 'old fetch-based loader still present' }
if (-not $chk.Contains('loader.parse(__buf')) { throw 'parse hook missing' }
Write-Output 'standalone.html OK — double-click to open, no server needed.'
