# تشغيل خادم ميزان MIZAN API على المنفذ 8000 (Windows PowerShell)
# الاستخدام:  .\run.ps1
Set-Location $PSScriptRoot
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
