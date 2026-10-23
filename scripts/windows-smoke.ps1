param([Parameter(Mandatory)][string]$Installer, [string]$OutputDirectory = "$env:RUNNER_TEMP\hub-desktop-evidence")
$ErrorActionPreference = 'Stop'
New-Item -ItemType Directory -Force -Path $OutputDirectory | Out-Null
$installDirectory = Join-Path $env:RUNNER_TEMP 'HubDesktopSmoke'
$webviewLog = Join-Path $env:RUNNER_TEMP 'zulu-desktop-smoke-webview.log'
Remove-Item $webviewLog -Force -ErrorAction SilentlyContinue
$env:ZULU_DESKTOP_SMOKE = '1'
if (Test-Path $installDirectory) { throw 'The smoke install directory must be empty.' }
$report = [ordered]@{ platform = 'Windows'; installer = (Split-Path $Installer -Leaf); sha256 = (Get-FileHash $Installer -Algorithm SHA256).Hash.ToLower(); signature = (Get-AuthenticodeSignature $Installer).Status.ToString(); signed = $false; installed = $false; windowOpened = $false; loginPageLoaded = $false; customTitlebar = $false; maximizeRestored = $false; minimizeControl = $false; singleInstance = $false; shortcutRestoredWindow = $false; backgroundTray = $false; autostartToggle = $false; miniWindow = $false; miniTopmost = $false; hiddenStartup = $false; uninstalled = $false; accountsCreated = 0; businessWrites = 0 }
$report.signed = $report.signature -eq 'Valid'
$appProcess = $null
$uninstaller = $null
$currentStage = 'start'
Add-Type @'
using System;
using System.Runtime.InteropServices;
public static class HubNativeWindow {
  [StructLayout(LayoutKind.Sequential)] private struct Rect { public int Left, Top, Right, Bottom; }
  [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr hwnd, int command);
  [DllImport("user32.dll")] public static extern bool IsZoomed(IntPtr hwnd);
  [DllImport("user32.dll")] public static extern bool IsIconic(IntPtr hwnd);
  [DllImport("user32.dll")] public static extern bool IsWindow(IntPtr hwnd);
  [DllImport("user32.dll")] public static extern bool IsWindowVisible(IntPtr hwnd);
  [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr hwnd);
  [DllImport("user32.dll", EntryPoint="GetDC")] public static extern IntPtr GetDeviceContext(IntPtr hwnd);
  [DllImport("user32.dll", EntryPoint="ReleaseDC")] public static extern int ReleaseDeviceContext(IntPtr hwnd, IntPtr hdc);
  [DllImport("gdi32.dll", EntryPoint="BitBlt")] public static extern bool BitBlt(IntPtr destination, int x, int y, int width, int height, IntPtr source, int sourceX, int sourceY, uint rasterOperation);
  [DllImport("user32.dll", EntryPoint="PostMessageW")] public static extern bool PostCloseMessage(IntPtr hwnd, uint message, IntPtr wParam, IntPtr lParam);
  [DllImport("user32.dll")] public static extern bool SetCursorPos(int x, int y);
  [DllImport("user32.dll")] public static extern void mouse_event(uint flags, uint dx, uint dy, uint data, IntPtr extra);
  public static void ClickCenter(int x, int y) {
    SetCursorPos(x, y);
    mouse_event(0x0002, 0, 0, 0, IntPtr.Zero);
    mouse_event(0x0004, 0, 0, 0, IntPtr.Zero);
  }
  [DllImport("user32.dll", EntryPoint="GetWindowLongW")] public static extern int GetWindowLong(IntPtr hwnd, int index);
  [DllImport("user32.dll")] private static extern bool GetWindowRect(IntPtr hwnd, out Rect rect);
  public static int[] Bounds(IntPtr hwnd) {
    Rect rect; GetWindowRect(hwnd, out rect);
    return new int[] { rect.Left, rect.Top, rect.Right, rect.Bottom };
  }
  private delegate bool EnumProc(IntPtr hwnd, IntPtr data);
  [DllImport("user32.dll")] private static extern bool EnumWindows(EnumProc callback, IntPtr data);
  [DllImport("user32.dll")] private static extern uint GetWindowThreadProcessId(IntPtr hwnd, out uint pid);
  [DllImport("user32.dll", CharSet=CharSet.Unicode)] private static extern int GetWindowText(IntPtr hwnd, System.Text.StringBuilder text, int max);
  public static string[] Windows(int pid) {
    var rows = new System.Collections.Generic.List<string>();
    EnumWindows((hwnd,data)=>{
      uint owner; GetWindowThreadProcessId(hwnd,out owner);
      if(owner==(uint)pid) {
        var title=new System.Text.StringBuilder(512);GetWindowText(hwnd,title,512);
        Rect rect; GetWindowRect(hwnd,out rect);
        rows.Add("visible="+IsWindowVisible(hwnd)+" topmost="+((GetWindowLong(hwnd,-20)&8)!=0)+" rect="+rect.Left+","+rect.Top+","+rect.Right+","+rect.Bottom+" title="+title.ToString());
      }
      return true;
    },IntPtr.Zero);
    return rows.ToArray();
  }
  public static IntPtr Find(int pid, bool mini) {
    IntPtr found=IntPtr.Zero;
    EnumWindows((hwnd,data)=>{
      uint owner; GetWindowThreadProcessId(hwnd,out owner);
      if(owner!=(uint)pid || !IsWindowVisible(hwnd))return true;
      var text=new System.Text.StringBuilder(512);GetWindowText(hwnd,text,512);
      string title=text.ToString();
      if(title.StartsWith("ZULU") && title.Contains("Mini timer")==mini){found=hwnd;return false;}
      return true;
    },IntPtr.Zero);
    return found;
  }
}
'@
function Wait-Until([scriptblock]$Condition, [int]$Seconds = 45) {
  $deadline = [DateTime]::UtcNow.AddSeconds($Seconds)
  do { if (& $Condition) { return }; Start-Sleep -Milliseconds 500 } while ([DateTime]::UtcNow -lt $deadline)
  throw "Timed out waiting for a desktop smoke condition at stage '$script:currentStage'."
}
function Capture-LayeredScreen($Graphics, [int[]]$Bounds) {
  $source = [HubNativeWindow]::GetDeviceContext([IntPtr]::Zero)
  $destination = $Graphics.GetHdc()
  try {
    if (-not [HubNativeWindow]::BitBlt($destination, 0, 0, $Bounds[2] - $Bounds[0], $Bounds[3] - $Bounds[1], $source, $Bounds[0], $Bounds[1], 0x40CC0020)) {
      throw 'Could not capture the mini timer window.'
    }
  } finally {
    $Graphics.ReleaseHdc($destination)
    [HubNativeWindow]::ReleaseDeviceContext([IntPtr]::Zero, $source) | Out-Null
  }
}
function Get-ZuluRunEntry {
  foreach ($path in @('HKCU:\Software\Microsoft\Windows\CurrentVersion\Run', 'HKLM:\Software\Microsoft\Windows\CurrentVersion\Run')) {
    $entry = Get-ItemProperty -Path $path -Name ZULU -ErrorAction SilentlyContinue
    if ($null -ne $entry) { return [string]$entry.ZULU }
  }
  return $null
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
  Wait-Until { $appProcess.Refresh(); -not $appProcess.HasExited -and [HubNativeWindow]::Find($appProcess.Id, $false) -ne [IntPtr]::Zero }
  $handle = [HubNativeWindow]::Find($appProcess.Id, $false)
  if (-not [HubNativeWindow]::IsWindow($handle)) { throw 'Application window was not created.' }
  $report.windowOpened = $true
  Add-Type -AssemblyName UIAutomationClient
  Add-Type -AssemblyName UIAutomationTypes
  $root = [System.Windows.Automation.AutomationElement]::FromHandle($handle)
  $headingText = 'Bom ter voc' + [char]0xEA + ' por aqui.'
  $loginHeading = [System.Windows.Automation.PropertyCondition]::new([System.Windows.Automation.AutomationElement]::NameProperty, $headingText)
  Wait-Until { $null -ne $root.FindFirst([System.Windows.Automation.TreeScope]::Descendants, $loginHeading) } 60
  $report.loginPageLoaded = $true
  Add-Type -AssemblyName System.Windows.Forms
  function Invoke-HubElement($Control, [IntPtr]$WindowHandle) {
    $pattern = $null
    if ($Control.TryGetCurrentPattern([System.Windows.Automation.InvokePattern]::Pattern, [ref]$pattern)) {
      $pattern.Invoke()
    } else {
      [HubNativeWindow]::SetForegroundWindow($WindowHandle) | Out-Null
      try {
        $Control.SetFocus()
        [System.Windows.Forms.SendKeys]::SendWait(' ')
      } catch {
        $bounds = $Control.Current.BoundingRectangle
        [HubNativeWindow]::ClickCenter([int][Math]::Round($bounds.X + $bounds.Width / 2), [int][Math]::Round($bounds.Y + $bounds.Height / 2))
      }
    }
  }
  function Invoke-HubControl([string]$Name) {
    $controlCondition = [System.Windows.Automation.PropertyCondition]::new([System.Windows.Automation.AutomationElement]::NameProperty, $Name)
    Wait-Until { $null -ne $root.FindFirst([System.Windows.Automation.TreeScope]::Descendants, $controlCondition) } 15
    $control = $root.FindFirst([System.Windows.Automation.TreeScope]::Descendants, $controlCondition)
    if (-not $control) { throw "Missing window control: $Name" }
    Invoke-HubElement $control $handle
  }
  function Open-HubRuntimeOptions {
    [HubNativeWindow]::SetForegroundWindow($handle) | Out-Null
    $quitCondition = [System.Windows.Automation.PropertyCondition]::new([System.Windows.Automation.AutomationElement]::NameProperty, 'Sair do ZULU')
    if ($null -eq $root.FindFirst([System.Windows.Automation.TreeScope]::Descendants, $quitCondition)) {
      $optionsCondition = [System.Windows.Automation.PropertyCondition]::new([System.Windows.Automation.AutomationElement]::NameProperty, 'Opções do aplicativo')
      $trigger = $root.FindFirst([System.Windows.Automation.TreeScope]::Descendants, $optionsCondition)
      if (-not $trigger) { throw 'Runtime options trigger missing.' }
      $bounds = $trigger.Current.BoundingRectangle
      # The mini owns focus after hiding; use an actual pointer press on the main window.
      $trigger.SetFocus()
      [HubNativeWindow]::ClickCenter([int][Math]::Round($bounds.X + $bounds.Width / 2), [int][Math]::Round($bounds.Y + $bounds.Height / 2))
    }
    Wait-Until { $null -ne $root.FindFirst([System.Windows.Automation.TreeScope]::Descendants, $quitCondition) } 15
  }
  $titlebarButton = [System.Windows.Automation.PropertyCondition]::new([System.Windows.Automation.AutomationElement]::NameProperty, 'Maximizar janela')
  Wait-Until { $null -ne $root.FindFirst([System.Windows.Automation.TreeScope]::Descendants, $titlebarButton) } 30
  Invoke-HubControl 'Maximizar janela'
  Wait-Until { [HubNativeWindow]::IsZoomed($handle) } 10
  Invoke-HubControl 'Restaurar janela'
  Wait-Until { -not [HubNativeWindow]::IsZoomed($handle) } 10
  $report.customTitlebar = $true
  $report.maximizeRestored = $true
  Invoke-HubControl 'Minimizar janela'
  Wait-Until { [HubNativeWindow]::IsIconic($handle) } 10
  $report.minimizeControl = $true
  [HubNativeWindow]::ShowWindow($handle, 9) | Out-Null
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
  # Local runtime preferences only. No account, email or business operation.
  Open-HubRuntimeOptions
  $checkCondition = [System.Windows.Automation.AndCondition]::new(
    [System.Windows.Automation.PropertyCondition]::new([System.Windows.Automation.AutomationElement]::NameProperty, 'Abrir ao ligar o PC'),
    [System.Windows.Automation.PropertyCondition]::new([System.Windows.Automation.AutomationElement]::ControlTypeProperty, [System.Windows.Automation.ControlType]::CheckBox))
  Wait-Until { $null -ne $root.FindFirst([System.Windows.Automation.TreeScope]::Descendants, $checkCondition) } 15
  $check = $root.FindFirst([System.Windows.Automation.TreeScope]::Descendants, $checkCondition)
  if (Get-ZuluRunEntry) { throw 'Startup must be opt-in on a fresh installation.' }
  Wait-Until { $root.FindFirst([System.Windows.Automation.TreeScope]::Descendants,$checkCondition).Current.IsEnabled } 15
  [HubNativeWindow]::SetForegroundWindow($handle) | Out-Null
  $check.SetFocus(); [System.Windows.Forms.SendKeys]::SendWait(' ')
  Wait-Until { (Get-ZuluRunEntry) -like '*--background*' } 15
  $startup = Get-ZuluRunEntry
  if ($startup -notlike "*$installDirectory*") { throw 'Startup entry must point to this installation.' }
  Wait-Until { $root.FindFirst([System.Windows.Automation.TreeScope]::Descendants,$checkCondition).Current.IsEnabled } 15
  $check=$root.FindFirst([System.Windows.Automation.TreeScope]::Descendants,$checkCondition)
  $check.SetFocus(); [System.Windows.Forms.SendKeys]::SendWait(' ')
  Wait-Until { -not (Get-ZuluRunEntry) } 15
  $report.autostartToggle = $true
  $currentStage = 'dismiss runtime options'
  [HubNativeWindow]::SetForegroundWindow($handle) | Out-Null
  $mainBounds = [HubNativeWindow]::Bounds($handle)
  [HubNativeWindow]::ClickCenter(
    $mainBounds[0] + [int](($mainBounds[2] - $mainBounds[0]) * 0.2),
    $mainBounds[1] + [int](($mainBounds[3] - $mainBounds[1]) * 0.75))
  $quitOption = [System.Windows.Automation.PropertyCondition]::new([System.Windows.Automation.AutomationElement]::NameProperty, 'Sair do ZULU')
  Wait-Until { $null -eq $root.FindFirst([System.Windows.Automation.TreeScope]::Descendants, $quitOption) } 10
  $currentStage = 'close main window to tray'
  [HubNativeWindow]::PostCloseMessage($handle, 0x0010, [IntPtr]::Zero, [IntPtr]::Zero) | Out-Null
  $currentStage = 'verify tray process remains open'
  Wait-Until { -not [HubNativeWindow]::IsWindowVisible($handle) } 15
  $appProcess.Refresh()
  if ($appProcess.HasExited) { throw 'Closing must keep the tray process alive.' }
  $report.backgroundTray = $true
  $currentStage = 'verify duplicate background launch'
  $silentSecond = Start-Process -FilePath $appPath -ArgumentList '--background' -PassThru
  Wait-Until { $silentSecond.Refresh(); $silentSecond.HasExited } 20
  if ([HubNativeWindow]::IsWindowVisible($handle)) { throw 'A duplicate background launch must not reveal the main window.' }
  $currentStage = 'restore main window from second launch'
  $second = Start-Process -FilePath $appPath -PassThru
  Wait-Until { $second.Refresh(); $second.HasExited } 20
  Wait-Until { [HubNativeWindow]::IsWindowVisible($handle) } 15
  $currentStage = 'open mini timer'
  Invoke-HubControl 'Abrir mini timer'
  Wait-Until { [HubNativeWindow]::Find($appProcess.Id, $true) -ne [IntPtr]::Zero } 30
  $miniHandle = [HubNativeWindow]::Find($appProcess.Id, $true)
  $miniRoot = [System.Windows.Automation.AutomationElement]::FromHandle($miniHandle)
  $miniBounds = [HubNativeWindow]::Bounds($miniHandle)
  $currentStage = 'verify mini timer topmost'
  if (([HubNativeWindow]::GetWindowLong($miniHandle, -20) -band 8) -eq 0) { throw 'Mini timer must be topmost.' }
  $report.miniTopmost = $true
  $currentStage = 'wait for mini timer controls'
  Start-Sleep -Seconds 5
  $miniRect = [System.Drawing.Rectangle]::FromLTRB($miniBounds[0], $miniBounds[1], $miniBounds[2], $miniBounds[3])
  $miniCapture = New-Object System.Drawing.Bitmap $miniRect.Width, $miniRect.Height
  $miniPaint = [System.Drawing.Graphics]::FromImage($miniCapture)
  Capture-LayeredScreen $miniPaint $miniBounds
  $miniCapture.Save((Join-Path $OutputDirectory 'mini-open.png'))
  $miniPaint.Dispose(); $miniCapture.Dispose()
  [HubNativeWindow]::SetForegroundWindow($miniHandle) | Out-Null
  Start-Sleep -Seconds 3
  $miniRoot = [System.Windows.Automation.AutomationElement]::FromHandle($miniHandle)
  $miniCapture = New-Object System.Drawing.Bitmap $miniRect.Width, $miniRect.Height
  $focusedPaint = [System.Drawing.Graphics]::FromImage($miniCapture)
  Capture-LayeredScreen $focusedPaint $miniBounds
  $miniCapture.Save((Join-Path $OutputDirectory 'mini-focused.png'))
  $focusedPaint.Dispose(); $miniCapture.Dispose()
  $miniCloseCondition = [System.Windows.Automation.PropertyCondition]::new([System.Windows.Automation.AutomationElement]::NameProperty, 'Ocultar mini timer')
  Wait-Until { $null -ne $miniRoot.FindFirst([System.Windows.Automation.TreeScope]::Descendants, $miniCloseCondition) } 45
  $compactCondition = [System.Windows.Automation.PropertyCondition]::new([System.Windows.Automation.AutomationElement]::NameProperty, 'Diminuir mini timer')
  Wait-Until { $null -ne $miniRoot.FindFirst([System.Windows.Automation.TreeScope]::Descendants, $compactCondition) } 30
  Invoke-HubElement ($miniRoot.FindFirst([System.Windows.Automation.TreeScope]::Descendants, $compactCondition)) $miniHandle
  $miniExpandedWidth = $miniBounds[2] - $miniBounds[0]
  Wait-Until { $rect = [HubNativeWindow]::Bounds($miniHandle); ($rect[2] - $rect[0]) -lt $miniExpandedWidth } 15
  $expandCondition = [System.Windows.Automation.PropertyCondition]::new([System.Windows.Automation.AutomationElement]::NameProperty, 'Expandir mini timer')
  Wait-Until { $null -ne $miniRoot.FindFirst([System.Windows.Automation.TreeScope]::Descendants, $expandCondition) } 15
  Wait-Until { ($miniRoot.FindFirst([System.Windows.Automation.TreeScope]::Descendants, $expandCondition)).Current.IsEnabled } 15
  Invoke-HubElement ($miniRoot.FindFirst([System.Windows.Automation.TreeScope]::Descendants, $expandCondition)) $miniHandle
  Wait-Until { $rect = [HubNativeWindow]::Bounds($miniHandle); ($rect[2] - $rect[0]) -ge $miniExpandedWidth } 15
  $report.miniResize = $true
  $report.miniWindow = $true
  $currentStage = 'capture desktop with mini timer'
  Add-Type -AssemblyName System.Drawing
  $bounds = [System.Windows.Forms.Screen]::PrimaryScreen.Bounds
  $bitmap = New-Object System.Drawing.Bitmap $bounds.Width, $bounds.Height
  $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
  $graphics.CopyFromScreen($bounds.Location, [System.Drawing.Point]::Empty, $bounds.Size)
  $bitmap.Save((Join-Path $OutputDirectory 'desktop.png'))
  $graphics.Dispose(); $bitmap.Dispose()
  $currentStage = 'hide mini timer from its close control'
  Invoke-HubElement ($miniRoot.FindFirst([System.Windows.Automation.TreeScope]::Descendants, $miniCloseCondition)) $miniHandle
  $currentStage = 'wait for mini timer to hide'
  Wait-Until { -not [HubNativeWindow]::IsWindowVisible($miniHandle) } 15
  $currentStage = 'open runtime options before quitting'
  Open-HubRuntimeOptions
  $currentStage = 'quit ZULU from runtime options'
  Invoke-HubControl 'Sair do ZULU'
  $currentStage = 'wait for tray process to exit'
  if (-not $appProcess.WaitForExit(10000)) { throw 'Quit must exit the background process.' }
  $currentStage = 'start ZULU hidden in the tray'
  $appProcess = Start-Process -FilePath $appPath -ArgumentList '--background' -PassThru
  Start-Sleep -Seconds 5
  $currentStage = 'verify hidden startup'
  $appProcess.Refresh()
  if ($appProcess.HasExited -or [HubNativeWindow]::Find($appProcess.Id, $false) -ne [IntPtr]::Zero) { throw 'Background startup must stay alive without a visible window.' }
  $report.hiddenStartup = $true
  $currentStage = 'restore main window from a second launch'
  $second = Start-Process -FilePath $appPath -PassThru
  Wait-Until { $second.Refresh(); $second.HasExited } 20
  Wait-Until { $appProcess.Refresh(); [HubNativeWindow]::Find($appProcess.Id, $false) -ne [IntPtr]::Zero } 20
  $handle = [HubNativeWindow]::Find($appProcess.Id, $false)
  $root = [System.Windows.Automation.AutomationElement]::FromHandle($handle)
  $currentStage = 'open runtime options in hidden-startup instance'
  Open-HubRuntimeOptions
  $currentStage = 'quit hidden-startup instance'
  Invoke-HubControl 'Sair do ZULU'
  $currentStage = 'wait for hidden-startup instance to exit'
  if (-not $appProcess.WaitForExit(10000)) { throw 'Background instance failed to quit.' }
} finally {
  try {
    if ($appProcess) {
      $appProcess.Refresh()
      $pageLoads = if (Test-Path $webviewLog) { [System.IO.File]::ReadAllText($webviewLog) } else { '' }
      @{ exited=$appProcess.HasExited; processId=$appProcess.Id; mainHandle=$handle.ToInt64(); miniBounds=$miniBounds; windows=[HubNativeWindow]::Windows($appProcess.Id); stage=$currentStage; pageLoads=$pageLoads; report=$report } | ConvertTo-Json -Depth 5 | Set-Content (Join-Path $OutputDirectory 'diagnostic.json') -Encoding utf8
    }
    if ($root) {
      $names=@($root.FindAll([System.Windows.Automation.TreeScope]::Descendants,[System.Windows.Automation.Condition]::TrueCondition) | Select-Object -First 120 | ForEach-Object { @{name=$_.Current.Name;class=$_.Current.ClassName;type=$_.Current.ControlType.ProgrammaticName} })
      $names | ConvertTo-Json -Depth 3 | Set-Content (Join-Path $OutputDirectory 'accessibility.json') -Encoding utf8
    }
    if ($miniRoot) {
      $miniNames=@($miniRoot.FindAll([System.Windows.Automation.TreeScope]::Descendants,[System.Windows.Automation.Condition]::TrueCondition) | Select-Object -First 120 | ForEach-Object { @{name=$_.Current.Name;class=$_.Current.ClassName;type=$_.Current.ControlType.ProgrammaticName} })
      $miniNames | ConvertTo-Json -Depth 3 | Set-Content (Join-Path $OutputDirectory 'mini-accessibility.json') -Encoding utf8
    }
    Add-Type -AssemblyName System.Windows.Forms
    Add-Type -AssemblyName System.Drawing
    $bounds=[System.Windows.Forms.Screen]::PrimaryScreen.Bounds
    $capture=New-Object System.Drawing.Bitmap $bounds.Width,$bounds.Height
    $paint=[System.Drawing.Graphics]::FromImage($capture)
    $paint.CopyFromScreen($bounds.Location,[System.Drawing.Point]::Empty,$bounds.Size)
    $capture.Save((Join-Path $OutputDirectory 'final-desktop.png'));$paint.Dispose();$capture.Dispose()
  } catch { Write-Warning 'Could not capture all diagnostic details.' }
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
