"""Citation package ZIP builder tests."""

from __future__ import annotations

import os
import tempfile
import zipfile

from app.drafting.citation_zip import zip_citation_package


def test_zip_citation_package_includes_files() -> None:
    with tempfile.TemporaryDirectory() as tmp:
        manifest = os.path.join(tmp, "manifest.txt")
        ref = os.path.join(tmp, "REF_001.pdf")
        with open(manifest, "w", encoding="utf-8") as fh:
            fh.write("manifest")
        with open(ref, "wb") as fh:
            fh.write(b"%PDF-1.4 test")

        pkg = {"ok": True, "paths": [manifest, ref]}
        blob = zip_citation_package(pkg)

        assert blob.startswith(b"PK")
        with zipfile.ZipFile(__import__("io").BytesIO(blob)) as archive:
            names = set(archive.namelist())
        assert "manifest.txt" in names
        assert "REF_001.pdf" in names
