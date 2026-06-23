import "./globals.css";

export const metadata = {
  title: "adjaragua1992 V2.0",
  description: "Enciclopédia histórica da Associação Desportiva Jaraguá",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
