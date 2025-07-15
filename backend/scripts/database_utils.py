#!/usr/bin/env python3
"""
Database utility functions for Reddit Forum Backend
This module provides various database utilities for maintenance and operations
"""

import os
import sys
import time
import asyncio
from pathlib import Path
from typing import List, Dict, Optional, Any, Tuple
from datetime import datetime, timedelta
from dataclasses import dataclass
from enum import Enum
import logging
import json
from contextlib import asynccontextmanager

# Add the project root to the path
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

from sqlalchemy import create_engine, text, MetaData, Table, inspect
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.engine import Engine
from sqlalchemy.pool import QueuePool
from app.database import DATABASE_URL

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class QueryType(Enum):
    """Types of database queries."""
    SELECT = "SELECT"
    INSERT = "INSERT"
    UPDATE = "UPDATE"
    DELETE = "DELETE"
    DDL = "DDL"
    UTILITY = "UTILITY"

@dataclass
class QueryPerformanceMetric:
    """Query performance metric data."""
    query_type: QueryType
    query_text: str
    execution_time: float
    timestamp: datetime
    rows_affected: int
    cpu_usage: float
    memory_usage: float
    io_operations: int

@dataclass
class DatabaseHealthMetric:
    """Database health metric data."""
    timestamp: datetime
    connection_count: int
    active_queries: int
    locked_queries: int
    database_size: int
    table_sizes: Dict[str, int]
    index_usage: Dict[str, float]
    cache_hit_ratio: float
    slow_queries: int

class DatabaseConnectionManager:
    """Enhanced database connection manager with pooling."""
    
    def __init__(self, database_url: str, pool_size: int = 10, max_overflow: int = 20):
        self.database_url = database_url
        self.pool_size = pool_size
        self.max_overflow = max_overflow
        self.engine = None
        self._connection_pool = None
        self._initialize_engine()
    
    def _initialize_engine(self):
        """Initialize database engine with connection pooling."""
        try:
            self.engine = create_engine(
                self.database_url,
                poolclass=QueuePool,
                pool_size=self.pool_size,
                max_overflow=self.max_overflow,
                pool_timeout=30,
                pool_recycle=3600,  # Recycle connections after 1 hour
                pool_pre_ping=True,  # Validate connections before use
                echo=False
            )
            
            logger.info(f"Database engine initialized with pool size: {self.pool_size}")
            
        except Exception as e:
            logger.error(f"Failed to initialize database engine: {e}")
            raise
    
    def create_connection_pool(self) -> bool:
        """Create connection pool for database operations."""
        try:
            # Test connection
            with self.engine.connect() as conn:
                conn.execute(text("SELECT 1"))
            
            self._connection_pool = self.engine.pool
            logger.info("Connection pool created successfully")
            return True
            
        except Exception as e:
            logger.error(f"Failed to create connection pool: {e}")
            return False
    
    def get_connection(self):
        """Get database connection from pool."""
        try:
            return self.engine.connect()
        except Exception as e:
            logger.error(f"Failed to get database connection: {e}")
            raise
    
    def close_connection_pool(self):
        """Close connection pool."""
        try:
            if self.engine:
                self.engine.dispose()
                logger.info("Connection pool closed")
        except Exception as e:
            logger.error(f"Failed to close connection pool: {e}")
    
    def get_pool_status(self) -> Dict[str, Any]:
        """Get connection pool status."""
        try:
            pool = self.engine.pool
            return {
                "size": pool.size(),
                "checked_in": pool.checkedin(),
                "checked_out": pool.checkedout(),
                "overflow": pool.overflow(),
                "invalid": pool.invalid()
            }
        except Exception as e:
            logger.error(f"Failed to get pool status: {e}")
            return {}

class SchemaValidator:
    """Enhanced schema validator with comprehensive checks."""
    
    def __init__(self, connection_manager: DatabaseConnectionManager):
        self.connection_manager = connection_manager
    
    def validate_schema(self) -> Tuple[bool, List[str]]:
        """Validate database schema with detailed error reporting."""
        try:
            errors = []
            
            with self.connection_manager.get_connection() as conn:
                # Check required tables
                required_tables = {
                    'users': ['id', 'username', 'email', 'password_hash', 'created_at'],
                    'channels': ['id', 'name', 'description', 'created_by', 'created_at'],
                    'posts': ['id', 'title', 'content', 'channel_id', 'user_id', 'created_at'],
                    'replies': ['id', 'content', 'post_id', 'user_id', 'created_at'],
                    'votes': ['id', 'user_id', 'vote_type', 'created_at'],
                    'messages': ['id', 'content', 'sender_id', 'recipient_id', 'created_at']
                }
                
                inspector = inspect(conn)
                existing_tables = inspector.get_table_names()
                
                for table_name, required_columns in required_tables.items():
                    if table_name not in existing_tables:
                        errors.append(f"Missing table: {table_name}")
                        continue
                    
                    # Check columns
                    columns = inspector.get_columns(table_name)
                    column_names = [col['name'] for col in columns]
                    
                    for required_col in required_columns:
                        if required_col not in column_names:
                            errors.append(f"Missing column {required_col} in table {table_name}")
                
                # Check foreign keys
                foreign_keys = [
                    ('posts', 'channel_id', 'channels', 'id'),
                    ('posts', 'user_id', 'users', 'id'),
                    ('replies', 'post_id', 'posts', 'id'),
                    ('replies', 'user_id', 'users', 'id'),
                    ('votes', 'user_id', 'users', 'id'),
                    ('messages', 'sender_id', 'users', 'id'),
                    ('messages', 'recipient_id', 'users', 'id')
                ]
                
                for table, column, ref_table, ref_column in foreign_keys:
                    if table in existing_tables and ref_table in existing_tables:
                        fks = inspector.get_foreign_keys(table)
                        fk_columns = [fk['constrained_columns'][0] for fk in fks]
                        
                        if column not in fk_columns:
                            errors.append(f"Missing foreign key: {table}.{column} -> {ref_table}.{ref_column}")
                
                # Check indexes
                critical_indexes = [
                    ('users', 'username'),
                    ('users', 'email'),
                    ('posts', 'channel_id'),
                    ('posts', 'created_at'),
                    ('replies', 'post_id'),
                    ('votes', 'user_id'),
                    ('messages', 'recipient_id')
                ]
                
                for table, column in critical_indexes:
                    if table in existing_tables:
                        indexes = inspector.get_indexes(table)
                        index_columns = [idx['column_names'][0] for idx in indexes if idx['column_names']]
                        
                        if column not in index_columns:
                            errors.append(f"Missing index: {table}.{column}")
                
                return len(errors) == 0, errors
                
        except Exception as e:
            logger.error(f"Schema validation failed: {e}")
            return False, [str(e)]
    
    def compare_schemas(self, baseline_schema: Dict[str, Any]) -> Tuple[bool, List[str]]:
        """Compare current schema with baseline."""
        try:
            current_schema = self.get_schema_info()
            differences = []
            
            # Compare tables
            baseline_tables = set(baseline_schema.get('tables', {}).keys())
            current_tables = set(current_schema.get('tables', {}).keys())
            
            missing_tables = baseline_tables - current_tables
            extra_tables = current_tables - baseline_tables
            
            for table in missing_tables:
                differences.append(f"Missing table: {table}")
            
            for table in extra_tables:
                differences.append(f"Extra table: {table}")
            
            # Compare columns for common tables
            common_tables = baseline_tables & current_tables
            
            for table in common_tables:
                baseline_columns = set(baseline_schema['tables'][table].get('columns', []))
                current_columns = set(current_schema['tables'][table].get('columns', []))
                
                missing_columns = baseline_columns - current_columns
                extra_columns = current_columns - baseline_columns
                
                for column in missing_columns:
                    differences.append(f"Missing column: {table}.{column}")
                
                for column in extra_columns:
                    differences.append(f"Extra column: {table}.{column}")
            
            return len(differences) == 0, differences
            
        except Exception as e:
            logger.error(f"Schema comparison failed: {e}")
            return False, [str(e)]
    
    def get_schema_info(self) -> Dict[str, Any]:
        """Get comprehensive schema information."""
        try:
            with self.connection_manager.get_connection() as conn:
                inspector = inspect(conn)
                
                schema_info = {
                    "tables": {},
                    "indexes": {},
                    "foreign_keys": {},
                    "constraints": {}
                }
                
                # Get table information
                for table_name in inspector.get_table_names():
                    columns = inspector.get_columns(table_name)
                    indexes = inspector.get_indexes(table_name)
                    foreign_keys = inspector.get_foreign_keys(table_name)
                    
                    schema_info["tables"][table_name] = {
                        "columns": [col['name'] for col in columns],
                        "column_details": columns,
                        "row_count": self._get_table_row_count(conn, table_name)
                    }
                    
                    schema_info["indexes"][table_name] = [
                        {
                            "name": idx['name'],
                            "columns": idx['column_names'],
                            "unique": idx['unique']
                        }
                        for idx in indexes
                    ]
                    
                    schema_info["foreign_keys"][table_name] = [
                        {
                            "name": fk['name'],
                            "columns": fk['constrained_columns'],
                            "referred_table": fk['referred_table'],
                            "referred_columns": fk['referred_columns']
                        }
                        for fk in foreign_keys
                    ]
                
                return schema_info
                
        except Exception as e:
            logger.error(f"Failed to get schema info: {e}")
            return {}
    
    def _get_table_row_count(self, conn, table_name: str) -> int:
        """Get row count for a table."""
        try:
            result = conn.execute(text(f"SELECT COUNT(*) FROM {table_name}"))
            return result.fetchone()[0]
        except Exception:
            return 0
    
    def generate_schema_report(self) -> Dict[str, Any]:
        """Generate comprehensive schema report."""
        try:
            is_valid, errors = self.validate_schema()
            schema_info = self.get_schema_info()
            
            report = {
                "timestamp": datetime.utcnow().isoformat(),
                "schema_valid": is_valid,
                "validation_errors": errors,
                "table_count": len(schema_info.get('tables', {})),
                "total_rows": sum(
                    table_info.get('row_count', 0)
                    for table_info in schema_info.get('tables', {}).values()
                ),
                "tables": schema_info.get('tables', {}),
                "indexes": schema_info.get('indexes', {}),
                "foreign_keys": schema_info.get('foreign_keys', {})
            }
            
            return report
            
        except Exception as e:
            logger.error(f"Failed to generate schema report: {e}")
            return {"error": str(e)}

class PerformanceMonitor:
    """Enhanced performance monitoring system."""
    
    def __init__(self, connection_manager: DatabaseConnectionManager):
        self.connection_manager = connection_manager
        self.monitoring_active = False
        self.performance_data = []
        self.query_metrics = []
    
    def start_monitoring(self, interval: int = 10):
        """Start performance monitoring."""
        self.monitoring_active = True
        self.performance_data = []
        self.query_metrics = []
        
        import threading
        monitoring_thread = threading.Thread(
            target=self._monitor_performance,
            args=(interval,),
            daemon=True
        )
        monitoring_thread.start()
        
        logger.info(f"Performance monitoring started with {interval}s interval")
    
    def stop_monitoring(self):
        """Stop performance monitoring."""
        self.monitoring_active = False
        logger.info("Performance monitoring stopped")
    
    def _monitor_performance(self, interval: int):
        """Monitor performance metrics continuously."""
        while self.monitoring_active:
            try:
                with self.connection_manager.get_connection() as conn:
                    metrics = self._collect_performance_metrics(conn)
                    self.performance_data.append(metrics)
                    
                    # Keep only last 1000 records
                    if len(self.performance_data) > 1000:
                        self.performance_data.pop(0)
                
                time.sleep(interval)
                
            except Exception as e:
                logger.error(f"Performance monitoring error: {e}")
                time.sleep(interval)
    
    def _collect_performance_metrics(self, conn) -> DatabaseHealthMetric:
        """Collect current performance metrics."""
        try:
            # Get connection count
            conn_result = conn.execute(text("""
                SELECT COUNT(*) as total_connections,
                       COUNT(CASE WHEN state = 'active' THEN 1 END) as active_connections
                FROM pg_stat_activity
                WHERE pid != pg_backend_pid()
            """))
            conn_counts = conn_result.fetchone()
            
            # Get lock information
            lock_result = conn.execute(text("""
                SELECT COUNT(*) as total_locks,
                       COUNT(CASE WHEN NOT granted THEN 1 END) as blocked_locks
                FROM pg_locks
            """))
            lock_counts = lock_result.fetchone()
            
            # Get database size
            size_result = conn.execute(text("SELECT pg_database_size(current_database())"))
            db_size = size_result.fetchone()[0]
            
            # Get table sizes
            table_sizes = {}
            tables_result = conn.execute(text("""
                SELECT schemaname, tablename, pg_total_relation_size(schemaname||'.'||tablename) as size
                FROM pg_tables
                WHERE schemaname = 'public'
            """))
            
            for schema, table, size in tables_result:
                table_sizes[table] = size
            
            # Get cache hit ratio
            cache_result = conn.execute(text("""
                SELECT 
                    sum(heap_blks_hit) / (sum(heap_blks_hit) + sum(heap_blks_read)) as cache_hit_ratio
                FROM pg_statio_user_tables
            """))
            cache_hit_ratio = cache_result.fetchone()[0] or 0
            
            # Get slow queries
            slow_queries_result = conn.execute(text("""
                SELECT COUNT(*) 
                FROM pg_stat_activity 
                WHERE state = 'active' 
                AND query_start < NOW() - INTERVAL '5 seconds'
                AND pid != pg_backend_pid()
            """))
            slow_queries = slow_queries_result.fetchone()[0]
            
            return DatabaseHealthMetric(
                timestamp=datetime.utcnow(),
                connection_count=conn_counts[0],
                active_queries=conn_counts[1],
                locked_queries=lock_counts[1],
                database_size=db_size,
                table_sizes=table_sizes,
                index_usage={},  # Would need more complex query
                cache_hit_ratio=float(cache_hit_ratio),
                slow_queries=slow_queries
            )
            
        except Exception as e:
            logger.error(f"Failed to collect performance metrics: {e}")
            return DatabaseHealthMetric(
                timestamp=datetime.utcnow(),
                connection_count=0,
                active_queries=0,
                locked_queries=0,
                database_size=0,
                table_sizes={},
                index_usage={},
                cache_hit_ratio=0.0,
                slow_queries=0
            )
    
    def monitor_query_performance(self, query: str, query_type: QueryType = QueryType.SELECT) -> QueryPerformanceMetric:
        """Monitor individual query performance."""
        try:
            with self.connection_manager.get_connection() as conn:
                start_time = time.time()
                
                # Execute query and measure performance
                result = conn.execute(text(query))
                
                end_time = time.time()
                execution_time = end_time - start_time
                
                # Get row count
                rows_affected = result.rowcount if result.rowcount != -1 else 0
                
                metric = QueryPerformanceMetric(
                    query_type=query_type,
                    query_text=query[:200] + "..." if len(query) > 200 else query,
                    execution_time=execution_time,
                    timestamp=datetime.utcnow(),
                    rows_affected=rows_affected,
                    cpu_usage=0.0,  # Would need system monitoring
                    memory_usage=0.0,  # Would need system monitoring
                    io_operations=0  # Would need system monitoring
                )
                
                self.query_metrics.append(metric)
                
                # Keep only last 1000 query metrics
                if len(self.query_metrics) > 1000:
                    self.query_metrics.pop(0)
                
                return metric
                
        except Exception as e:
            logger.error(f"Query performance monitoring failed: {e}")
            return QueryPerformanceMetric(
                query_type=query_type,
                query_text=query,
                execution_time=0.0,
                timestamp=datetime.utcnow(),
                rows_affected=0,
                cpu_usage=0.0,
                memory_usage=0.0,
                io_operations=0
            )
    
    def analyze_slow_queries(self, threshold: float = 1.0) -> List[Dict[str, Any]]:
        """Analyze slow queries above threshold."""
        try:
            with self.connection_manager.get_connection() as conn:
                slow_queries_result = conn.execute(text("""
                    SELECT query, calls, total_time, mean_time, max_time, rows
                    FROM pg_stat_statements
                    WHERE mean_time > :threshold
                    ORDER BY mean_time DESC
                    LIMIT 20
                """), {"threshold": threshold * 1000})  # Convert to milliseconds
                
                slow_queries = []
                for query, calls, total_time, mean_time, max_time, rows in slow_queries_result:
                    slow_queries.append({
                        "query": query[:200] + "..." if len(query) > 200 else query,
                        "calls": calls,
                        "total_time_ms": total_time,
                        "mean_time_ms": mean_time,
                        "max_time_ms": max_time,
                        "rows": rows
                    })
                
                return slow_queries
                
        except Exception as e:
            logger.error(f"Slow query analysis failed: {e}")
            return []
    
    def generate_performance_report(self) -> Dict[str, Any]:
        """Generate comprehensive performance report."""
        try:
            if not self.performance_data:
                return {"error": "No performance data available"}
            
            # Calculate averages
            avg_connections = sum(m.connection_count for m in self.performance_data) / len(self.performance_data)
            avg_active_queries = sum(m.active_queries for m in self.performance_data) / len(self.performance_data)
            avg_cache_hit_ratio = sum(m.cache_hit_ratio for m in self.performance_data) / len(self.performance_data)
            
            # Find peaks
            max_connections = max(m.connection_count for m in self.performance_data)
            max_slow_queries = max(m.slow_queries for m in self.performance_data)
            
            # Query performance stats
            query_stats = {}
            if self.query_metrics:
                query_stats = {
                    "total_queries": len(self.query_metrics),
                    "avg_execution_time": sum(m.execution_time for m in self.query_metrics) / len(self.query_metrics),
                    "max_execution_time": max(m.execution_time for m in self.query_metrics),
                    "slow_queries": len([m for m in self.query_metrics if m.execution_time > 1.0])
                }
            
            # Current database size
            current_db_size = self.performance_data[-1].database_size if self.performance_data else 0
            
            report = {
                "timestamp": datetime.utcnow().isoformat(),
                "monitoring_duration_minutes": len(self.performance_data) * 10 / 60,  # Assuming 10s intervals
                "database_size_gb": current_db_size / (1024**3),
                "connection_stats": {
                    "avg_connections": avg_connections,
                    "max_connections": max_connections,
                    "avg_active_queries": avg_active_queries
                },
                "performance_stats": {
                    "avg_cache_hit_ratio": avg_cache_hit_ratio,
                    "max_slow_queries": max_slow_queries
                },
                "query_stats": query_stats,
                "slow_queries": self.analyze_slow_queries()
            }
            
            return report
            
        except Exception as e:
            logger.error(f"Failed to generate performance report: {e}")
            return {"error": str(e)}

class IntegrityChecker:
    """Database integrity checker."""
    
    def __init__(self, connection_manager: DatabaseConnectionManager):
        self.connection_manager = connection_manager
    
    def check_referential_integrity(self) -> Tuple[bool, List[str]]:
        """Check referential integrity."""
        try:
            errors = []
            
            with self.connection_manager.get_connection() as conn:
                # Check foreign key constraints
                integrity_checks = [
                    ("posts", "user_id", "users", "id", "Posts with invalid user_id"),
                    ("posts", "channel_id", "channels", "id", "Posts with invalid channel_id"),
                    ("replies", "user_id", "users", "id", "Replies with invalid user_id"),
                    ("replies", "post_id", "posts", "id", "Replies with invalid post_id"),
                    ("votes", "user_id", "users", "id", "Votes with invalid user_id"),
                    ("messages", "sender_id", "users", "id", "Messages with invalid sender_id"),
                    ("messages", "recipient_id", "users", "id", "Messages with invalid recipient_id")
                ]
                
                for table, column, ref_table, ref_column, description in integrity_checks:
                    result = conn.execute(text(f"""
                        SELECT COUNT(*) 
                        FROM {table} t
                        LEFT JOIN {ref_table} r ON t.{column} = r.{ref_column}
                        WHERE r.{ref_column} IS NULL AND t.{column} IS NOT NULL
                    """))
                    
                    count = result.fetchone()[0]
                    if count > 0:
                        errors.append(f"{description}: {count} records")
                
                return len(errors) == 0, errors
                
        except Exception as e:
            logger.error(f"Referential integrity check failed: {e}")
            return False, [str(e)]
    
    def validate_foreign_keys(self) -> Tuple[bool, List[str]]:
        """Validate foreign key constraints."""
        try:
            errors = []
            
            with self.connection_manager.get_connection() as conn:
                # Check for disabled foreign key constraints
                result = conn.execute(text("""
                    SELECT conname, conrelid::regclass, confrelid::regclass
                    FROM pg_constraint
                    WHERE contype = 'f' AND NOT convalidated
                """))
                
                for constraint_name, table, ref_table in result:
                    errors.append(f"Disabled foreign key constraint: {constraint_name} on {table} -> {ref_table}")
                
                return len(errors) == 0, errors
                
        except Exception as e:
            logger.error(f"Foreign key validation failed: {e}")
            return False, [str(e)]
    
    def check_constraint_violations(self) -> Tuple[bool, List[str]]:
        """Check for constraint violations."""
        try:
            errors = []
            
            with self.connection_manager.get_connection() as conn:
                # Check unique constraints
                uniqueness_checks = [
                    ("users", "username", "Duplicate usernames"),
                    ("users", "email", "Duplicate emails"),
                    ("channels", "name", "Duplicate channel names")
                ]
                
                for table, column, description in uniqueness_checks:
                    result = conn.execute(text(f"""
                        SELECT {column}, COUNT(*) 
                        FROM {table} 
                        GROUP BY {column} 
                        HAVING COUNT(*) > 1
                    """))
                    
                    duplicates = result.fetchall()
                    if duplicates:
                        errors.append(f"{description}: {len(duplicates)} duplicate values")
                
                # Check null constraints
                null_checks = [
                    ("users", "username", "Users with null username"),
                    ("users", "email", "Users with null email"),
                    ("posts", "title", "Posts with null title"),
                    ("posts", "content", "Posts with null content")
                ]
                
                for table, column, description in null_checks:
                    result = conn.execute(text(f"""
                        SELECT COUNT(*) FROM {table} WHERE {column} IS NULL
                    """))
                    
                    count = result.fetchone()[0]
                    if count > 0:
                        errors.append(f"{description}: {count} records")
                
                return len(errors) == 0, errors
                
        except Exception as e:
            logger.error(f"Constraint violation check failed: {e}")
            return False, [str(e)]
    
    def validate_data_consistency(self) -> Tuple[bool, List[str]]:
        """Validate data consistency."""
        try:
            errors = []
            
            with self.connection_manager.get_connection() as conn:
                # Check for posts without valid channels
                result = conn.execute(text("""
                    SELECT COUNT(*) FROM posts p
                    LEFT JOIN channels c ON p.channel_id = c.id
                    WHERE c.id IS NULL
                """))
                
                orphaned_posts = result.fetchone()[0]
                if orphaned_posts > 0:
                    errors.append(f"Orphaned posts: {orphaned_posts}")
                
                # Check for replies without valid posts
                result = conn.execute(text("""
                    SELECT COUNT(*) FROM replies r
                    LEFT JOIN posts p ON r.post_id = p.id
                    WHERE p.id IS NULL
                """))
                
                orphaned_replies = result.fetchone()[0]
                if orphaned_replies > 0:
                    errors.append(f"Orphaned replies: {orphaned_replies}")
                
                # Check for votes without valid targets
                result = conn.execute(text("""
                    SELECT COUNT(*) FROM votes v
                    WHERE (v.post_id IS NULL AND v.reply_id IS NULL)
                    OR (v.post_id IS NOT NULL AND v.reply_id IS NOT NULL)
                """))
                
                invalid_votes = result.fetchone()[0]
                if invalid_votes > 0:
                    errors.append(f"Invalid votes: {invalid_votes}")
                
                return len(errors) == 0, errors
                
        except Exception as e:
            logger.error(f"Data consistency validation failed: {e}")
            return False, [str(e)]
    
    def check_duplicate_records(self) -> Tuple[bool, List[str]]:
        """Check for duplicate records."""
        try:
            errors = []
            
            with self.connection_manager.get_connection() as conn:
                # Check for duplicate votes
                result = conn.execute(text("""
                    SELECT user_id, post_id, reply_id, COUNT(*) 
                    FROM votes 
                    GROUP BY user_id, post_id, reply_id 
                    HAVING COUNT(*) > 1
                """))
                
                duplicate_votes = result.fetchall()
                if duplicate_votes:
                    errors.append(f"Duplicate votes: {len(duplicate_votes)} cases")
                
                # Check for duplicate messages
                result = conn.execute(text("""
                    SELECT sender_id, recipient_id, content, created_at, COUNT(*) 
                    FROM messages 
                    GROUP BY sender_id, recipient_id, content, created_at 
                    HAVING COUNT(*) > 1
                """))
                
                duplicate_messages = result.fetchall()
                if duplicate_messages:
                    errors.append(f"Duplicate messages: {len(duplicate_messages)} cases")
                
                return len(errors) == 0, errors
                
        except Exception as e:
            logger.error(f"Duplicate records check failed: {e}")
            return False, [str(e)]
    
    def validate_data_types(self) -> Tuple[bool, List[str]]:
        """Validate data types and formats."""
        try:
            errors = []
            
            with self.connection_manager.get_connection() as conn:
                # Check email format
                result = conn.execute(text("""
                    SELECT COUNT(*) FROM users 
                    WHERE email !~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'
                """))
                
                invalid_emails = result.fetchone()[0]
                if invalid_emails > 0:
                    errors.append(f"Invalid email formats: {invalid_emails}")
                
                # Check username format
                result = conn.execute(text("""
                    SELECT COUNT(*) FROM users 
                    WHERE username !~ '^[A-Za-z0-9_-]+$' OR LENGTH(username) < 3
                """))
                
                invalid_usernames = result.fetchone()[0]
                if invalid_usernames > 0:
                    errors.append(f"Invalid username formats: {invalid_usernames}")
                
                # Check date consistency
                result = conn.execute(text("""
                    SELECT COUNT(*) FROM posts 
                    WHERE created_at > updated_at
                """))
                
                invalid_dates = result.fetchone()[0]
                if invalid_dates > 0:
                    errors.append(f"Invalid date sequences: {invalid_dates}")
                
                return len(errors) == 0, errors
                
        except Exception as e:
            logger.error(f"Data type validation failed: {e}")
            return False, [str(e)]
    
    def assess_data_quality(self) -> Dict[str, Any]:
        """Assess overall data quality."""
        try:
            assessment = {
                "timestamp": datetime.utcnow().isoformat(),
                "referential_integrity": {"passed": False, "errors": []},
                "constraint_violations": {"passed": False, "errors": []},
                "data_consistency": {"passed": False, "errors": []},
                "duplicate_records": {"passed": False, "errors": []},
                "data_types": {"passed": False, "errors": []},
                "overall_score": 0
            }
            
            # Run all checks
            checks = [
                ("referential_integrity", self.check_referential_integrity),
                ("constraint_violations", self.check_constraint_violations),
                ("data_consistency", self.validate_data_consistency),
                ("duplicate_records", self.check_duplicate_records),
                ("data_types", self.validate_data_types)
            ]
            
            passed_checks = 0
            
            for check_name, check_func in checks:
                try:
                    passed, errors = check_func()
                    assessment[check_name] = {
                        "passed": passed,
                        "errors": errors
                    }
                    if passed:
                        passed_checks += 1
                except Exception as e:
                    assessment[check_name] = {
                        "passed": False,
                        "errors": [str(e)]
                    }
            
            # Calculate overall score
            assessment["overall_score"] = (passed_checks / len(checks)) * 100
            
            return assessment
            
        except Exception as e:
            logger.error(f"Data quality assessment failed: {e}")
            return {"error": str(e)}
    
    def identify_data_anomalies(self) -> List[Dict[str, Any]]:
        """Identify data anomalies."""
        try:
            anomalies = []
            
            with self.connection_manager.get_connection() as conn:
                # Check for users with excessive posts
                result = conn.execute(text("""
                    SELECT user_id, COUNT(*) as post_count
                    FROM posts
                    GROUP BY user_id
                    HAVING COUNT(*) > 1000
                    ORDER BY post_count DESC
                """))
                
                for user_id, post_count in result:
                    anomalies.append({
                        "type": "excessive_posts",
                        "description": f"User {user_id} has {post_count} posts",
                        "severity": "high" if post_count > 5000 else "medium"
                    })
                
                # Check for channels with no posts
                result = conn.execute(text("""
                    SELECT c.id, c.name
                    FROM channels c
                    LEFT JOIN posts p ON c.id = p.channel_id
                    WHERE p.id IS NULL
                """))
                
                for channel_id, channel_name in result:
                    anomalies.append({
                        "type": "empty_channel",
                        "description": f"Channel '{channel_name}' has no posts",
                        "severity": "low"
                    })
                
                # Check for posts with excessive replies
                result = conn.execute(text("""
                    SELECT post_id, COUNT(*) as reply_count
                    FROM replies
                    GROUP BY post_id
                    HAVING COUNT(*) > 100
                    ORDER BY reply_count DESC
                """))
                
                for post_id, reply_count in result:
                    anomalies.append({
                        "type": "excessive_replies",
                        "description": f"Post {post_id} has {reply_count} replies",
                        "severity": "medium"
                    })
                
                return anomalies
                
        except Exception as e:
            logger.error(f"Data anomaly identification failed: {e}")
            return [{"type": "error", "description": str(e), "severity": "high"}]
    
    def generate_quality_report(self) -> Dict[str, Any]:
        """Generate comprehensive data quality report."""
        try:
            quality_assessment = self.assess_data_quality()
            anomalies = self.identify_data_anomalies()
            
            report = {
                "timestamp": datetime.utcnow().isoformat(),
                "quality_assessment": quality_assessment,
                "anomalies": anomalies,
                "recommendations": []
            }
            
            # Generate recommendations based on findings
            if quality_assessment.get("overall_score", 0) < 80:
                report["recommendations"].append("Data quality score is below 80%. Consider implementing data validation procedures.")
            
            if not quality_assessment.get("referential_integrity", {}).get("passed", False):
                report["recommendations"].append("Referential integrity issues detected. Review foreign key constraints.")
            
            if len(anomalies) > 10:
                report["recommendations"].append("Multiple data anomalies detected. Consider implementing data monitoring.")
            
            return report
            
        except Exception as e:
            logger.error(f"Quality report generation failed: {e}")
            return {"error": str(e)}

def main():
    """Main database utilities script."""
    import argparse
    
    parser = argparse.ArgumentParser(description="Database utilities tool")
    parser.add_argument("command", choices=[
        "validate", "monitor", "integrity", "performance", "schema", "report"
    ], help="Utility command to run")
    parser.add_argument("--database-url", help="Database URL override")
    parser.add_argument("--duration", type=int, default=60, help="Monitoring duration in seconds")
    parser.add_argument("--output", help="Output file for reports")
    
    args = parser.parse_args()
    
    # Create connection manager
    connection_manager = DatabaseConnectionManager(
        args.database_url or DATABASE_URL
    )
    
    if args.command == "validate":
        validator = SchemaValidator(connection_manager)
        is_valid, errors = validator.validate_schema()
        
        if is_valid:
            print("Schema validation passed")
        else:
            print("Schema validation failed:")
            for error in errors:
                print(f"  - {error}")
            sys.exit(1)
    
    elif args.command == "monitor":
        monitor = PerformanceMonitor(connection_manager)
        monitor.start_monitoring()
        
        print(f"Monitoring for {args.duration} seconds...")
        time.sleep(args.duration)
        
        monitor.stop_monitoring()
        report = monitor.generate_performance_report()
        
        if args.output:
            with open(args.output, 'w') as f:
                json.dump(report, f, indent=2)
            print(f"Performance report saved to {args.output}")
        else:
            print(json.dumps(report, indent=2))
    
    elif args.command == "integrity":
        checker = IntegrityChecker(connection_manager)
        assessment = checker.assess_data_quality()
        
        if args.output:
            with open(args.output, 'w') as f:
                json.dump(assessment, f, indent=2)
            print(f"Integrity assessment saved to {args.output}")
        else:
            print(json.dumps(assessment, indent=2))
    
    elif args.command == "performance":
        monitor = PerformanceMonitor(connection_manager)
        slow_queries = monitor.analyze_slow_queries()
        
        print("Slow queries analysis:")
        for query in slow_queries:
            print(f"  Query: {query['query']}")
            print(f"  Calls: {query['calls']}, Mean time: {query['mean_time_ms']:.2f}ms")
            print()
    
    elif args.command == "schema":
        validator = SchemaValidator(connection_manager)
        schema_info = validator.get_schema_info()
        
        if args.output:
            with open(args.output, 'w') as f:
                json.dump(schema_info, f, indent=2)
            print(f"Schema information saved to {args.output}")
        else:
            print(json.dumps(schema_info, indent=2))
    
    elif args.command == "report":
        # Generate comprehensive report
        validator = SchemaValidator(connection_manager)
        checker = IntegrityChecker(connection_manager)
        monitor = PerformanceMonitor(connection_manager)
        
        schema_report = validator.generate_schema_report()
        quality_report = checker.generate_quality_report()
        
        # Start monitoring for a short time
        monitor.start_monitoring()
        time.sleep(10)  # Monitor for 10 seconds
        monitor.stop_monitoring()
        performance_report = monitor.generate_performance_report()
        
        comprehensive_report = {
            "timestamp": datetime.utcnow().isoformat(),
            "schema": schema_report,
            "data_quality": quality_report,
            "performance": performance_report
        }
        
        if args.output:
            with open(args.output, 'w') as f:
                json.dump(comprehensive_report, f, indent=2)
            print(f"Comprehensive report saved to {args.output}")
        else:
            print(json.dumps(comprehensive_report, indent=2))
    
    else:
        print(f"Unknown command: {args.command}")
        sys.exit(1)
    
    print("Database utilities operation completed successfully")

if __name__ == "__main__":
    main()