# Modo "Em casa"

O Outorga TV nasceu como plataforma de streaming white-label (a parte em
`backend/` e nas páginas da raiz do site). O modo **Em casa** é outra coisa,
que mora no mesmo site em `/casa`: a central de TV da família, que junta os
vídeos do computador de casa, o catálogo do TMDB, canais ao vivo e os jogos
do dia, e funciona no computador, no celular e na TV.

Ele não passa pelo `Titulo.publicar` da plataforma, e não precisa: não
publica conteúdo de terceiro. O que toca é vídeo do próprio PC ou
transmissão oficial liberada para tocar fora do YouTube. O resto abre no app
de quem tem o direito (Globoplay, Netflix, SBT...).

## Como as peças se encaixam

```
 celular / TV / PC ──► servidor Next.js (PC de casa, porta 3000)
   app Android              │
   ou navegador             ├─ acervo (SQLite em web/.dados/casa.db)
                            │     └─ sincronizador ──► TMDB (catálogo)
                            ├─ pasta de vídeos (BIBLIOTECA_DIR)
                            ├─ canais ao vivo ──► YouTube (lives oficiais)
                            └─ esportes ──► placar público da ESPN

 fora de casa ─────────► mesmo site na Vercel (sem a pasta de vídeos)
```

**O acervo** é a regra que deixa tudo rápido: a tela sempre lê do banco. Se o
registro existe, responde na hora, mesmo velho, e atualiza por trás. O TMDB
só é chamado com a tela esperando quando o título nunca foi visto. Um
sincronizador roda a cada 30 minutos: renova as prateleiras, puxa antes o
detalhe de tudo que aparece nelas, pergunta ao TMDB o que mudou (endpoint
`/changes`) e atualiza só isso. O banco é SQLite local e não o Neon porque o
sincronizador manteria o Neon acordado e gastaria a cota de horas da conta.

**O app de Android** (`android/`) é um WebView nativo, sem biblioteca de
terceiros. Ao abrir, procura o PC de casa na rede (tenta o último endereço
e, se não responder, varre a rede local atrás de `/api/casa/vivo`). Achou,
usa o PC; não achou, usa o site da Vercel. Ninguém digita endereço.

## Onde mexer

| Quero... | Arquivo |
|---|---|
| criar, tirar ou reordenar uma prateleira | `web/lib/casa/prateleiras.ts` |
| pôr ou tirar um canal ao vivo | `web/lib/casa/canais.ts` |
| mudar as competições de esporte | `web/lib/casa/esportes.ts` (`COMPETICOES`) |
| trocar a busca de um serviço de streaming | `web/lib/casa/servicos.ts` |
| criar usuário ou trocar senha | `npm run casa:usuario -- 4 "Nome Completo" SenhaNova` |

## Instalar no PC de casa (Windows)

1. Instale o Node.js 22 ou mais novo.
2. Em `web/.env.local`, preencha `TMDB_TOKEN` e `BIBLIOTECA_DIR` (a pasta dos
   filmes). O exemplo comentado está em `web/.env.example`.
3. Crie os usuários: `npm run casa:usuario -- 1 "Nome" Senha123` (dentro de `web/`).
4. Rode `instalar\windows\instalar.ps1`. Ele monta o site, libera a porta
   3000 só para a rede local, faz o servidor subir com o Windows e cria o
   atalho "Outorga TV" na área de trabalho.

Para desfazer: `instalar\windows\desinstalar.ps1`.

Em Linux, NAS ou mini PC: `docker compose --profile casa up -d`, com
`PASTA_DE_VIDEOS` apontando para os filmes. Em Kubernetes caseiro (k3s):
`infra/k8s/casa.yaml`.

## Vídeos do PC

- Formatos: mp4, m4v, webm, mkv e mov. **MP4 com H.264 e AAC toca em
  qualquer aparelho.** MKV e vídeo HEVC dependem do aparelho; quando não
  tocam, a tela diz isso em vez de ficar preta.
- Legenda: um `.srt` com o mesmo nome do vídeo, ao lado dele. Legenda em
  Windows-1252 (a maioria das baixadas no Brasil) é lida certo.
- Série: nomes com `S01E02` ou `1x02`. Pasta com o nome da série funciona
  mesmo quando o arquivo se chama só `S01E02.mp4`.
- Dublado e legendado são separados pelo nome (`dublado`, `dual`, `leg`) e
  pela presença do `.srt`.
- Arquivo novo aparece em até um minuto.

## Segurança

- Login por número e senha. Senha guardada só como hash scrypt, em
  `CASA_USUARIOS`; o cookie de sessão é assinado (HMAC-SHA256) e dura 180
  dias, para ninguém precisar digitar senha no controle toda semana.
- Cinco senhas erradas no mesmo número bloqueiam aquele número por 15
  minutos. Por endereço, só na Vercel (em casa todos saem pelo mesmo
  endereço, e o bloqueio trancaria a família inteira).
- O vídeo só é servido de dentro da pasta configurada: todo pedido é
  resolvido e conferido de novo, e `../` não sai dela.
- O token do TMDB fica só no servidor. Nada de segredo vai para o navegador
  nem para o repositório.
- Política de segurança de conteúdo: o único iframe permitido é o do
  YouTube sem cookie.

## Testes

```
cd web
npm test                      # unidade (regras, acervo, sessão, biblioteca)
E2E_LOGIN=1 E2E_SENHA=... npm run test:e2e   # ponta a ponta, com o servidor de pé
```

Os de ponta a ponta rodam em três telas (computador, celular e TV de 1920
com as setas do controle), tocam vídeo de verdade e usam o Edge ou o
Chrome, porque o Chromium puro não toca H.264.

## Limites que valem saber

- **Netflix, Globoplay, Globo, Premiere** e afins não tocam dentro do app.
  Nenhuma API entrega esse vídeo; o botão abre o app oficial.
- **TV Samsung e LG** não instalam APK. Usam o navegador da TV.
- Transmissão do YouTube que proíbe tocar fora (acontece com jogo) é
  detectada na hora e vira um botão "Abrir no YouTube".
