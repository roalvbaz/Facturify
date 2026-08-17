import './globals.css';

export const metadata = {
  title: 'Facturify - Panel Veri*factu',
  description: 'Sistema de facturación inmutable',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <head>
        <link 
          rel="stylesheet" 
          href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" 
        />
        {/* CARGAMOS HTML2PDF DESDE CDN PARA EVITAR ERRORES DE NPM */}
        <script src="https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js" async></script>
      </head>
      {/* Reseteamos márgenes para evitar desplazamientos y quitamos las clases antiguas */}
      <body style={{ margin: 0, padding: 0, minHeight: '100vh' }}>
        {children}
      </body>
    </html>
  );
}