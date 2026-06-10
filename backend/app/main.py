# -*- coding: utf-8 -*-
"""ميزان MIZAN API — نقطة الدخول.

FastAPI + CORS لـ http://localhost:3000 (+ أي origins إضافية عبر MIZAN_CORS_ORIGINS
مفصولة بفواصل، مثل دومين Vercel). كل الردود JSON طبقاً لعقد CONTRACTS §4.
"""

import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .routers import alerts, basins, fields, misc
from .store import get_store


@asynccontextmanager
async def lifespan(_app: FastAPI):
    """تحميل بيانات demo + دمج حالات SQLite عند الإقلاع (المخزن كسول أيضاً كاحتياط)."""
    get_store()
    yield

DESCRIPTION = (
    "نظام كشف سرقة المياه الجوفية في الأردن — GRACE-FO + Sentinel-2 + AI.\n\n"
    "كل البيانات الحالية تجريبية موسومة `is_demo: true` (تُستبدل بمخرجات pipeline GEE "
    "الحقيقية بلا تغيير في العقد). منحنى GRACE إشارة إقليمية ~300كم "
    "(«منحنى GRACE للمنطقة الشرقية/الأردن») — لا ادعاء حقلياً من الجاذبية؛ "
    "تحديد الحقول من Sentinel-2 حصراً.\n\n"
    "MIZAN API — Jordan groundwater-theft detection (GRACE-FO + Sentinel-2 + AI). "
    "All current data is labeled demo data."
)

app = FastAPI(
    title="ميزان MIZAN API",
    description=DESCRIPTION,
    version="1.0.0",
    lifespan=lifespan,
)

# CORS: الواجهة المحلية + أي origins إضافية من متغير البيئة (دومين Vercel مثلاً)
_origins = ["http://localhost:3000"]
_extra = os.getenv("MIZAN_CORS_ORIGINS", "")
_origins += [o.strip() for o in _extra.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# كل endpoints عقد CONTRACTS §4
app.include_router(fields.router)
app.include_router(alerts.router)
app.include_router(basins.router)
app.include_router(misc.router)


@app.get("/", tags=["root"])
def root():
    """جذر الـ API — توجيه سريع."""
    meta = get_store().docs.get("meta", {})
    return {
        "name": "ميزان MIZAN API",
        "data_mode": meta.get("data_mode", "demo"),
        "docs": "/docs",
        "contract": "CONTRACTS.md §4",
    }
