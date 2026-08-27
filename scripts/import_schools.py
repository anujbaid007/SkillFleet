"""One-time, idempotent import of the CBSE schools register.

Reads cbse_schools_master.xlsx (gitignored, reference only), normalises the
ALL-CAPS source into display-ready text, and bulk-inserts into public.schools
via the Supabase Management API.

Usage:
    SUPABASE_ACCESS_TOKEN=<pat> python scripts/import_schools.py

Re-running is safe: ON CONFLICT (affiliation_no) DO UPDATE.
"""
import json
import os
import re
import sys
import urllib.error
import urllib.request

import openpyxl

XLSX = "cbse_schools_master.xlsx"
PROJECT_REF = "bbioktywqkfvpzmakdxt"          # skillfleet ONLY
BATCH = 2000

# Acronyms and roman numerals that must survive title-casing. A naive .title()
# turns DAV into "Dav". Extend this list when a mangled name is spotted.
KEEP_UPPER = {
    "DAV", "KV", "KVS", "JNV", "PM", "DPS", "IIT", "NIT", "AECS", "APS", "AFS",
    "CRPF", "BSF", "ITBP", "SSB", "NCC", "ONGC", "NTPC", "BHEL", "SAIL", "MES",
    "CBSE", "ICSE", "SDA", "BVB", "SVM", "GHSS", "TTD", "SOS", "NPS", "GD",
    "II", "III", "IV", "VI", "VII", "VIII", "IX", "XI", "XII",
}
# Joining words that read better lowercase when not leading.
SMALL = {"And", "Of", "The", "At", "In", "On", "For"}

# Legacy / misspelled state names in the CBSE source. The last two merge the
# two territories that legally became one UT in 2020 (and fix DADAR -> DADRA).
STATE_FIX = {
    "CHATTISGARH": "Chhattisgarh",
    "TAMILNADU": "Tamil Nadu",
    "ANDAMAN & NICOBAR": "Andaman & Nicobar Islands",
    "JAMMU & KASHMIR": "Jammu & Kashmir",
    "DADAR & NAGAR HAVELI": "Dadra & Nagar Haveli and Daman & Diu",
    "DAMAN & DIU": "Dadra & Nagar Haveli and Daman & Diu",
}


def smart_title(s: str) -> str:
    """Title-case each alphabetic run, preserving known acronyms."""
    def fix(m):
        w = m.group(0)
        return w.upper() if w.upper() in KEEP_UPPER else w.capitalize()

    out = re.sub(r"[A-Za-z]+", fix, (s or "").strip())
    words = out.split()
    return " ".join(
        w.lower() if i > 0 and w in SMALL else w for i, w in enumerate(words)
    )


def norm_state(raw: str) -> str:
    raw = (raw or "").strip().upper()
    return STATE_FIX.get(raw, smart_title(raw))


def sql_str(v) -> str:
    if v is None or str(v).strip() == "":
        return "NULL"
    return "'" + str(v).strip().replace("'", "''") + "'"


def run_sql(token: str, sql: str) -> None:
    req = urllib.request.Request(
        f"https://api.supabase.com/v1/projects/{PROJECT_REF}/database/query",
        data=json.dumps({"query": sql}).encode("utf-8"),
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
            # Cloudflare fronts this API and blocks urllib's default agent with
            # "error code: 1010". Any ordinary UA string gets through.
            "User-Agent": "skillfleet-import/1.0",
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(req) as r:
            r.read()
    except urllib.error.HTTPError as e:
        # Surface the API's message; the default traceback hides the body.
        raise SystemExit(f"HTTP {e.code} from Supabase: {e.read()[:400].decode()}")


def main() -> int:
    token = os.environ.get("SUPABASE_ACCESS_TOKEN")
    if not token:
        print("SUPABASE_ACCESS_TOKEN is not set", file=sys.stderr)
        return 1

    ws = openpyxl.load_workbook(XLSX, read_only=True).active
    rows = []
    for r in ws.iter_rows(min_row=2, values_only=True):
        state_raw = str(r[4]).strip()
        # ISC is a national competition with state rounds; a "Foreign Schools"
        # pseudo-state cannot be placed in one.
        if state_raw.upper() == "FOREIGN SCHOOLS":
            continue
        rows.append((
            str(r[2]).strip(),          # Aff. No.
            smart_title(str(r[7])),     # School Name
            norm_state(state_raw),      # State
            smart_title(str(r[5])),     # District
            smart_title(str(r[9])) if r[9] else None,   # Address
            str(r[10]).strip() if r[10] else None,      # Pincode
            str(r[6]).strip() if r[6] else None,        # Status/level
        ))

    print(f"Importing {len(rows)} schools in batches of {BATCH}...")
    for i in range(0, len(rows), BATCH):
        chunk = rows[i:i + BATCH]
        values = ",".join(
            "(" + ",".join([
                sql_str(a), sql_str(n), sql_str(st), sql_str(d),
                sql_str(addr), sql_str(pin), sql_str(lvl), "'cbse'", "'approved'",
            ]) + ")"
            for (a, n, st, d, addr, pin, lvl) in chunk
        )
        run_sql(token, f"""
            INSERT INTO public.schools
              (affiliation_no, name, state, district, address, pincode, level,
               source, review_status)
            VALUES {values}
            ON CONFLICT (affiliation_no) DO UPDATE SET
              name     = EXCLUDED.name,
              state    = EXCLUDED.state,
              district = EXCLUDED.district,
              address  = EXCLUDED.address,
              pincode  = EXCLUDED.pincode,
              level    = EXCLUDED.level;
        """)
        print(f"  {min(i + BATCH, len(rows))}/{len(rows)}")

    print("Done.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
