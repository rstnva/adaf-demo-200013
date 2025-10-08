# ADAF Dashboard Production Runbooks
*Version 2.0 - Security Hardened Production Environment*

## 🚨 Emergency Contacts & Escalation

**Primary On-Call:** DevOps Team  
**Secondary:** Lead Developer  
**Emergency Escalation:** CTO  

**Monitoring Dashboards:**
- Grafana: http://localhost:3001 (Wall Street Pulse Dashboard)
- Prometheus: http://localhost:9090
- Jaeger Tracing: http://localhost:16686

---

## 🔥 Critical Incident Response

### **Incident 1: Database Primary Down**

**Symptoms:**
- Health check `/api/health/db` returns 503
- Application shows database connection errors
- Prometheus alert: `PostgreSQL Primary Down`

**Immediate Actions (< 5 minutes):**
1. **Promote Standby to Primary**
   ```bash
   # Connect to standby container
   docker exec -it adaf_postgres_standby bash
   
   # Promote to primary
   touch /tmp/postgresql.trigger
   
   # Verify promotion
   psql -U adaf_user -d adaf_dashboard -c "SELECT pg_is_in_recovery();"
   # Should return 'f' (false)
   ```

2. **Update Application Configuration**
   ```bash
   # Update docker-compose.prod.yml
   # Change DATABASE_URL to point to standby (port 5433)
   # Or update NGINX to route DB traffic
   
   # Restart app instances
   docker-compose -f docker-compose.prod.yml restart app-blue app-green
   ```

3. **Verify System Recovery**
   ```bash
   curl -f http://localhost/api/health/app
   curl -f http://localhost/api/health/db
   ```

**Root Cause Analysis:**
- Check original primary logs: `docker logs adaf_postgres_primary`
- Review system resources: disk space, memory, CPU
- Check for corruption: `VACUUM`, `REINDEX` operations

**Recovery Steps:**
1. Fix underlying issue on original primary
2. Rebuild as new standby from current primary
3. Re-establish replication
4. Update monitoring and documentation

---

### **Incident 2: Redis Complete Failure**

**Symptoms:**
- Sessions lost, users logged out
- Cache misses at 100%
- Application slower but functional

**Immediate Actions (< 10 minutes):**
1. **Switch to Redis Replica**
   ```bash
   # Promote replica to primary
   docker exec -it adaf_redis_replica redis-cli
   > REPLICAOF NO ONE
   > CONFIG SET save "900 1"
   ```

2. **Update Application Config**
   ```bash
   # Update REDIS_URL to point to replica (port 6380)
   docker-compose -f docker-compose.prod.yml restart app-blue app-green
   ```

3. **Graceful Degradation Mode**
   - Enable "maintenance mode" if needed
   - Cache bypass for critical Wall Street Pulse data
   - Session storage fallback to database

**Recovery:**
1. Investigate primary Redis failure
2. Restore from AOF/RDB backup if needed
3. Re-establish primary-replica setup

---

### **Incident 3: Application High Error Rate (>1%)**

**Symptoms:**
- Grafana alert: "High Error Rate"
- 5xx responses increasing
- User complaints about functionality

**Immediate Actions (< 3 minutes):**
1. **Blue-Green Rollback**
   ```bash
   ./scripts/deploy-bluegreen.sh rollback
   ```

2. **Traffic Analysis**
   ```bash
   # Check NGINX error logs
   docker logs adaf_nginx | tail -100
   
   # Check application logs
   docker logs adaf_app_blue | grep ERROR | tail -50
   ```

3. **Circuit Breaker Activation**
   - Enable rate limiting for affected endpoints
   - Activate cached responses for Wall Street Pulse data

---

### **Incident 4: Complete Site Down**

**Symptoms:**
- NGINX health check failing
- All services unresponsive
- Load balancer reporting all instances down

**Immediate Actions (< 2 minutes):**
1. **System Status Check**
   ```bash
   docker-compose -f docker-compose.prod.yml ps
   docker system df
   docker system events --since 10m
   ```

2. **Emergency Restart**
   ```bash
   # If resources available, restart all services
   docker-compose -f docker-compose.prod.yml restart
   
   # If resource issues, restart selectively
   docker-compose -f docker-compose.prod.yml up -d postgres-primary redis-primary app-blue nginx
   ```

3. **Disaster Recovery Mode**
   ```bash
   # Restore from backups if needed
   ./scripts/restore-from-backup.sh
   ```

---

## 🔧 Maintenance Procedures

### **Planned Database Maintenance**

**Pre-maintenance Checklist:**
- [ ] Backup verification completed
- [ ] Standby replication lag < 5 seconds
- [ ] Maintenance window announced
- [ ] Rollback plan confirmed

**Maintenance Steps:**
1. Enable maintenance mode
2. Promote standby to primary
3. Perform maintenance on original primary
4. Rebuild as new standby
5. Switch back if needed
6. Disable maintenance mode

### **Application Deployment**

**Blue-Green Deployment:**
```bash
# Standard deployment
./scripts/deploy-bluegreen.sh deploy v2.1.0

# Monitor deployment progress
watch 'curl -s http://localhost/api/health/app | jq .status'

# Rollback if issues
./scripts/deploy-bluegreen.sh rollback
```

**Canary Deployment Monitoring:**
- Watch error rates during each canary stage
- Monitor response times (p95 < 450ms)
- Check Wall Street Pulse data freshness

---

## 📊 Monitoring & Alerting

### **Key Metrics to Watch:**

**Application Performance:**
- Response time p95 < 450ms
- Error rate < 1%
- Wall Street Pulse data freshness < 5 minutes

**Infrastructure Health:**
- Database replication lag < 10 seconds
- Redis memory usage < 80%
- Disk usage < 85%

**Security Indicators:**
- Failed authentication attempts
- Rate limiting triggers
- Unusual traffic patterns

### **Alert Escalation Matrix:**

| Alert Level | Response Time | Action |
|------------|---------------|---------|
| **P0 - Critical** | 5 minutes | Page on-call, auto-rollback |
| **P1 - High** | 15 minutes | Notify on-call, investigate |
| **P2 - Medium** | 1 hour | Create ticket, schedule fix |
| **P3 - Low** | 24 hours | Log for weekly review |

---

## 🧪 Testing & Validation

### **Health Check Commands:**
```bash
# Application health
curl -f http://localhost/api/health/app

# Database health
curl -f http://localhost/api/health/db

# Redis health  
curl -f http://localhost/api/health/redis

# Full system check
curl -f http://localhost/api/health && echo "All systems operational"
```

### **Performance Validation:**
```bash
# Response time test
time curl -s http://localhost/api/read/wsp/etf-flows | jq .

# Load test (basic)
ab -n 1000 -c 10 http://localhost/api/health

# Database performance
docker exec adaf_postgres_primary psql -U adaf_user -d adaf_dashboard -c "SELECT pg_stat_database.datname, pg_size_pretty(pg_database_size(pg_stat_database.datname)) AS size FROM pg_stat_database;"
```

---

## 📞 Communication Templates

### **Incident Communication:**

**Initial Alert:**
> 🚨 **INCIDENT DETECTED**  
> **Service:** ADAF Dashboard  
> **Severity:** [P0/P1/P2]  
> **Impact:** [Brief description]  
> **Status:** Investigating  
> **ETA:** [Estimated time to resolution]

**Progress Update:**
> 📋 **INCIDENT UPDATE**  
> **Service:** ADAF Dashboard  
> **Status:** [In Progress/Resolved]  
> **Actions Taken:** [Brief summary]  
> **Next Steps:** [What's being done next]

**Resolution Notice:**
> ✅ **INCIDENT RESOLVED**  
> **Service:** ADAF Dashboard  
> **Duration:** [Total incident time]  
> **Root Cause:** [Brief explanation]  
> **Prevention:** [Steps taken to prevent recurrence]

---

## 🔄 Recovery Procedures

### **Point-in-Time Recovery (PITR):**
```bash
# Stop application to prevent new writes
docker-compose -f docker-compose.prod.yml stop app-blue app-green

# Restore database to specific timestamp
./scripts/pitr-restore.sh "2024-10-06 14:30:00"

# Verify data integrity
./scripts/verify-restore.sh

# Resume application
docker-compose -f docker-compose.prod.yml start app-blue app-green
```

### **Full System Recovery:**
```bash
# Complete system rebuild from backups
./scripts/disaster-recovery.sh

# Restore databases
./scripts/restore-postgres.sh

# Restore Redis data
./scripts/restore-redis.sh

# Restore application configuration
./scripts/restore-config.sh

# Verify all services
./scripts/verify-system.sh
```

---

## 📝 Post-Incident Actions

**Immediate (< 24 hours):**
1. Document incident timeline
2. Identify root cause
3. Implement immediate fixes
4. Update monitoring/alerting

**Short-term (< 1 week):**
1. Conduct blameless post-mortem
2. Update runbooks
3. Implement prevention measures
4. Test recovery procedures

**Long-term (< 1 month):**
1. Architectural improvements
2. Enhanced monitoring
3. Training updates
4. Process refinements

---

*This runbook should be reviewed and updated quarterly. Last updated: October 2025*