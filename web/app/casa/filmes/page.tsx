import type { Metadata } from 'next';
import { Prateleiras } from '@/components/casa/Prateleiras';

export const metadata: Metadata = { title: 'Filmes' };
export const dynamic = 'force-dynamic';

export default function Filmes() {
  return (
    <div className="envolucro casa-fileiras">
      <h1 className="titulo-pagina">Filmes</h1>
      <Prateleiras pagina="filmes" />
    </div>
  );
}
