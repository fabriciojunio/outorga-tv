import type { Metadata } from 'next';
import { Prateleiras } from '@/components/casa/Prateleiras';

export const metadata: Metadata = { title: 'Infantil' };
export const dynamic = 'force-dynamic';

export default function Infantil() {
  return (
    <div className="envolucro casa-fileiras">
      <h1 className="titulo-pagina">Infantil</h1>
      <p className="fraco">Só classificação livre ou até 10 anos.</p>
      <Prateleiras pagina="infantil" />
    </div>
  );
}
