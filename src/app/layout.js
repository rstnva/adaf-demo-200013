import './globals.css'

export const metadata = {
  title: 'ADAF Dashboard - Integración Completa',
  description: 'Sistema Integrado de Inteligencia Financiera - Sección 2 Completada',
}

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  )
}