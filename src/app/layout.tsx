export const metadata = {
  title: 'Facturify - Veri*factu',
  description: 'Sistema de facturación electrónica',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es">
      <body>
        {children}
      </body>
    </html>
  )
}