#!/usr/bin/env bash
# Prepara o modo de casa para o teste de ponta a ponta no CI: vídeos de
# teste gerados na hora (com os nomes do jeito que arquivo baixado vem),
# legenda com acento, um usuário de teste e o .env.local.
#
# Uso: TMDB_TOKEN=... E2E_SENHA=... bash e2e/preparar.sh
set -euo pipefail
cd "$(dirname "$0")/.."

videos="$(pwd)/.dados/videos-de-teste"
mkdir -p "$videos/Series/Breaking Bad"

gerar() {
  ffmpeg -loglevel error -y -f lavfi -i "testsrc2=size=640x360:rate=25" \
    -f lavfi -i "sine=frequency=440:sample_rate=48000" -t "$2" \
    -c:v libx264 -pix_fmt yuv420p -preset ultrafast -c:a aac -movflags +faststart "$1"
}
gerar "$videos/Sintel.2010.1080p.Dublado.mp4" 40
gerar "$videos/Series/Breaking Bad/Breaking.Bad.S01E01.720p.mp4" 40
gerar "$videos/Series/Breaking Bad/Breaking.Bad.S01E02.720p.mp4" 40
gerar "$videos/Video da festa da familia.mp4" 10
printf '1\n00:00:01,000 --> 00:00:05,000\nLegenda de teste: ação, coração e pão\n' \
  > "$videos/Series/Breaking Bad/Breaking.Bad.S01E01.720p.srt"

cat > .env.local <<EOF
TMDB_TOKEN=${TMDB_TOKEN}
BIBLIOTECA_DIR=${videos}
CASA_SEGREDO=$(node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))")
EOF
node scripts/casa-usuario.mjs "${E2E_LOGIN:-1}" "Pessoa de Teste" "${E2E_SENHA}"
echo "ambiente de teste pronto"
