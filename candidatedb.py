#TRIAL NEW CODE
#!/usr/bin/env python3
"""candidatedb: a SQLite candidate database you can refresh from live sources.

Setup:      python candidatedb.py init            (creates candidate.db)
            python candidatedb.py seed            (Hamilton County, IN 2026 sample rows)
Server:     python candidatedb.py serve           (Starts local HTTP server for the web app)
Query:      python candidatedb.py query --state IN --county Hamilton --office Senate
Stats:      python candidatedb.py stats
"""
import argparse, csv, hashlib, json, os, sqlite3, sys, time
import urllib.error, urllib.parse, urllib.request
import http.server
from datetime import datetime, timezone

DB = os.environ.get("CANDIDATE_DB", "candidate.db")

SCHEMA = """
PRAGMA foreign_keys=ON;
CREATE TABLE IF NOT EXISTS sources(id INTEGER PRIMARY KEY, name TEXT UNIQUE NOT NULL, url TEXT DEFAULT '', notes TEXT DEFAULT '');
CREATE TABLE IF NOT EXISTS offices(
  id INTEGER PRIMARY KEY, level TEXT NOT NULL, state TEXT NOT NULL DEFAULT '', county TEXT NOT NULL DEFAULT '',
  locality TEXT NOT NULL DEFAULT '', name TEXT NOT NULL, district TEXT NOT NULL DEFAULT '', ocd_id TEXT DEFAULT '',
  UNIQUE(level,state,county,locality,name,district));
CREATE TABLE IF NOT EXISTS elections(
  id INTEGER PRIMARY KEY, state TEXT NOT NULL DEFAULT '', date TEXT NOT NULL, kind TEXT NOT NULL DEFAULT 'general',
  UNIQUE(state,date,kind));
CREATE TABLE IF NOT EXISTS candidates(
  id INTEGER PRIMARY KEY, source_id INTEGER NOT NULL REFERENCES sources(id), source_key TEXT NOT NULL,
  name TEXT NOT NULL, party TEXT DEFAULT '', office_id INTEGER NOT NULL REFERENCES offices(id),
  election_id INTEGER REFERENCES elections(id), status TEXT DEFAULT 'unknown', raw_status TEXT DEFAULT '',
  incumbent INTEGER DEFAULT 0, votes INTEGER, vote_pct REAL, website TEXT DEFAULT '', fec_id TEXT DEFAULT '',
  notes TEXT DEFAULT '', unofficial INTEGER DEFAULT 0, first_seen TEXT, last_seen TEXT,
  tags TEXT DEFAULT '[]', bio TEXT DEFAULT '', key_positions TEXT DEFAULT '[]',
  UNIQUE(source_id, source_key));
CREATE TABLE IF NOT EXISTS refresh_log(
  id INTEGER PRIMARY KEY, source TEXT, started TEXT, finished TEXT, rows_seen INTEGER, rows_new INTEGER, error TEXT);
CREATE INDEX IF NOT EXISTS ix_off ON offices(state, level, county);
CREATE INDEX IF NOT EXISTS ix_cand_name ON candidates(name);
CREATE INDEX IF NOT EXISTS ix_cand_office ON candidates(office_id);
CREATE VIEW IF NOT EXISTS v_candidates AS
  SELECT c.id, c.name, c.party, c.status, c.incumbent, c.votes, c.vote_pct, c.unofficial, c.website, c.fec_id, c.notes,
         c.tags, c.bio, c.key_positions,
         o.level, o.state, o.county, o.locality, o.name AS office, o.district,
         e.date AS election_date, e.kind AS election_kind, s.name AS source, c.last_seen
  FROM candidates c JOIN offices o ON o.id=c.office_id JOIN sources s ON s.id=c.source_id
  LEFT JOIN elections e ON e.id=c.election_id;
"""

def now(): return datetime.now(timezone.utc).isoformat(timespec="seconds")

def connect(path=None):
    con = sqlite3.connect(path or DB)
    con.executescript(SCHEMA)
    return con

def source(con, name, url="", notes=""):
    con.execute("INSERT OR IGNORE INTO sources(name,url,notes) VALUES(?,?,?)", (name, url, notes))
    return con.execute("SELECT id FROM sources WHERE name=?", (name,)).fetchone()[0]

def office(con, level, name, state="", county="", locality="", district="", ocd=""):
    k = (level, state or "", county or "", locality or "", name, str(district or ""))
    r = con.execute("SELECT id FROM offices WHERE level=? AND state=? AND county=? AND locality=? AND name=? AND district=?", k).fetchone()
    if r: return r[0]
    return con.execute("INSERT INTO offices(level,state,county,locality,name,district,ocd_id) VALUES(?,?,?,?,?,?,?)", (*k, ocd)).lastrowid

def election(con, state, date, kind="general"):
    if not date: return None
    con.execute("INSERT OR IGNORE INTO elections(state,date,kind) VALUES(?,?,?)", (state or "", date, kind or "general"))
    return con.execute("SELECT id FROM elections WHERE state=? AND date=? AND kind=?", (state or "", date, kind or "general")).fetchone()[0]

def upsert(con, src, key, office_id, name, election_id=None, **f):
    cols = dict(party=f.get("party") or "", status=f.get("status") or "unknown", raw_status=f.get("raw_status") or "",
                incumbent=int(bool(f.get("incumbent"))), votes=f.get("votes"), vote_pct=f.get("vote_pct"),
                website=f.get("website") or "", fec_id=f.get("fec_id") or "", notes=f.get("notes") or "",
                unofficial=int(bool(f.get("unofficial"))),
                tags=json.dumps(f.get("tags", [])), bio=f.get("bio", ""), key_positions=json.dumps(f.get("keyPositions", [])))
    t = now()
    row = con.execute("SELECT id FROM candidates WHERE source_id=? AND source_key=?", (src, key)).fetchone()
    if row:
        sets = ",".join(f"{k}=?" for k in cols)
        con.execute(f"UPDATE candidates SET name=?,office_id=?,election_id=?,{sets},last_seen=? WHERE id=?",
                    (name, office_id, election_id, *cols.values(), t, row[0]))
        return False
    con.execute("INSERT INTO candidates(source_id,source_key,name,office_id,election_id," + ",".join(cols) +
                ",first_seen,last_seen) VALUES(?,?,?,?,?," + ",".join("?" * len(cols)) + ",?,?)",
                (src, key, name, office_id, election_id, *cols.values(), t, t))
    return True

# ---- sample data with full UI attributes ----------------------------------
SEED = [
  (
    "federal", "U.S. House of Representatives (IN-05)", "5", "Hamilton", "Victoria Spartz", "Republican", "on_ballot", 1, 0,
    "https://spartz.house.gov", ["Taxes", "Agriculture", "Healthcare", "Economy"],
    "Current U.S. Representative serving Indiana's 5th Congressional District. Focuses on fiscal responsibility, free-market healthcare reform, and agricultural policy.",
    [{"issue": "Economy", "stance": "Advocates for tax cuts, deregulation, and spending caps to curb inflation."},
     {"issue": "Healthcare", "stance": "Supports price transparency and interstate health insurance competition."},
     {"issue": "Agriculture", "stance": "Promotes deregulation for local farms and expanded trade access."}]
  ),
  (
    "federal", "U.S. House of Representatives (IN-05)", "5", "Hamilton", "J.D. Ford", "Democratic", "on_ballot", 0, 0,
    "https://fordforindiana.com", ["Education", "Healthcare", "Worker Rights", "Renewable Energy"],
    "State Senator running for Congressional District 5. Emphasizes public school funding, reproductive freedoms, and expanding healthcare coverage.",
    [{"issue": "Education", "stance": "Pushes for increased federal title funding and higher teacher pay standards."},
     {"issue": "Healthcare", "stance": "Supports expanding ACA subsidies and lowering prescription drug prices."},
     {"issue": "Energy", "stance": "Advocates for federal incentives for clean energy manufacturers in Indiana."}]
  ),
  (
    "state", "Indiana Secretary of State", "", "Hamilton", "Beau Bayh", "Democratic", "on_ballot", 0, 0,
    "https://beaubayh.com", ["Election Security", "Business Express", "Voter Access"],
    "Focuses on modernizing Indiana's business registry and expanding voter accessibility through transparent election auditing.",
    [{"issue": "Elections", "stance": "Promotes same-day registration and independent post-election auditing."},
     {"issue": "Business", "stance": "Aims to streamline online licensing for Hoosier small business owners."}]
  ),
  (
    "state", "Indiana Secretary of State", "", "Hamilton", "Max Engling", "Republican", "on_ballot", 0, 0,
    "https://maxengling.com", ["Voter ID", "Cybersecurity", "Corporate Compliance"],
    "Emphasizes strict voter identification enforcement, paper-trail ballot verification, and fraud prevention.",
    [{"issue": "Elections", "stance": "Advocates for strict voter ID laws and cleaning up county voter rolls."},
     {"issue": "Security", "stance": "Prioritizes cybersecurity defense for county voting machines across IN."}]
  ),
  (
    "state", "Indiana Secretary of State", "", "Hamilton", "Lauri Shillings", "Libertarian", "on_ballot", 0, 0,
    "https://lpin.org", ["Ballot Access", "Deregulation", "Transparency"],
    "Advocates for ending single-party election commission control and lowering ballot access hurdles for third parties.",
    [{"issue": "Elections", "stance": "Supports ranked-choice voting and open access for third-party candidates."},
     {"issue": "Government", "stance": "Pushes for complete openness in public record availability."}]
  ),
  (
    "state", "Indiana State Comptroller", "", "Hamilton", "Elise Nieshalla", "Republican", "on_ballot", 1, 0,
    "https://in.gov/comptroller", ["Fiscal Auditing", "State Budget", "Transparency"],
    "Appointed State Comptroller overseeing state accounting, financial transparency portals, and local tax distributions.",
    [{"issue": "Finance", "stance": "Promotes online expenditure portals for taxpayer oversight."},
     {"issue": "Fiscal Responsibility", "stance": "Prioritizes maintaining Indiana's AAA credit rating."}]
  ),
  (
    "county", "Hamilton County Commissioner (District 1)", "1", "Hamilton", "Christine Altman", "Republican", "on_ballot", 1, 0,
    "https://hamiltoncounty.in.gov", ["Infrastructure", "Transportation", "County Parks"],
    "Long-serving Hamilton County Commissioner focusing on regional infrastructure improvements, road widening, and drainage control.",
    [{"issue": "Infrastructure", "stance": "Leads major road expansion projects connecting Fishers, Carmel, and Noblesville."},
     {"issue": "Parks", "stance": "Expands county park trails and greenways."}]
  ),
  (
    "county", "Hamilton County Council (At-Large)", "", "Hamilton", "Stephanie Gilliard", "Democratic", "on_ballot", 0, 0,
    "https://hamiltoncountydems.org", ["Mental Health", "Public Transit", "Budget Oversight"],
    "Community leader focused on funding county crisis response teams and promoting affordable housing initiatives.",
    [{"issue": "Mental Health", "stance": "Advocates dedicated funding for county co-responder crisis units."},
     {"issue": "Housing", "stance": "Supports tax incentives for workforce housing development."}]
  ),
  (
    "municipal", "Mayor of Fishers", "", "Hamilton", "Scott Fadness", "Republican", "on_ballot", 1, 0,
    "https://fishers.in.us", ["Economic Dev", "Public Safety", "Smart Cities"],
    "First Mayor of the City of Fishers. Has spearheaded the redevelopment of the Nickel Plate District and life-science tech hubs.",
    [{"issue": "Economy", "stance": "Drives biotech and life-science corporate attraction to Fishers."},
     {"issue": "Public Safety", "stance": "Pioneers integrated mental health initiatives within city police & fire."}]
  ),
  (
    "municipal", "Fishers City Council (At-Large)", "", "Hamilton", "Jocelyn Vare", "Democratic", "on_ballot", 1, 0,
    "https://jocelynvareforfishers.com", ["Transparency", "Parks & Rec", "Fiscal Responsibility"],
    "First Democrat elected city-wide in Fishers. Champions fiscal transparency, public engagement, and environmental stewardship.",
    [{"issue": "Transparency", "stance": "Pushes for open public commentary periods during city council budgeting."},
     {"issue": "Environment", "stance": "Promotes urban canopy retention and green building standards."}]
  )
]

def run_seed(con):
    src = source(con, "Hamilton County IN 2026 Directory", "https://www.larryinfishers.com", "Local sample candidates for election directory.")
    ev = election(con, "IN", "2026-11-03", "general"); new = 0
    for lvl, off, dist, county, name, party, status, inc, unofficial, website, tags, bio, key_positions in SEED:
        oid = office(con, lvl, off, "IN", county if lvl == "county" else "", district=dist)
        new += upsert(con, src, f"{off}|{dist}|{name}", oid, name, ev, party=party, status=status,
                      incumbent=inc, website=website, unofficial=unofficial, tags=tags, bio=bio, keyPositions=key_positions)
    con.commit()
    return len(SEED), new

# ---- HTTP Server for Web App -----------------------------------------------
import argparse, json, sys, http.server
from datetime import datetime

class CandidateHandler(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        if self.path.split("?")[0] == "/api/candidates":
            con = connect()
            try:
                cur = con.execute("SELECT * FROM v_candidates")
                cols = [c[0] for c in cur.description]
                rows = []
                for r in cur.fetchall():
                    d = dict(zip(cols, r))
                    # Safely parse JSON fields stored in SQLite back into native structures
                    d["tags"] = json.loads(d.get("tags") or "[]")
                    d["keyPositions"] = json.loads(d.get("key_positions") or d.get("keyPositions") or "[]")
                    d["incumbent"] = bool(d.get("incumbent", 0))
                    rows.append(d)
                
                body = json.dumps(rows).encode("utf-8")
                self.send_response(200)
                self.send_header("Content-Type", "application/json")
                self.send_header("Access-Control-Allow-Origin", "*")
                self.send_header("Content-Length", str(len(body)))
                self.end_headers()  # Fixed hyphen syntax error
                self.wfile.write(body)
            finally:
                con.close()  # Prevent connection leaks
        else:
            super().do_GET()

def run_server(port=8000, db_path=None):
    server_address = ("", port)
    httpd = http.server.HTTPServer(server_address, CandidateHandler)
    print(f"Serving candidate API at http://localhost:{port}/api/candidates")
    print("Open index.html in your browser or serve directory with Python.")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        pass

def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--db", default=None)
    sub = ap.add_subparsers(dest="cmd", required=True)
    sub.add_parser("init"); sub.add_parser("seed"); sub.add_parser("stats"); sub.add_parser("serve")
    
    a = ap.parse_args(argv)
    
    if a.cmd == "init":
        con = connect(a.db)
        print(f"ready: {a.db or DB}")
        con.close()
        return 0
    if a.cmd == "seed": 
        con = connect(a.db)
        seen, new = run_seed(con)
        print(f"Seeded {seen} candidates successfully.")
        con.close()
        return 0
    if a.cmd == "serve":
        run_server(db_path=a.db)
        return 0
    if a.cmd == "stats":
        con = connect(a.db)
        for row in con.execute("SELECT source, level, state, COUNT(*) FROM v_candidates GROUP BY 1,2,3 ORDER BY 1,2,3"):
            print(*row)
        con.close()
        return 0
    return 0

if __name__ == "__main__":
    sys.exit(main())


#OLD CODE
# #!/usr/bin/env python3
# """candidatedb: a SQLite candidate database you can refresh from live sources.

# Setup:      python candidatedb.py init            (creates candidate.db)
#             python candidatedb.py seed            (optional: Hamilton County, IN 2026 sample rows)
# Federal:    FEC_API_KEY=... python candidatedb.py refresh fec --year 2026
#             (free key: https://api.data.gov/signup/ ; covers federal candidates only)
# By address: CIVIC_API_KEY=... python candidatedb.py refresh civic --address "1 Main St, Fishers, IN 46037"
#             (Google Civic Information API; returns contests only when an election has published data)
# Any source: python candidatedb.py import file.csv --source "CTCL export"
#             (CSV or JSON list; columns: name, party, office, level, state, county, locality, district,
#              election_date, election_kind, status, website, incumbent, votes, vote_pct, key)
#             Use --map csvcolumn=field when your headers differ.
# Query:      python candidatedb.py query --state IN --county Hamilton --office Senate
# Stats:      python candidatedb.py stats
# Keep fresh: cron, e.g.  0 6 * * *  cd /path && python candidatedb.py refresh fec --year 2026

# Statuses: declared, on_ballot, leading, trailing, won, lost, withdrawn, potential, prior, unknown.
# Rows from one source are upserted by (source, key); last_seen shows when a source last returned a row.
# """
# import argparse, csv, hashlib, json, os, sqlite3, sys, time
# import urllib.error, urllib.parse, urllib.request
# from datetime import datetime, timezone

# DB = os.environ.get("CANDIDATE_DB", "candidate.db")

# SCHEMA = """
# PRAGMA foreign_keys=ON;
# CREATE TABLE IF NOT EXISTS sources(id INTEGER PRIMARY KEY, name TEXT UNIQUE NOT NULL, url TEXT DEFAULT '', notes TEXT DEFAULT '');
# CREATE TABLE IF NOT EXISTS offices(
#   id INTEGER PRIMARY KEY, level TEXT NOT NULL, state TEXT NOT NULL DEFAULT '', county TEXT NOT NULL DEFAULT '',
#   locality TEXT NOT NULL DEFAULT '', name TEXT NOT NULL, district TEXT NOT NULL DEFAULT '', ocd_id TEXT DEFAULT '',
#   UNIQUE(level,state,county,locality,name,district));
# CREATE TABLE IF NOT EXISTS elections(
#   id INTEGER PRIMARY KEY, state TEXT NOT NULL DEFAULT '', date TEXT NOT NULL, kind TEXT NOT NULL DEFAULT 'general',
#   UNIQUE(state,date,kind));
# CREATE TABLE IF NOT EXISTS candidates(
#   id INTEGER PRIMARY KEY, source_id INTEGER NOT NULL REFERENCES sources(id), source_key TEXT NOT NULL,
#   name TEXT NOT NULL, party TEXT DEFAULT '', office_id INTEGER NOT NULL REFERENCES offices(id),
#   election_id INTEGER REFERENCES elections(id), status TEXT DEFAULT 'unknown', raw_status TEXT DEFAULT '',
#   incumbent INTEGER DEFAULT 0, votes INTEGER, vote_pct REAL, website TEXT DEFAULT '', fec_id TEXT DEFAULT '',
#   notes TEXT DEFAULT '', unofficial INTEGER DEFAULT 0, first_seen TEXT, last_seen TEXT,
#   UNIQUE(source_id, source_key));
# CREATE TABLE IF NOT EXISTS refresh_log(
#   id INTEGER PRIMARY KEY, source TEXT, started TEXT, finished TEXT, rows_seen INTEGER, rows_new INTEGER, error TEXT);
# CREATE INDEX IF NOT EXISTS ix_off ON offices(state, level, county);
# CREATE INDEX IF NOT EXISTS ix_cand_name ON candidates(name);
# CREATE INDEX IF NOT EXISTS ix_cand_office ON candidates(office_id);
# CREATE VIEW IF NOT EXISTS v_candidates AS
#   SELECT c.id, c.name, c.party, c.status, c.incumbent, c.votes, c.vote_pct, c.unofficial, c.website, c.fec_id, c.notes,
#          o.level, o.state, o.county, o.locality, o.name AS office, o.district,
#          e.date AS election_date, e.kind AS election_kind, s.name AS source, c.last_seen
#   FROM candidates c JOIN offices o ON o.id=c.office_id JOIN sources s ON s.id=c.source_id
#   LEFT JOIN elections e ON e.id=c.election_id;
# """

# def now(): return datetime.now(timezone.utc).isoformat(timespec="seconds")

# def connect(path=None):
#     con = sqlite3.connect(path or DB)
#     con.executescript(SCHEMA)
#     return con

# def source(con, name, url="", notes=""):
#     con.execute("INSERT OR IGNORE INTO sources(name,url,notes) VALUES(?,?,?)", (name, url, notes))
#     return con.execute("SELECT id FROM sources WHERE name=?", (name,)).fetchone()[0]

# def office(con, level, name, state="", county="", locality="", district="", ocd=""):
#     k = (level, state or "", county or "", locality or "", name, str(district or ""))
#     r = con.execute("SELECT id FROM offices WHERE level=? AND state=? AND county=? AND locality=? AND name=? AND district=?", k).fetchone()
#     if r: return r[0]
#     return con.execute("INSERT INTO offices(level,state,county,locality,name,district,ocd_id) VALUES(?,?,?,?,?,?,?)", (*k, ocd)).lastrowid

# def election(con, state, date, kind="general"):
#     if not date: return None
#     con.execute("INSERT OR IGNORE INTO elections(state,date,kind) VALUES(?,?,?)", (state or "", date, kind or "general"))
#     return con.execute("SELECT id FROM elections WHERE state=? AND date=? AND kind=?", (state or "", date, kind or "general")).fetchone()[0]

# def upsert(con, src, key, office_id, name, election_id=None, **f):
#     cols = dict(party=f.get("party") or "", status=f.get("status") or "unknown", raw_status=f.get("raw_status") or "",
#                 incumbent=int(bool(f.get("incumbent"))), votes=f.get("votes"), vote_pct=f.get("vote_pct"),
#                 website=f.get("website") or "", fec_id=f.get("fec_id") or "", notes=f.get("notes") or "",
#                 unofficial=int(bool(f.get("unofficial"))))
#     t = now()
#     row = con.execute("SELECT id FROM candidates WHERE source_id=? AND source_key=?", (src, key)).fetchone()
#     if row:
#         sets = ",".join(f"{k}=?" for k in cols)
#         con.execute(f"UPDATE candidates SET name=?,office_id=?,election_id=?,{sets},last_seen=? WHERE id=?",
#                     (name, office_id, election_id, *cols.values(), t, row[0]))
#         return False
#     con.execute("INSERT INTO candidates(source_id,source_key,name,office_id,election_id," + ",".join(cols) +
#                 ",first_seen,last_seen) VALUES(?,?,?,?,?," + ",".join("?" * len(cols)) + ",?,?)",
#                 (src, key, name, office_id, election_id, *cols.values(), t, t))
#     return True

# def tidy(n):
#     n = (n or "").strip()
#     if "," in n:
#         last, first = [p.strip() for p in n.split(",", 1)]
#         n = f"{first} {last}"
#     return n.title() if n.isupper() else n

# def http_json(url, params=None, tries=4):
#     if params: url += ("&" if "?" in url else "?") + urllib.parse.urlencode(params)
#     for i in range(tries):
#         try:
#             req = urllib.request.Request(url, headers={"User-Agent": "candidatedb/1.0"})
#             with urllib.request.urlopen(req, timeout=30) as r:
#                 return json.load(r)
#         except urllib.error.HTTPError as e:
#             if e.code in (429, 500, 502, 503) and i < tries - 1:
#                 time.sleep(2 ** i * 2); continue
#             raise RuntimeError(f"HTTP {e.code} from {url.split('?')[0]}: {e.read().decode('utf8', 'replace')[:300]}")
#         except urllib.error.URLError as e:
#             if i < tries - 1: time.sleep(2 ** i); continue
#             raise RuntimeError(f"Network error reaching {url.split('?')[0]}: {e.reason}")

# def logged(con, name, fn):
#     t = now(); seen = new = 0; err = ""
#     try:
#         seen, new = fn()
#     except Exception as e:
#         err = str(e)
#     con.execute("INSERT INTO refresh_log(source,started,finished,rows_seen,rows_new,error) VALUES(?,?,?,?,?,?)",
#                 (name, t, now(), seen, new, err))
#     con.commit()
#     print(f"{name}: {seen} rows seen, {new} new" + (f"; ERROR: {err}" if err else ""))
#     return 0 if not err else 1

# # ---- adapters -------------------------------------------------------------
# FEC_STATUS = {"C": "declared", "F": "potential", "N": "potential", "P": "prior"}

# def run_fec(con, key, year, max_pages=None):
#     src = source(con, "openFEC", "https://api.open.fec.gov/",
#                  "Federal candidates registered with the FEC. Includes registrants who never reach a ballot.")
#     page = pages = 1; seen = new = 0
#     while page <= pages and (not max_pages or page <= max_pages):
#         d = http_json("https://api.open.fec.gov/v1/candidates/",
#                       {"api_key": key, "election_year": year, "per_page": 100, "page": page, "sort": "name"})
#         pages = (d.get("pagination") or {}).get("pages", 1) or 1
#         for r in d.get("results", []):
#             o, st = r.get("office"), r.get("state") or ""
#             if o == "H": oid = office(con, "federal", "U.S. House", st, district=r.get("district") or "")
#             elif o == "S": oid = office(con, "federal", "U.S. Senate", st)
#             elif o == "P": oid = office(con, "federal", "President", "US")
#             else: continue
#             raw = r.get("candidate_status") or ""
#             new += upsert(con, src, f"{r['candidate_id']}|{year}", oid, tidy(r.get("name")),
#                           election(con, st if o != "P" else "US", str(year), "cycle"),
#                           party=r.get("party_full") or r.get("party"), status=FEC_STATUS.get(raw, "unknown"),
#                           raw_status=raw, incumbent=r.get("incumbent_challenge") == "I", fec_id=r["candidate_id"])
#             seen += 1
#         con.commit(); page += 1; time.sleep(0.2)
#     return seen, new

# LEVELS = {"country": "federal", "administrativeArea1": "state", "administrativeArea2": "county"}

# def run_civic(con, key, address, election_id=None):
#     base = "https://www.googleapis.com/civicinfo/v2/"
#     ids = [election_id] if election_id else [e["id"] for e in http_json(base + "elections", {"key": key}).get("elections", []) if e["id"] != "2000"]
#     src = source(con, "Google Civic voterInfo", base, "Address-based contests; only populated when an election has published data.")
#     seen = new = 0
#     for eid in ids:
#         try:
#             d = http_json(base + "voterinfo", {"key": key, "address": address, "electionId": eid})
#         except RuntimeError as e:
#             print(f"  election {eid}: {str(e)[:120]}"); continue
#         st = (d.get("normalizedInput") or {}).get("state", "")
#         ed = (d.get("election") or {}).get("electionDay", "")
#         ev = election(con, st, ed, "general")
#         for c in d.get("contests", []):
#             if not c.get("office") or not c.get("candidates"): continue
#             lvl = LEVELS.get((c.get("level") or [""])[0], "local")
#             dist = c.get("district") or {}
#             oid = office(con, lvl, c["office"], st, district=dist.get("name", "") if lvl != "local" else "",
#                          locality=dist.get("name", "") if lvl == "local" else "")
#             for cand in c["candidates"]:
#                 k = f"{eid}|{c['office']}|{dist.get('id', '')}|{cand['name']}"
#                 new += upsert(con, src, k, oid, cand["name"], ev, party=cand.get("party"),
#                               status="on_ballot", website=cand.get("candidateUrl"))
#                 seen += 1
#     con.commit()
#     return seen, new

# FIELDS = ["name", "party", "office", "level", "state", "county", "locality", "district", "election_date",
#           "election_kind", "status", "website", "incumbent", "votes", "vote_pct", "key", "notes"]

# def run_import(con, path, srcname, mapping):
#     rows = json.load(open(path)) if path.endswith(".json") else list(csv.DictReader(open(path, newline="", encoding="utf-8-sig")))
#     src = source(con, srcname, "", f"Imported from {os.path.basename(path)}")
#     seen = new = 0
#     for r in rows:
#         r = {mapping.get(k, k).strip().lower(): (v.strip() if isinstance(v, str) else v) for k, v in r.items()}
#         if not r.get("name") or not r.get("office"): continue
#         oid = office(con, r.get("level") or "local", r["office"], (r.get("state") or "").upper(), r.get("county", ""),
#                      r.get("locality", ""), r.get("district", ""))
#         key = r.get("key") or hashlib.sha1("|".join(str(r.get(f, "")) for f in ("name", "office", "level", "state", "county", "locality", "district", "election_date")).encode()).hexdigest()
#         num = lambda x, t: t(x) if x not in (None, "") else None
#         new += upsert(con, src, key, oid, r["name"], election(con, (r.get("state") or "").upper(), r.get("election_date"), r.get("election_kind") or "general"),
#                       party=r.get("party"), status=(r.get("status") or "unknown").lower(), website=r.get("website"),
#                       incumbent=str(r.get("incumbent", "")).lower() in ("1", "true", "yes", "y"),
#                       votes=num(r.get("votes"), lambda v: int(float(v))), vote_pct=num(r.get("vote_pct"), float), notes=r.get("notes"))
#         seen += 1
#     con.commit()
#     return seen, new

# # ---- sample data (Hamilton County, Indiana, unofficial Nov. 3, 2026 returns) --------------
# SEED = [  # level, office, district, county, name, party, status, votes, pct, incumbent
#     ("federal", "U.S. House", "5", "Hamilton", "J.D. Ford", "Democratic", "won", 81500, 55.36, 0),
#     ("federal", "U.S. House", "5", "Hamilton", "Victoria Spartz", "Republican", "lost", 65570, 44.54, 1),
#     ("state", "Indiana Senate", "31", "Hamilton", "Kerry Forestal", "Democratic", "won", 23549, 57.34, 0),
#     ("state", "Indiana Senate", "31", "Hamilton", "Juanita Albright", "Republican", "lost", 17517, 42.66, 0),
#     ("state", "Indiana House", "37", "Hamilton", "Lauren Cole", "Democratic", "won", 13318, 51.52, 0),
#     ("state", "Indiana House", "37", "Hamilton", "Todd Huston", "Republican", "lost", 12532, 48.48, 1),
#     ("state", "Indiana House", "88", "Hamilton", "Stephanie Jo Yocum", "Democratic", "leading", 4359, 53.07, 0),
#     ("state", "Indiana House", "88", "Hamilton", "Chris Jeter", "Republican", "trailing", 3854, 46.93, 1),
#     ("county", "Sheriff", "", "Hamilton", "Charles Hollowell", "Democratic", "won", 74466, 50.94, 0),
#     ("county", "Sheriff", "", "Hamilton", "Dustin Dixon", "Republican", "lost", 71723, 49.06, 0),
#     ("county", "Circuit Court Clerk", "", "Hamilton", "Alexandra Wilson", "Democratic", "won", 74325, 51.27, 0),
#     ("county", "Circuit Court Clerk", "", "Hamilton", "Beth Sheller", "Republican", "lost", 70648, 48.73, 0),
#     ("county", "County Commissioner", "1", "Hamilton", "Christine Altman", "Republican", "won", 72549, 50.11, 1),
#     ("county", "County Commissioner", "1", "Hamilton", "Ti'Gre McNear", "Democratic", "lost", 72226, 49.89, 0),
#     ("county", "Superior Court Judge", "8", "Hamilton", "Emily Angel Shaw", "Democratic", "won", 75801, 52.47, 0),
#     ("county", "Superior Court Judge", "8", "Hamilton", "Danica Eyler", "Republican", "lost", 68664, 47.53, 0),
# ]

# def run_seed(con):
#     src = source(con, "Hamilton County IN unofficial 2026", "https://www.larryinfishers.com/2026/11/04/democrats-take-key-hamilton-county-offices-in-historic-2026-election/",
#                  "Unofficial election-night returns; Hamilton County portion only for multi-county districts.")
#     ev = election(con, "IN", "2026-11-03", "general"); new = 0
#     for lvl, off, dist, county, name, party, status, votes, pct, inc in SEED:
#         oid = office(con, lvl, off, "IN", county if lvl == "county" else "", district=dist)
#         new += upsert(con, src, f"{off}|{dist}|{name}", oid, name, ev, party=party, status=status, votes=votes,
#                       vote_pct=pct, incumbent=inc, unofficial=1,
#                       notes="Hamilton County votes only" if lvl in ("federal", "state") else "")
#     con.commit()
#     return len(SEED), new

# # ---- query ------------------------------------------------------------------
# def run_query(con, a):
#     w, p = [], []
#     for col, val, op in (("state", a.state and a.state.upper(), "="), ("level", a.level, "="), ("status", a.status, "="),
#                          ("county", a.county, "LIKE"), ("locality", a.city, "LIKE"), ("office", a.office, "LIKE"),
#                          ("name", a.name, "LIKE"), ("party", a.party, "LIKE"), ("district", a.district, "=")):
#         if val: w.append(f"{col} {op} ?"); p.append(f"%{val}%" if op == "LIKE" else val)
#     q = "SELECT * FROM v_candidates" + (" WHERE " + " AND ".join(w) if w else "") + " ORDER BY state, level, office, district, vote_pct DESC, name LIMIT ?"
#     cur = con.execute(q, (*p, a.limit)); cols = [c[0] for c in cur.description]; rows = cur.fetchall()
#     if a.json:
#         print(json.dumps([dict(zip(cols, r)) for r in rows], indent=2)); return 0
#     for r in rows:
#         d = dict(zip(cols, r)); where = " ".join(x for x in (d["state"], d["county"], d["locality"]) if x)
#         pct = f" {d['vote_pct']:.1f}%" if d["vote_pct"] is not None else ""
#         print(f"{d['name']} ({d['party'] or '?'}){' [inc]' if d['incumbent'] else ''} | {d['office']} {d['district']} | {where} | {d['status']}{pct}{' (unofficial)' if d['unofficial'] else ''} | {d['source']}")
#     print(f"-- {len(rows)} row(s)")
#     return 0

# def main(argv=None):
#     ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
#     ap.add_argument("--db", default=None)
#     sub = ap.add_subparsers(dest="cmd", required=True)
#     sub.add_parser("init"); sub.add_parser("seed"); sub.add_parser("stats")
#     r = sub.add_parser("refresh"); r.add_argument("source", choices=["fec", "civic"])
#     r.add_argument("--year", type=int, default=datetime.now().year); r.add_argument("--address"); r.add_argument("--election-id")
#     r.add_argument("--max-pages", type=int)
#     i = sub.add_parser("import"); i.add_argument("file"); i.add_argument("--source", required=True)
#     i.add_argument("--map", action="append", default=[], help="csvcolumn=field")
#     q = sub.add_parser("query")
#     for f in ("state", "level", "county", "city", "office", "name", "party", "district", "status"): q.add_argument("--" + f)
#     q.add_argument("--limit", type=int, default=100); q.add_argument("--json", action="store_true")
#     a = ap.parse_args(argv); con = connect(a.db)
#     if a.cmd == "init": print(f"ready: {a.db or DB}"); return 0
#     if a.cmd == "seed": return logged(con, "seed", lambda: run_seed(con))
#     if a.cmd == "import":
#         m = dict(x.split("=", 1) for x in a.map)
#         return logged(con, "import:" + a.source, lambda: run_import(con, a.file, a.source, m))
#     if a.cmd == "refresh":
#         if a.source == "fec":
#             k = os.environ.get("FEC_API_KEY") or sys.exit("Set FEC_API_KEY (free: https://api.data.gov/signup/)")
#             return logged(con, "fec", lambda: run_fec(con, k, a.year, a.max_pages))
#         k = os.environ.get("CIVIC_API_KEY") or sys.exit("Set CIVIC_API_KEY (Google Cloud, Civic Information API)")
#         if not a.address: sys.exit("--address is required for civic")
#         return logged(con, "civic", lambda: run_civic(con, k, a.address, a.election_id))
#     if a.cmd == "query": return run_query(con, a)
#     if a.cmd == "stats":
#         for row in con.execute("SELECT source, level, state, COUNT(*) FROM v_candidates GROUP BY 1,2,3 ORDER BY 1,2,3"): print(*row)
#         print("last refreshes:")
#         for row in con.execute("SELECT source, finished, rows_seen, rows_new, error FROM refresh_log ORDER BY id DESC LIMIT 5"): print(*row)
#     return 0

# if __name__ == "__main__":
#     sys.exit(main())
