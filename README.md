# ADAF Dashboard - Sistema Integrado de Agentes de Inteligencia Financiera

🎯 **Sistema completo unificado** - Todos los componentes integrados en un solo proyecto Next.js

## ✅ ¿Qué incluye este proyecto?

### 🚀 **Core Next.js Application**
- **Dashboard Web**: Interfaz completa en React/Next.js 15
- **API Routes**: Endpoints REST integrados para ingesta y consulta
- **SSR/SSG**: Renderizado optimizado para performance

### 🤖 **Sistema de Agentes Inteligentes**
- **17 Agentes Especializados**: NM-1 a OP-X con lógica específica
- **Worker Automatizado**: Procesamiento en background con cron
- **Heurísticas Avanzadas**: Detección de patrones y anomalías

### 📡 **Ingesta de Datos (Sección 2 Completa)**
- **RSS News Parser**: Procesamiento de noticias financieras
- **DeFiLlama Integration**: Datos TVL en tiempo real
- **Redis Deduplication**: Sistema SHA256 para evitar duplicados
- **PostgreSQL + Prisma**: Persistencia robusta y tipada

### 🔥 **APIs Disponibles**
```
POST /api/ingest/news           # Ingestar noticias
POST /api/ingest/onchain/tvl    # Ingestar datos TVL
GET  /api/read/alerts           # Consultar alertas
GET  /api/read/opportunities    # Consultar oportunidades
GET  /api/health               # Health check
```

## 🛠 **Instalación y Configuración**

### 1. **Instalar Dependencias**
```bash
npm install
```

### 2. **Configurar Base de Datos**
```bash
# Generar cliente Prisma
npm run db:generate

# Aplicar schema
npm run db:push

# (Opcional) Abrir Prisma Studio
npm run db:studio
```

### 3. **Configurar Redis**
```bash
# Iniciar Redis
npm run redis:start

# O manualmente
redis-server
```

### 4. **Variables de Entorno**
```bash
cp .env.example .env.local
```
Configurar:
```
DATABASE_URL="postgresql://user:pass@localhost:5432/adaf_db"
REDIS_HOST=localhost
REDIS_PORT=6379
NEXT_PUBLIC_SOSO_API_KEY=your_sosovalue_api_key_here
```

## 🏃‍♂️ **Ejecutar el Proyecto**

### **Servidor de Desarrollo**
```bash
npm run dev
# Dashboard disponible en: http://localhost:3000
```

### **Worker de Agentes** (Terminal separado)
```bash
npm run worker:start
```

### **Pruebas**
```bash
# Todas las pruebas
npm test

# Pruebas específicas
npm run test:ingestion  # Ingesta de datos
npm run test:agents     # Workers de agentes  
npm run test:e2e        # End-to-end
```

## 📁 **Estructura del Proyecto**

```
adaf-dashboard-pro/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── ingest/
│   │   │   │   ├── news/route.ts
│   │   │   │   └── onchain/tvl/route.ts
│   │   │   ├── read/
│   │   │   │   ├── alerts/route.ts
│   │   │   │   └── opportunities/route.ts
│   │   │   └── health/route.ts
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── lib/
│   │   ├── agents/
│   │   │   └── worker.ts         # Worker principal
│   │   ├── ingest/
│   │   │   └── adapters/         # RSS y DeFiLlama
│   │   ├── ssv.ts                # SoSoValue integration
│   │   └── [otros módulos...]
│   └── components/               # UI Components
├── tests/                        # Pruebas completas
├── prisma/
│   └── schema.prisma            # Schema de base de datos
├── package.json                 # Todas las dependencias
└── README.md                    # Este archivo
```

## 🎯 **Flujo de Datos**

1. **Ingesta**: RSS/DeFiLlama → API Routes → Redis Dedup → PostgreSQL
2. **Procesamiento**: Worker lee señales → Aplica heurísticas → Genera alertas/oportunidades
3. **Consulta**: Dashboard consume API → Muestra alertas y oportunidades en tiempo real

## 🧪 **Validación del Sistema**

### **Health Check**
```bash
curl http://localhost:3000/api/health
```

### **Ingesta de Prueba**
```bash
# Noticia de prueba
curl -X POST http://localhost:3000/api/ingest/news \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Bitcoin Breaks $50k",
    "description": "Major market movement detected",
    "link": "https://example.com/news",
    "pubDate": "'$(date -Iseconds)'",
    "source": "TestSource"
  }'

# Datos TVL de prueba  
curl -X POST http://localhost:3000/api/ingest/onchain/tvl \
  -H "Content-Type: application/json" \
  -d '{
    "protocol": "uniswap",
    "tvl": 5800000000,
    "change24h": -0.125,
    "timestamp": "'$(date -Iseconds)'",
    "chain": "ethereum"
  }'
```

### **Consulta de Resultados**
```bash
# Ver alertas generadas
curl http://localhost:3000/api/read/alerts

# Ver oportunidades detectadas
curl http://localhost:3000/api/read/opportunities
```

## 🚀 **Producción**

```bash
# Build optimizado
npm run build

# Iniciar en producción  
npm start
```

---

## 📊 **Métricas del Proyecto**

- ✅ **17 Agentes Inteligentes** implementados
- ✅ **Sistema de Deduplicación Redis** con SHA256
- ✅ **Base de Datos TimescaleDB** para series temporales
- ✅ **API REST Completa** con validación Zod
- ✅ **Pruebas E2E** con cobertura completa
- ✅ **Worker Automatizado** con cron scheduling
- ✅ **Adaptadores Externos** (RSS, DeFiLlama, SoSoValue)
- ✅ **28 Tests** pasando exitosamente
- ✅ **ETF Analytics** integrado con SoSoValue

**Estado**: 🎉 **COMPLETAMENTE INTEGRADO Y FUNCIONAL**
