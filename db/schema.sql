-- =============================================
-- Smart Inventory Manager - Complete Database Schema
-- Architecture: Shared Database with shop_id isolation
-- =============================================

-- Drop tables if they exist (in correct order due to foreign keys)
-- Drop tables if they exist (in correct order due to foreign keys)
DROP TABLE IF EXISTS stock_movements CASCADE;
DROP TABLE IF EXISTS products CASCADE;
DROP TABLE IF EXISTS categories CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS shops CASCADE;
DROP TABLE IF EXISTS session CASCADE;
DROP TABLE IF EXISTS notifications CASCADE;

-- =============================================
-- Session Table (REQUIRED for connect-pg-simple)
-- =============================================
CREATE TABLE session (
    sid VARCHAR NOT NULL COLLATE "default",
    sess JSON NOT NULL,
    expire TIMESTAMP(6) NOT NULL
)
WITH (OIDS=FALSE);

ALTER TABLE session ADD CONSTRAINT session_pkey PRIMARY KEY (sid) NOT DEFERRABLE INITIALLY IMMEDIATE;
CREATE INDEX idx_session_expire ON session (expire);

-- =============================================
-- Shops Table (ROOT ENTITY - Parent of all tables)
-- =============================================
CREATE TABLE shops (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- Users Table (Linked to Shop)
-- =============================================
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    shop_id INTEGER NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255),              -- NULLABLE for Google OAuth users
    google_id VARCHAR(255) UNIQUE,           -- Google OAuth ID
    avatar_url TEXT,                         -- Profile picture URL
    role VARCHAR(50) DEFAULT 'owner' CHECK (role IN ('owner', 'staff', 'manager')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index on email for faster lookups
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_shop ON users(shop_id);

-- =============================================
-- Categories Table (Linked to Shop)
-- =============================================
CREATE TABLE categories (
    id SERIAL PRIMARY KEY,
    shop_id INTEGER NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index for shop-based queries
CREATE INDEX idx_categories_shop ON categories(shop_id);

-- =============================================
-- Products Table (The Inventory - Linked to Shop)
-- =============================================
CREATE TABLE products (
    id SERIAL PRIMARY KEY,
    shop_id INTEGER NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
    category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    sku VARCHAR(100),
    stock_quantity INTEGER DEFAULT 0,
    price DECIMAL(10, 2) NOT NULL,
    description TEXT,
    image_url VARCHAR(255),
    low_stock_alert_sent BOOLEAN DEFAULT FALSE,  -- Flag to prevent duplicate low stock email alerts
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Composite Unique Constraint: SKU is unique WITHIN a shop
ALTER TABLE products ADD CONSTRAINT unique_sku_per_shop UNIQUE (shop_id, sku);

-- Create indexes for common queries
CREATE INDEX idx_products_shop ON products(shop_id);
CREATE INDEX idx_products_category ON products(category_id);
CREATE INDEX idx_products_sku ON products(sku);
CREATE INDEX idx_products_name ON products(name);

-- =============================================
-- Stock Movements Table (Audit Trail)
-- Tracks all inventory changes for each product
-- =============================================
CREATE TABLE stock_movements (
    id SERIAL PRIMARY KEY,
    shop_id INTEGER NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
    product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    quantity_change INTEGER NOT NULL,  -- Positive for additions, negative for reductions
    reason VARCHAR(50) NOT NULL,       -- 'Initial Stock', 'Restock', 'Sale', 'POS Sale', 'Damaged', etc.
    notes TEXT,                        -- Optional additional details
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for stock_movements
CREATE INDEX idx_stock_movements_product ON stock_movements(product_id);
CREATE INDEX idx_stock_movements_shop ON stock_movements(shop_id);
CREATE INDEX idx_stock_movements_created ON stock_movements(created_at DESC);

-- =============================================
-- Notifications Table (In-App Bell Icon Alerts)
-- =============================================
CREATE TABLE notifications (
    id SERIAL PRIMARY KEY,
    shop_id INTEGER NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    type VARCHAR(20) DEFAULT 'info' CHECK (type IN ('alert', 'warning', 'success', 'info')),
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for notifications
CREATE INDEX idx_notifications_shop ON notifications(shop_id);
CREATE INDEX idx_notifications_unread ON notifications(shop_id, is_read) WHERE is_read = FALSE;
CREATE INDEX idx_notifications_created ON notifications(created_at DESC);

-- =============================================
-- Trigger: Auto-update updated_at timestamp
-- =============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply trigger to all tables with updated_at
CREATE TRIGGER update_shops_updated_at
    BEFORE UPDATE ON shops
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_categories_updated_at
    BEFORE UPDATE ON categories
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_products_updated_at
    BEFORE UPDATE ON products
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
