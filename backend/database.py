from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, DeclarativeBase
import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://postgres:postgres@localhost:5432/shopai"
)

engine = create_engine(DATABASE_URL, pool_pre_ping=True)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    pass


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def migrate_db():
    """Safely add new columns to existing tables without dropping data."""
    stmts = [
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS is_seller BOOLEAN NOT NULL DEFAULT FALSE",
        "ALTER TABLE products ADD COLUMN IF NOT EXISTS seller_id INTEGER REFERENCES users(id)",
        "ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_name VARCHAR(255)",
        "ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_phone VARCHAR(50)",
        """
        CREATE TABLE IF NOT EXISTS order_status_history (
            id SERIAL PRIMARY KEY,
            order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
            status VARCHAR(50) NOT NULL,
            changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
        """,
        """
        CREATE TABLE IF NOT EXISTS delivery_services (
            id SERIAL PRIMARY KEY,
            name VARCHAR(100) NOT NULL,
            name_kz VARCHAR(100) NOT NULL,
            price FLOAT NOT NULL DEFAULT 0,
            days_min INTEGER NOT NULL DEFAULT 1,
            days_max INTEGER NOT NULL DEFAULT 3,
            is_active BOOLEAN NOT NULL DEFAULT TRUE
        )
        """,
        "ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_service_id INTEGER REFERENCES delivery_services(id)",
        "ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_cost FLOAT DEFAULT 0",
        """
        CREATE TABLE IF NOT EXISTS messages (
            id SERIAL PRIMARY KEY,
            sender_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            receiver_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            text TEXT NOT NULL,
            is_read BOOLEAN NOT NULL DEFAULT FALSE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
        """,
        """
        INSERT INTO delivery_services (name, name_kz, price, days_min, days_max)
        SELECT * FROM (VALUES
            ('Самовывоз',     'Өзі алып кету',   0,    0, 0),
            ('Казпочта',      'Қазпошта',        500,  5, 7),
            ('Kaspi Доставка','Kaspi Жеткізу',   800,  1, 3),
            ('СДЭК',          'СДЭК',            1200, 2, 4),
            ('DHL',           'DHL',             2500, 1, 2)
        ) AS v(name, name_kz, price, days_min, days_max)
        WHERE NOT EXISTS (SELECT 1 FROM delivery_services LIMIT 1)
        """,
        """
        CREATE TABLE IF NOT EXISTS wishlist_items (
            id SERIAL PRIMARY KEY,
            user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
            added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(user_id, product_id)
        )
        """,
        """
        CREATE TABLE IF NOT EXISTS cart_items (
            id SERIAL PRIMARY KEY,
            user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
            quantity INTEGER NOT NULL DEFAULT 1,
            UNIQUE(user_id, product_id)
        )
        """,
        """
        CREATE TABLE IF NOT EXISTS promo_codes (
            id SERIAL PRIMARY KEY,
            code VARCHAR(50) UNIQUE NOT NULL,
            discount_percent INTEGER NOT NULL,
            is_active BOOLEAN NOT NULL DEFAULT TRUE,
            max_uses INTEGER,
            used_count INTEGER NOT NULL DEFAULT 0,
            expires_at TIMESTAMP,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
        """,
        """
        CREATE TABLE IF NOT EXISTS notifications (
            id SERIAL PRIMARY KEY,
            user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            title VARCHAR(255) NOT NULL,
            body VARCHAR(1000) NOT NULL,
            type VARCHAR(50) NOT NULL DEFAULT 'info',
            is_read BOOLEAN NOT NULL DEFAULT FALSE,
            link VARCHAR(500),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
        """,
        """
        INSERT INTO promo_codes (code, discount_percent, is_active, max_uses)
        SELECT * FROM (VALUES
            ('QOLDA10', 10, TRUE, 100),
            ('WELCOME15', 15, TRUE, 50),
            ('SALE20', 20, TRUE, 30)
        ) AS v(code, discount_percent, is_active, max_uses)
        WHERE NOT EXISTS (SELECT 1 FROM promo_codes LIMIT 1)
        """,
    ]
    with engine.connect() as conn:
        for stmt in stmts:
            conn.execute(text(stmt))
        conn.commit()
