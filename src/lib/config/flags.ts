export const FLAGS = {
  eCharts: process.env.NEXT_PUBLIC_FEATURE_ECHARTS === '1',
  semaforoPlus: process.env.NEXT_PUBLIC_FEATURE_SEMAFORO_PLUS === '1',
} as const
