import client from 'prom-client'

export const registry = new client.Registry()
client.collectDefaultMetrics({ register: registry })

export const mSignalsProcessed = new client.Counter({
  name: 'adaf_signals_processed_total',
  help: 'Signals processed total'
})
export const mAlertsCreated = new client.Counter({
  name: 'adaf_alerts_created_total',
  help: 'Alerts created total'
})
export const mOppsCreated = new client.Counter({
  name: 'adaf_opportunities_created_total',
  help: 'Opportunities created total'
})
export const gLastTickTs = new client.Gauge({
  name: 'adaf_worker_last_tick_ts',
  help: 'Unix timestamp of last worker tick'
})
export const cApiRequests = new client.Counter({
  name: 'adaf_api_requests_total',
  help: 'API requests total',
  labelNames: ['route','method','status'] as const
})

export function incApiRequest(route: string, method: string, status: number, _duration?: number) {
  try {
    cApiRequests.labels({ route, method: method.toUpperCase(), status: String(status) }).inc()
    // Duration is ignored for now, can be logged or used for histograms in the future
  } catch {
    // no-op
  }
}

export const cOpxActions = new client.Counter({
  name: 'adaf_opx_actions_total',
  help: 'OP-X actions total',
  labelNames: ['action','status'] as const
})

export function incOpxAction(action: 'APPROVE'|'REJECT', status: 'ok'|'noop'|'error') {
  try { cOpxActions.labels({ action, status }).inc() } catch { /* no-op */ }
}

export const gOpxBacklog = new client.Gauge({
  name: 'adaf_opx_backlog_total',
  help: 'OP-X backlog total by status',
  labelNames: ['status'] as const
})

export function setOpxBacklog(status: 'proposed'|'approved'|'rejected', value: number) {
  try { gOpxBacklog.labels({ status }).set(value) } catch { /* no-op */ }
}

// Derivatives metrics
export const cDerivsFundingAlerts = new client.Counter({
  name: 'adaf_derivs_funding_alerts_total',
  help: 'Derivatives funding alerts total',
  labelNames: ['asset', 'exchange'] as const
})

export const gDerivsFundingNegHours = new client.Gauge({
  name: 'adaf_derivs_funding_neg_hours',
  help: 'Hours of negative funding by asset and exchange',
  labelNames: ['asset', 'exchange'] as const
})

export function incDerivsFundingAlert(asset: 'BTC'|'ETH', exchange: string) {
  try { cDerivsFundingAlerts.labels({ asset, exchange }).inc() } catch { /* no-op */ }
}

export function setDerivsFundingNegHours(asset: 'BTC'|'ETH', exchange: string, hours: number) {
  try { gDerivsFundingNegHours.labels({ asset, exchange }).set(hours) } catch { /* no-op */ }
}

// DQP (Data Quality & Pipeline) metrics
export const cDqpIncidents = new client.Counter({
  name: 'adaf_dqp_incidents_total',
  help: 'DQP incidents total by kind, source, and agent',
  labelNames: ['kind', 'source', 'agentCode'] as const
})

export const gDqpSourcesStatus = new client.Gauge({
  name: 'adaf_dqp_sources_status',
  help: 'Number of sources by status (ok/warn/fail)',
  labelNames: ['status'] as const
})

export const gDqpLastFreshnessMinutes = new client.Gauge({
  name: 'adaf_dqp_last_freshness_minutes',
  help: 'Last calculated freshness in minutes by source and agent',
  labelNames: ['source', 'agentCode', 'type'] as const
})

export function incDqpIncident(kind: string, source: string, agentCode: string) {
  try { cDqpIncidents.labels({ kind, source, agentCode }).inc() } catch { /* no-op */ }
}

export function setDqpSourcesStatus(status: 'ok'|'warn'|'fail', count: number) {
  try { gDqpSourcesStatus.labels({ status }).set(count) } catch { /* no-op */ }
}

export function setDqpLastFreshness(source: string, agentCode: string, type: string, minutes: number) {
  try { gDqpLastFreshnessMinutes.labels({ source, agentCode, type }).set(minutes) } catch { /* no-op */ }
}

// Lineage metrics
export const cLineageEvents = new client.Counter({
  name: 'adaf_lineage_events_total',
  help: 'Lineage events recorded total',
  labelNames: ['stage', 'entity', 'source'] as const
})

export const cLineageSearch = new client.Counter({
  name: 'adaf_lineage_search_total',
  help: 'Lineage search operations total',
  labelNames: ['entity', 'stage', 'source', 'status'] as const
})

export const hLineageSearchDuration = new client.Histogram({
  name: 'adaf_lineage_search_duration_seconds',
  help: 'Lineage search operation duration in seconds',
  buckets: [0.05, 0.1, 0.25, 0.5, 1, 2, 5]
})

export const cLineageViews = new client.Counter({
  name: 'adaf_lineage_views_total',
  help: 'Lineage UI views total',
  labelNames: ['entity'] as const
})

export function incLineageEvent(stage: 'ingest' | 'transform' | 'aggregate' | 'export', entity: 'signal' | 'metric' | 'report', source: string) {
  try { cLineageEvents.labels({ stage, entity, source }).inc() } catch { /* no-op */ }
}

export function incLineageSearch(
  entity?: string, 
  stage?: string, 
  source?: string, 
  status: 'ok' | 'error' = 'ok'
) {
  try { 
    cLineageSearch.labels({ 
      entity: entity || 'unknown',
      stage: stage || 'unknown', 
      source: source || 'unknown',
      status 
    }).inc() 
  } catch { /* no-op */ }
}

export function observeLineageSearchDuration(seconds: number) {
  try { hLineageSearchDuration.observe(seconds) } catch { /* no-op */ }
}

export function incLineageView(entity: 'signal' | 'metric' | 'report') {
  try { cLineageViews.labels({ entity }).inc() } catch { /* no-op */ }
}

// Academy metrics
export const cAcademyExercisesRun = new client.Counter({
  name: 'adaf_academy_exercises_run_total',
  help: 'Academy exercises run total'
})

export const cAcademyLessonsStarted = new client.Counter({
  name: 'adaf_academy_lessons_started_total',
  help: 'Academy lessons started total'
})

export const cAcademyLessonsCompleted = new client.Counter({
  name: 'adaf_academy_lessons_completed_total',
  help: 'Academy lessons completed total'
})

export const cAcademyQuizSubmissions = new client.Counter({
  name: 'adaf_academy_quiz_submissions_total',
  help: 'Academy quiz submissions total'
})

export function incAcademyExercisesRun() {
  try { cAcademyExercisesRun.inc() } catch { /* no-op */ }
}

export function incAcademyLessonsStarted() {
  try { cAcademyLessonsStarted.inc() } catch { /* no-op */ }
}

export function incAcademyLessonsCompleted() {
  try { cAcademyLessonsCompleted.inc() } catch { /* no-op */ }
}

export function incAcademyQuizSubmissions() {
  try { cAcademyQuizSubmissions.inc() } catch { /* no-op */ }
}

registry.registerMetric(mSignalsProcessed)
registry.registerMetric(mAlertsCreated)
registry.registerMetric(mOppsCreated)
registry.registerMetric(gLastTickTs)
registry.registerMetric(cApiRequests)
registry.registerMetric(cOpxActions)
registry.registerMetric(gOpxBacklog)
registry.registerMetric(cDerivsFundingAlerts)
registry.registerMetric(gDerivsFundingNegHours)
registry.registerMetric(cDqpIncidents)
registry.registerMetric(gDqpSourcesStatus)
registry.registerMetric(gDqpLastFreshnessMinutes)
registry.registerMetric(cLineageEvents)
registry.registerMetric(cLineageSearch)
registry.registerMetric(hLineageSearchDuration)
registry.registerMetric(cLineageViews)
registry.registerMetric(cAcademyExercisesRun)
registry.registerMetric(cAcademyLessonsStarted)
registry.registerMetric(cAcademyLessonsCompleted)
registry.registerMetric(cAcademyQuizSubmissions)
