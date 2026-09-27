<#
  Desfaz o que o instalar.ps1 fez: para o servidor, tira o início automático,
  o atalho e a regra do firewall. Não apaga o projeto, os vídeos nem o banco.
#>
$porta = 3000
Get-NetTCPConnection -LocalPort $porta -State Listen -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }
Remove-Item (Join-Path ([Environment]::GetFolderPath('Startup')) 'Outorga TV (servidor).lnk') -ErrorAction SilentlyContinue
Remove-Item (Join-Path ([Environment]::GetFolderPath('Desktop')) 'Outorga TV.lnk') -ErrorAction SilentlyContinue
Start-Process powershell -Verb RunAs -Wait -ArgumentList '-NoProfile', '-Command', "Remove-NetFirewallRule -DisplayName 'Outorga TV (porta $porta)' -ErrorAction SilentlyContinue"
Write-Host 'Outorga TV removido do início automático, da área de trabalho e do firewall.'
