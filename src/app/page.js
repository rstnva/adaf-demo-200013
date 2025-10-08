// This file is intentionally left blank to disable the legacy page.js and allow page.tsx to render the dashboard.

// ...existing code...
export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-5xl font-bold text-gray-900 mb-6">
            🎯 ADAF Dashboard - Integración Completa
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            ✅ Sistema Integrado - Todos los componentes de Sección 2 migrados exitosamente
          </p>
          
          <div className="bg-green-100 border-l-4 border-green-500 p-6 mb-8">
            <h2 className="text-lg font-semibold text-green-800 mb-2">
              ✅ Integración Completada
            </h2>
            <ul className="text-green-700 space-y-1 text-left">
              <li>• FastAPI routers migrados a Next.js API routes</li>
              <li>• Worker de agentes integrado (src/lib/agents/worker.ts)</li>
              <li>• Adaptadores RSS y DeFiLlama configurados</li>
              <li>• Sistema de deduplicación Redis implementado</li>
              <li>• Esquema Prisma completo configurado</li>
              <li>• Pruebas de integración actualizadas</li>
            </ul>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-12">
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                📨 API de Ingesta
              </h3>
              <div className="text-sm text-gray-600 space-y-1">
                <p>POST /api/ingest/news</p>
                <p>POST /api/ingest/onchain/tvl</p>
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                📊 API de Consulta
              </h3>
              <div className="text-sm text-gray-600 space-y-1">
                <p>GET /api/read/alerts</p>
                <p>GET /api/read/opportunities</p>
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                🤖 Agent Workers
              </h3>
              <p className="text-gray-600">
                Procesamiento automático con heurísticas avanzadas
              </p>
            </div>
            
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibent text-gray-900 mb-2">
                🔄 Adaptadores
              </h3>
              <p className="text-gray-600">
                RSS News Parser y DeFiLlama TVL Client
              </p>
            </div>
          </div>

          <div className="mt-8 p-6 bg-blue-50 rounded-lg">
            <h3 className="text-lg font-semibold mb-3">🚀 Próximos Pasos</h3>
            <div className="text-left space-y-2">
              <p>1. Configurar PostgreSQL y Redis</p>
              <p>2. Ejecutar: <code className="bg-gray-200 px-2 py-1 rounded">npm run db:generate</code></p>
              <p>3. Iniciar worker: <code className="bg-gray-200 px-2 py-1 rounded">npm run worker:start</code></p>
              <p>4. Ejecutar pruebas: <code className="bg-gray-200 px-2 py-1 rounded">npm test</code></p>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}