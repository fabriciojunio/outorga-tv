import { acervo } from '@/lib/casa/acervo';
import { PRATELEIRAS, prateleirasDa, type Pagina } from '@/lib/casa/prateleiras';
import { Fileira, paraItem } from './Fileira';

/**
 * Todas as fileiras de uma página, na ordem do arquivo de prateleiras. Cada
 * uma sai do banco; uma prateleira que falhar some sozinha, sem levar a
 * página junto.
 */
export async function Prateleiras({ pagina }: { pagina: Pagina }) {
  const nomes = prateleirasDa(pagina);
  const listas = await Promise.all(nomes.map((nome) => acervo.lista(nome).catch(() => [])));
  const vazias = listas.every((l) => l.length === 0);

  return (
    <>
      {vazias && (
        <div className="aviso atencao">
          Não foi possível falar com o TMDB agora e o banco ainda não tem esta página guardada. Confira a internet e
          recarregue em alguns segundos.
        </div>
      )}
      {nomes.map((nome, i) => (
        <Fileira key={nome} titulo={PRATELEIRAS[nome].nome} itens={(listas[i] ?? []).map(paraItem)} />
      ))}
    </>
  );
}
