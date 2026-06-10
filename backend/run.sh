#!/usr/bin/env bash
# تشغيل خادم ميزان MIZAN API على المنفذ 8000 (Linux/macOS)
# الاستخدام:  ./run.sh
cd "$(dirname "$0")"
exec python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
