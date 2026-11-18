#!/usr/bin/env python3
"""
Globetrotter Gateway — Automated Database Disaster Recovery & Snapshot Sentinel
Fulfills Gate 12 of the Pre-Flight Launch Quality Checklist (Reel 19: @krishanu.builds).
Creates timestamped, gzip-compressed database snapshots with SHA-256 integrity checksums.
"""

import os
import sys
import tarfile
import hashlib
import argparse
import datetime
from pathlib import Path

class DatabaseBackupSentinel:
    def __init__(self, repo_root: Path, backup_dir: Path):
        self.repo_root = repo_root
        self.backup_dir = backup_dir
        self.backup_dir.mkdir(parents=True, exist_ok=True)

    def create_snapshot(self, retention_days: int = 7) -> str:
        timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
        snapshot_filename = f"globetrotter_db_snapshot_{timestamp}.tar.gz"
        snapshot_path = self.backup_dir / snapshot_filename

        data_dir = self.repo_root / "backend" / "data"
        if not data_dir.exists():
            data_dir.mkdir(parents=True, exist_ok=True)

        print(f"📦 Creating database snapshot from: {data_dir.resolve()}")
        with tarfile.open(snapshot_path, "w:gz") as tar:
            for item in data_dir.iterdir():
                # Avoid locking or temporary lock files
                if not item.name.endswith(".lock.db"):
                    tar.add(item, arcname=item.name)

        # Compute SHA-256 Checksum
        sha256 = hashlib.sha256()
        with open(snapshot_path, "rb") as f:
            while chunk := f.read(65536):
                sha256.update(chunk)
        digest = sha256.hexdigest()

        checksum_file = self.backup_dir / f"{snapshot_filename}.sha256"
        checksum_file.write_text(f"{digest}  {snapshot_filename}\n", encoding="utf-8")

        print(f"✅ Snapshot created successfully: {snapshot_path.name} ({snapshot_path.stat().st_size} bytes)")
        print(f"🔒 SHA-256 Checksum: {digest}")

        self._prune_old_backups(retention_days)
        return str(snapshot_path)

    def verify_snapshot(self, snapshot_path: Path) -> bool:
        if not snapshot_path.exists():
            print(f"❌ Snapshot not found: {snapshot_path}")
            return False

        checksum_file = snapshot_path.with_suffix(snapshot_path.suffix + ".sha256") if not snapshot_path.name.endswith(".tar.gz") else Path(str(snapshot_path) + ".sha256")
        if not checksum_file.exists():
            print(f"⚠️ Checksum file missing for {snapshot_path.name}")
            return False

        expected = checksum_file.read_text(encoding="utf-8").split()[0].strip()
        sha256 = hashlib.sha256()
        with open(snapshot_path, "rb") as f:
            while chunk := f.read(65536):
                sha256.update(chunk)
        actual = sha256.hexdigest()

        if expected.lower() == actual.lower():
            print(f"✅ Checksum verification PASSED for {snapshot_path.name} ({actual[:16]}...)")
            return True
        else:
            print(f"❌ Checksum MISMATCH! Expected {expected}, got {actual}")
            return False

    def _prune_old_backups(self, retention_days: int):
        cutoff = datetime.datetime.now() - datetime.timedelta(days=retention_days)
        for f in self.backup_dir.glob("globetrotter_db_snapshot_*.tar.gz"):
            try:
                mtime = datetime.datetime.fromtimestamp(f.stat().st_mtime)
                if mtime < cutoff:
                    print(f"🧹 Pruning aged backup: {f.name}")
                    f.unlink(missing_ok=True)
                    Path(str(f) + ".sha256").unlink(missing_ok=True)
            except Exception as e:
                print(f"Failed to prune {f}: {e}")

def main():
    parser = argparse.ArgumentParser(description="Globetrotter Database Backup Sentinel")
    parser.add_argument("--verify", type=str, help="Verify specific snapshot path")
    parser.add_argument("--retention", type=int, default=7, help="Backup retention days (default: 7)")
    args = parser.parse_args()

    repo_root = Path(__file__).resolve().parent.parent.parent
    backup_dir = repo_root / "backups"

    sentinel = DatabaseBackupSentinel(repo_root, backup_dir)
    if args.verify:
        success = sentinel.verify_snapshot(Path(args.verify))
        sys.exit(0 if success else 1)
    else:
        snapshot_file = sentinel.create_snapshot(args.retention)
        # Self-verify immediately
        success = sentinel.verify_snapshot(Path(snapshot_file))
        sys.exit(0 if success else 1)

if __name__ == "__main__":
    main()
