#!/bin/bash

# =============================================================================
# HDOS - Complete Restore Script
# Supports: Database (PostgreSQL), Files (Uploads, Assets), Migrations
# =============================================================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKUP_DIR="${SCRIPT_DIR}/backups"

# Load env
if [ -f "${SCRIPT_DIR}/.env" ]; then
    set -a
    source "${SCRIPT_DIR}/.env"
    set +a
fi

DB_USER="${DB_USER:-hdos}"
DB_PASSWORD="${DB_PASSWORD:-hdos_password}"
DB_NAME="${DB_NAME:-hdos}"
DATABASE_URL="${DATABASE_URL:-postgresql://${DB_USER}:${DB_PASSWORD}@localhost:5432/${DB_NAME}}"
UPLOADS_DIR="${SCRIPT_DIR}/uploads"
ASSETS_DIR="${SCRIPT_DIR}/attached_assets"

print_header() { echo -e "\n${CYAN}═══════════════════════════════════════════════════════════════════${NC}\n  $1\n${CYAN}═══════════════════════════════════════════════════════════════════${NC}\n"; }
print_status() { echo -e "${GREEN}[✓]${NC} $1"; }
print_warning() { echo -e "${YELLOW}[!]${NC} $1"; }
print_error() { echo -e "${RED}[✗]${NC} $1"; }
print_info() { echo -e "${BLUE}[i]${NC} $1"; }
print_step() { echo -e "${BOLD}[→]${NC} $1"; }

is_docker() { docker info >/dev/null 2>&1; }

# =====================================
# RESTORE DATABASE
# =====================================
restore_database() {
    print_header "Restore Database"
    
    # Find database backups
    local db_backups
    db_backups=($(ls -t "$BACKUP_DIR"/db_*.sql.gz 2>/dev/null))
    local full_db_backups
    full_db_backups=($(ls -t "$BACKUP_DIR"/full_backup_*/db_*.sql.gz 2>/dev/null))
    local all_db_backups=("${db_backups[@]}" "${full_db_backups[@]}")
    
    if [ ${#all_db_backups[@]} -eq 0 ] || [ -z "${all_db_backups[0]}" ]; then
        print_error "No database backups found!"
        return 1
    fi
    
    echo "Available backups:"
    local shown=() count=0
    for backup in "${all_db_backups[@]}"; do
        if [ -n "$backup" ]; then
            local bn
            bn=$(basename "$backup" 2>/dev/null || echo "unknown")
            local already_shown=0
            for s in "${shown[@]}"; do
                [ "$s" = "$bn" ] && already_shown=1
            done
            if [ $already_shown -eq 0 ]; then
                shown+=("$bn")
                local size
                size=$(du -h "$backup" 2>/dev/null | cut -f1 || echo "N/A")
                echo "  [$((count+1))] $bn | $size"
                ((count++))
            fi
        fi
    done
    
    if [ $count -eq 0 ]; then
        print_error "No valid backups found!"
        return 1
    fi
    
    echo ""
    read -p "Select (1-$count, c=cancel): " choice
    
    if [[ "$choice" =~ ^[cC]$ ]]; then
        print_info "Cancelled"
        return 0
    fi
    
    if ! [[ "$choice" =~ ^[0-9]+$ ]] || [ "$choice" -lt 1 ] || [ "$choice" -gt $count ]; then
        print_error "Invalid selection!"
        return 1
    fi
    
    # Find selected backup
    local selected=""
    local shown=() index=0
    for backup in "${all_db_backups[@]}"; do
        if [ -n "$backup" ]; then
            local bn
            bn=$(basename "$backup" 2>/dev/null || echo "unknown")
            local already_shown=0
            for s in "${shown[@]}"; do
                [ "$s" = "$bn" ] && already_shown=1
            done
            if [ $already_shown -eq 0 ]; then
                shown+=("$bn")
                if [ $index -eq $((choice-1)) ]; then
                    selected="$backup"
                fi
                ((index++))
            fi
        fi
    done
    
    if [ -z "$selected" ] || [ ! -f "$selected" ]; then
        print_error "Selected backup not found!"
        return 1
    fi
    
    print_warning "This will REPLACE all data in database '$DB_NAME'!"
    read -p "Continue? (yes/NO): " confirm
    if [ "$confirm" != "yes" ]; then
        print_info "Cancelled"
        return 0
    fi
    
    print_step "Restoring database from: $(basename "$selected")"
    
    if is_docker; then
        # Docker mode
        print_info "Stopping application..."
        docker stop hdos-app 2>/dev/null || true
        
        # Terminate connections
        docker exec hdos-db psql -U hdos -d postgres -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '$DB_NAME';" 2>/dev/null || true
        
        # Drop temp DB if exists
        docker exec hdos-db psql -U hdos -d postgres -c "DROP DATABASE IF EXISTS ${DB_NAME}_temp;" 2>/dev/null || true
        docker exec hdos-db psql -U hdos -d postgres -c "CREATE DATABASE ${DB_NAME}_temp;"
        
        # Restore
        gunzip -c "$selected" | docker exec -i hdos-db psql -U hdos -d "${DB_NAME}_temp"
        
        if [ $? -eq 0 ]; then
            docker exec hdos-db psql -U hdos -d postgres -c "DROP DATABASE IF EXISTS $DB_NAME;"
            docker exec hdos-db psql -U hdos -d postgres -c "ALTER DATABASE ${DB_NAME}_temp RENAME TO $DB_NAME;"
            print_status "Database restored successfully!"
            docker start hdos-app 2>/dev/null || true
        else
            print_error "Restore failed!"
            return 1
        fi
    else
        # Local mode
        export PGPASSWORD="$DB_PASSWORD"
        
        psql -U "$DB_USER" -d postgres -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '$DB_NAME';" 2>/dev/null || true
        psql -U "$DB_USER" -d postgres -c "DROP DATABASE IF EXISTS ${DB_NAME}_temp;" 2>/dev/null || true
        psql -U "$DB_USER" -d postgres -c "CREATE DATABASE ${DB_NAME}_temp;"
        
        gunzip -c "$selected" | psql -U "$DB_USER" -d "${DB_NAME}_temp"
        
        if [ $? -eq 0 ]; then
            psql -U "$DB_USER" -d postgres -c "DROP DATABASE IF EXISTS $DB_NAME;"
            psql -U "$DB_USER" -d postgres -c "ALTER DATABASE ${DB_NAME}_temp RENAME TO $DB_NAME;"
            print_status "Database restored successfully!"
        else
            print_error "Restore failed!"
            return 1
        fi
    fi
}

# =====================================
# RESTORE FILES
# =====================================
restore_files() {
    print_header "Restore Files (Uploads & Assets)"
    
    # Find file backups
    local file_backups
    file_backups=($(ls -t "$BACKUP_DIR"/files_*.tar.gz 2>/dev/null))
    local full_file_backups
    full_file_backups=($(ls -t "$BACKUP_DIR"/full_backup_*/files_*.tar.gz 2>/dev/null))
    local all_file_backups=("${file_backups[@]}" "${full_file_backups[@]}")
    
    if [ ${#all_file_backups[@]} -eq 0 ] || [ -z "${all_file_backups[0]}" ]; then
        print_error "No files backups found!"
        return 1
    fi
    
    echo "Available backups:"
    local shown=() count=0
    for backup in "${all_file_backups[@]}"; do
        if [ -n "$backup" ]; then
            local bn
            bn=$(basename "$backup" 2>/dev/null || echo "unknown")
            local already_shown=0
            for s in "${shown[@]}"; do
                [ "$s" = "$bn" ] && already_shown=1
            done
            if [ $already_shown -eq 0 ]; then
                shown+=("$bn")
                local size
                size=$(du -h "$backup" 2>/dev/null | cut -f1 || echo "N/A")
                echo "  [$((count+1))] $bn | $size"
                ((count++))
            fi
        fi
    done
    
    if [ $count -eq 0 ]; then
        print_error "No valid backups found!"
        return 1
    fi
    
    echo ""
    read -p "Select (1-$count, c=cancel): " choice
    
    if [[ "$choice" =~ ^[cC]$ ]]; then
        print_info "Cancelled"
        return 0
    fi
    
    if ! [[ "$choice" =~ ^[0-9]+$ ]] || [ "$choice" -lt 1 ] || [ "$choice" -gt $count ]; then
        print_error "Invalid selection!"
        return 1
    fi
    
    # Find selected backup
    local selected=""
    local shown=() index=0
    for backup in "${all_file_backups[@]}"; do
        if [ -n "$backup" ]; then
            local bn
            bn=$(basename "$backup" 2>/dev/null || echo "unknown")
            local already_shown=0
            for s in "${shown[@]}"; do
                [ "$s" = "$bn" ] && already_shown=1
            done
            if [ $already_shown -eq 0 ]; then
                shown+=("$bn")
                if [ $index -eq $((choice-1)) ]; then
                    selected="$backup"
                fi
                ((index++))
            fi
        fi
    done
    
    if [ -z "$selected" ] || [ ! -f "$selected" ]; then
        print_error "Selected backup not found!"
        return 1
    fi
    
    print_warning "This will REPLACE uploads/ and attached_assets/ folders!"
    read -p "Continue? (yes/NO): " confirm
    if [ "$confirm" != "yes" ]; then
        print_info "Cancelled"
        return 0
    fi
    
    # Backup current files first
    local ts
    ts=$(date +"%Y%m%d_%H%M%S")
    if [ -d "$UPLOADS_DIR" ] || [ -d "$ASSETS_DIR" ]; then
        tar -czf "$BACKUP_DIR/old_files_$ts.tar.gz" uploads attached_assets 2>/dev/null || true
        print_info "Current files backed up to: old_files_$ts.tar.gz"
    fi
    
    print_step "Extracting files from: $(basename "$selected")"
    tar -xzf "$selected" -C "$SCRIPT_DIR"
    
    if [ $? -eq 0 ]; then
        print_status "Files restored successfully!"
    else
        print_error "Files restore failed!"
        return 1
    fi
}

# =====================================
# MAIN MENU
# =====================================
main() {
    echo -e "${BOLD}HDOS Restore System${NC}"
    echo ""
    echo "  1) Restore Database"
    echo "  2) Restore Files (Uploads & Assets)"
    echo "  3) Exit"
    echo ""
    read -p "Select option: " option
    
    case $option in
        1) restore_database ;;
        2) restore_files ;;
        3) exit 0 ;;
        *) print_error "Invalid option!"; exit 1 ;;
    esac
}

# Run main if called directly
if [ "$0" = "${BASH_SOURCE[0]}" ]; then
    main "$@"
fi
