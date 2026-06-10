# ميزان MIZAN — Backend (FastAPI)

خادم الـ API لنظام كشف سرقة المياه الجوفية في الأردن (GRACE-FO + Sentinel-2 + AI) — مطابق حرفياً لعقد الـ API في `CONTRACTS.md §4`.

> **كل البيانات الحالية تجريبية موسومة `is_demo: true`** — تُستبدل بمخرجات pipeline GEE الحقيقية بنفس المخططات بلا أي تغيير في العقد. **لا mock كحقيقي أبداً.**

## التشغيل السريع

```bash
cd backend
pip install -r requirements.txt

# Windows
.\run.ps1
# Linux / macOS
./run.sh
```

الخادم يقلع على `http://localhost:8000` — التوثيق التفاعلي على `/docs`.

## الاختبارات

```bash
cd backend
python -m pytest tests/ -v
```

تغطي كل endpoint: فلاتر `/fields`، دورة الحالة الصحيحة والمرفوضة (422)، حساب `/impact?rate=0.5`، 404 لحقل/حوض مجهول، تثبيت الحالة في SQLite، وCORS. تستخدم قاعدة SQLite مؤقتة فلا تلوث `mizan.db`.

## البنية

| المسار | الدور |
|---|---|
| `app/main.py` | FastAPI + CORSMiddleware (origins: `http://localhost:3000` + متغير البيئة `MIZAN_CORS_ORIGINS`) |
| `app/store.py` | طبقة البيانات: قراءة `data/demo/*.json|geojson` للذاكرة عند الإقلاع + SQLite لتثبيت حالات الحقول فقط |
| `app/routers/fields.py` | `/fields` (فلاتر basin, min_score, status, flag, limit) · `/fields/{id}` · `/fields/{id}/ndvi` · `PATCH /fields/{id}/status` |
| `app/routers/alerts.py` | `/alerts?limit=20` — أعلى الحقول درجةً (مشتقة حيّاً) |
| `app/routers/basins.py` | `/basins` · `/basins/{id}/health` · `/basins/{id}/forecast` · `/basins/{id}/ledger` |
| `app/routers/misc.py` | `/validation` · `/impact?rate` · `/timemachine` · `/meta` |
| `tests/test_api.py` | اختبارات pytest + TestClient لكل endpoint |
| `postgis/schema.sql` | مخطط PostGIS الكامل (الجداول الخمسة) جاهز لـ Supabase |
| `postgis/load_demo.py` | سكربت تحميل بيانات demo إلى PostGIS |

## متغيرات البيئة

| المتغير | الافتراضي | الدور |
|---|---|---|
| `MIZAN_DATA_DIR` | `../data/demo` (نسبة لجذر المشروع) | مجلد ملفات البيانات |
| `MIZAN_DB_PATH` | `backend/mizan.db` | قاعدة SQLite لتثبيت حالات الحقول |
| `MIZAN_CORS_ORIGINS` | — | origins إضافية مفصولة بفواصل (مثل دومين Vercel) |

## دورة حالة الحقل (صارمة)

```
new → inspected → confirmed | cleared
```

أي انتقال آخر (قفز، عودة، حالة مجهولة) يرجع **HTTP 422**. التحديثات تثبت في SQLite وتُدمج فوق بيانات demo عند كل إقلاع.

## `GET /impact?rate=`

يعيد حساب سيناريو الاسترجاع من معدل تأكيد التفتيش (0.1–0.9) فوق ثوابت `impact.json` (الملحق أ في `plan.md`):

- المكافئ البشري: معادلة الوزارة — 1 مليون م³ ≈ مياه ~3,730 شخصاً لسنة.
- القيمة المالية: تقديرية بمنهجية معلنة — م³ × كلفة التحلية البديلة 0.5–0.7$/م³.

بلا `rate` يرجع السيناريوهين المعلنين (متحفّظ 0.35 / متوقّع 0.55) محسوبين.

## التبديل إلى PostGIS/Supabase

انظر التعليق الكامل في نهاية `postgis/schema.sql` — المخطط جاهز، وسكربت `load_demo.py` يحمّل بيانات demo، والواجهة لا تتأثر لأنها تقرأ عبر طبقة fallback (CONTRACTS §4).

## قاعدة صياغة GRACE

أي عرض لسلسلة TWS يُسمّى **«منحنى GRACE للمنطقة الشرقية/الأردن»** (إشارة إقليمية ~300كم) — هبوط الحوض من **قياسات آبار الوزارة (−20م)**، وتحديد الحقول من **Sentinel-2** حصراً. لا ادعاء حقلياً من الجاذبية.
