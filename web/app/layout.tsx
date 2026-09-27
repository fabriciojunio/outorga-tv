import type { Metadata } from 'next';
import './globals.css';
import { Cabecalho } from '@/components/Cabecalho';
import { Rodape } from '@/components/Rodape';

export const metadata: Metadata = {
  title: 'Outorga TV',
  description: 'Plataforma de streaming white-label com controle de direitos de exibição',
  // O arquivo app/icon.svg vira o favicon sozinho no Next; declarar aqui
  // serve para o caminho não sumir numa limpeza de pasta sem ninguém notar.
  icons: { icon: '/icon.svg', apple: '/icones/180.png' },
  appleWebApp: { capable: true, title: 'Outorga TV', statusBarStyle: 'black-translucent' },
  robots: {
    // Enquanto o serviço é de demonstração, não há motivo para indexar.
    index: false,
    follow: false,
  },
};

export default function LayoutRaiz({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>
        <Cabecalho />
        <main>{children}</main>
        <Rodape />
      </body>
    </html>
  );
}
