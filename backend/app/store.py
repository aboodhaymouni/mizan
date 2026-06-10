# -*- coding: utf-8 -*-
"""طبقة البيانات لميزان MIZAN.

تقرأ كل ملفات data/demo/*.json و*.geojson إلى الذاكرة عند الإقلاع،
وتستخدم SQLite (backend/mizan.db) لتثبيت تحديثات حالة الحقول (PATCH) فقط.
عند الإقلاع تُدمج الحالات المحفوظة فوق بيانات demo — لا تعديل على ملفات المصدر أبداً.

دورة الحالة الصارمة (CONTRACTS §4): new → inspected → confirmed | cleared
أي انتقال آخر = خطأ InvalidTransition (يُترجم HTTP 422 في الـ routers).
"""

from __future__ import annotations

import json
import os
import sqlite3
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Optional

# مسارات أساسية: backend/ وجذر المشروع
BACKEND_DIR = Path(__file__).resolve().parents[1]
PROJECT_ROOT = BACKEND_DIR.parent

# الحالات المسموحة والانتقالات الصالحة حصراً
VALID_STATUSES = {"new", "inspected", "confirmed", "cleared"}
VALID_TRANSITIONS: dict[str, set[str]] = {
    "new": {"inspected"},
    "inspected": {"confirmed", "cleared"},
    "confirmed": set(),   # حالة نهائية
    "cleared": set(),     # حالة نهائية
}


class FieldNotFound(KeyError):
    """حقل غير موجود — تُترجم HTTP 404."""


class InvalidTransition(ValueError):
    """انتقال حالة غير صالح — تُترجم HTTP 422."""


def _default_data_dir() -> Path:
    """مسار البيانات: متغير البيئة MIZAN_DATA_DIR وافتراضه ../data/demo نسبة لجذر المشروع."""
    env = os.getenv("MIZAN_DATA_DIR")
    return Path(env) if env else PROJECT_ROOT / "data" / "demo"


def _default_db_path() -> Path:
    """مسار SQLite: متغير البيئة MIZAN_DB_PATH وافتراضه backend/mizan.db."""
    env = os.getenv("MIZAN_DB_PATH")
    return Path(env) if env else BACKEND_DIR / "mizan.db"


class Store:
    """مخزن البيانات في الذاكرة + تثبيت الحالات في SQLite."""

    def __init__(self, data_dir: Optional[Path] = None, db_path: Optional[Path] = None):
        self.data_dir = Path(data_dir) if data_dir else _default_data_dir()
        self.db_path = Path(db_path) if db_path else _default_db_path()
        self.docs: dict[str, Any] = {}          # كل ملف باسمه بلا امتداد
        self.fields_by_id: dict[str, dict] = {}  # فهرس مباشر للحقول
        self._load_files()
        self._init_db()
        self._merge_saved_statuses()

    # ---------- تحميل الملفات ----------

    def _load_files(self) -> None:
        """قراءة كل *.json و*.geojson من مجلد البيانات إلى الذاكرة."""
        if not self.data_dir.is_dir():
            raise RuntimeError(
                f"مجلد البيانات غير موجود: {self.data_dir} — اضبط MIZAN_DATA_DIR"
            )
        for path in sorted(self.data_dir.iterdir()):
            if path.suffix not in {".json", ".geojson"}:
                continue
            with open(path, encoding="utf-8") as fh:
                self.docs[path.stem] = json.load(fh)

        fields = self.docs.get("fields", {})
        for feature in fields.get("features", []):
            self.fields_by_id[feature["properties"]["id"]] = feature

    # ---------- SQLite: تثبيت حالات الحقول فقط ----------

    def _connect(self) -> sqlite3.Connection:
        return sqlite3.connect(self.db_path)

    def _init_db(self) -> None:
        with self._connect() as con:
            con.execute(
                """CREATE TABLE IF NOT EXISTS field_status (
                       field_id   TEXT PRIMARY KEY,
                       status     TEXT NOT NULL,
                       note       TEXT,
                       updated_at TEXT NOT NULL
                   )"""
            )

    def _merge_saved_statuses(self) -> None:
        """دمج الحالات المحفوظة في SQLite فوق بيانات demo عند الإقلاع."""
        with self._connect() as con:
            rows = con.execute(
                "SELECT field_id, status, note, updated_at FROM field_status"
            ).fetchall()
        for field_id, status, note, updated_at in rows:
            feature = self.fields_by_id.get(field_id)
            if feature is None:
                continue  # حالة محفوظة لحقل لم يعد في بيانات demo — تُتجاهل
            props = feature["properties"]
            props["status"] = status
            if note:
                props["status_note"] = note
            props["status_updated_at"] = updated_at

    # ---------- الوصول للحقول وتحديث الحالة ----------

    def get_field(self, field_id: str) -> dict:
        feature = self.fields_by_id.get(field_id)
        if feature is None:
            raise FieldNotFound(field_id)
        return feature

    def update_status(self, field_id: str, new_status: str, note: Optional[str] = None) -> dict:
        """تحديث حالة حقل بدورة الحالة الصارمة + التثبيت في SQLite."""
        feature = self.get_field(field_id)
        current = feature["properties"].get("status", "new")

        if new_status not in VALID_STATUSES:
            raise InvalidTransition(
                f"حالة غير معروفة: '{new_status}' — المسموح: {sorted(VALID_STATUSES)}"
            )
        if new_status not in VALID_TRANSITIONS.get(current, set()):
            raise InvalidTransition(
                f"انتقال غير صالح: '{current}' → '{new_status}' — "
                "الدورة: new → inspected → confirmed | cleared"
            )

        updated_at = datetime.now(timezone.utc).isoformat()
        with self._connect() as con:
            con.execute(
                """INSERT INTO field_status (field_id, status, note, updated_at)
                   VALUES (?, ?, ?, ?)
                   ON CONFLICT(field_id) DO UPDATE SET
                       status = excluded.status,
                       note = excluded.note,
                       updated_at = excluded.updated_at""",
                (field_id, new_status, note, updated_at),
            )

        props = feature["properties"]
        props["status"] = new_status
        if note is not None:
            props["status_note"] = note
        props["status_updated_at"] = updated_at
        return feature


# ---------- Singleton كسول (يسهّل الاختبار وإعادة التهيئة) ----------

_store: Optional[Store] = None


def get_store() -> Store:
    """يرجع المخزن المشترك — يُنشأ عند أول طلب (قراءة متغيرات البيئة لحظتها)."""
    global _store
    if _store is None:
        _store = Store()
    return _store


def reset_store() -> None:
    """تفريغ الـ singleton — يعاد التحميل من الملفات + دمج SQLite عند الطلب التالي."""
    global _store
    _store = None
