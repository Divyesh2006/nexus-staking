from __future__ import annotations

from datetime import date


def calculate_staking_years(staking_date: date, maturity_date: date) -> int:
    years = maturity_date.year - staking_date.year
    if (maturity_date.month, maturity_date.day) < (staking_date.month, staking_date.day):
        years -= 1
    return max(years, 0)


def parse_date_text(value: str) -> date | None:
    for separator in ("/", "-"):
        parts = value.split(separator)
        if len(parts) == 3:
            try:
                month = int(parts[0])
                day = int(parts[1])
                year = int(parts[2])
                return date(year, month, day)
            except ValueError:
                return None
    return None
