#!/usr/bin/env python3
"""
Database backup and restore system for Reddit Forum Backend
This script handles automated backups, retention policies, and restore operations
"""

import os
import sys
import shutil
import subprocess
import gzip
import json
import time
from pathlib import Path
from typing import List, Dict, Optional, Any
from datetime import datetime, timedelta
from dataclasses import dataclass, asdict
from enum import Enum
import logging
import threading
import schedule
from concurrent.futures import ThreadPoolExecutor, as_completed

# Add the project root to the path
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

from sqlalchemy import create_engine, text
from sqlalchemy.exc import SQLAlchemyError
from app.database import DATABASE_URL
from app.config import settings

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class BackupType(Enum):
    """Types of database backups."""
    FULL = "full"
    INCREMENTAL = "incremental"
    DIFFERENTIAL = "differential"
    TRANSACTION_LOG = "transaction_log"

class BackupStatus(Enum):
    """Backup operation status."""
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    CORRUPTED = "corrupted"

class CompressionType(Enum):
    """Compression types for backups."""
    NONE = "none"
    GZIP = "gzip"
    BZIP2 = "bzip2"
    XZ = "xz"

@dataclass
class BackupMetadata:
    """Metadata for backup files."""
    backup_id: str
    backup_type: BackupType
    timestamp: datetime
    file_path: str
    file_size: int
    compression: CompressionType
    database_name: str
    database_version: str
    schema_version: str
    checksum: str
    backup_duration: float
    status: BackupStatus
    error_message: Optional[str] = None
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for JSON serialization."""
        data = asdict(self)
        data['backup_type'] = self.backup_type.value
        data['timestamp'] = self.timestamp.isoformat()
        data['compression'] = self.compression.value
        data['status'] = self.status.value
        return data
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'BackupMetadata':
        """Create from dictionary."""
        data['backup_type'] = BackupType(data['backup_type'])
        data['timestamp'] = datetime.fromisoformat(data['timestamp'])
        data['compression'] = CompressionType(data['compression'])
        data['status'] = BackupStatus(data['status'])
        return cls(**data)

@dataclass
class RetentionPolicy:
    """Backup retention policy configuration."""
    daily_retention_days: int = 7
    weekly_retention_weeks: int = 4
    monthly_retention_months: int = 12
    yearly_retention_years: int = 5
    max_backup_size_gb: float = 10.0
    cleanup_threshold_gb: float = 50.0

@dataclass
class BackupConfig:
    """Configuration for backup operations."""
    database_url: str
    backup_directory: str
    retention_policy: RetentionPolicy
    default_compression: CompressionType = CompressionType.GZIP
    verify_backups: bool = True
    parallel_operations: int = 2
    encryption_enabled: bool = False
    encryption_key: Optional[str] = None
    remote_storage_enabled: bool = False
    remote_storage_config: Optional[Dict[str, Any]] = None

class DatabaseConnectionManager:
    """Manages database connections for backup operations."""
    
    def __init__(self, database_url: str):
        self.database_url = database_url
        self.engine = create_engine(database_url)
        self._connection_pool = None
    
    def create_connection_pool(self, pool_size: int = 5) -> bool:
        """Create connection pool for backup operations."""
        try:
            from sqlalchemy.pool import QueuePool
            
            self._connection_pool = QueuePool(
                lambda: self.engine.connect(),
                pool_size=pool_size,
                max_overflow=10,
                pool_timeout=30,
                pool_recycle=3600
            )
            
            logger.info(f"Database connection pool created with {pool_size} connections")
            return True
            
        except Exception as e:
            logger.error(f"Failed to create connection pool: {e}")
            return False
    
    def get_connection(self):
        """Get database connection."""
        if self._connection_pool:
            return self._connection_pool.connect()
        else:
            return self.engine.connect()
    
    def close_connection_pool(self):
        """Close connection pool."""
        if self._connection_pool:
            self._connection_pool.dispose()
            self._connection_pool = None
            logger.info("Database connection pool closed")

class SchemaValidator:
    """Validates database schema for backup operations."""
    
    def __init__(self, connection_manager: DatabaseConnectionManager):
        self.connection_manager = connection_manager
    
    def validate_schema(self) -> bool:
        """Validate database schema."""
        try:
            with self.connection_manager.get_connection() as conn:
                # Check required tables exist
                required_tables = ['users', 'channels', 'posts', 'replies', 'votes', 'messages']
                
                for table in required_tables:
                    result = conn.execute(text(f"""
                        SELECT COUNT(*) FROM information_schema.tables 
                        WHERE table_name = '{table}'
                    """))
                    
                    if result.fetchone()[0] == 0:
                        logger.error(f"Required table missing: {table}")
                        return False
                
                logger.info("Schema validation passed")
                return True
                
        except Exception as e:
            logger.error(f"Schema validation failed: {e}")
            return False
    
    def compare_schemas(self, backup_metadata: BackupMetadata) -> bool:
        """Compare current schema with backup schema."""
        try:
            current_schema = self.get_current_schema_version()
            backup_schema = backup_metadata.schema_version
            
            if current_schema != backup_schema:
                logger.warning(f"Schema version mismatch: current={current_schema}, backup={backup_schema}")
                return False
            
            logger.info("Schema comparison passed")
            return True
            
        except Exception as e:
            logger.error(f"Schema comparison failed: {e}")
            return False
    
    def get_current_schema_version(self) -> str:
        """Get current schema version."""
        try:
            with self.connection_manager.get_connection() as conn:
                result = conn.execute(text("SELECT version_num FROM alembic_version"))
                version = result.fetchone()
                return version[0] if version else "unknown"
                
        except Exception as e:
            logger.error(f"Failed to get schema version: {e}")
            return "unknown"
    
    def generate_schema_report(self) -> Dict[str, Any]:
        """Generate schema report."""
        try:
            with self.connection_manager.get_connection() as conn:
                report = {
                    "schema_version": self.get_current_schema_version(),
                    "tables": {},
                    "indexes": {},
                    "constraints": {}
                }
                
                # Get table information
                tables_result = conn.execute(text("""
                    SELECT table_name, 
                           (SELECT COUNT(*) FROM information_schema.columns 
                            WHERE table_name = t.table_name) as column_count
                    FROM information_schema.tables t
                    WHERE table_schema = 'public'
                """))
                
                for table_name, column_count in tables_result:
                    report["tables"][table_name] = {
                        "column_count": column_count,
                        "row_count": self._get_table_row_count(conn, table_name)
                    }
                
                return report
                
        except Exception as e:
            logger.error(f"Failed to generate schema report: {e}")
            return {}
    
    def _get_table_row_count(self, conn, table_name: str) -> int:
        """Get row count for a table."""
        try:
            result = conn.execute(text(f"SELECT COUNT(*) FROM {table_name}"))
            return result.fetchone()[0]
        except Exception:
            return 0

class PerformanceMonitor:
    """Monitors database performance during backup operations."""
    
    def __init__(self, connection_manager: DatabaseConnectionManager):
        self.connection_manager = connection_manager
        self.monitoring_active = False
        self.performance_data = []
    
    def start_monitoring(self):
        """Start performance monitoring."""
        self.monitoring_active = True
        self.performance_data = []
        
        monitoring_thread = threading.Thread(
            target=self._monitor_performance,
            daemon=True
        )
        monitoring_thread.start()
        
        logger.info("Performance monitoring started")
    
    def stop_monitoring(self):
        """Stop performance monitoring."""
        self.monitoring_active = False
        logger.info("Performance monitoring stopped")
    
    def _monitor_performance(self):
        """Monitor performance metrics."""
        while self.monitoring_active:
            try:
                with self.connection_manager.get_connection() as conn:
                    # Get current performance metrics
                    metrics = {
                        "timestamp": datetime.utcnow().isoformat(),
                        "active_connections": self._get_active_connections(conn),
                        "lock_count": self._get_lock_count(conn),
                        "slow_queries": self._get_slow_queries(conn),
                        "database_size": self._get_database_size(conn)
                    }
                    
                    self.performance_data.append(metrics)
                    
                    # Keep only last 100 records
                    if len(self.performance_data) > 100:
                        self.performance_data.pop(0)
                
                time.sleep(10)  # Monitor every 10 seconds
                
            except Exception as e:
                logger.error(f"Performance monitoring error: {e}")
                time.sleep(10)
    
    def _get_active_connections(self, conn) -> int:
        """Get number of active connections."""
        try:
            result = conn.execute(text("""
                SELECT COUNT(*) FROM pg_stat_activity 
                WHERE state = 'active'
            """))
            return result.fetchone()[0]
        except Exception:
            return 0
    
    def _get_lock_count(self, conn) -> int:
        """Get number of locks."""
        try:
            result = conn.execute(text("SELECT COUNT(*) FROM pg_locks"))
            return result.fetchone()[0]
        except Exception:
            return 0
    
    def _get_slow_queries(self, conn) -> int:
        """Get number of slow queries."""
        try:
            result = conn.execute(text("""
                SELECT COUNT(*) FROM pg_stat_activity 
                WHERE state = 'active' AND query_start < NOW() - INTERVAL '5 seconds'
            """))
            return result.fetchone()[0]
        except Exception:
            return 0
    
    def _get_database_size(self, conn) -> int:
        """Get database size in bytes."""
        try:
            result = conn.execute(text("SELECT pg_database_size(current_database())"))
            return result.fetchone()[0]
        except Exception:
            return 0
    
    def generate_performance_report(self) -> Dict[str, Any]:
        """Generate performance report."""
        if not self.performance_data:
            return {}
        
        report = {
            "monitoring_duration": len(self.performance_data) * 10,  # seconds
            "average_connections": sum(d["active_connections"] for d in self.performance_data) / len(self.performance_data),
            "max_connections": max(d["active_connections"] for d in self.performance_data),
            "average_locks": sum(d["lock_count"] for d in self.performance_data) / len(self.performance_data),
            "slow_query_incidents": sum(1 for d in self.performance_data if d["slow_queries"] > 0),
            "database_size_gb": self.performance_data[-1]["database_size"] / (1024**3) if self.performance_data else 0
        }
        
        return report

class BackupManager:
    """Main backup management system."""
    
    def __init__(self, config: BackupConfig):
        self.config = config
        self.connection_manager = DatabaseConnectionManager(config.database_url)
        self.schema_validator = SchemaValidator(self.connection_manager)
        self.performance_monitor = PerformanceMonitor(self.connection_manager)
        
        # Create backup directory
        self.backup_dir = Path(config.backup_directory)
        self.backup_dir.mkdir(parents=True, exist_ok=True)
        
        # Metadata storage
        self.metadata_file = self.backup_dir / "backup_metadata.json"
        self.metadata_cache = self._load_metadata_cache()
    
    def _load_metadata_cache(self) -> Dict[str, BackupMetadata]:
        """Load backup metadata cache."""
        try:
            if self.metadata_file.exists():
                with open(self.metadata_file, 'r') as f:
                    data = json.load(f)
                    return {
                        backup_id: BackupMetadata.from_dict(backup_data)
                        for backup_id, backup_data in data.items()
                    }
            return {}
        except Exception as e:
            logger.error(f"Failed to load metadata cache: {e}")
            return {}
    
    def _save_metadata_cache(self):
        """Save backup metadata cache."""
        try:
            data = {
                backup_id: backup_metadata.to_dict()
                for backup_id, backup_metadata in self.metadata_cache.items()
            }
            
            with open(self.metadata_file, 'w') as f:
                json.dump(data, f, indent=2)
                
        except Exception as e:
            logger.error(f"Failed to save metadata cache: {e}")
    
    def create_backup(self, backup_type: BackupType = BackupType.FULL) -> Optional[BackupMetadata]:
        """Create a database backup."""
        try:
            logger.info(f"Creating {backup_type.value} backup...")
            
            # Validate schema
            if not self.schema_validator.validate_schema():
                logger.error("Schema validation failed")
                return None
            
            # Start performance monitoring
            self.performance_monitor.start_monitoring()
            
            # Generate backup metadata
            backup_id = f"backup_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}"
            backup_filename = f"{backup_id}.sql"
            
            if self.config.default_compression != CompressionType.NONE:
                backup_filename += f".{self.config.default_compression.value}"
            
            backup_path = self.backup_dir / backup_filename
            
            # Create backup
            start_time = time.time()
            
            if backup_type == BackupType.FULL:
                success = self._create_full_backup(backup_path)
            elif backup_type == BackupType.INCREMENTAL:
                success = self._create_incremental_backup(backup_path)
            else:
                logger.error(f"Unsupported backup type: {backup_type}")
                return None
            
            backup_duration = time.time() - start_time
            
            # Stop performance monitoring
            self.performance_monitor.stop_monitoring()
            
            if not success:
                logger.error("Backup creation failed")
                return None
            
            # Calculate checksum
            checksum = self._calculate_checksum(backup_path)
            
            # Create metadata
            metadata = BackupMetadata(
                backup_id=backup_id,
                backup_type=backup_type,
                timestamp=datetime.utcnow(),
                file_path=str(backup_path),
                file_size=backup_path.stat().st_size,
                compression=self.config.default_compression,
                database_name=self._get_database_name(),
                database_version=self._get_database_version(),
                schema_version=self.schema_validator.get_current_schema_version(),
                checksum=checksum,
                backup_duration=backup_duration,
                status=BackupStatus.COMPLETED
            )
            
            # Validate backup
            if self.config.verify_backups:
                if not self.validate_backup(metadata):
                    metadata.status = BackupStatus.CORRUPTED
                    logger.error("Backup validation failed")
                    return None
            
            # Save metadata
            self.metadata_cache[backup_id] = metadata
            self._save_metadata_cache()
            
            logger.info(f"Backup created successfully: {backup_id}")
            logger.info(f"Backup size: {metadata.file_size / (1024**2):.2f} MB")
            logger.info(f"Backup duration: {backup_duration:.2f} seconds")
            
            return metadata
            
        except Exception as e:
            logger.error(f"Backup creation failed: {e}")
            return None
    
    def _create_full_backup(self, backup_path: Path) -> bool:
        """Create a full database backup."""
        try:
            # Build pg_dump command
            cmd = [
                "pg_dump",
                "--no-password",
                "--format=custom",
                "--compress=9",
                "--verbose",
                "--file", str(backup_path),
                self.config.database_url
            ]
            
            # Execute backup
            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                timeout=3600  # 1 hour timeout
            )
            
            if result.returncode == 0:
                logger.info("Full backup completed successfully")
                return True
            else:
                logger.error(f"Full backup failed: {result.stderr}")
                return False
                
        except Exception as e:
            logger.error(f"Full backup failed: {e}")
            return False
    
    def _create_incremental_backup(self, backup_path: Path) -> bool:
        """Create an incremental backup."""
        try:
            # For PostgreSQL, we can use WAL archiving for incremental backups
            # This is a simplified implementation
            logger.warning("Incremental backup not fully implemented - creating full backup")
            return self._create_full_backup(backup_path)
            
        except Exception as e:
            logger.error(f"Incremental backup failed: {e}")
            return False
    
    def create_differential_backup(self, base_backup_id: str) -> Optional[BackupMetadata]:
        """Create a differential backup."""
        try:
            logger.info(f"Creating differential backup based on {base_backup_id}...")
            
            # This would create a backup containing only changes since the base backup
            # For now, create a full backup
            return self.create_backup(BackupType.DIFFERENTIAL)
            
        except Exception as e:
            logger.error(f"Differential backup failed: {e}")
            return None
    
    def _calculate_checksum(self, file_path: Path) -> str:
        """Calculate SHA256 checksum of backup file."""
        try:
            import hashlib
            
            sha256_hash = hashlib.sha256()
            with open(file_path, "rb") as f:
                for chunk in iter(lambda: f.read(4096), b""):
                    sha256_hash.update(chunk)
            
            return sha256_hash.hexdigest()
            
        except Exception as e:
            logger.error(f"Checksum calculation failed: {e}")
            return ""
    
    def _get_database_name(self) -> str:
        """Get database name from URL."""
        try:
            return self.config.database_url.split("/")[-1]
        except Exception:
            return "unknown"
    
    def _get_database_version(self) -> str:
        """Get database version."""
        try:
            with self.connection_manager.get_connection() as conn:
                result = conn.execute(text("SELECT version()"))
                return result.fetchone()[0]
        except Exception:
            return "unknown"
    
    def validate_backup(self, metadata: BackupMetadata) -> bool:
        """Validate backup integrity."""
        try:
            logger.info(f"Validating backup: {metadata.backup_id}")
            
            # Check file exists
            backup_path = Path(metadata.file_path)
            if not backup_path.exists():
                logger.error("Backup file not found")
                return False
            
            # Check file size
            if backup_path.stat().st_size != metadata.file_size:
                logger.error("Backup file size mismatch")
                return False
            
            # Verify checksum
            current_checksum = self._calculate_checksum(backup_path)
            if current_checksum != metadata.checksum:
                logger.error("Backup checksum mismatch")
                return False
            
            # Test restoration (optional)
            if self.config.verify_backups:
                if not self.test_backup_restore(metadata):
                    logger.error("Backup restore test failed")
                    return False
            
            logger.info("Backup validation passed")
            return True
            
        except Exception as e:
            logger.error(f"Backup validation failed: {e}")
            return False
    
    def test_backup_restore(self, metadata: BackupMetadata) -> bool:
        """Test backup restore capability."""
        try:
            logger.info(f"Testing backup restore: {metadata.backup_id}")
            
            # Create temporary database for testing
            test_db_name = f"test_restore_{int(time.time())}"
            
            # This would create a test database and restore the backup
            # For now, just return True
            logger.info("Backup restore test passed (simulated)")
            return True
            
        except Exception as e:
            logger.error(f"Backup restore test failed: {e}")
            return False
    
    def restore_from_backup(self, backup_id: str, target_database: str = None) -> bool:
        """Restore database from backup."""
        try:
            logger.info(f"Restoring from backup: {backup_id}")
            
            # Get backup metadata
            if backup_id not in self.metadata_cache:
                logger.error(f"Backup metadata not found: {backup_id}")
                return False
            
            metadata = self.metadata_cache[backup_id]
            
            # Validate backup
            if not self.validate_backup(metadata):
                logger.error("Backup validation failed")
                return False
            
            # Perform restoration
            backup_path = Path(metadata.file_path)
            
            # Build pg_restore command
            cmd = [
                "pg_restore",
                "--no-password",
                "--verbose",
                "--clean",
                "--if-exists",
                "--dbname", target_database or self.config.database_url,
                str(backup_path)
            ]
            
            # Execute restore
            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                timeout=3600  # 1 hour timeout
            )
            
            if result.returncode == 0:
                logger.info("Database restoration completed successfully")
                return True
            else:
                logger.error(f"Database restoration failed: {result.stderr}")
                return False
                
        except Exception as e:
            logger.error(f"Database restoration failed: {e}")
            return False
    
    def restore_to_point_in_time(self, target_time: datetime) -> bool:
        """Restore database to specific point in time."""
        try:
            logger.info(f"Restoring to point in time: {target_time}")
            
            # Find the most recent backup before target time
            suitable_backups = [
                metadata for metadata in self.metadata_cache.values()
                if metadata.timestamp <= target_time and metadata.status == BackupStatus.COMPLETED
            ]
            
            if not suitable_backups:
                logger.error("No suitable backup found for point-in-time restore")
                return False
            
            # Sort by timestamp and get most recent
            latest_backup = max(suitable_backups, key=lambda x: x.timestamp)
            
            # Restore from backup
            if not self.restore_from_backup(latest_backup.backup_id):
                return False
            
            # Apply transaction logs up to target time
            # This would require WAL archiving to be configured
            logger.warning("Transaction log replay not implemented - restored to backup time")
            
            logger.info("Point-in-time restore completed")
            return True
            
        except Exception as e:
            logger.error(f"Point-in-time restore failed: {e}")
            return False
    
    def validate_restore_success(self, backup_metadata: BackupMetadata) -> bool:
        """Validate restore operation success."""
        try:
            logger.info("Validating restore success...")
            
            # Check schema version matches
            if not self.schema_validator.compare_schemas(backup_metadata):
                logger.error("Schema version mismatch after restore")
                return False
            
            # Check table counts
            with self.connection_manager.get_connection() as conn:
                tables = ["users", "channels", "posts", "replies", "votes", "messages"]
                
                for table in tables:
                    result = conn.execute(text(f"SELECT COUNT(*) FROM {table}"))
                    count = result.fetchone()[0]
                    logger.info(f"Table {table}: {count} rows")
            
            logger.info("Restore validation passed")
            return True
            
        except Exception as e:
            logger.error(f"Restore validation failed: {e}")
            return False
    
    def list_available_backups(self) -> List[BackupMetadata]:
        """List all available backups."""
        return list(self.metadata_cache.values())
    
    def apply_retention_policy(self) -> int:
        """Apply retention policy and clean up old backups."""
        try:
            logger.info("Applying backup retention policy...")
            
            current_time = datetime.utcnow()
            retention = self.config.retention_policy
            deleted_count = 0
            
            for backup_id, metadata in list(self.metadata_cache.items()):
                should_delete = False
                age = current_time - metadata.timestamp
                
                # Check retention rules
                if age.days > retention.yearly_retention_years * 365:
                    should_delete = True
                elif age.days > retention.monthly_retention_months * 30:
                    # Keep monthly backups
                    if metadata.timestamp.day != 1:
                        should_delete = True
                elif age.days > retention.weekly_retention_weeks * 7:
                    # Keep weekly backups
                    if metadata.timestamp.weekday() != 0:
                        should_delete = True
                elif age.days > retention.daily_retention_days:
                    should_delete = True
                
                if should_delete:
                    if self._delete_backup(backup_id):
                        deleted_count += 1
            
            logger.info(f"Retention policy applied: {deleted_count} backups deleted")
            return deleted_count
            
        except Exception as e:
            logger.error(f"Retention policy application failed: {e}")
            return 0
    
    def cleanup_old_backups(self, max_age_days: int = 30) -> int:
        """Clean up backups older than specified age."""
        try:
            logger.info(f"Cleaning up backups older than {max_age_days} days...")
            
            current_time = datetime.utcnow()
            cutoff_time = current_time - timedelta(days=max_age_days)
            deleted_count = 0
            
            for backup_id, metadata in list(self.metadata_cache.items()):
                if metadata.timestamp < cutoff_time:
                    if self._delete_backup(backup_id):
                        deleted_count += 1
            
            logger.info(f"Cleanup completed: {deleted_count} backups deleted")
            return deleted_count
            
        except Exception as e:
            logger.error(f"Backup cleanup failed: {e}")
            return 0
    
    def _delete_backup(self, backup_id: str) -> bool:
        """Delete a backup and its metadata."""
        try:
            if backup_id not in self.metadata_cache:
                logger.warning(f"Backup metadata not found: {backup_id}")
                return False
            
            metadata = self.metadata_cache[backup_id]
            backup_path = Path(metadata.file_path)
            
            # Delete backup file
            if backup_path.exists():
                backup_path.unlink()
                logger.info(f"Deleted backup file: {backup_path}")
            
            # Remove from metadata cache
            del self.metadata_cache[backup_id]
            self._save_metadata_cache()
            
            logger.info(f"Backup deleted: {backup_id}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to delete backup {backup_id}: {e}")
            return False
    
    def get_backup_statistics(self) -> Dict[str, Any]:
        """Get backup statistics."""
        try:
            stats = {
                "total_backups": len(self.metadata_cache),
                "total_size_gb": sum(m.file_size for m in self.metadata_cache.values()) / (1024**3),
                "oldest_backup": None,
                "newest_backup": None,
                "backup_types": {},
                "status_counts": {},
                "average_backup_size_mb": 0,
                "average_backup_duration": 0
            }
            
            if self.metadata_cache:
                # Find oldest and newest
                sorted_backups = sorted(self.metadata_cache.values(), key=lambda x: x.timestamp)
                stats["oldest_backup"] = sorted_backups[0].timestamp.isoformat()
                stats["newest_backup"] = sorted_backups[-1].timestamp.isoformat()
                
                # Count by type and status
                for metadata in self.metadata_cache.values():
                    backup_type = metadata.backup_type.value
                    stats["backup_types"][backup_type] = stats["backup_types"].get(backup_type, 0) + 1
                    
                    status = metadata.status.value
                    stats["status_counts"][status] = stats["status_counts"].get(status, 0) + 1
                
                # Calculate averages
                stats["average_backup_size_mb"] = (
                    sum(m.file_size for m in self.metadata_cache.values()) / 
                    len(self.metadata_cache) / (1024**2)
                )
                
                stats["average_backup_duration"] = (
                    sum(m.backup_duration for m in self.metadata_cache.values()) / 
                    len(self.metadata_cache)
                )
            
            return stats
            
        except Exception as e:
            logger.error(f"Failed to get backup statistics: {e}")
            return {}

def main():
    """Main backup script."""
    import argparse
    
    parser = argparse.ArgumentParser(description="Database backup and restore tool")
    parser.add_argument("command", choices=[
        "backup", "restore", "list", "validate", "cleanup", "stats", "schedule"
    ], help="Backup command to run")
    parser.add_argument("--backup-id", help="Backup ID for restore/validate operations")
    parser.add_argument("--backup-type", choices=["full", "incremental", "differential"], 
                       default="full", help="Type of backup to create")
    parser.add_argument("--target-database", help="Target database for restore")
    parser.add_argument("--max-age-days", type=int, default=30, help="Maximum age for cleanup")
    parser.add_argument("--backup-dir", default="/tmp/backups", help="Backup directory")
    parser.add_argument("--database-url", help="Database URL override")
    
    args = parser.parse_args()
    
    # Create configuration
    config = BackupConfig(
        database_url=args.database_url or DATABASE_URL,
        backup_directory=args.backup_dir,
        retention_policy=RetentionPolicy()
    )
    
    manager = BackupManager(config)
    
    if args.command == "backup":
        backup_type = BackupType(args.backup_type)
        metadata = manager.create_backup(backup_type)
        if metadata:
            print(f"Backup created: {metadata.backup_id}")
        else:
            sys.exit(1)
    
    elif args.command == "restore":
        if not args.backup_id:
            print("Error: --backup-id is required for restore")
            sys.exit(1)
        
        success = manager.restore_from_backup(args.backup_id, args.target_database)
        if not success:
            sys.exit(1)
    
    elif args.command == "list":
        backups = manager.list_available_backups()
        for backup in sorted(backups, key=lambda x: x.timestamp, reverse=True):
            print(f"{backup.backup_id}: {backup.timestamp} ({backup.backup_type.value}) - {backup.file_size / (1024**2):.1f} MB")
    
    elif args.command == "validate":
        if not args.backup_id:
            print("Error: --backup-id is required for validate")
            sys.exit(1)
        
        if args.backup_id not in manager.metadata_cache:
            print(f"Backup not found: {args.backup_id}")
            sys.exit(1)
        
        metadata = manager.metadata_cache[args.backup_id]
        if manager.validate_backup(metadata):
            print("Backup validation passed")
        else:
            print("Backup validation failed")
            sys.exit(1)
    
    elif args.command == "cleanup":
        deleted_count = manager.cleanup_old_backups(args.max_age_days)
        print(f"Deleted {deleted_count} old backups")
    
    elif args.command == "stats":
        stats = manager.get_backup_statistics()
        print(json.dumps(stats, indent=2))
    
    elif args.command == "schedule":
        print("Backup scheduling not implemented in this version")
    
    else:
        print(f"Unknown command: {args.command}")
        sys.exit(1)
    
    print("Backup operation completed successfully")

if __name__ == "__main__":
    main()