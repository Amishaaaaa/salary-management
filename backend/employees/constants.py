"""Reference data. FX rates are static and documented so reports are deterministic."""

COUNTRY_CURRENCY = {
    "US": "USD",
    "GB": "GBP",
    "DE": "EUR",
    "FR": "EUR",
    "IN": "INR",
    "CA": "CAD",
    "AU": "AUD",
    "SG": "SGD",
    "BR": "BRL",
    "JP": "JPY",
}

# Units of USD per 1 unit of local currency (static, rounded, as of 2026-01).
USD_PER_UNIT = {
    "USD": 1.0,
    "GBP": 1.27,
    "EUR": 1.08,
    "INR": 0.012,
    "CAD": 0.74,
    "AUD": 0.66,
    "SGD": 0.74,
    "BRL": 0.19,
    "JPY": 0.0067,
}

DEPARTMENTS = ["Engineering", "Sales", "Marketing", "Finance", "HR", "Operations", "Support", "Legal"]
LEVELS = ["L1", "L2", "L3", "L4", "L5", "L6"]
GENDERS = ["F", "M", "X"]


def to_usd(amount: int, currency: str) -> int:
    """Convert a whole-unit annual salary to whole USD using the static rates."""
    return round(amount * USD_PER_UNIT[currency])
