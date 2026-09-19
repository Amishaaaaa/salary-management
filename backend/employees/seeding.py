"""Deterministic synthetic data. Same (count, seed) always yields the same workforce."""
import random
from datetime import date, timedelta

from . import constants
from .models import Employee, SalaryRecord

REFERENCE_DATE = date(2026, 1, 1)  # fixed so tenure (and therefore output) never depends on today

FIRST_NAMES = ["Aisha", "Liam", "Sofia", "Noah", "Priya", "Mateo", "Chen", "Emma", "Omar", "Yuki",
               "Lucas", "Fatima", "Arjun", "Hannah", "Diego", "Mei", "Oliver", "Zara", "Ethan", "Nina"]
LAST_NAMES = ["Smith", "Patel", "Garcia", "Kim", "Nguyen", "Muller", "Silva", "Tanaka", "Brown", "Khan",
              "Rossi", "Singh", "Lopez", "Wong", "Dubois", "Cohen", "Ivanov", "Okafor", "Jones", "Sato"]

JOB_TITLES = {
    "Engineering": ["Software Engineer", "Data Engineer", "QA Engineer", "DevOps Engineer"],
    "Sales": ["Account Executive", "Sales Development Rep"],
    "Marketing": ["Marketing Specialist", "Content Strategist"],
    "Finance": ["Financial Analyst", "Accountant"],
    "HR": ["HR Business Partner", "Recruiter"],
    "Operations": ["Operations Analyst", "Logistics Coordinator"],
    "Support": ["Support Specialist", "Customer Success Manager"],
    "Legal": ["Legal Counsel", "Compliance Analyst"],
}

LEVEL_BASE_USD = {"L1": 55_000, "L2": 75_000, "L3": 100_000, "L4": 130_000, "L5": 170_000, "L6": 220_000}
LEVEL_WEIGHTS = [25, 30, 22, 13, 7, 3]
DEPT_FACTOR = {"Engineering": 1.15, "Sales": 1.0, "Marketing": 0.95, "Finance": 1.0,
               "HR": 0.9, "Operations": 0.88, "Support": 0.8, "Legal": 1.1}
COUNTRY_FACTOR = {"US": 1.0, "GB": 0.85, "DE": 0.85, "FR": 0.8, "IN": 0.28,
                  "CA": 0.9, "AU": 0.9, "SG": 0.9, "BR": 0.35, "JP": 0.75}
COUNTRY_WEIGHTS = {"US": 30, "GB": 10, "DE": 9, "FR": 6, "IN": 20, "CA": 6, "AU": 5, "SG": 4, "BR": 6, "JP": 4}
GENDER_WEIGHTS = {"F": 46, "M": 51, "X": 3}

FEMALE_PAY_FACTOR = 0.97  # deliberate small gap so the gender-gap insight has something to show
OUTLIER_RATE = 0.01
RAISE_STEP = 0.05


def _round_to(value: float, step: int = 100) -> int:
    return max(step, int(round(value / step)) * step)


def generate(count: int, seed: int = 42):
    """Return (employees, salary_records) as unsaved objects with explicit ids 1..count."""
    rng = random.Random(seed)
    employees, records = [], []
    countries = list(COUNTRY_WEIGHTS)
    genders = list(GENDER_WEIGHTS)

    for i in range(1, count + 1):
        country = rng.choices(countries, weights=list(COUNTRY_WEIGHTS.values()))[0]
        gender = rng.choices(genders, weights=list(GENDER_WEIGHTS.values()))[0]
        department = rng.choice(constants.DEPARTMENTS)
        level = rng.choices(constants.LEVELS, weights=LEVEL_WEIGHTS)[0]
        hire_date = REFERENCE_DATE - timedelta(days=rng.randint(30, 365 * 15))

        usd = LEVEL_BASE_USD[level] * DEPT_FACTOR[department] * COUNTRY_FACTOR[country]
        usd *= max(0.7, rng.gauss(1.0, 0.07))
        if gender == "F":
            usd *= FEMALE_PAY_FACTOR
        if rng.random() < OUTLIER_RATE:
            usd *= rng.choice([0.6, 1.6])
        currency = constants.COUNTRY_CURRENCY[country]
        salary = _round_to(usd / constants.USD_PER_UNIT[currency])

        first, last = rng.choice(FIRST_NAMES), rng.choice(LAST_NAMES)
        emp = Employee(
            id=i,
            first_name=first,
            last_name=last,
            email=f"{first}.{last}.{i}@acme.test".lower(),
            job_title=rng.choice(JOB_TITLES[department]),
            department=department,
            level=level,
            gender=gender,
            country=country,
            hire_date=hire_date,
            salary=salary,
        )
        emp.derive_fields()
        employees.append(emp)
        records.extend(_history(emp))
    return employees, records


def _history(emp: Employee):
    """Up to 3 records ending at the current salary: hire salary, then raises."""
    tenure_years = (REFERENCE_DATE - emp.hire_date).days // 365
    n = min(3, 1 + tenure_years // 2)
    span = (REFERENCE_DATE - emp.hire_date).days
    out = []
    for step in range(n):  # step 0 is the most recent
        amount = _round_to(emp.salary / (1 + RAISE_STEP) ** step)
        when = emp.hire_date if step == n - 1 else REFERENCE_DATE - timedelta(days=span * step // n)
        reason = "Hire" if step == n - 1 else "Annual raise"
        out.append(SalaryRecord(employee_id=emp.id, amount=amount, currency=emp.currency,
                                effective_date=when, reason=reason))
    return out
