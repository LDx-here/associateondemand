"""Zip citation verification package files for browser download."""

from __future__ import annotations

import io
import os
import zipfile
from typing import Any


def zip_citation_package(pkg: dict[str, Any]) -> bytes:
    """Build a ZIP archive from build_citation_package paths."""

    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as archive:
        for path in pkg.get("paths") or []:
            if isinstance(path, str) and os.path.isfile(path):
                archive.write(path, arcname=os.path.basename(path))
    buf.seek(0)
    return buf.read()
