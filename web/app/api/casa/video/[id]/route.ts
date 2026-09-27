import { createReadStream, promises as fs } from 'node:fs';
import path from 'node:path';
import { Readable } from 'node:stream';
import { caminhoSeguro, EXTENSOES_DE_VIDEO } from '@/lib/biblioteca';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Pedaço máximo por resposta quando o navegador pede "daqui até o fim".
// Sem limite, a TV pediria o arquivo de 4 GB inteiro de uma vez.
const PEDACO = 8 * 1024 * 1024;

/**
 * Entrega o vídeo em pedaços. O player pede faixa de bytes (cabeçalho Range)
 * para começar a tocar antes de baixar tudo e para pular para o meio do
 * filme; sem responder 206, o avanço não funciona em celular nem em TV.
 */
export async function GET(pedido: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const arquivo = caminhoSeguro(id);
  if (!arquivo) return new Response('Vídeo não encontrado', { status: 404 });

  let tamanho: number;
  try {
    tamanho = (await fs.stat(arquivo)).size;
  } catch {
    return new Response('Vídeo não encontrado', { status: 404 });
  }

  const tipo = EXTENSOES_DE_VIDEO[path.extname(arquivo).toLowerCase()] ?? 'application/octet-stream';
  const faixa = pedido.headers.get('range')?.match(/^bytes=(\d*)-(\d*)$/);

  if (!faixa) {
    return new Response(corrente(arquivo, 0, tamanho - 1), {
      headers: {
        'Content-Type': tipo,
        'Content-Length': String(tamanho),
        'Accept-Ranges': 'bytes',
      },
    });
  }

  let inicio: number;
  let fim: number;
  if (faixa[1] === '') {
    // "bytes=-500": os últimos 500 bytes, que é onde o mp4 às vezes guarda o índice.
    inicio = Math.max(0, tamanho - Number(faixa[2]));
    fim = tamanho - 1;
  } else {
    inicio = Number(faixa[1]);
    fim = faixa[2] === '' ? Math.min(inicio + PEDACO - 1, tamanho - 1) : Math.min(Number(faixa[2]), tamanho - 1);
  }

  if (inicio >= tamanho || inicio > fim) {
    return new Response(null, { status: 416, headers: { 'Content-Range': `bytes */${tamanho}` } });
  }

  return new Response(corrente(arquivo, inicio, fim), {
    status: 206,
    headers: {
      'Content-Type': tipo,
      'Content-Length': String(fim - inicio + 1),
      'Content-Range': `bytes ${inicio}-${fim}/${tamanho}`,
      'Accept-Ranges': 'bytes',
    },
  });
}

function corrente(arquivo: string, inicio: number, fim: number) {
  return Readable.toWeb(createReadStream(arquivo, { start: inicio, end: fim })) as ReadableStream;
}
