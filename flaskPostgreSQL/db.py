import psycopg2
from psycopg2.extras import RealDictCursor
from contextlib import contextmanager
from config import Config

def get_db_connection():
    """Establish and return a new connection to the PostgreSQL database."""
    return psycopg2.connect(
        host=Config.DB_HOST,
        port=Config.DB_PORT,
        dbname=Config.DB_NAME,
        user=Config.DB_USER,
        password=Config.DB_PASSWORD,
        cursor_factory=RealDictCursor
    )

@contextmanager
def get_db():
    """Context manager that yields a database connection and guarantees it is closed."""
    conn = get_db_connection()
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()

def get_all_users():
    """Retrieve all users ordered by ID ascending."""
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT id, fname, lname, pet FROM users ORDER BY id ASC;")
            return cur.fetchall()

def get_user_by_id(user_id):
    """Retrieve a single user by ID."""
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT id, fname, lname, pet FROM users WHERE id = %s;",
                (user_id,)
            )
            return cur.fetchone()

def create_user(fname, lname, pet):
    """Insert a new user record and return the created record."""
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO users (fname, lname, pet)
                VALUES (%s, %s, %s)
                RETURNING id, fname, lname, pet;
                """,
                (fname, lname, pet)
            )
            created = cur.fetchone()
        return created

def update_user(user_id, fname, lname, pet):
    """Update an existing user record and return the updated record."""
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                UPDATE users
                SET fname = %s, lname = %s, pet = %s
                WHERE id = %s
                RETURNING id, fname, lname, pet;
                """,
                (fname, lname, pet, user_id)
            )
            updated = cur.fetchone()
        return updated

def delete_user(user_id):
    """Delete a user record by ID."""
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "DELETE FROM users WHERE id = %s RETURNING id;",
                (user_id,)
            )
            deleted = cur.fetchone()
        return deleted
