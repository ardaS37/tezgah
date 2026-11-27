$ErrorActionPreference = 'Stop'
[Console]::InputEncoding = [System.Text.UTF8Encoding]::new($false)
[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false)
$action = [Console]::In.ReadToEnd() | ConvertFrom-Json
Add-Type -AssemblyName System.Windows.Forms,System.Drawing
Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;
public static class TezgahInput {
  [DllImport("user32.dll")] public static extern bool SetProcessDPIAware();
  [DllImport("user32.dll")] public static extern bool SetCursorPos(int x, int y);
  [DllImport("user32.dll")] public static extern void mouse_event(uint flags, uint x, uint y, uint data, UIntPtr extra);
}
'@
[TezgahInput]::SetProcessDPIAware() | Out-Null
$bounds = [System.Windows.Forms.Screen]::PrimaryScreen.Bounds
$width = [Math]::Min(1280, $bounds.Width)
$height = [int][Math]::Round($bounds.Height * $width / $bounds.Width)
if ($action.action -eq 'inspect') {
  $original = [System.Drawing.Bitmap]::new($bounds.Width, $bounds.Height)
  $graphics = [System.Drawing.Graphics]::FromImage($original)
  try {
    $graphics.CopyFromScreen($bounds.Left, $bounds.Top, 0, 0, $bounds.Size)
    $scaled = [System.Drawing.Bitmap]::new($original, $width, $height)
    $stream = [System.IO.MemoryStream]::new()
    try {
      $scaled.Save($stream, [System.Drawing.Imaging.ImageFormat]::Jpeg)
      $result = @{ text = "Primary display screenshot: $($width)x$($height)"; image = [Convert]::ToBase64String($stream.ToArray()) }
      [Console]::Write(($result | ConvertTo-Json -Compress))
    } finally { $stream.Dispose(); $scaled.Dispose() }
  } finally { $graphics.Dispose(); $original.Dispose() }
  exit 0
}
switch ($action.action) {
  'click' {
    if ($action.x -lt 0 -or $action.x -ge $width -or $action.y -lt 0 -or $action.y -ge $height) { throw 'Click is outside the primary display.' }
    $x = [int][Math]::Floor($action.x * $bounds.Width / $width) + $bounds.Left
    $y = [int][Math]::Floor($action.y * $bounds.Height / $height) + $bounds.Top
    if (-not [TezgahInput]::SetCursorPos($x, $y)) { throw 'Windows rejected the pointer move.' }
    [TezgahInput]::mouse_event(2, 0, 0, 0, [UIntPtr]::Zero)
    [TezgahInput]::mouse_event(4, 0, 0, 0, [UIntPtr]::Zero)
  }
  'type' {
    $plain = [string]$action.text
    $literal = [regex]::Replace($plain, '[+^%~(){}\[\]]', { param($match) '{' + $match.Value + '}' })
    [System.Windows.Forms.SendKeys]::SendWait($literal)
  }
  'press' {
    $keys = @{ Enter = 'ENTER'; Escape = 'ESC'; Tab = 'TAB'; Backspace = 'BACKSPACE'; ArrowUp = 'UP'; ArrowDown = 'DOWN'; ArrowLeft = 'LEFT'; ArrowRight = 'RIGHT' }
    $key = $keys[[string]$action.key]
    if (-not $key) { throw 'Unsupported key.' }
    [System.Windows.Forms.SendKeys]::SendWait('{' + $key + '}')
  }
  default { throw 'Unsupported screen action.' }
}
[Console]::Write('{"text":"Windows input delivered."}')
