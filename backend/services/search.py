"""
Natural Language Search Service — 7-step pipeline.

Step 1: Groq LLM call for structured extraction
Step 2: JSON parse (try/except)
Step 2b: Rule-based fallback if LLM fails
Step 3: Validate extracted fields against DB
Step 4: Hard filters vs soft preferences
Step 5: SQL query
Step 6: Deterministic ranking
Step 7: Response assembly
"""

import json
import os
import re
from datetime import datetime, date, timedelta
from typing import Optional

from sqlmodel import Session, text

# ── Time windows ───────────────────────────────────────

TIME_WINDOWS = {
    "morning":   (5, 12),
    "afternoon": (12, 17),
    "evening":   (17, 21),
    "night":     (21, 5),  # wraps around midnight
}

CITY_SYNONYMS = {
    "bagaluru": "Bangalore",
    "bengaluru": "Bangalore",
}


def format_sql_datetime(value: datetime) -> str:
    return value.strftime("%Y-%m-%d %H:%M:%S")


def normalize_city_name(value: str) -> str:
    if not value:
        return None
    normalized = value.strip().lower()
    if normalized in CITY_SYNONYMS:
        return CITY_SYNONYMS[normalized]
    return value.strip().title()

# ── Groq config ───────────────────────────────────────

GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
GROQ_MODEL = "llama-3.3-70b-versatile"
GROQ_URL = "https://api.groq.com/openai/v1/chat/completions"

SYSTEM_PROMPT = """You are a bus search query parser. Given a user's natural language query about bus travel, extract the following fields into valid JSON. Return ONLY the JSON object, no explanation text.

Schema:
{"origin": null, "destination": null, "date": null, "time_window": null, "bus_type": null}

Rules:
- "origin": the departure city name, or null if not mentioned
- "destination": the arrival city name, or null if not mentioned
- "date": in YYYY-MM-DD format, or null if not mentioned. For "today" use the current date, for "tomorrow" use tomorrow's date.
- "time_window": one of "morning" (5am-12pm), "afternoon" (12pm-5pm), "evening" (5pm-9pm), "night" (9pm-5am), or null
- "bus_type": one of "AC", "Non-AC", "Sleeper", or null

Return ONLY the JSON object."""


# ── Step 1: Groq API call ─────────────────────────────

def call_groq(query: str) -> Optional[dict]:
    """Call Groq LLM for structured extraction. Returns parsed dict or None."""
    if not GROQ_API_KEY:
        return None

    try:
        import httpx

        today_str = date.today().isoformat()
        tomorrow_str = (date.today() + timedelta(days=1)).isoformat()

        response = httpx.post(
            GROQ_URL,
            headers={
                "Authorization": f"Bearer {GROQ_API_KEY}",
                "Content-Type": "application/json",
            },
            json={
                "model": GROQ_MODEL,
                "messages": [
                    {"role": "system", "content": SYSTEM_PROMPT + f"\nToday's date is {today_str}. Tomorrow is {tomorrow_str}."},
                    {"role": "user", "content": query},
                ],
                "temperature": 0,
                "max_tokens": 200,
            },
            timeout=10.0,
        )
        response.raise_for_status()
        content = response.json()["choices"][0]["message"]["content"].strip()

        # Try to extract JSON from the response (sometimes wrapped in code fences)
        json_match = re.search(r'\{.*\}', content, re.DOTALL)
        if json_match:
            return json.loads(json_match.group())
        return json.loads(content)

    except Exception:
        return None


# ── Step 2b: Rule-based fallback ──────────────────────

def fallback_extract(query: str, known_cities: list[str]) -> dict:
    """
    Rule-based extraction when LLM is unavailable or fails.
    Uses regex patterns and keyword matching.
    """
    q = query.lower().strip()
    normalized = q
    for alias, canonical in CITY_SYNONYMS.items():
        normalized = normalized.replace(alias, canonical.lower())

    result = {"origin": None, "destination": None, "date": None, "time_window": None, "bus_type": None}

    # -- Origin / Destination --
    # Find all known cities mentioned in the query as whole words
    city_positions = []
    for city in known_cities:
        for match in re.finditer(rf'\b{re.escape(city.lower())}\b', normalized):
            city_positions.append((match.start(), city))
            
    # Sort by their position in the string (first city mentioned is likely origin, second is destination)
    city_positions.sort()
    
    if len(city_positions) >= 2:
        result["origin"] = city_positions[0][1]
        result["destination"] = city_positions[1][1]
    elif len(city_positions) == 1:
        idx, city = city_positions[0]
        from_idx = q.find('from')
        to_idx = q.find('to')
        
        if from_idx != -1 and from_idx < idx and (to_idx == -1 or to_idx > idx):
            result["origin"] = city
        elif to_idx != -1 and to_idx < idx and (from_idx == -1 or from_idx > idx):
            result["destination"] = city
        else:
            result["origin"] = city

    # -- Date --
    today = date.today()
    if "today" in q:
        result["date"] = today.isoformat()
    elif "tomorrow" in q:
        result["date"] = (today + timedelta(days=1)).isoformat()
    elif "day after tomorrow" in q:
        result["date"] = (today + timedelta(days=2)).isoformat()
    else:
        # Try to find a date pattern like YYYY-MM-DD or DD/MM/YYYY
        date_match = re.search(r'(\d{4}-\d{2}-\d{2})', q)
        if date_match:
            result["date"] = date_match.group(1)
        else:
            date_match2 = re.search(r'(\d{1,2})[/-](\d{1,2})[/-](\d{4})', q)
            if date_match2:
                try:
                    d = date(int(date_match2.group(3)), int(date_match2.group(2)), int(date_match2.group(1)))
                    result["date"] = d.isoformat()
                except ValueError:
                    pass

    # -- Bus type --
    if "sleeper" in q:
        result["bus_type"] = "Sleeper"
    elif "non-ac" in q or "non ac" in q:
        result["bus_type"] = "Non-AC"
    elif "ac" in q:
        result["bus_type"] = "AC"

    # -- Time window --
    for tw in ["morning", "afternoon", "evening", "night"]:
        if tw in q:
            result["time_window"] = tw
            break

    return result


# ── Step 3: Validate against DB ───────────────────────

def get_known_cities(db: Session) -> list[str]:
    """Get distinct city names from the buses table."""
    rows = db.exec(
        text("SELECT DISTINCT origin FROM buses UNION SELECT DISTINCT destination FROM buses")
    ).all()
    return [r[0] for r in rows]


def validate_fields(extracted: dict, known_cities: list[str]) -> tuple[dict, Optional[str]]:
    """
    Validate extracted fields against real data.
    Returns (validated_dict, note_or_none).
    """
    note = None

    # Normalize alias city names first
    if extracted.get("origin"):
        extracted["origin"] = normalize_city_name(extracted["origin"])
    if extracted.get("destination"):
        extracted["destination"] = normalize_city_name(extracted["destination"])

    # Validate origin
    if extracted.get("origin"):
        matched = None
        for city in known_cities:
            if city.lower() == extracted["origin"].lower():
                matched = city
                break
        extracted["origin"] = matched

    # Validate destination
    if extracted.get("destination"):
        matched = None
        for city in known_cities:
            if city.lower() == extracted["destination"].lower():
                matched = city
                break
        extracted["destination"] = matched

    # Validate date
    if extracted.get("date"):
        try:
            parsed_date = date.fromisoformat(extracted["date"])
            if parsed_date < date.today():
                extracted["date"] = date.today().isoformat()
                note = "Requested date has passed; showing results for today instead."
        except (ValueError, TypeError):
            extracted["date"] = None

    # Validate bus_type
    valid_types = {"AC", "Non-AC", "Sleeper"}
    if extracted.get("bus_type") and extracted["bus_type"] not in valid_types:
        extracted["bus_type"] = None

    # Validate time_window
    valid_windows = {"morning", "afternoon", "evening", "night"}
    if extracted.get("time_window") and extracted["time_window"] not in valid_windows:
        extracted["time_window"] = None

    return extracted, note


# ── Step 5: SQL query ─────────────────────────────────

def query_buses(db: Session, origin: str, destination: str, search_date: str) -> list[dict]:
    """Execute the hard-filter SQL query."""
    now = format_sql_datetime(datetime.utcnow())

    rows = db.exec(
        text(
            "SELECT id, origin, destination, departure_time, bus_type, "
            "total_seats, available_seats, price, status "
            "FROM buses "
            "WHERE LOWER(origin) = LOWER(:origin) "
            "AND LOWER(destination) = LOWER(:destination) "
            "AND date(departure_time) = :search_date "
            "AND available_seats > 0 "
            "AND departure_time > :now "
            "AND LOWER(status) = 'active'"
        ),
        params={"origin": origin, "destination": destination, "search_date": search_date, "now": now},
    ).all()

    return [
        {
            "id": r[0], "origin": r[1], "destination": r[2],
            "departure_time": r[3], "bus_type": r[4],
            "total_seats": r[5], "available_seats": r[6],
            "price": r[7], "status": r[8],
        }
        for r in rows
    ]


# ── Step 6: Ranking ───────────────────────────────────

def rank_buses(buses: list[dict], bus_type_pref: Optional[str], time_window_pref: Optional[str]) -> list[dict]:
    """Deterministic scoring per spec."""
    if not buses:
        return []

    prices = [b["price"] for b in buses]
    min_price = min(prices)
    max_price = max(prices)
    price_range = max_price - min_price if max_price != min_price else 1

    for bus in buses:
        score = 0.0

        # Bus type match (+3)
        if bus_type_pref and bus["bus_type"] == bus_type_pref:
            score += 3

        # Time window match (+2)
        if time_window_pref:
            dep = bus["departure_time"]
            if isinstance(dep, str):
                dep = datetime.fromisoformat(dep)
            hour = dep.hour if isinstance(dep, datetime) else 0

            window = TIME_WINDOWS.get(time_window_pref)
            if window:
                start_h, end_h = window
                if time_window_pref == "night":
                    in_window = hour >= start_h or hour < end_h
                else:
                    in_window = start_h <= hour < end_h
                if in_window:
                    score += 2

        # Seat buffer (+1 if >5 seats free)
        if bus["available_seats"] > 5:
            score += 1

        # Price scoring (+1 cheapest, 0-1 scaled for others)
        if bus["price"] == min_price:
            score += 1
        else:
            score += round(1 - (bus["price"] - min_price) / price_range, 2)

        bus["score"] = round(score, 2)

    # Sort: score descending, then price ascending for ties
    buses.sort(key=lambda b: (-b["score"], b["price"]))
    return buses


# ── Main search function ─────────────────────────────

def search_buses(query: str, db: Session) -> dict:
    """
    Full NL search pipeline (Steps 1-7).
    Returns {"results": [...], "understood": {...}, "note": ...}
    """
    known_cities = get_known_cities(db)

    # Step 1 & 2: Try Groq LLM
    extracted = call_groq(query)

    # Step 2b: Fallback if LLM failed
    if extracted is None:
        extracted = fallback_extract(query, known_cities)

    # Step 3: Validate
    extracted, note = validate_fields(extracted, known_cities)

    # Step 4: Check hard requirements
    if not extracted.get("origin") or not extracted.get("destination"):
        return {
            "results": [],
            "understood": extracted,
            "note": "Could not determine both origin and destination. Please specify 'from [city] to [city]' or use the structured search form.",
            "error": True,
        }

    # Default date if missing
    if not extracted.get("date"):
        # Find earliest date with available buses on this route
        now = format_sql_datetime(datetime.utcnow())
        row = db.exec(
            text(
                "SELECT date(departure_time) FROM buses "
                "WHERE LOWER(origin) = LOWER(:origin) "
                "AND LOWER(destination) = LOWER(:destination) "
                "AND available_seats > 0 AND departure_time > :now "
                "AND LOWER(status) = 'active' "
                "ORDER BY departure_time ASC LIMIT 1"
            ),
            params={"origin": extracted["origin"], "destination": extracted["destination"], "now": now},
        ).first()
        if row:
            extracted["date"] = row[0]
            if not note:
                note = f"No date specified; showing results for {extracted['date']}."
        else:
            extracted["date"] = date.today().isoformat()
            if not note:
                note = "No date specified; showing results for today."

    # Step 5: Query
    buses = query_buses(db, extracted["origin"], extracted["destination"], extracted["date"])

    # Step 6: Rank
    ranked = rank_buses(buses, extracted.get("bus_type"), extracted.get("time_window"))

    # Step 7: Return
    return {
        "results": ranked,
        "understood": {
            "origin": extracted.get("origin"),
            "destination": extracted.get("destination"),
            "date": extracted.get("date"),
            "bus_type": extracted.get("bus_type"),
            "time_window": extracted.get("time_window"),
        },
        "note": note,
    }
