#!/bin/bash
# Docker Secrets Management Script for ADAF Dashboard
# Creates and manages all required secrets for production deployment

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Logging functions
log() {
    echo -e "${BLUE}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" >&2
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

warn() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Configuration
SECRETS_DIR="/tmp/adaf_secrets"
BACKUP_DIR="./secrets_backup"

# Generate secure random password
generate_password() {
    local length=${1:-32}
    openssl rand -base64 $length | tr -d "=+/" | cut -c1-$length
}

# Create secrets directory
create_secrets_dir() {
    log "Creating temporary secrets directory..."
    mkdir -p "$SECRETS_DIR"
    chmod 700 "$SECRETS_DIR"
    success "Secrets directory created at $SECRETS_DIR"
}

# Generate all required secrets
generate_secrets() {
    log "Generating secure secrets..."
    
    # PostgreSQL secrets
    echo "$(generate_password 32)" > "$SECRETS_DIR/postgres_password"
    echo "$(generate_password 32)" > "$SECRETS_DIR/postgres_replication_password"
    
    # Application secrets
    echo "$(generate_password 64)" > "$SECRETS_DIR/app_secret_key"
    echo "$(generate_password 64)" > "$SECRETS_DIR/jwt_secret"
    
    # AWS/S3 credentials for WAL-G (you'll need to provide these)
    echo "REPLACE_WITH_YOUR_AWS_ACCESS_KEY" > "$SECRETS_DIR/aws_access_key"
    echo "REPLACE_WITH_YOUR_AWS_SECRET_KEY" > "$SECRETS_DIR/aws_secret_key"
    
    # Grafana admin password
    echo "$(generate_password 24)" > "$SECRETS_DIR/grafana_password"
    
    # Redis password
    echo "$(generate_password 32)" > "$SECRETS_DIR/redis_password"
    
    success "All secrets generated successfully"
}

# Create Docker secrets
create_docker_secrets() {
    log "Creating Docker secrets..."
    
    for secret_file in "$SECRETS_DIR"/*; do
        if [ -f "$secret_file" ]; then
            secret_name=$(basename "$secret_file")
            
            # Check if secret already exists
            if docker secret inspect "$secret_name" >/dev/null 2>&1; then
                warn "Secret '$secret_name' already exists, removing..."
                docker secret rm "$secret_name" 2>/dev/null || true
            fi
            
            # Create new secret
            docker secret create "$secret_name" "$secret_file"
            success "Created Docker secret: $secret_name"
        fi
    done
}

# Backup secrets (encrypted)
backup_secrets() {
    log "Creating encrypted backup of secrets..."
    
    mkdir -p "$BACKUP_DIR"
    
    # Create encrypted tar archive
    tar -czf - -C "$SECRETS_DIR" . | \
        openssl enc -aes-256-cbc -salt -pbkdf2 -iter 100000 \
        -out "$BACKUP_DIR/adaf_secrets_$(date +%Y%m%d_%H%M%S).tar.gz.enc"
    
    success "Encrypted backup created in $BACKUP_DIR"
    warn "Please store the backup password securely!"
}

# Display generated secrets (masked)
display_secrets() {
    log "Generated secrets summary:"
    echo
    
    for secret_file in "$SECRETS_DIR"/*; do
        if [ -f "$secret_file" ]; then
            secret_name=$(basename "$secret_file")
            secret_value=$(cat "$secret_file")
            
            # Mask the secret for display (show first 4 chars + asterisks)
            masked_value="${secret_value:0:4}$(printf '%*s' $((${#secret_value}-4)) | tr ' ' '*')"
            
            printf "%-30s : %s\n" "$secret_name" "$masked_value"
        fi
    done
    
    echo
    warn "AWS credentials need to be updated with your actual values!"
    echo "Update the following files in $SECRETS_DIR:"
    echo "  - aws_access_key"
    echo "  - aws_secret_key"
}

# Cleanup function
cleanup() {
    log "Cleaning up temporary files..."
    rm -rf "$SECRETS_DIR"
    success "Cleanup completed"
}

# Create environment file template
create_env_template() {
    log "Creating .env.prod template..."
    
    cat > .env.prod.template <<EOF
# ADAF Dashboard Production Environment Template
# Copy to .env.prod and fill in the values

# PostgreSQL Configuration
POSTGRES_DB=adaf_dashboard
POSTGRES_USER=adaf_user
POSTGRES_REPLICATION_USER=replicator

# WAL-G S3 Configuration  
WALG_S3_PREFIX=s3://your-backup-bucket/wal-g
AWS_REGION=us-east-1

# OpenTelemetry Configuration
OTEL_EXPORTER_OTLP_ENDPOINT=http://jaeger:4318

# Application Configuration
NODE_ENV=production
PORT=3000
HOSTNAME=0.0.0.0

# Redis Configuration
REDIS_PASSWORD_FILE=/run/secrets/redis_password

# Monitoring
PROMETHEUS_RETENTION_TIME=30d
GRAFANA_DOMAIN=grafana.your-domain.com

# Backup Configuration
BACKUP_RETENTION_DAYS=30
WAL_RETENTION_DAYS=90
EOF

    success "Environment template created: .env.prod.template"
}

# Create rotation script
create_rotation_script() {
    log "Creating secret rotation script..."
    
    cat > scripts/rotate-secrets.sh <<'EOF'
#!/bin/bash
# Secret Rotation Script for ADAF Dashboard
# Run this quarterly to rotate secrets

set -e

SECRETS_TO_ROTATE=("postgres_password" "app_secret_key" "jwt_secret" "grafana_password" "redis_password")
BACKUP_DIR="./secrets_backup/rotation_$(date +%Y%m%d)"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

# Create backup before rotation
mkdir -p "$BACKUP_DIR"

for secret_name in "${SECRETS_TO_ROTATE[@]}"; do
    log "Rotating secret: $secret_name"
    
    # Backup current secret
    docker secret inspect "$secret_name" --format "{{.Spec.Name}}" > "$BACKUP_DIR/${secret_name}.backup" 2>/dev/null || true
    
    # Generate new secret
    new_secret=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-32)
    echo "$new_secret" | docker secret create "${secret_name}_new" -
    
    log "New secret created: ${secret_name}_new"
done

log "Secret rotation completed. Update your docker-compose.prod.yml to use new secrets."
log "Don't forget to restart services after updating configuration."
EOF

    chmod +x scripts/rotate-secrets.sh
    success "Secret rotation script created: scripts/rotate-secrets.sh"
}

# Main execution
main() {
    log "Starting ADAF Dashboard Secrets Management"
    
    # Check prerequisites
    if ! command -v docker >/dev/null 2>&1; then
        error "Docker is required but not installed"
        exit 1
    fi
    
    if ! command -v openssl >/dev/null 2>&1; then
        error "OpenSSL is required but not installed"
        exit 1
    fi
    
    # Create secrets
    create_secrets_dir
    generate_secrets
    
    # Display secrets for user review
    display_secrets
    
    # Ask for confirmation before creating Docker secrets
    echo
    read -p "Do you want to create Docker secrets now? (y/N): " -n 1 -r
    echo
    
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        create_docker_secrets
        backup_secrets
        success "Docker secrets created and backed up"
    else
        log "Skipping Docker secrets creation"
        log "Secrets are available in: $SECRETS_DIR"
    fi
    
    # Create additional files
    create_env_template
    create_rotation_script
    
    # Final instructions
    echo
    log "ADAF Secrets Management completed!"
    echo
    echo "Next steps:"
    echo "1. Update AWS credentials in $SECRETS_DIR/aws_* files"
    echo "2. Copy .env.prod.template to .env.prod and configure"
    echo "3. Run: docker-compose -f docker-compose.prod.yml up -d"
    echo "4. Schedule quarterly secret rotation: scripts/rotate-secrets.sh"
    echo
    warn "Remember to securely store the backup encryption password!"
    
    # Cleanup if secrets were created
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        cleanup
    fi
}

# Handle script termination
trap cleanup EXIT

# Execute main function
main "$@"