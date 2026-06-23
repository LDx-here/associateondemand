#!/usr/bin/env python3
"""Generate the AOS Discretionary Factors assessment workbook (4 tabs)."""

from __future__ import annotations

import shutil
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "data" / "templates" / "AOS_Discretionary_Factors_Case_Assessment_Tool.xlsx"
REF = ROOT / "tools" / "drafting-reference"
env = {**dict(__import__("os").environ), "AOD_ASSESSMENT_XLSX": str(OUT)}

for script in ("build_aos_chart.py", "build_brief_matrix.py"):
    subprocess.run([sys.executable, str(REF / script)], check=True, cwd=str(REF), env=env)

pub = ROOT / "web" / "public" / "templates"
pub.mkdir(parents=True, exist_ok=True)
shutil.copy2(OUT, pub / OUT.name)
print(f"Template written to {OUT} and {pub / OUT.name}")
