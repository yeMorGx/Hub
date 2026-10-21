; Keep startup preference across in-place updates; remove our entry on uninstall.
!macro NSIS_HOOK_PREUNINSTALL
  ${If} $UpdateMode <> 1
    DeleteRegValue HKCU "Software\Microsoft\Windows\CurrentVersion\Run" "ZULU"
  ${EndIf}
!macroend
