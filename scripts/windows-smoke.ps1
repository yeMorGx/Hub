param([Parameter(Mandatory)][string]$Installer, [string]$OutputDirectory = "$env:RUNNER_TEMP\hub-desktop-evidence")
$ErrorActionPreference = 'Stop'
New-Item -ItemType Directory -Force -Path $OutputDirectory | Out-Null
$installDirectory = Join-Path $env:RUNNER_TEMP 'HubDesktopSmoke'
if (Test-Path $installDirectory) { throw 'The smoke install directory must be empty.' }
$report = [ordered]@{ platform = 'Windows'; installer = (Split-Path $Installer -Leaf); sha256 = (Get-FileHash $Installer -Algorithm SHA256).Hash.ToLower(); signature = (Get-AuthenticodeSignature $Installer).Status.ToString(); signed = $false; installed = $false; windowOpened = $false; loginPageLoaded = $false; singleInstance = $false; shortcutRestoredWindow = $false; uninstalled = $false; accountsCreated = 0; businessWrites = 0 }
$report.signed = $report.signature -eq 'Valid'
$appProcess = $null
$uninstaller = $null
Add-Type @'
using System;
using System.Runtime.InteropServices;
public static class HubNativeWindow {
  [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr hwnd, int command);
  [DllImport("user32.dll")] public static extern bool IsIconic(IntPtr hwnd);
  [DllImport("user32.dll")] public static extern bool IsWindow(IntPtr hwnd);
}
'@
function Wait-Until([scriptblock]$Condition, [int]$Seconds = 45) {
  $deadline = [DateTime]::UtcNow.AddSeconds($Seconds)
  do { if (& $Condition) { return }; Start-Sleep -Milliseconds 500 } while ([DateTime]::UtcNow -lt $deadline)
  throw 'Timed out waiting for a desktop smoke condition.'
}
try {
  $setup = Start-Process -FilePath $Installer -ArgumentList @('/S', "/D=$installDirectory") -PassThru -Wait
  if ($setup.ExitCode -ne 0) { throw "Installer failed with exit code $($setup.ExitCode)." }
  $executables = @(Get-ChildItem $installDirectory -Filter '*.exe' -File | Where-Object { $_.Name -notmatch '(?i)uninstall|setup|webview|bootstrap' })
  if ($executables.Count -ne 1) { throw 'Expected exactly one installed application executable.' }
  $uninstaller = Get-ChildItem $installDirectory -Filter '*uninstall*.exe' -File | Select-Object -First 1
  if (-not $uninstaller) { throw 'Uninstaller missing.' }
  $report.installed = $true
  $appPath = $executables[0].FullName
  $appProcess = Start-Process -FilePath $appPath -PassThru
  Wait-Until { $appProcess.Refresh(); -not $appProcess.HasExited -and $appProcess.MainWindowHandle -ne [IntPtr]::Zero }
  $handle = $appProcess.MainWindowHandle
  if (-not [HubNativeWindow]::IsWindow($handle)) { throw 'Application window was not created.' }
  $report.windowOpened = $true
  Add-Type -AssemblyName UIAutomationClient
  Add-Type -AssemblyName UIAutomationTypes
  $root = [System.Windows.Automation.AutomationElement]::FromHandle($handle)
  $headingText = 'Bom ter voc' + [char]0xEA + ' por aqui.'
  $loginHeading = [System.Windows.Automation.PropertyCondition]::new([System.Windows.Automation.AutomationElement]::NameProperty, $headingText)
  Wait-Until { $null -ne $root.FindFirst([System.Windows.Automation.TreeScope]::Descendants, $loginHeading) } 60
  $report.loginPageLoaded = $true
  # No sign-in or timer operation: the remote page stays unauthenticated.
  $second = Start-Process -FilePath $appPath -PassThru
  Wait-Until { $second.Refresh(); $second.HasExited } 20
  $running = @(Get-Process -Name $executables[0].BaseName -ErrorAction SilentlyContinue)
  if ($running.Count -ne 1 -or $running[0].Id -ne $appProcess.Id) { throw 'Expected one application instance.' }
  $report.singleInstance = $true
  [HubNativeWindow]::ShowWindow($handle, 6) | Out-Null
  Wait-Until { [HubNativeWindow]::IsIconic($handle) } 10
  Add-Type -AssemblyName System.Windows.Forms
  [System.Windows.Forms.SendKeys]::SendWait('^+h')
  Wait-Until { -not [HubNativeWindow]::IsIconic($handle) } 15
  $report.shortcutRestoredWindow = $true
  Add-Type -AssemblyName System.Drawing
  $bounds = [System.Windows.Forms.Screen]::PrimaryScreen.Bounds
  $bitmap = New-Object System.Drawing.Bitmap $bounds.Width, $bounds.Height
  $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
  $graphics.CopyFromScreen($bounds.Location, [System.Drawing.Point]::Empty, $bounds.Size)
  $bitmap.Save((Join-Path $OutputDirectory 'desktop.png'))
  $graphics.Dispose(); $bitmap.Dispose()
} finally {
  if ($appProcess -and -not $appProcess.HasExited) {
    $appProcess.CloseMainWindow() | Out-Null
    if (-not $appProcess.WaitForExit(10000)) { $appProcess.Kill() }
  }
  if ($uninstaller -and (Test-Path $uninstaller.FullName)) {
    $remove = Start-Process -FilePath $uninstaller.FullName -ArgumentList '/S' -PassThru -Wait
    if ($remove.ExitCode -eq 0) {
      $deadline = [DateTime]::UtcNow.AddSeconds(20)
      while ((Test-Path $appPath) -and [DateTime]::UtcNow -lt $deadline) { Start-Sleep -Milliseconds 500 }
      $report.uninstalled = -not (Test-Path $appPath)
    }
  }
  $report | ConvertTo-Json -Depth 5 | Set-Content -Path (Join-Path $OutputDirectory 'smoke.json') -Encoding utf8
}
if (-not $report.uninstalled) { throw 'Uninstall did not remove the application.' }
Write-Output ($report | ConvertTo-Json -Depth 5)
