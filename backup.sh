#!/bin/bash

# =============================================================================
# HDOS - Complete Backup Script
# Supports: Database (PostgreSQL), Files (Uploads, Assets), Migrations
# =============================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

# =============================================================================
# CONFIGURATION
# =============================================================================
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKUP_DIR="${SCRIPT_DIR}/backups"
ENV_FILE="${SCRIPT_DIR}/.env"

# Load environment variables
if [ -f "$ENV_FILE" ]; then
    set -a
    source "$ENV_FILE"
    set +a
fi

# Default values
DB_USER="${DB_USER:-hdos}"
DB_PASSWORD="${DB_PASSWORD:-hdos_password}"
DB_NAME="${DB_NAME:-hdos}"
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DATABASE_URL="${DATABASE_URL:-postgresql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}}"

UPLOADS_DIR="${SCRIPT_DIR}/uploads"
ASSETS_DIR="${SCRIPT_DIR}/attached_assets"
MIGRATIONS_DIR="${SCRIPT_DIR}/migrations"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-30}"

# =============================================================================
# HELPER FUNCTIONS
# =============================================================================

print_header() {
    echo ""
    echo -e "${CYAN}═══════════════════════════════════════════════════════════════════${NC}"
    echo -e "${CYAN}  $1${NC}"
    echo -e "${CYAN}═══════════════════════════════════════════════════════════════════${NC}"
    echo ""
}

print_status() { echo -e "${GREEN}[✓]${NC} $1"; }
print_warning() { echo -e "${YELLOW}[!]${NC} $1"; }
print_error() { echo -e "${RED}[✗]${NC} $1"; }
print_info() { echo -e "${BLUE}[i]${NC} $1"; }
print_step() { echo -e "${BOLD}[→]${NC} $1"; }

get_timestamp() { date +"%Y%m%d_%H%M%S"; }
get_date() { date +"%Y-%m-%d %H:%M:%S"; }
get_size() { [ -f "$1" ] && du -h "$1" | cut -f1 || echo "N/A"; }

is_docker_running() { docker info >/dev/null 2>&1; }

# =============================================================================
# PREREQUISITES
# =============================================================================

check_prerequisites() {
    print_header "Checking Prerequisites"
    
    local missing_tools=()
    
    command -v gzip >/dev/null 2>&1 || missing_tools+=("gzip")
    command -v tar >/dev/null 2>&1 || missing_tools+=("tar")
    
    if command -v pg_dump >/dev/null 2>&1; then
        print_status "pg_dump found"
    else
        missing_tools+=("postgresql-client")
    fi
    
    if command -v docker >/dev/null 2>&1; then
        print_status "Docker found"
    else
        print_warning "Docker not found - running in local mode"
    fi
    
    if [ ${#missing_tools[@]} -ne 0 ]; then
        print_error "Missing tools: ${missing_tools[*]}"
        echo "Install: sudo apt-get install ${missing_tools[*]}"
        exit 1
    fi
    
    if [ ! -d "$BACKUP_DIR" ]; then
        mkdir -p "$BACKUP_DIR"
        print_status "Created backup directory: $BACKUP_DIR"
    fi
    
    print_status "All prerequisites satisfied"
}

# =============================================================================
# DATABASE BACKUP
# =============================================================================

backup_database() {
    local backup_file="$BACKUP_DIR/db_${DB_NAME}_$(get_timestamp).sql.gz"
    
    print_step "Starting database backup..."
    print_info "Output: $backup_file"
    
    local user="$DB_USER"
    local password="$DB_PASSWORD"
    local host="$DB_HOST"
    local port="$DB_PORT"
    local db="$DB_NAME"
    
    export PGPASSWORD="$password"
    
    if is_docker_running; then
        docker exec hdos-db pg_dump -U "$user" -d "$db" 2>/dev/null | gzip > "$backup_file"
    else
        pg_dump -U "$user" -h "$host" -p "$port" -d "$db" 2>/dev/null | gzip > "$backup_file"
    fi
    
    if [ $? -eq 0 ]; then
        local size=$(get_size "$backup_file")
        print_status "Database backup created!"
        print_info "Size: $size"
        return 0
    else
        print_error "Database backup failed!"
        rm -f "$backup_file"
        return 1
    fi
}

# =============================================================================
# FILES BACKUP
# =============================================================================

backup_files() {
    local timestamp=$(get_timestamp)
    local backup_file="$BACKUP_DIR/files_${timestamp}.tar.gz"
    
    print_step "Starting files backup..."
    print_info "Output: $backup_file"
    
    local dirs_to_backup=()
    
    if [ -d "$UPLOADS_DIR" ] && [ "$(ls -A "$UPLOADS_DIR" 2>/dev/null)" ]; then
        dirs_to_backup+=("$UPLOADS_DIR")
        print_info "Including: uploads"
    fi
    
    if [ -d "$ASSETS_DIR" ] && [ "$(ls -A "$ASSETS_DIR" 2>/dev/null)" ]; then
        dirs_to_backup+=("$ASSETS_DIR")
        print_info "Including: attached_assets"
    fi
    
    if [ ${#dirs_to_backup[@]} -eq 0 ]; then
        print_warning "No files to backup"
        return 0
    fi
    
    tar -czf "$backup_file" "${dirs_to_backup[@]}" 2>/dev/null
    
    if [ $? -eq 0 ]; then
        local size=$(get_size "$backup_file")
        print_status "Files backup created!"
        print_info "Size: $size"
        return 0
    else
        print_error "Files backup failed!"
        rm -f "$backup_file"
        return 1
    fi
}

# =============================================================================
# MIGRATIONS BACKUP
# =============================================================================

backup_migrations() {
    local backup_file="$BACKUP_DIR/migrations_$(get_timestamp).tar.gz"
    
    print_step "Starting migrations backup..."
    print_info "Output: $backup_file"
    
    if [ ! -d "$MIGRATIONS_DIR" ]; then
        print_warning "Migrations directory not found"
        return 0
    fi
    
    tar -czf "$backup_file" -C "$SCRIPT_DIR" migrations 2>/dev/null
    
    if [ $? -eq 0 ]; then
        local size=$(get_size "$backup_file")
        print_status "Migrations backup created!"
        print_info "Size: $size"
        return 0
    else
        print_error "Migrations backup failed!"
        rm -f "$backup_file"
        return 1
    fi
}

# =============================================================================
# COMPLETE BACKUP
# =============================================================================

backup_all() {
    print_header "Creating Complete Backup"
    
    local timestamp=$(get_timestamp)
    local full_backup_dir="$BACKUP_DIR/full_backup_${timestamp}"
    mkdir -p "$full_backup_dir"
    
    print_info "Backup directory: $full_backup_dir"
    echo ""
    
    # Backup each component
    backup_database >/dev/null 2>&1 || true
    backup_files >/dev/null 2>&1 || true
    backup_migrations >/dev/null 2>&1 || true
    
    # Create manifest
    local manifest_file="$full_backup_dir/manifest.json"
    
    cat > "$manifest_file" << EOF
{
  "timestamp": "$timestamp",
  "date": "$(get_date)",
  "version": "1.0",
  "type": "full_backup"
}
EOF
    
    echo ""
    print_header "Backup Complete!"
    echo ""
    echo -e "${GREEN}Location: $full_backup_dir${NC}"
    
    cleanup_old_backups
}

# =============================================================================
# LIST BACKUPS
# =============================================================================

list_backups() {
    print_header "Available Backups"
    
    if [ ! -d "$BACKUP_DIR" ] || [ -z "$(ls -A "$BACKUP_DIR" 2>/dev/null)" ]; then
        print_warning "No backups found!"
        return 0
    fi
    
    echo -e "${BOLD}Full Backups:${NC}"
    ls -td "$BACKUP_DIR"/full_backup_* 2>/dev/null | head -5 | while read dir; do
        local date=$(stat -c %y "$dir" 2>/dev/null | cut -d' ' -f1,2 | cut -d':' -f1,2)
        echo "  📦 $(basename "$dir") | $date"
    done
    [ -z "$(ls -d "$BACKUP_DIR"/full_backup_* 2>/dev/null)" ] && echo "  None"
    
    echo ""
    echo -e "${BOLD}Database Backups:${NC}"
    ls -t "$BACKUP_DIR"/db_*.sql.gz 2>/dev/null | head -5 | while read file; do
        local size=$(get_size "$file")
        local date=$(stat -c %y "$file" 2>/dev/null | cut -d' ' -f1,2 | cut -d':' -f1,2)
        echo "  🗄️  $(basename "$file") | $size | $date"
    done
    [ -z "$(ls "$BACKUP_DIR"/db_*.sql.gz 2>/dev/null)" ] && echo "  None"
    
    echo ""
    echo -e "${BOLD}Files Backups:${NC}"
    ls -t "$BACKUP_DIR"/files_*.tar.gz 2>/dev/null | head -5 | while read file; do
        local size=$(get_size "$file")
        local date=$(stat -c %y "$file" 2>/dev/null | cut -d' ' -f1,2 | cut -d':' -f1,2)
        echo "  📁 $(basename "$file") | $size | $date"
    done
    [ -z "$(ls "$BACKUP_DIR"/files_*.tar.gz 2>/dev/null)" ] && echo "  None"
    
    echo ""
    print_info "Total: $(find "$BACKUP_DIR" -name "*.sql.gz" -o -name "*.tar.gz" 2>/dev/null | wc -l) backup files"
}

# =============================================================================
# CLEANUP OLD BACKUPS
# =============================================================================

cleanup_old_backups() {
    print_step "Cleaning up old backups (older than $RETENTION_DAYS days)..."
    
    find "$BACKUP_DIR" -maxdepth 1 -type d -name "full_backup_*" -mtime +$RETENTION_DAYS -exec rm -rf {} \; 2>/dev/null || true
    find "$BACKUP_DIR" -maxdepth 1 -type f \( -name "*.sql.gz" -o -name "*.tar.gz" \) -mtime +$RETENTION_DAYS -delete 2>/dev/null || true
    
    print_status "Cleanup complete"
}

# =============================================================================
# USAGE
# =============================================================================

usage() {
    echo -e "${BOLD}HDOS Backup System${NC}"
    echo ""
    echo "Usage: $0 [command]"
    echo ""
    echo "Commands:"
    echo "  backup     - Create complete backup (database + files + migrations)"
    echo "  db        - Backup database only"
    echo "  files     - Backup files only (uploads + assets)"
    echo "  migrations - Backup migrations only"
    echo "  list      - List all backups"
    echo "  cleanup   - Remove old backups"
    echo ""
}

# =============================================================================
# MAIN
# =============================================================================

main() {
    check_prerequisites
    
    case "${1:-backup}" in
        backup)
            backup_all
            ;;
        db)
            print_header "Database Backup"
            backup_database
            ;;
        files)
            print_header "Files Backup"
            backup_files
            ;;
        migrations)
            print_header "Migrations Backup"
            backup_migrations
            ;;
        list)
            list_backups
            ;;
        cleanup)
            cleanup_old_backups
            ;;
        help|--help|-h)
            usage
            ;;
        *)
            print_error "Unknown command: $1"
            usage
            exit 1
            ;;
    esac
}

main "$@"
