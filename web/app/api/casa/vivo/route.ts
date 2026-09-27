/**
 * Resposta curta e aberta, sem login. É o que o app de Android procura na
 * rede de casa para achar o PC sozinho, sem ninguém digitar endereço. Não
 * diz nada além de "sou um Outorga TV em casa".
 */
export function GET() {
  return Response.json(
    { outorga: 'casa', versao: 1 },
    { headers: { 'Cache-Control': 'no-store', 'Access-Control-Allow-Origin': '*' } },
  );
}
