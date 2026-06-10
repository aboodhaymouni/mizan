# -*- coding: utf-8 -*-
"""إعداد pytest: إضافة مجلد backend إلى sys.path حتى يُستورد `app` مباشرة."""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
