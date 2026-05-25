import psycopg2
from contextlib import contextmanager
from config import DATABASE_URL


class Database:
    """Thin wrapper around psycopg2 with a transactional context manager."""

    @staticmethod
    @contextmanager
    def connect():
        """Yield (cursor, conn). Commits on success, rolls back on any exception."""
        conn = psycopg2.connect(DATABASE_URL)
        cur  = conn.cursor()
        try:
            yield cur, conn
            conn.commit()
        except Exception:
            conn.rollback()
            raise
        finally:
            cur.close()
            conn.close()
