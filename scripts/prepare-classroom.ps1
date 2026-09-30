param([Parameter(Mandatory=$true)][string]$TeacherAddress)
$ErrorActionPreference = "Stop"
Set-Location (Join-Path $PSScriptRoot "..")
if (-not (Get-Command mkcert -ErrorAction SilentlyContinue)) {
  throw "Instal.la mkcert seguint https://github.com/FiloSottile/mkcert i torna a executar aquest script."
}
if (Test-Path "certs/server-key.pem") { throw "Ja hi ha un certificat. Conserva'l o mou-lo abans de regenerar-lo." }
New-Item -ItemType Directory -Force "certs" | Out-Null
& mkcert -install
if ($LASTEXITCODE -ne 0) { throw "No s'ha pogut instal.lar l'autoritat local." }
& mkcert -cert-file "certs/server.pem" -key-file "certs/server-key.pem" $TeacherAddress localhost 127.0.0.1
if ($LASTEXITCODE -ne 0) { throw "No s'ha pogut crear el certificat." }
$caDirectory = (& mkcert -CAROOT).Trim()
Copy-Item (Join-Path $caDirectory "rootCA.pem") "certs/Confianca-Aula.crt"
Write-Host "Certificat preparat per https://${TeacherAddress}:3000"
Write-Host "L'administrador del centre ha d'instal.lar certs/Confianca-Aula.crt com a arrel de confiança als equips d'aquesta aula."
Write-Host "NO comparteixis server-key.pem ni rootCA-key.pem."
Write-Host "Permet TCP 3000 al tallafoc nomes per a la subxarxa de l'aula. No obris ports al router."
Write-Host "Arrenca Iniciar-Docent.cmd i mantingues la consola oberta."
