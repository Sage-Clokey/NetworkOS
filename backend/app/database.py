import aiosqlite
import os
from pathlib import Path

DB_PATH = os.environ.get("DATABASE_URL", str(Path(__file__).parent.parent.parent / "database" / "networkos.db"))
SCHEMA_PATH = str(Path(__file__).parent.parent.parent / "database" / "schema.sql")


async def get_db():
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        await db.execute("PRAGMA foreign_keys = ON")
        yield db


async def init_db():
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute("PRAGMA foreign_keys = ON")
        with open(SCHEMA_PATH, "r") as f:
            schema = f.read()
        await db.executescript(schema)
        await db.commit()
