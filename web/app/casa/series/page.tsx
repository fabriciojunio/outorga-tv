import type { Metadata } from 'next';
import { Prateleiras } from '@/components/casa/Prateleiras';

export const metadata: Metadata = { title: 'Séries e novelas' };
export const dynamic = 'force-dynamic';

export default function Series() {
  return (
    <div className="envolucro casa-fileiras">
      <h1 className="titulo-pagina">Séries e novelas</h1>
      <Prateleiras pagina="series" />
    </div>
  );
}
