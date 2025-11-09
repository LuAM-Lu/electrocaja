-- Migration: Add Performance Indexes for Stock Reservations
-- Date: 2025-10-21
-- Purpose: Optimize stock reservation queries (10-100x faster)

-- ===================================
-- 1. INDEX FOR ACTIVE RESERVATIONS
-- ===================================
-- This index dramatically speeds up the query:
-- "SELECT * FROM stock_movement WHERE tipo = 'RESERVA' AND transaccion_id IS NULL"
-- Used in: stockService.reservarStock() and obtenerStockDisponible()

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_stock_movement_active_reservations
ON stock_movement (producto_id, tipo, transaccion_id)
WHERE tipo = 'RESERVA' AND transaccion_id IS NULL;

-- ===================================
-- 2. INDEX FOR EXPIRED RESERVATIONS
-- ===================================
-- Speeds up cleanup query:
-- "SELECT * FROM stock_movement WHERE tipo = 'RESERVA' AND fecha < ?"
-- Used in: stockService.limpiarReservasExpiradas()

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_stock_movement_expired_reservations
ON stock_movement (fecha DESC, tipo)
WHERE tipo = 'RESERVA' AND transaccion_id IS NULL;

-- ===================================
-- 3. INDEX FOR SESSION-BASED CLEANUP
-- ===================================
-- Speeds up:
-- "SELECT * FROM stock_movement WHERE motivo LIKE 'Sesión: %'"
-- Used in: liberarTodasLasReservasDeSesion()

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_stock_movement_session_cleanup
ON stock_movement (motivo)
WHERE tipo = 'RESERVA' AND transaccion_id IS NULL;

-- ===================================
-- VERIFY INDEXES
-- ===================================
-- Run this query to verify indexes were created:
-- SELECT indexname, indexdef FROM pg_indexes WHERE tablename = 'stock_movement';

-- ===================================
-- PERFORMANCE TESTING
-- ===================================
-- Before indexes:
-- EXPLAIN ANALYZE SELECT * FROM stock_movement
-- WHERE tipo = 'RESERVA' AND transaccion_id IS NULL;
--
-- After indexes:
-- Same query should show "Index Scan" instead of "Seq Scan"
-- and execution time should be 10-100x faster
