# #py using api.data.gov to get candidate data and store in sqlite database

# import os
# import sqlite3
# import requests
# import json

# # Setup API Key (Get a free key at https://api.data.gov/signup/)
# API_KEY = os.environ.get("FEC_API_KEY", "DEMO_KEY")
# BASE_URL = "https://api.open.fec.gov/v1"

# # Initialize SQLite Database
# def init_db(db_name="candidates.db"):
#     conn = sqlite3.connect(db_name)
#     cursor = conn.cursor()
#     cursor.execute("""
#         CREATE TABLE IF NOT EXISTS federal_candidates (
#             candidate_id TEXT PRIMARY KEY,
#             name TEXT NOT NULL,
#             party TEXT,
#             office TEXT,
#             state TEXT,
#             district TEXT,
#             incumbent_challenge_full TEXT,
#             candidate_status TEXT,
#             election_year INTEGER
#         )
#     """)
#     conn.commit()
#     conn.close()

# # Fetch candidates from OpenFEC API
# def fetch_and_store_candidates(state, district=None, year=2026):
#     init_db()

#     endpoint = f"{BASE_URL}/candidates/"
#     params = {
#         "api_key": API_KEY,
#         "state": state.upper(),
#         "election_year": year,
#         "per_page": 100,
#         "page": 1
#     }
#     if district:
#         params["district"] = str(district).zfill(2)

#     print(f"Fetching federal candidates for {state.upper()}" + (f" District {district}" if district else "") + f" ({year})...")

#     response = requests.get(endpoint, params=params)
#     if response.status_code != 200:
#         print(f"Error fetching data: {response.status_code} - {response.text}")
#         return

#     data = response.json()
#     candidates = data.get("results", [])

#     conn = sqlite3.connect("candidates.db")
#     cursor = conn.cursor()

#     count = 0
#     for c in candidates:
#         cursor.execute("""
#             INSERT OR REPLACE INTO federal_candidates (
#                 candidate_id, name, party, office, state, district,
#                 incumbent_challenge_full, candidate_status, election_year
#             ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
#         """, (
#             c.get("candidate_id"),
#             c.get("name"),
#             c.get("party_full") or c.get("party"),
#             c.get("office_full") or c.get("office"),
#             c.get("state"),
#             c.get("district"),
#             c.get("incumbent_challenge_full"),
#             c.get("candidate_status"),
#             year
#         ))
#         count += 1

#     conn.commit()
#     conn.close()
#     print(f"Successfully saved {count} candidate records into candidates.db.")

# if __name__ == "__main__":
#     # Example: Fetch federal candidates for Indiana's 5th Congressional District (Hamilton County area)
#     fetch_and_store_candidates(state="IN", district="05", year=2026)

# #NEW CODE
# #!/usr/bin/env python3
# """candidatedb: A SQLite candidate database with a Flask API endpoint.

# Setup:      python candidatedb.py init            (creates candidate.db)
#             python candidatedb.py seed            (populates sample data)
# Server:     python candidatedb.py serve           (starts Flask server)
# Query:      python candidatedb.py query --state IN --county Hamilton
# """

# import argparse
# import csv
# import hashlib
# import json
# import os
# import sqlite3
# import sys
# from datetime import datetime, timezone

# from flask import Flask, jsonify, request
# from flask_cors import CORS

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
#   tags TEXT DEFAULT '[]', bio TEXT DEFAULT '', key_positions TEXT DEFAULT '[]',
#   UNIQUE(source_id, source_key));
# CREATE TABLE IF NOT EXISTS refresh_log(
#   id INTEGER PRIMARY KEY, source TEXT, started TEXT, finished TEXT, rows_seen INTEGER, rows_new INTEGER, error TEXT);
# CREATE INDEX IF NOT EXISTS ix_off ON offices(state, level, county);
# CREATE INDEX IF NOT EXISTS ix_cand_name ON candidates(name);
# CREATE INDEX IF NOT EXISTS ix_cand_office ON candidates(office_id);
# CREATE VIEW IF NOT EXISTS v_candidates AS
#   SELECT c.id, c.name, c.party, c.status, c.incumbent, c.votes, c.vote_pct, c.unofficial, c.website, c.fec_id, c.notes,
#          c.tags, c.bio, c.key_positions,
#          o.level, o.state, o.county, o.locality, o.name AS office, o.district,
#          e.date AS election_date, e.kind AS election_kind, s.name AS source, c.last_seen
#   FROM candidates c JOIN offices o ON o.id=c.office_id JOIN sources s ON s.id=c.source_id
#   LEFT JOIN elections e ON e.id=c.election_id;
# """

# def now():
#     return datetime.now(timezone.utc).isoformat(timespec="seconds")

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
#     cols = dict(
#         party=f.get("party") or "",
#         status=f.get("status") or "unknown",
#         raw_status=f.get("raw_status") or "",
#         incumbent=int(bool(f.get("incumbent"))),
#         votes=f.get("votes"),
#         vote_pct=f.get("vote_pct"),
#         website=f.get("website") or "",
#         fec_id=f.get("fec_id") or "",
#         notes=f.get("notes") or "",
#         unofficial=int(bool(f.get("unofficial"))),
#         tags=json.dumps(f.get("tags", [])),
#         bio=f.get("bio", ""),
#         key_positions=json.dumps(f.get("keyPositions", []))
#     )
#     t = now()
#     row = con.execute("SELECT id FROM candidates WHERE source_id=? AND source_key=?", (src, key)).fetchone()
#     if row:
#         sets = ",".join(f"{k}=?" for k in cols)
#         con.execute(
#             f"UPDATE candidates SET name=?,office_id=?,election_id=?,{sets},last_seen=? WHERE id=?",
#             (name, office_id, election_id, *cols.values(), t, row[0])
#         )
#         return False
#     con.execute(
#         "INSERT INTO candidates(source_id,source_key,name,office_id,election_id," + ",".join(cols) +
#         ",first_seen,last_seen) VALUES(?,?,?,?,?," + ",".join("?" * len(cols)) + ",?,?)",
#         (src, key, name, office_id, election_id, *cols.values(), t, t)
#     )
#     return True

# # ---- Sample Dataset --------------------------------------------------------
# SEED = [
#   (
#     "federal", "U.S. House of Representatives (IN-05)", "5", "Hamilton", "Victoria Spartz", "Republican", "on_ballot", 1, 0,
#     "https://spartz.house.gov", ["Taxes", "Agriculture", "Healthcare", "Economy"],
#     "Current U.S. Representative serving Indiana's 5th Congressional District. Focuses on fiscal responsibility, free-market healthcare reform, and agricultural policy.",
#     [{"issue": "Economy", "stance": "Advocates for tax cuts, deregulation, and spending caps to curb inflation."},
#      {"issue": "Healthcare", "stance": "Supports price transparency and interstate health insurance competition."},
#      {"issue": "Agriculture", "stance": "Promotes deregulation for local farms and expanded trade access."}]
#   ),
#   (
#     "federal", "U.S. House of Representatives (IN-05)", "5", "Hamilton", "J.D. Ford", "Democratic", "on_ballot", 0, 0,
#     "https://fordforindiana.com", ["Education", "Healthcare", "Worker Rights", "Renewable Energy"],
#     "State Senator running for Congressional District 5. Emphasizes public school funding, reproductive freedoms, and expanding healthcare coverage.",
#     [{"issue": "Education", "stance": "Pushes for increased federal title funding and higher teacher pay standards."},
#      {"issue": "Healthcare", "stance": "Supports expanding ACA subsidies and lowering prescription drug prices."},
#      {"issue": "Energy", "stance": "Advocates for federal incentives for clean energy manufacturers in Indiana."}]
#   ),
#   (
#     "state", "Indiana Secretary of State", "", "Hamilton", "Beau Bayh", "Democratic", "on_ballot", 0, 0,
#     "https://beaubayh.com", ["Election Security", "Business Express", "Voter Access"],
#     "Focuses on modernizing Indiana's business registry and expanding voter accessibility through transparent election auditing.",
#     [{"issue": "Elections", "stance": "Promotes same-day registration and independent post-election auditing."},
#      {"issue": "Business", "stance": "Aims to streamline online licensing for Hoosier small business owners."}]
#   )
# ]

# def run_seed(con):
#     src = source(con, "Hamilton County IN Directory", "https://www.hamiltoncounty.in.gov", "Sample seed data")
#     ev = election(con, "IN", "2026-11-03", "general")
#     new = 0
#     for lvl, off, dist, county, name, party, status, inc, unofficial, website, tags, bio, key_positions in SEED:
#         oid = office(con, lvl, off, "IN", county if lvl == "county" else "", district=dist)
#         new += upsert(con, src, f"{off}|{dist}|{name}", oid, name, ev, party=party, status=status,
#                       incumbent=inc, website=website, unofficial=unofficial, tags=tags, bio=bio, keyPositions=key_positions)
#     con.commit()
#     return len(SEED), new

# # ---- Flask Web API Setup ----------------------------------------------------
# api = Flask(__name__)
# CORS(api)  # Enable Cross-Origin Resource Sharing for all origins

# @api.route("/api/candidates", methods=["GET"])
# def get_candidates():
#     con = connect()
#     try:
#         cur = con.execute("SELECT * FROM v_candidates")
#         cols = [c[0] for c in cur.description]
#         candidates = []
#         for r in cur.fetchall():
#             d = dict(zip(cols, r))
#             d["tags"] = json.loads(d.get("tags") or "[]")
#             d["keyPositions"] = json.loads(d.get("key_positions") or d.get("keyPositions") or "[]")
#             d["incumbent"] = bool(d.get("incumbent", 0))
#             candidates.append(d)
#         return jsonify(candidates)
#     finally:
#         con.close()

# # ---- CLI Commands -----------------------------------------------------------
# def main():
#     ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
#     ap.add_argument("--db", default=None)
#     sub = ap.add_subparsers(dest="cmd", required=True)
#     sub.add_parser("init")
#     sub.add_parser("seed")
    
#     srv = sub.add_parser("serve")
#     srv.add_argument("--host", default="0.0.0.0", help="Host IP to bind (0.0.0.0 for public/all interfaces)")
#     srv.add_argument("--port", type=int, default=8000, help="Port number")

#     a = ap.parse_args()

#     if a.cmd == "init":
#         con = connect(a.db)
#         print(f"Database ready: {a.db or DB}")
#         con.close()
#     elif a.cmd == "seed":
#         con = connect(a.db)
#         seen, new = run_seed(con)
#         print(f"Seeded database with {seen} candidates.")
#         con.close()
#     elif a.cmd == "serve":
#         print(f"Starting Flask server on http://{a.host}:{a.port}/api/candidates")
#         api.run(host=a.host, port=a.port, debug=False)

# if __name__ == "__main__":
#     main()

# # #TRIAL OLD CODE
# # #!/usr/bin/env python3
# # """candidatedb: a SQLite candidate database you can refresh from live sources.

# # Setup:      python candidatedb.py init            (creates candidate.db)
# #             python candidatedb.py seed            (Hamilton County, IN 2026 sample rows)
# # Server:     python candidatedb.py serve           (Starts local HTTP server for the web app)
# # Query:      python candidatedb.py query --state IN --county Hamilton --office Senate
# # Stats:      python candidatedb.py stats
# # """
# # import argparse, csv, hashlib, json, os, sqlite3, sys, time
# # import urllib.error, urllib.parse, urllib.request
# # import http.server
# # from datetime import datetime, timezone

# # DB = os.environ.get("CANDIDATE_DB", "candidate.db")

# # SCHEMA = """
# # PRAGMA foreign_keys=ON;
# # CREATE TABLE IF NOT EXISTS sources(id INTEGER PRIMARY KEY, name TEXT UNIQUE NOT NULL, url TEXT DEFAULT '', notes TEXT DEFAULT '');
# # CREATE TABLE IF NOT EXISTS offices(
# #   id INTEGER PRIMARY KEY, level TEXT NOT NULL, state TEXT NOT NULL DEFAULT '', county TEXT NOT NULL DEFAULT '',
# #   locality TEXT NOT NULL DEFAULT '', name TEXT NOT NULL, district TEXT NOT NULL DEFAULT '', ocd_id TEXT DEFAULT '',
# #   UNIQUE(level,state,county,locality,name,district));
# # CREATE TABLE IF NOT EXISTS elections(
# #   id INTEGER PRIMARY KEY, state TEXT NOT NULL DEFAULT '', date TEXT NOT NULL, kind TEXT NOT NULL DEFAULT 'general',
# #   UNIQUE(state,date,kind));
# # CREATE TABLE IF NOT EXISTS candidates(
# #   id INTEGER PRIMARY KEY, source_id INTEGER NOT NULL REFERENCES sources(id), source_key TEXT NOT NULL,
# #   name TEXT NOT NULL, party TEXT DEFAULT '', office_id INTEGER NOT NULL REFERENCES offices(id),
# #   election_id INTEGER REFERENCES elections(id), status TEXT DEFAULT 'unknown', raw_status TEXT DEFAULT '',
# #   incumbent INTEGER DEFAULT 0, votes INTEGER, vote_pct REAL, website TEXT DEFAULT '', fec_id TEXT DEFAULT '',
# #   notes TEXT DEFAULT '', unofficial INTEGER DEFAULT 0, first_seen TEXT, last_seen TEXT,
# #   tags TEXT DEFAULT '[]', bio TEXT DEFAULT '', key_positions TEXT DEFAULT '[]',
# #   UNIQUE(source_id, source_key));
# # CREATE TABLE IF NOT EXISTS refresh_log(
# #   id INTEGER PRIMARY KEY, source TEXT, started TEXT, finished TEXT, rows_seen INTEGER, rows_new INTEGER, error TEXT);
# # CREATE INDEX IF NOT EXISTS ix_off ON offices(state, level, county);
# # CREATE INDEX IF NOT EXISTS ix_cand_name ON candidates(name);
# # CREATE INDEX IF NOT EXISTS ix_cand_office ON candidates(office_id);
# # CREATE VIEW IF NOT EXISTS v_candidates AS
# #   SELECT c.id, c.name, c.party, c.status, c.incumbent, c.votes, c.vote_pct, c.unofficial, c.website, c.fec_id, c.notes,
# #          c.tags, c.bio, c.key_positions,
# #          o.level, o.state, o.county, o.locality, o.name AS office, o.district,
# #          e.date AS election_date, e.kind AS election_kind, s.name AS source, c.last_seen
# #   FROM candidates c JOIN offices o ON o.id=c.office_id JOIN sources s ON s.id=c.source_id
# #   LEFT JOIN elections e ON e.id=c.election_id;
# # """

# # def now(): return datetime.now(timezone.utc).isoformat(timespec="seconds")

# # def connect(path=None):
# #     con = sqlite3.connect(path or DB)
# #     con.executescript(SCHEMA)
# #     return con

# # def source(con, name, url="", notes=""):
# #     con.execute("INSERT OR IGNORE INTO sources(name,url,notes) VALUES(?,?,?)", (name, url, notes))
# #     return con.execute("SELECT id FROM sources WHERE name=?", (name,)).fetchone()[0]

# # def office(con, level, name, state="", county="", locality="", district="", ocd=""):
# #     k = (level, state or "", county or "", locality or "", name, str(district or ""))
# #     r = con.execute("SELECT id FROM offices WHERE level=? AND state=? AND county=? AND locality=? AND name=? AND district=?", k).fetchone()
# #     if r: return r[0]
# #     return con.execute("INSERT INTO offices(level,state,county,locality,name,district,ocd_id) VALUES(?,?,?,?,?,?,?)", (*k, ocd)).lastrowid

# # def election(con, state, date, kind="general"):
# #     if not date: return None
# #     con.execute("INSERT OR IGNORE INTO elections(state,date,kind) VALUES(?,?,?)", (state or "", date, kind or "general"))
# #     return con.execute("SELECT id FROM elections WHERE state=? AND date=? AND kind=?", (state or "", date, kind or "general")).fetchone()[0]

# # def upsert(con, src, key, office_id, name, election_id=None, **f):
# #     cols = dict(party=f.get("party") or "", status=f.get("status") or "unknown", raw_status=f.get("raw_status") or "",
# #                 incumbent=int(bool(f.get("incumbent"))), votes=f.get("votes"), vote_pct=f.get("vote_pct"),
# #                 website=f.get("website") or "", fec_id=f.get("fec_id") or "", notes=f.get("notes") or "",
# #                 unofficial=int(bool(f.get("unofficial"))),
# #                 tags=json.dumps(f.get("tags", [])), bio=f.get("bio", ""), key_positions=json.dumps(f.get("keyPositions", [])))
# #     t = now()
# #     row = con.execute("SELECT id FROM candidates WHERE source_id=? AND source_key=?", (src, key)).fetchone()
# #     if row:
# #         sets = ",".join(f"{k}=?" for k in cols)
# #         con.execute(f"UPDATE candidates SET name=?,office_id=?,election_id=?,{sets},last_seen=? WHERE id=?",
# #                     (name, office_id, election_id, *cols.values(), t, row[0]))
# #         return False
# #     con.execute("INSERT INTO candidates(source_id,source_key,name,office_id,election_id," + ",".join(cols) +
# #                 ",first_seen,last_seen) VALUES(?,?,?,?,?," + ",".join("?" * len(cols)) + ",?,?)",
# #                 (src, key, name, office_id, election_id, *cols.values(), t, t))
# #     return True

# # # ---- sample data with full UI attributes ----------------------------------
# # SEED = [
# #   (
# #     "federal", "U.S. House of Representatives (IN-05)", "5", "Hamilton", "Victoria Spartz", "Republican", "on_ballot", 1, 0,
# #     "https://spartz.house.gov", ["Taxes", "Agriculture", "Healthcare", "Economy"],
# #     "Current U.S. Representative serving Indiana's 5th Congressional District. Focuses on fiscal responsibility, free-market healthcare reform, and agricultural policy.",
# #     [{"issue": "Economy", "stance": "Advocates for tax cuts, deregulation, and spending caps to curb inflation."},
# #      {"issue": "Healthcare", "stance": "Supports price transparency and interstate health insurance competition."},
# #      {"issue": "Agriculture", "stance": "Promotes deregulation for local farms and expanded trade access."}]
# #   ),
# #   (
# #     "federal", "U.S. House of Representatives (IN-05)", "5", "Hamilton", "J.D. Ford", "Democratic", "on_ballot", 0, 0,
# #     "https://fordforindiana.com", ["Education", "Healthcare", "Worker Rights", "Renewable Energy"],
# #     "State Senator running for Congressional District 5. Emphasizes public school funding, reproductive freedoms, and expanding healthcare coverage.",
# #     [{"issue": "Education", "stance": "Pushes for increased federal title funding and higher teacher pay standards."},
# #      {"issue": "Healthcare", "stance": "Supports expanding ACA subsidies and lowering prescription drug prices."},
# #      {"issue": "Energy", "stance": "Advocates for federal incentives for clean energy manufacturers in Indiana."}]
# #   ),
# #   (
# #     "state", "Indiana Secretary of State", "", "Hamilton", "Beau Bayh", "Democratic", "on_ballot", 0, 0,
# #     "https://beaubayh.com", ["Election Security", "Business Express", "Voter Access"],
# #     "Focuses on modernizing Indiana's business registry and expanding voter accessibility through transparent election auditing.",
# #     [{"issue": "Elections", "stance": "Promotes same-day registration and independent post-election auditing."},
# #      {"issue": "Business", "stance": "Aims to streamline online licensing for Hoosier small business owners."}]
# #   ),
# #   (
# #     "state", "Indiana Secretary of State", "", "Hamilton", "Max Engling", "Republican", "on_ballot", 0, 0,
# #     "https://maxengling.com", ["Voter ID", "Cybersecurity", "Corporate Compliance"],
# #     "Emphasizes strict voter identification enforcement, paper-trail ballot verification, and fraud prevention.",
# #     [{"issue": "Elections", "stance": "Advocates for strict voter ID laws and cleaning up county voter rolls."},
# #      {"issue": "Security", "stance": "Prioritizes cybersecurity defense for county voting machines across IN."}]
# #   ),
# #   (
# #     "state", "Indiana Secretary of State", "", "Hamilton", "Lauri Shillings", "Libertarian", "on_ballot", 0, 0,
# #     "https://lpin.org", ["Ballot Access", "Deregulation", "Transparency"],
# #     "Advocates for ending single-party election commission control and lowering ballot access hurdles for third parties.",
# #     [{"issue": "Elections", "stance": "Supports ranked-choice voting and open access for third-party candidates."},
# #      {"issue": "Government", "stance": "Pushes for complete openness in public record availability."}]
# #   ),
# #   (
# #     "state", "Indiana State Comptroller", "", "Hamilton", "Elise Nieshalla", "Republican", "on_ballot", 1, 0,
# #     "https://in.gov/comptroller", ["Fiscal Auditing", "State Budget", "Transparency"],
# #     "Appointed State Comptroller overseeing state accounting, financial transparency portals, and local tax distributions.",
# #     [{"issue": "Finance", "stance": "Promotes online expenditure portals for taxpayer oversight."},
# #      {"issue": "Fiscal Responsibility", "stance": "Prioritizes maintaining Indiana's AAA credit rating."}]
# #   ),
# #   (
# #     "county", "Hamilton County Commissioner (District 1)", "1", "Hamilton", "Christine Altman", "Republican", "on_ballot", 1, 0,
# #     "https://hamiltoncounty.in.gov", ["Infrastructure", "Transportation", "County Parks"],
# #     "Long-serving Hamilton County Commissioner focusing on regional infrastructure improvements, road widening, and drainage control.",
# #     [{"issue": "Infrastructure", "stance": "Leads major road expansion projects connecting Fishers, Carmel, and Noblesville."},
# #      {"issue": "Parks", "stance": "Expands county park trails and greenways."}]
# #   ),
# #   (
# #     "county", "Hamilton County Council (At-Large)", "", "Hamilton", "Stephanie Gilliard", "Democratic", "on_ballot", 0, 0,
# #     "https://hamiltoncountydems.org", ["Mental Health", "Public Transit", "Budget Oversight"],
# #     "Community leader focused on funding county crisis response teams and promoting affordable housing initiatives.",
# #     [{"issue": "Mental Health", "stance": "Advocates dedicated funding for county co-responder crisis units."},
# #      {"issue": "Housing", "stance": "Supports tax incentives for workforce housing development."}]
# #   ),
# #   (
# #     "municipal", "Mayor of Fishers", "", "Hamilton", "Scott Fadness", "Republican", "on_ballot", 1, 0,
# #     "https://fishers.in.us", ["Economic Dev", "Public Safety", "Smart Cities"],
# #     "First Mayor of the City of Fishers. Has spearheaded the redevelopment of the Nickel Plate District and life-science tech hubs.",
# #     [{"issue": "Economy", "stance": "Drives biotech and life-science corporate attraction to Fishers."},
# #      {"issue": "Public Safety", "stance": "Pioneers integrated mental health initiatives within city police & fire."}]
# #   ),
# #   (
# #     "municipal", "Fishers City Council (At-Large)", "", "Hamilton", "Jocelyn Vare", "Democratic", "on_ballot", 1, 0,
# #     "https://jocelynvareforfishers.com", ["Transparency", "Parks & Rec", "Fiscal Responsibility"],
# #     "First Democrat elected city-wide in Fishers. Champions fiscal transparency, public engagement, and environmental stewardship.",
# #     [{"issue": "Transparency", "stance": "Pushes for open public commentary periods during city council budgeting."},
# #      {"issue": "Environment", "stance": "Promotes urban canopy retention and green building standards."}]
# #   )
# # ]

# # def run_seed(con):
# #     src = source(con, "Hamilton County IN 2026 Directory", "https://www.larryinfishers.com", "Local sample candidates for election directory.")
# #     ev = election(con, "IN", "2026-11-03", "general"); new = 0
# #     for lvl, off, dist, county, name, party, status, inc, unofficial, website, tags, bio, key_positions in SEED:
# #         oid = office(con, lvl, off, "IN", county if lvl == "county" else "", district=dist)
# #         new += upsert(con, src, f"{off}|{dist}|{name}", oid, name, ev, party=party, status=status,
# #                       incumbent=inc, website=website, unofficial=unofficial, tags=tags, bio=bio, keyPositions=key_positions)
# #     con.commit()
# #     return len(SEED), new

# # # ---- HTTP Server for Web App -----------------------------------------------
# # import argparse, json, sys, http.server
# # from datetime import datetime

# # class CandidateHandler(http.server.SimpleHTTPRequestHandler):
# #     def do_GET(self):
# #         if self.path.split("?")[0] == "/api/candidates":
# #             con = connect()
# #             try:
# #                 cur = con.execute("SELECT * FROM v_candidates")
# #                 cols = [c[0] for c in cur.description]
# #                 rows = []
# #                 for r in cur.fetchall():
# #                     d = dict(zip(cols, r))
# #                     # Safely parse JSON fields stored in SQLite back into native structures
# #                     d["tags"] = json.loads(d.get("tags") or "[]")
# #                     d["keyPositions"] = json.loads(d.get("key_positions") or d.get("keyPositions") or "[]")
# #                     d["incumbent"] = bool(d.get("incumbent", 0))
# #                     rows.append(d)
                
# #                 body = json.dumps(rows).encode("utf-8")
# #                 self.send_response(200)
# #                 self.send_header("Content-Type", "application/json")
# #                 self.send_header("Access-Control-Allow-Origin", "*")
# #                 self.send_header("Content-Length", str(len(body)))
# #                 self.end_headers()  # Fixed hyphen syntax error
# #                 self.wfile.write(body)
# #             finally:
# #                 con.close()  # Prevent connection leaks
# #         else:
# #             super().do_GET()

# # def run_server(port=8000, db_path=None):
# #     server_address = ("", port)
# #     httpd = http.server.HTTPServer(server_address, CandidateHandler)
# #     print(f"Serving candidate API at http://localhost:{port}/api/candidates")
# #     print("Open index.html in your browser or serve directory with Python.")
# #     try:
# #         httpd.serve_forever()
# #     except KeyboardInterrupt:
# #         pass

# # def main(argv=None):
# #     ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
# #     ap.add_argument("--db", default=None)
# #     sub = ap.add_subparsers(dest="cmd", required=True)
# #     sub.add_parser("init"); sub.add_parser("seed"); sub.add_parser("stats"); sub.add_parser("serve")
    
# #     a = ap.parse_args(argv)
    
# #     if a.cmd == "init":
# #         con = connect(a.db)
# #         print(f"ready: {a.db or DB}")
# #         con.close()
# #         return 0
# #     if a.cmd == "seed": 
# #         con = connect(a.db)
# #         seen, new = run_seed(con)
# #         print(f"Seeded {seen} candidates successfully.")
# #         con.close()
# #         return 0
# #     if a.cmd == "serve":
# #         run_server(db_path=a.db)
# #         return 0
# #     if a.cmd == "stats":
# #         con = connect(a.db)
# #         for row in con.execute("SELECT source, level, state, COUNT(*) FROM v_candidates GROUP BY 1,2,3 ORDER BY 1,2,3"):
# #             print(*row)
# #         con.close()
# #         return 0
# #     return 0

# # if __name__ == "__main__":
# #     sys.exit(main())
