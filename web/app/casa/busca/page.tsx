import type { Metadata } from 'next';
import { Fileira, paraItem } from '@/components/casa/Fileira';
import { acervo } from '@/lib/casa/acervo';
import type { Cartaz } from '@/lib/tmdb';

export const metadata: Metadata = { title: 'Busca' };

export default async function Busca({ searchParams }: { searchParams: Promise<{ q?: string | string[] }> }) {
  const bruto = (await searchParams).q;
  const termo = ((Array.isArray(bruto) ? bruto[0] : bruto) ?? '').trim().slice(0, 100);

  let resultado: Cartaz[] = [];
  let falhou = false;
  if (termo.length >= 2) {
    try {
      resultado = await acervo.busca(termo);
    } catch {
      falhou = true;
    }
  }

  return (
    <div className="envolucro secao">
      <form action="/casa/busca" role="search" className="busca-grande">
        <input
          name="q"
          type="search"
          defaultValue={termo}
          placeholder="Nome do filme ou da série"
          aria-label="Nome do filme ou da série"
          enterKeyHint="search"
          autoComplete="off"
          autoFocus={!termo}
        />
        <button className="botao" type="submit">
          Buscar
        </button>
      </form>

      {falhou && <div className="aviso erro">A busca falhou agora. Tente de novo em instantes.</div>}
      {termo.length >= 2 && !falhou && resultado.length === 0 && (
        <p className="fraco">Nada encontrado para &ldquo;{termo}&rdquo;.</p>
      )}
      {termo.length === 1 && <p className="fraco">Digite pelo menos duas letras.</p>}

      {resultado.length > 0 && (
        <div className="grade-cartazes">
          <Fileira titulo={`Resultado para “${termo}”`} itens={resultado.map(paraItem)} />
        </div>
      )}
    </div>
  );
}
