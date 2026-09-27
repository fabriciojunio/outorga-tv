<#
  Instala o Outorga TV no PC de casa.

  Roda uma vez (clique com o botão direito > Executar com o PowerShell, ou
  `powershell -ExecutionPolicy Bypass -File instalar\windows\instalar.ps1`).
  Pode rodar de novo quantas vezes quiser: ele refaz o que precisar.

  O que faz:
    1. instala as dependências e monta a versão de produção do site;
    2. libera a porta 3000 no firewall, só para a rede privada (a de casa),
       que é o que deixa o celular e a TV falarem com o PC;
    3. faz o servidor subir sozinho quando o Windows liga, sem janela;
    4. cria o atalho "Outorga TV" na área de trabalho, que abre como app.

  Se a pasta do projeto mudar de lugar, rode este arquivo de novo: o início
  automático aponta para o caminho de agora.
#>

$ErrorActionPreference = 'Stop'
$web = Resolve-Path (Join-Path $PSScriptRoot '..\..\web')
$porta = 3000

function Passo($texto) { Write-Host "`n>> $texto" -ForegroundColor Yellow }

Passo 'Conferindo o Node.js'
$node = Get-Command node -ErrorAction SilentlyContinue
if (-not $node) { throw 'Node.js não encontrado. Instale a versão 22 ou mais nova em https://nodejs.org e rode de novo.' }
$versao = [int]((node -v).TrimStart('v').Split('.')[0])
if ($versao -lt 22) { throw "O Node.js $(node -v) é antigo. Precisa da versão 22 ou mais nova." }
Write-Host "Node $(node -v) ok"

Passo 'Conferindo a configuração (web\.env.local)'
$env_local = Join-Path $web '.env.local'
if (-not (Test-Path $env_local)) {
  Copy-Item (Join-Path $web '.env.example') $env_local
  Write-Host 'Criei o web\.env.local a partir do exemplo. Preencha TMDB_TOKEN e rode de novo.' -ForegroundColor Red
  notepad $env_local
  exit 1
}
$texto = Get-Content $env_local -Raw
if ($texto -notmatch '(?m)^TMDB_TOKEN=\S+') { throw 'Falta TMDB_TOKEN no web\.env.local.' }
if ($texto -notmatch '(?m)^CASA_SEGREDO=\S{32,}') {
  $segredo = node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
  Add-Content $env_local "`nCASA_SEGREDO=$segredo"
  Write-Host 'Gerei o CASA_SEGREDO.'
}
if ($texto -notmatch '(?m)^CASA_USUARIOS=') {
  Write-Host 'Nenhum usuário ainda. Crie com: npm run casa:usuario -- 1 "Seu Nome" SuaSenha' -ForegroundColor Red
}

Passo 'Instalando e montando o site (leva alguns minutos na primeira vez)'
Push-Location $web
try {
  npm ci --no-audit --no-fund
  if ($LASTEXITCODE -ne 0) { throw 'npm ci falhou' }
  npx next build
  if ($LASTEXITCODE -ne 0) { throw 'a montagem do site falhou' }
} finally { Pop-Location }

Passo 'Liberando a porta 3000 para a rede de casa (vai pedir permissão de administrador)'
$regra = "Outorga TV (porta $porta)"
$comando = "if (-not (Get-NetFirewallRule -DisplayName '$regra' -ErrorAction SilentlyContinue)) { New-NetFirewallRule -DisplayName '$regra' -Direction Inbound -Protocol TCP -LocalPort $porta -Action Allow -Profile Private,Public -RemoteAddress LocalSubnet | Out-Null } else { Set-NetFirewallRule -DisplayName '$regra' -Profile Private,Public -RemoteAddress LocalSubnet }"
Start-Process powershell -Verb RunAs -Wait -ArgumentList '-NoProfile', '-Command', $comando
# LocalSubnet: só aparelhos da mesma rede local entram, seja qual for a
# classificação da rede no Windows (muita rede de casa fica como "Pública").
Write-Host 'Porta liberada só para aparelhos da mesma rede de casa.'

Passo 'Fazendo o servidor subir junto com o Windows'
$iniciar = Join-Path $PSScriptRoot 'iniciar-servidor.vbs'
$inicializar = [Environment]::GetFolderPath('Startup')
$atalhoInicio = Join-Path $inicializar 'Outorga TV (servidor).lnk'
$shell = New-Object -ComObject WScript.Shell
$lnk = $shell.CreateShortcut($atalhoInicio)
$lnk.TargetPath = 'wscript.exe'
$lnk.Arguments = "`"$iniciar`" `"$web`""
$lnk.WorkingDirectory = "$web"
$lnk.Save()
Write-Host "Criado em $atalhoInicio"

Passo 'Criando o atalho "Outorga TV" na área de trabalho'
$edge = @(
  "${env:ProgramFiles(x86)}\Microsoft\Edge\Application\msedge.exe",
  "$env:ProgramFiles\Microsoft\Edge\Application\msedge.exe"
) | Where-Object { Test-Path $_ } | Select-Object -First 1
$area = [Environment]::GetFolderPath('Desktop')
$app = $shell.CreateShortcut((Join-Path $area 'Outorga TV.lnk'))
if ($edge) {
  # --app abre sem barra de endereço, como aplicativo de verdade.
  $app.TargetPath = $edge
  $app.Arguments = "--app=http://localhost:$porta/casa"
} else {
  $app.TargetPath = "http://localhost:$porta/casa"
}
$icone = Join-Path $PSScriptRoot 'outorga.ico'
if (Test-Path $icone) { $app.IconLocation = $icone }
$app.Save()

Passo 'Ligando o servidor agora'
Get-NetTCPConnection -LocalPort $porta -State Listen -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }
Start-Process wscript.exe -ArgumentList "`"$iniciar`" `"$web`""
Start-Sleep 6

$ips = Get-NetIPAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue |
  Where-Object { $_.IPAddress -match '^(192\.168|10\.|172\.(1[6-9]|2\d|3[01]))' -and $_.PrefixOrigin -ne 'WellKnown' } |
  Select-Object -ExpandProperty IPAddress

Write-Host "`nPronto." -ForegroundColor Green
Write-Host "Neste PC: atalho 'Outorga TV' na área de trabalho (ou http://localhost:$porta/casa)."
foreach ($ip in $ips) { Write-Host "No celular e na TV, pelo navegador: http://${ip}:$porta/casa" }
Write-Host 'Nos apps de celular e TV não precisa digitar nada: eles acham o PC sozinhos.'
