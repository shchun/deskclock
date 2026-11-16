!macro NSIS_HOOK_POSTINSTALL
  FileOpen $0 "$INSTDIR\deskclock-installed" w
  FileClose $0
!macroend

!macro NSIS_HOOK_POSTUNINSTALL
  Delete "$INSTDIR\deskclock-installed"
!macroend
