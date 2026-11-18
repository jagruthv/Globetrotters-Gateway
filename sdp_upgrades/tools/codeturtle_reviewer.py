#!/usr/bin/env python3
"""
CodeTurtle — Open-Source $0 AI & Static Code Review Sentinel
Inspired by Sekhar Javvadi's architecture (Reel 5: @sekharjavvadi).
Eliminates reliance on $30/developer monthly subscriptions like CodeRabbit.
Performs production-grade static and security analysis across Spring Boot & React.
"""

import os
import sys
import re
import argparse
from pathlib import Path
from dataclasses import dataclass
from typing import List, Optional

@dataclass
class Issue:
    rule_id: str
    severity: str  # CRITICAL, HIGH, MEDIUM, LOW
    file_path: str
    line_number: int
    line_content: str
    message: str
    recommendation: str

class CodeTurtleSentinel:
    def __init__(self, root_dir: Path):
        self.root_dir = root_dir
        self.issues: List[Issue] = []

    def check_file(self, file_path: Path):
        rel_path = file_path.relative_to(self.root_dir)
        # Skip node_modules, target, .git, scratch, dist, build, backup folders
        parts = rel_path.parts
        if any(p in parts for p in ['node_modules', 'target', '.git', 'scratch', 'dist', 'build', '.idea', '.vscode', 'frontend_backup', 'skills_taxonomy']):
            return

        suffix = file_path.suffix.lower()
        if suffix in ['.java']:
            self._audit_java_file(file_path, str(rel_path))
        elif suffix in ['.jsx', '.js', '.tsx', '.ts']:
            self._audit_react_file(file_path, str(rel_path))

    def _audit_java_file(self, file_path: Path, rel_path: str):
        try:
            content = file_path.read_text(encoding='utf-8', errors='ignore')
            lines = content.splitlines()
        except Exception:
            return

        for idx, line in enumerate(lines, start=1):
            trimmed = line.strip()
            # Ignore comment lines
            if trimmed.startswith('//') or trimmed.startswith('*') or trimmed.startswith('/*'):
                continue

            # Rule SEC-001: Plaintext secret or password
            if re.search(r'(api_key|password|jwt_secret|private_key)\s*=\s*["\'][A-Za-z0-9_\-]{8,}["\']', line, re.I):
                if 'dummy' not in line.lower() and 'test' not in line.lower() and 'changeit' not in line.lower():
                    self.issues.append(Issue(
                        rule_id='SEC-001',
                        severity='CRITICAL',
                        file_path=rel_path,
                        line_number=idx,
                        line_content=trimmed,
                        message='Potential hardcoded secret or credential detected in source code.',
                        recommendation='Inject secrets via environment variables or Spring @Value("${...}")'
                    ))

            # Rule SEC-002: Dynamic query string concatenation (SQLi risk)
            if re.search(r'(createQuery|createNativeQuery|prepareStatement)\s*\([^)]*\+', line):
                self.issues.append(Issue(
                    rule_id='SEC-002',
                    severity='CRITICAL',
                    file_path=rel_path,
                    line_number=idx,
                    line_content=trimmed,
                    message='Dynamic SQL/HQL string concatenation detected.',
                    recommendation='Use parameterized queries with named parameters (:param) to prevent SQL injection.'
                ))

            # Rule SEC-003: Insecure Random for security tokens
            if 'new Random()' in line and ('token' in rel_path.lower() or 'pass' in rel_path.lower() or 'auth' in rel_path.lower()):
                self.issues.append(Issue(
                    rule_id='SEC-003',
                    severity='HIGH',
                    file_path=rel_path,
                    line_number=idx,
                    line_content=trimmed,
                    message='java.util.Random used in security-critical context.',
                    recommendation='Replace with java.security.SecureRandom for cryptographic pseudo-randomness.'
                ))

            # Rule SEC-004: Insecure timing-attack vulnerable signature equals
            if re.search(r'(signature|sig|hmac|hash)\.equals\(', line):
                self.issues.append(Issue(
                    rule_id='SEC-004',
                    severity='HIGH',
                    file_path=rel_path,
                    line_number=idx,
                    line_content=trimmed,
                    message='String.equals() used on cryptographic signature.',
                    recommendation='Use MessageDigest.isEqual(byte[], byte[]) to prevent timing attacks.'
                ))

            # Rule REL-001: Empty catch block or catching generic Throwable without comment/logging
            if re.search(r'catch\s*\(\s*(Exception|Throwable)\s+\w+\s*\)\s*\{\s*\}', line):
                self.issues.append(Issue(
                    rule_id='REL-001',
                    severity='MEDIUM',
                    file_path=rel_path,
                    line_number=idx,
                    line_content=trimmed,
                    message='Empty catch block swallowed generic Exception.',
                    recommendation='Catch specific exceptions (e.g. DateTimeParseException, NumberFormatException) and log with SLF4J.'
                ))

            # Rule REL-002: System.out.println in production code
            if 'System.out.println' in line or 'System.err.println' in line:
                self.issues.append(Issue(
                    rule_id='REL-002',
                    severity='LOW',
                    file_path=rel_path,
                    line_number=idx,
                    line_content=trimmed,
                    message='System.out/err.println used instead of SLF4J logger.',
                    recommendation='Use private static final Logger log = LoggerFactory.getLogger(...) or @Slf4j.'
                ))

    def _audit_react_file(self, file_path: Path, rel_path: str):
        try:
            content = file_path.read_text(encoding='utf-8', errors='ignore')
            lines = content.splitlines()
        except Exception:
            return

        # Check for useEffect missing cleanup if adding event listener
        useEffect_pattern = re.compile(r'useEffect\s*\(\s*\(\)\s*=>\s*\{([^}]*)\}', re.DOTALL)
        for match in useEffect_pattern.finditer(content):
            body = match.group(1)
            if 'addEventListener' in body and 'removeEventListener' not in body:
                line_no = content[:match.start()].count('\n') + 1
                self.issues.append(Issue(
                    rule_id='MEM-101',
                    severity='HIGH',
                    file_path=rel_path,
                    line_number=line_no,
                    line_content='useEffect(() => { ... addEventListener ... })',
                    message='Event listener added in useEffect without removeEventListener cleanup.',
                    recommendation='Return a cleanup function: return () => window.removeEventListener(...);'
                ))

        # Check for multiline tags: <a ... target="_blank" ...> missing noopener
        anchor_pattern = re.compile(r'<a\b([^>]*)>', re.DOTALL | re.IGNORECASE)
        for match in anchor_pattern.finditer(content):
            tag_attrs = match.group(1)
            if 'target="_blank"' in tag_attrs or "target='_blank'" in tag_attrs:
                if 'noopener' not in tag_attrs:
                    line_no = content[:match.start()].count('\n') + 1
                    self.issues.append(Issue(
                        rule_id='SEC-102',
                        severity='MEDIUM',
                        file_path=rel_path,
                        line_number=line_no,
                        line_content=f"<a {tag_attrs.strip()[:60]}...>",
                        message='Anchor tag with target="_blank" missing rel="noopener noreferrer" (Reverse Tabnabbing).',
                        recommendation='Add rel="noopener noreferrer" to external hyperlinks.'
                    ))

        # Check for multiline tags: <img ...> missing alt
        img_pattern = re.compile(r'<img\b([^>]*)>', re.DOTALL | re.IGNORECASE)
        for match in img_pattern.finditer(content):
            tag_attrs = match.group(1)
            if 'alt=' not in tag_attrs:
                line_no = content[:match.start()].count('\n') + 1
                self.issues.append(Issue(
                    rule_id='A11Y-101',
                    severity='LOW',
                    file_path=rel_path,
                    line_number=line_no,
                    line_content=f"<img {tag_attrs.strip()[:60]}...>",
                    message='Image tag missing alt text attribute.',
                    recommendation='Provide descriptive alt text for accessibility (a11y) or alt="" for decorative images.'
                ))

        for idx, line in enumerate(lines, start=1):
            trimmed = line.strip()
            if trimmed.startswith('//') or trimmed.startswith('/*') or trimmed.startswith('*'):
                continue

            # Rule SEC-101: dangerouslySetInnerHTML
            if 'dangerouslySetInnerHTML' in line:
                if 'DOMPurify' not in line:
                    self.issues.append(Issue(
                        rule_id='SEC-101',
                        severity='CRITICAL',
                        file_path=rel_path,
                        line_number=idx,
                        line_content=trimmed,
                        message='dangerouslySetInnerHTML used without DOMPurify sanitization (XSS risk).',
                        recommendation='Sanitize markup with DOMPurify.sanitize(...) before injecting.'
                    ))

            # Rule PERF-101: Array index as key in React list rendering
            if re.search(r'key=\{(index|idx)\}', line):
                self.issues.append(Issue(
                    rule_id='PERF-101',
                    severity='LOW',
                    file_path=rel_path,
                    line_number=idx,
                    line_content=trimmed,
                    message='Array index used as React key.',
                    recommendation='Use a unique stable ID (e.g. item.id, place.name) to prevent reconciler bugs.'
                ))

    def run_audit(self, target_path: Optional[str] = None) -> int:
        start_path = self.root_dir if not target_path else Path(target_path)
        print(f"\n======================================================================")
        print(f"🐢 CODETURTLE SENTINEL — Production AI Code Review (v1.0.0)")
        print(f"   Architecture: Zero-Cost In-House Alternative to CodeRabbit ($30/mo)")
        print(f"   Target Root: {start_path.resolve()}")
        print(f"======================================================================\n")

        file_count = 0
        if start_path.is_file():
            self.check_file(start_path)
            file_count = 1
        else:
            for root, dirs, files in os.walk(start_path):
                dirs[:] = [d for d in dirs if d not in ['node_modules', 'target', '.git', 'scratch', 'dist', 'build', '.idea', '.vscode', 'frontend_backup', 'skills_taxonomy']]
                for f in files:
                    ext = Path(f).suffix.lower()
                    if ext in ['.java', '.jsx', '.js', '.tsx', '.ts']:
                        self.check_file(Path(root) / f)
                        file_count += 1

        print(f"🔍 Scanned {file_count} source files across Spring Boot & React.\n")

        critical_count = sum(1 for i in self.issues if i.severity == 'CRITICAL')
        high_count = sum(1 for i in self.issues if i.severity == 'HIGH')
        medium_count = sum(1 for i in self.issues if i.severity == 'MEDIUM')
        low_count = sum(1 for i in self.issues if i.severity == 'LOW')

        if not self.issues:
            print("✅ CODETURTLE PASSED: Zero production flaws or security risks detected!")
            print("   Architecture adheres to $0 Google / Meta / Apple production standards.\n")
            return 0

        print(f"⚠️  ISSUES FOUND: {len(self.issues)} total ({critical_count} CRITICAL, {high_count} HIGH, {medium_count} MEDIUM, {low_count} LOW)\n")

        for idx, issue in enumerate(self.issues, start=1):
            severity_badge = f"[{issue.severity}]"
            print(f"{idx}. {severity_badge} {issue.rule_id} — {issue.file_path}:{issue.line_number}")
            print(f"   Line:   {issue.line_content}")
            print(f"   Flaw:   {issue.message}")
            print(f"   Fix:    {issue.recommendation}\n")

        print("----------------------------------------------------------------------")
        score = max(0, 100 - (critical_count * 25 + high_count * 10 + medium_count * 3 + low_count * 1))
        print(f"🐢 Production Readiness Score: {score}/100")
        if critical_count > 0:
            print("❌ Audit Verdict: FAILED (Critical security vulnerabilities present)")
            return 1
        elif high_count > 0:
            print("⚠️ Audit Verdict: WARNING (High-severity memory/architecture issues present)")
            return 0
        else:
            print("✅ Audit Verdict: PASSED (Minor informational notices only)")
            return 0

def main():
    parser = argparse.ArgumentParser(description="CodeTurtle — In-house $0 AI Code Reviewer")
    parser.add_argument("--path", type=str, default=None, help="Target file or folder to audit")
    args = parser.parse_args()

    script_dir = Path(__file__).resolve().parent
    repo_root = script_dir.parent.parent

    sentinel = CodeTurtleSentinel(repo_root)
    exit_code = sentinel.run_audit(args.path)
    sys.exit(exit_code)

if __name__ == "__main__":
    main()
