#py using api.data.gov to get candidate data and store in sqlite database

import os
import sqlite3
import requests
import json

# Setup API Key (Get a free key at https://api.data.gov/signup/)
API_KEY = os.environ.get("FEC_API_KEY", "DEMO_KEY")
BASE_URL = "https://api.open.fec.gov/v1"

# Initialize SQLite Database
def init_db(db_name="candidates.db"):
    conn = sqlite3.connect(db_name)
    cursor = conn.cursor()
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS federal_candidates (
            candidate_id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            party TEXT,
            office TEXT,
            state TEXT,
            district TEXT,
            incumbent_challenge_full TEXT,
            candidate_status TEXT,
            election_year INTEGER
        )
    """)
    conn.commit()
    conn.close()

# Fetch candidates from OpenFEC API
def fetch_and_store_candidates(state, district=None, year=2026):
    init_db()

    endpoint = f"{BASE_URL}/candidates/"
    params = {
        "api_key": API_KEY,
        "state": state.upper(),
        "election_year": year,
        "per_page": 100,
        "page": 1
    }
    if district:
        params["district"] = str(district).zfill(2)

    print(f"Fetching federal candidates for {state.upper()}" + (f" District {district}" if district else "") + f" ({year})...")

    response = requests.get(endpoint, params=params)
    if response.status_code != 200:
        print(f"Error fetching data: {response.status_code} - {response.text}")
        return

    data = response.json()
    candidates = data.get("results", [])

    conn = sqlite3.connect("candidates.db")
    cursor = conn.cursor()

    count = 0
    for c in candidates:
        cursor.execute("""
            INSERT OR REPLACE INTO federal_candidates (
                candidate_id, name, party, office, state, district,
                incumbent_challenge_full, candidate_status, election_year
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            c.get("candidate_id"),
            c.get("name"),
            c.get("party_full") or c.get("party"),
            c.get("office_full") or c.get("office"),
            c.get("state"),
            c.get("district"),
            c.get("incumbent_challenge_full"),
            c.get("candidate_status"),
            year
        ))
        count += 1

    conn.commit()
    conn.close()
    print(f"Successfully saved {count} candidate records into candidates.db.")

if __name__ == "__main__":
    # Example: Fetch federal candidates for Indiana's 5th Congressional District (Hamilton County area)
    fetch_and_store_candidates(state="IN", district="05", year=2026)