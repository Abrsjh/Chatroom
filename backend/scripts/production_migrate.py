#!/usr/bin/env python3
"""
Production migration strategy for Reddit Forum Backend
This script handles zero-downtime migrations and production safety
"""

import os
import sys
import asyncio
import time
import signal
from pathlib import Path
from typing import List, Dict, Optional, Any, Callable
from datetime import datetime, timedelta
from dataclasses import dataclass
from enum import Enum
import logging
import json
import threading
from contextlib import contextmanager

# Add the project root to the path
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

from sqlalchemy import create_engine, text, MetaData, Table
from sqlalchemy.exc import SQLAlchemyError
from alembic.config import Config
from alembic import command
from alembic.runtime.migration import MigrationContext
from alembic.script import ScriptDirectory
from app.database import DATABASE_URL
from app.config import settings

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class MigrationStatus(Enum):
    """Migration status states."""
    PENDING = "pending"
    PREPARING = "preparing"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    ROLLED_BACK = "rolled_back"

class MigrationPhase(Enum):
    """Migration phases for zero-downtime deployment."""
    PRE_MIGRATION = "pre_migration"
    MIGRATION = "migration"
    POST_MIGRATION = "post_migration"
    CLEANUP = "cleanup"

@dataclass
class MigrationCheckpoint:
    """Migration checkpoint for rollback."""
    timestamp: datetime
    revision: str
    database_schema: Dict[str, Any]
    backup_location: str
    notes: str

@dataclass
class MigrationConfig:
    """Configuration for production migration."""
    database_url: str
    max_migration_time: int = 3600  # 1 hour
    health_check_interval: int = 30  # 30 seconds
    rollback_on_failure: bool = True
    require_manual_approval: bool = True
    backup_before_migration: bool = True
    monitoring_enabled: bool = True
    emergency_contacts: List[str] = None
    maintenance_window: bool = False

class ProductionMigrator:
    """Handles production database migrations with zero downtime."""
    
    def __init__(self, config: MigrationConfig = None):
        self.config = config or MigrationConfig(DATABASE_URL)
        self.engine = create_engine(self.config.database_url)
        self.alembic_cfg = Config(str(project_root / "alembic.ini"))
        self.alembic_cfg.set_main_option("sqlalchemy.url", self.config.database_url)
        
        self.migration_status = MigrationStatus.PENDING
        self.current_phase = MigrationPhase.PRE_MIGRATION
        self.checkpoints: List[MigrationCheckpoint] = []
        self.migration_start_time: Optional[datetime] = None
        self.monitoring_thread: Optional[threading.Thread] = None
        self.stop_monitoring = threading.Event()
        
        # Setup signal handlers
        signal.signal(signal.SIGTERM, self._signal_handler)
        signal.signal(signal.SIGINT, self._signal_handler)
    
    def _signal_handler(self, signum, frame):
        """Handle shutdown signals."""
        logger.warning(f"Received signal {signum}, initiating graceful shutdown")
        self.stop_monitoring.set()
        
        if self.migration_status == MigrationStatus.RUNNING:
            logger.warning("Migration in progress, preparing for emergency rollback")
            self._prepare_emergency_rollback()
    
    def validate_migration_environment(self) -> bool:
        """Validate that environment is ready for migration."""
        try:
            logger.info("Validating migration environment...")
            
            # Check database connection
            with self.engine.connect() as conn:
                conn.execute(text("SELECT 1"))
            
            # Check Alembic configuration
            script_dir = ScriptDirectory.from_config(self.alembic_cfg)
            if not script_dir:
                logger.error("Invalid Alembic configuration")
                return False
            
            # Check disk space
            if not self._check_disk_space():
                logger.error("Insufficient disk space for migration")
                return False
            
            # Check migration lock
            if self._is_migration_locked():
                logger.error("Another migration is in progress")
                return False
            
            logger.info("Environment validation passed")
            return True
            
        except Exception as e:
            logger.error(f"Environment validation failed: {e}")
            return False
    
    def _check_disk_space(self) -> bool:
        """Check if there's enough disk space for migration."""
        try:
            import shutil
            total, used, free = shutil.disk_usage("/")
            
            # Require at least 1GB free space
            min_free_space = 1024 * 1024 * 1024  # 1GB
            
            if free < min_free_space:
                logger.error(f"Insufficient disk space: {free / (1024**3):.2f}GB free")
                return False
            
            logger.info(f"Disk space check passed: {free / (1024**3):.2f}GB free")
            return True
            
        except Exception as e:
            logger.error(f"Disk space check failed: {e}")
            return False
    
    def _is_migration_locked(self) -> bool:
        """Check if migration is locked by another process."""
        try:
            with self.engine.connect() as conn:
                result = conn.execute(text("""
                    SELECT pg_try_advisory_lock(12345)
                """))
                
                if result.fetchone()[0]:
                    # Got the lock, release it
                    conn.execute(text("SELECT pg_advisory_unlock(12345)"))
                    return False
                else:
                    return True
                    
        except Exception as e:
            logger.error(f"Lock check failed: {e}")
            return True
    
    def acquire_migration_lock(self) -> bool:
        """Acquire migration lock."""
        try:
            with self.engine.connect() as conn:
                result = conn.execute(text("""
                    SELECT pg_try_advisory_lock(12345)
                """))
                
                if result.fetchone()[0]:
                    logger.info("Migration lock acquired")
                    return True
                else:
                    logger.error("Failed to acquire migration lock")
                    return False
                    
        except Exception as e:
            logger.error(f"Lock acquisition failed: {e}")
            return False
    
    def release_migration_lock(self) -> bool:
        """Release migration lock."""
        try:
            with self.engine.connect() as conn:
                conn.execute(text("SELECT pg_advisory_unlock(12345)"))
                logger.info("Migration lock released")
                return True
                
        except Exception as e:
            logger.error(f"Lock release failed: {e}")
            return False
    
    def create_rollback_checkpoint(self, notes: str = "") -> bool:
        """Create a rollback checkpoint."""
        try:
            logger.info("Creating rollback checkpoint...")
            
            # Get current revision
            with self.engine.connect() as conn:
                context = MigrationContext.configure(conn)
                current_rev = context.get_current_revision()
            
            # Create schema snapshot
            schema_snapshot = self._create_schema_snapshot()
            
            # Create backup if enabled
            backup_location = ""
            if self.config.backup_before_migration:
                backup_location = self._create_database_backup()
                if not backup_location:
                    logger.error("Failed to create database backup")
                    return False
            
            checkpoint = MigrationCheckpoint(
                timestamp=datetime.utcnow(),
                revision=current_rev or "initial",
                database_schema=schema_snapshot,
                backup_location=backup_location,
                notes=notes
            )
            
            self.checkpoints.append(checkpoint)
            logger.info(f"Rollback checkpoint created: {checkpoint.timestamp}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to create rollback checkpoint: {e}")
            return False
    
    def _create_schema_snapshot(self) -> Dict[str, Any]:
        """Create a snapshot of the current database schema."""
        try:
            metadata = MetaData()
            metadata.reflect(bind=self.engine)
            
            schema_info = {
                "tables": {},
                "indexes": {},
                "constraints": {}
            }
            
            for table_name, table in metadata.tables.items():
                schema_info["tables"][table_name] = {
                    "columns": [
                        {
                            "name": col.name,
                            "type": str(col.type),
                            "nullable": col.nullable,
                            "default": str(col.default) if col.default else None
                        }
                        for col in table.columns
                    ],
                    "primary_key": [col.name for col in table.primary_key.columns],
                    "foreign_keys": [
                        {
                            "column": fk.parent.name,
                            "references": f"{fk.column.table.name}.{fk.column.name}"
                        }
                        for fk in table.foreign_keys
                    ]
                }
            
            return schema_info
            
        except Exception as e:
            logger.error(f"Failed to create schema snapshot: {e}")
            return {}
    
    def _create_database_backup(self) -> str:
        """Create a database backup."""
        try:
            import subprocess
            
            timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
            backup_filename = f"backup_{timestamp}.sql"
            backup_path = Path(f"/tmp/{backup_filename}")
            
            # Extract connection details from database URL
            db_url = self.config.database_url
            # This is a simplified approach - in production, you'd parse the URL properly
            
            cmd = [
                "pg_dump",
                "--no-password",
                "--format=custom",
                "--compress=9",
                "--file", str(backup_path),
                db_url
            ]
            
            result = subprocess.run(cmd, capture_output=True, text=True)
            
            if result.returncode == 0:
                logger.info(f"Database backup created: {backup_path}")
                return str(backup_path)
            else:
                logger.error(f"Backup failed: {result.stderr}")
                return ""
                
        except Exception as e:
            logger.error(f"Backup creation failed: {e}")
            return ""
    
    def pre_migration_health_check(self) -> bool:
        """Perform pre-migration health checks."""
        try:
            logger.info("Performing pre-migration health checks...")
            
            checks = [
                ("Database connection", self._check_database_connection),
                ("Table accessibility", self._check_table_accessibility),
                ("Active connections", self._check_active_connections),
                ("Replication lag", self._check_replication_lag),
                ("Lock contention", self._check_lock_contention),
                ("Query performance", self._check_query_performance)
            ]
            
            for check_name, check_func in checks:
                if not check_func():
                    logger.error(f"Pre-migration check failed: {check_name}")
                    return False
                logger.info(f"Pre-migration check passed: {check_name}")
            
            logger.info("All pre-migration health checks passed")
            return True
            
        except Exception as e:
            logger.error(f"Pre-migration health check failed: {e}")
            return False
    
    def _check_database_connection(self) -> bool:
        """Check database connection health."""
        try:
            with self.engine.connect() as conn:
                conn.execute(text("SELECT 1"))
            return True
        except Exception as e:
            logger.error(f"Database connection check failed: {e}")
            return False
    
    def _check_table_accessibility(self) -> bool:
        """Check that all tables are accessible."""
        try:
            with self.engine.connect() as conn:
                tables = ["users", "channels", "posts", "replies", "votes", "messages"]
                
                for table in tables:
                    result = conn.execute(text(f"SELECT COUNT(*) FROM {table}"))
                    count = result.fetchone()[0]
                    logger.debug(f"Table {table}: {count} rows")
                
            return True
        except Exception as e:
            logger.error(f"Table accessibility check failed: {e}")
            return False
    
    def _check_active_connections(self) -> bool:
        """Check active database connections."""
        try:
            with self.engine.connect() as conn:
                result = conn.execute(text("""
                    SELECT COUNT(*) FROM pg_stat_activity 
                    WHERE state = 'active' AND pid != pg_backend_pid()
                """))
                
                active_connections = result.fetchone()[0]
                max_connections = 100  # Configurable threshold
                
                if active_connections > max_connections:
                    logger.warning(f"High number of active connections: {active_connections}")
                    return False
                
                logger.info(f"Active connections: {active_connections}")
                return True
                
        except Exception as e:
            logger.error(f"Active connections check failed: {e}")
            return False
    
    def _check_replication_lag(self) -> bool:
        """Check replication lag (if applicable)."""
        try:
            # This would check replication lag in a master-slave setup
            # For simplicity, we'll return True
            logger.info("Replication lag check: N/A (single database)")
            return True
        except Exception as e:
            logger.error(f"Replication lag check failed: {e}")
            return False
    
    def _check_lock_contention(self) -> bool:
        """Check for lock contention."""
        try:
            with self.engine.connect() as conn:
                result = conn.execute(text("""
                    SELECT COUNT(*) FROM pg_locks 
                    WHERE NOT granted
                """))
                
                blocked_locks = result.fetchone()[0]
                
                if blocked_locks > 0:
                    logger.warning(f"Blocked locks detected: {blocked_locks}")
                    return False
                
                logger.info("No lock contention detected")
                return True
                
        except Exception as e:
            logger.error(f"Lock contention check failed: {e}")
            return False
    
    def _check_query_performance(self) -> bool:
        """Check query performance baseline."""
        try:
            with self.engine.connect() as conn:
                start_time = time.time()
                conn.execute(text("SELECT COUNT(*) FROM users"))
                query_time = time.time() - start_time
                
                max_query_time = 5.0  # 5 seconds threshold
                
                if query_time > max_query_time:
                    logger.warning(f"Slow query detected: {query_time:.2f}s")
                    return False
                
                logger.info(f"Query performance check passed: {query_time:.2f}s")
                return True
                
        except Exception as e:
            logger.error(f"Query performance check failed: {e}")
            return False
    
    def post_migration_health_check(self) -> bool:
        """Perform post-migration health checks."""
        try:
            logger.info("Performing post-migration health checks...")
            
            checks = [
                ("Database connection", self._check_database_connection),
                ("Table accessibility", self._check_table_accessibility),
                ("Data integrity", self._check_data_integrity),
                ("Application health", self._check_application_health),
                ("Performance baseline", self._check_performance_baseline)
            ]
            
            for check_name, check_func in checks:
                if not check_func():
                    logger.error(f"Post-migration check failed: {check_name}")
                    return False
                logger.info(f"Post-migration check passed: {check_name}")
            
            logger.info("All post-migration health checks passed")
            return True
            
        except Exception as e:
            logger.error(f"Post-migration health check failed: {e}")
            return False
    
    def _check_data_integrity(self) -> bool:
        """Check data integrity after migration."""
        try:
            with self.engine.connect() as conn:
                # Check foreign key constraints
                result = conn.execute(text("""
                    SELECT conname, conrelid::regclass, confrelid::regclass
                    FROM pg_constraint
                    WHERE contype = 'f' AND NOT convalidated
                """))
                
                invalid_constraints = result.fetchall()
                
                if invalid_constraints:
                    logger.error(f"Invalid foreign key constraints: {invalid_constraints}")
                    return False
                
                # Check for orphaned records
                orphaned_posts = conn.execute(text("""
                    SELECT COUNT(*) FROM posts p
                    LEFT JOIN users u ON p.user_id = u.id
                    WHERE u.id IS NULL
                """)).fetchone()[0]
                
                if orphaned_posts > 0:
                    logger.error(f"Orphaned posts detected: {orphaned_posts}")
                    return False
                
                logger.info("Data integrity check passed")
                return True
                
        except Exception as e:
            logger.error(f"Data integrity check failed: {e}")
            return False
    
    def _check_application_health(self) -> bool:
        """Check application health after migration."""
        try:
            import requests
            
            # Check health endpoint
            health_url = f"{settings.cors_origins[0]}/health"
            response = requests.get(health_url, timeout=10)
            
            if response.status_code == 200:
                logger.info("Application health check passed")
                return True
            else:
                logger.error(f"Application health check failed: {response.status_code}")
                return False
                
        except Exception as e:
            logger.error(f"Application health check failed: {e}")
            return False
    
    def _check_performance_baseline(self) -> bool:
        """Check performance baseline after migration."""
        try:
            with self.engine.connect() as conn:
                # Test common queries
                queries = [
                    "SELECT COUNT(*) FROM users",
                    "SELECT COUNT(*) FROM posts",
                    "SELECT COUNT(*) FROM replies WHERE post_id = 1",
                    "SELECT COUNT(*) FROM votes WHERE user_id = 1"
                ]
                
                total_time = 0
                for query in queries:
                    start_time = time.time()
                    conn.execute(text(query))
                    query_time = time.time() - start_time
                    total_time += query_time
                
                max_total_time = 10.0  # 10 seconds for all queries
                
                if total_time > max_total_time:
                    logger.warning(f"Performance baseline check failed: {total_time:.2f}s")
                    return False
                
                logger.info(f"Performance baseline check passed: {total_time:.2f}s")
                return True
                
        except Exception as e:
            logger.error(f"Performance baseline check failed: {e}")
            return False
    
    def setup_migration_monitoring(self) -> bool:
        """Set up migration monitoring."""
        try:
            if not self.config.monitoring_enabled:
                return True
            
            self.monitoring_thread = threading.Thread(
                target=self._monitor_migration_progress,
                daemon=True
            )
            self.monitoring_thread.start()
            
            logger.info("Migration monitoring started")
            return True
            
        except Exception as e:
            logger.error(f"Failed to setup migration monitoring: {e}")
            return False
    
    def _monitor_migration_progress(self):
        """Monitor migration progress continuously."""
        while not self.stop_monitoring.is_set():
            try:
                # Check migration status
                if self.migration_status == MigrationStatus.RUNNING:
                    elapsed_time = datetime.utcnow() - self.migration_start_time
                    
                    if elapsed_time.total_seconds() > self.config.max_migration_time:
                        logger.error("Migration timeout exceeded")
                        self._prepare_emergency_rollback()
                        break
                    
                    # Check database health
                    if not self._check_database_connection():
                        logger.error("Database connection lost during migration")
                        self._prepare_emergency_rollback()
                        break
                    
                    logger.info(f"Migration progress: {elapsed_time.total_seconds():.0f}s elapsed")
                
                self.stop_monitoring.wait(self.config.health_check_interval)
                
            except Exception as e:
                logger.error(f"Migration monitoring error: {e}")
                time.sleep(self.config.health_check_interval)
    
    def _prepare_emergency_rollback(self):
        """Prepare for emergency rollback."""
        logger.warning("Preparing emergency rollback...")
        
        try:
            # Stop current migration
            self.migration_status = MigrationStatus.FAILED
            
            # Execute rollback
            if self.checkpoints:
                last_checkpoint = self.checkpoints[-1]
                self.execute_emergency_rollback(last_checkpoint.revision)
            
            # Send alerts
            self.send_migration_alerts("Emergency rollback initiated")
            
        except Exception as e:
            logger.error(f"Emergency rollback preparation failed: {e}")
    
    def execute_emergency_rollback(self, target_revision: str) -> bool:
        """Execute emergency rollback."""
        try:
            logger.warning(f"Executing emergency rollback to revision: {target_revision}")
            
            # Use Alembic to rollback
            command.downgrade(self.alembic_cfg, target_revision)
            
            # Verify rollback success
            if self.validate_rollback_success(target_revision):
                self.migration_status = MigrationStatus.ROLLED_BACK
                logger.info("Emergency rollback completed successfully")
                return True
            else:
                logger.error("Emergency rollback validation failed")
                return False
                
        except Exception as e:
            logger.error(f"Emergency rollback failed: {e}")
            return False
    
    def validate_rollback_success(self, target_revision: str) -> bool:
        """Validate rollback success."""
        try:
            with self.engine.connect() as conn:
                context = MigrationContext.configure(conn)
                current_rev = context.get_current_revision()
                
                if current_rev == target_revision:
                    logger.info("Rollback validation passed")
                    return True
                else:
                    logger.error(f"Rollback validation failed: expected {target_revision}, got {current_rev}")
                    return False
                    
        except Exception as e:
            logger.error(f"Rollback validation failed: {e}")
            return False
    
    def send_migration_alerts(self, message: str):
        """Send migration alerts."""
        try:
            if not self.config.emergency_contacts:
                return
            
            logger.info(f"Sending migration alert: {message}")
            
            # In production, this would send emails, Slack messages, etc.
            # For now, just log the alert
            for contact in self.config.emergency_contacts:
                logger.warning(f"ALERT for {contact}: {message}")
                
        except Exception as e:
            logger.error(f"Failed to send migration alerts: {e}")
    
    def prepare_migration(self) -> bool:
        """Prepare for migration."""
        try:
            logger.info("Preparing migration...")
            self.current_phase = MigrationPhase.PRE_MIGRATION
            self.migration_status = MigrationStatus.PREPARING
            
            # Validation checks
            if not self.validate_migration_environment():
                return False
            
            # Acquire lock
            if not self.acquire_migration_lock():
                return False
            
            # Create checkpoint
            if not self.create_rollback_checkpoint("Pre-migration checkpoint"):
                return False
            
            # Health checks
            if not self.pre_migration_health_check():
                return False
            
            # Setup monitoring
            if not self.setup_migration_monitoring():
                return False
            
            logger.info("Migration preparation completed")
            return True
            
        except Exception as e:
            logger.error(f"Migration preparation failed: {e}")
            return False
    
    def execute_online_migration(self) -> bool:
        """Execute online migration."""
        try:
            logger.info("Executing online migration...")
            self.current_phase = MigrationPhase.MIGRATION
            self.migration_status = MigrationStatus.RUNNING
            self.migration_start_time = datetime.utcnow()
            
            # Run Alembic migration
            command.upgrade(self.alembic_cfg, "head")
            
            logger.info("Online migration completed")
            return True
            
        except Exception as e:
            logger.error(f"Online migration failed: {e}")
            return False
    
    def finalize_migration(self) -> bool:
        """Finalize migration."""
        try:
            logger.info("Finalizing migration...")
            self.current_phase = MigrationPhase.POST_MIGRATION
            
            # Post-migration health checks
            if not self.post_migration_health_check():
                logger.error("Post-migration health checks failed")
                return False
            
            # Cleanup phase
            self.current_phase = MigrationPhase.CLEANUP
            
            # Release lock
            self.release_migration_lock()
            
            # Stop monitoring
            self.stop_monitoring.set()
            
            self.migration_status = MigrationStatus.COMPLETED
            logger.info("Migration finalized successfully")
            return True
            
        except Exception as e:
            logger.error(f"Migration finalization failed: {e}")
            return False
    
    def run_production_migration(self) -> bool:
        """Run complete production migration."""
        try:
            logger.info("Starting production migration...")
            
            # Prepare migration
            if not self.prepare_migration():
                logger.error("Migration preparation failed")
                return False
            
            # Execute migration
            if not self.execute_online_migration():
                logger.error("Migration execution failed")
                if self.config.rollback_on_failure:
                    self._prepare_emergency_rollback()
                return False
            
            # Finalize migration
            if not self.finalize_migration():
                logger.error("Migration finalization failed")
                return False
            
            logger.info("Production migration completed successfully")
            return True
            
        except Exception as e:
            logger.error(f"Production migration failed: {e}")
            return False

def main():
    """Main production migration script."""
    import argparse
    
    parser = argparse.ArgumentParser(description="Production migration tool")
    parser.add_argument("command", choices=[
        "migrate", "prepare", "execute", "finalize", "rollback", "status"
    ], help="Migration command to run")
    parser.add_argument("--revision", "-r", help="Target revision")
    parser.add_argument("--no-backup", action="store_true", help="Skip backup creation")
    parser.add_argument("--no-monitoring", action="store_true", help="Skip monitoring")
    parser.add_argument("--maintenance-window", action="store_true", help="Enable maintenance window")
    parser.add_argument("--database-url", help="Database URL override")
    
    args = parser.parse_args()
    
    # Create configuration
    config = MigrationConfig(
        database_url=args.database_url or DATABASE_URL,
        backup_before_migration=not args.no_backup,
        monitoring_enabled=not args.no_monitoring,
        maintenance_window=args.maintenance_window
    )
    
    migrator = ProductionMigrator(config)
    
    if args.command == "migrate":
        success = migrator.run_production_migration()
    elif args.command == "prepare":
        success = migrator.prepare_migration()
    elif args.command == "execute":
        success = migrator.execute_online_migration()
    elif args.command == "finalize":
        success = migrator.finalize_migration()
    elif args.command == "rollback":
        if not args.revision:
            logger.error("Rollback requires --revision argument")
            sys.exit(1)
        success = migrator.execute_emergency_rollback(args.revision)
    elif args.command == "status":
        logger.info(f"Migration status: {migrator.migration_status}")
        logger.info(f"Current phase: {migrator.current_phase}")
        success = True
    else:
        logger.error(f"Unknown command: {args.command}")
        sys.exit(1)
    
    if not success:
        sys.exit(1)
    
    logger.info("Production migration operation completed successfully")

if __name__ == "__main__":
    main()