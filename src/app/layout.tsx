import './globals.css';
import { Toaster } from "@/components/ui/sonner";
import { Inter } from "next/font/google";
import { cn } from "@/lib/utils";
import { ThemeProvider } from "next-themes";

const inter = Inter({subsets:['latin'],variable:'--font-sans'});

export const metadata = {
  title: 'FacturON',
  description: 'Sistema de facturación inmutable',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className={cn("font-sans", inter.variable)} suppressHydrationWarning>
      <head>
        <link
          rel="stylesheet"
          href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css"
        />
        <link rel="icon" href='logo.png'/>
        {/* CARGAMOS HTML2PDF DESDE CDN PARA EVITAR ERRORES DE NPM */}
        <script src="https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js" async></script>
      </head>
      <body style={{ margin: 0, padding: 0, minHeight: '100vh', backgroundColor: 'var(--bg-color)', color: 'var(--text-main)', transition: 'background-color 0.2s ease, color 0.2s ease' }}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          {children}
        </ThemeProvider>
        <Toaster closeButton richColors position="top-right" />
      </body>
    </html>
  );
}