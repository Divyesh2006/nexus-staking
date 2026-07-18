from __future__ import annotations

import re
from dataclasses import dataclass
from datetime import date

from app.models.schemas import StakingRecord
from app.utils.date_utils import calculate_staking_years, parse_date_text

MODE_PATTERN = re.compile(r"\b(Regular|Fixed|Elite)\b", re.IGNORECASE)
STAKING_ID_PATTERN = re.compile(r"STK\d{5,}", re.IGNORECASE)
DATE_PATTERN = re.compile(r"\b\d{1,2}[/-]\d{1,2}[/-]\d{4}\b")
VOLUME_PATTERN = re.compile(r"\b\d{3,}\b")
USERNAME_PATTERN = re.compile(r"\b[A-Z][A-Z0-9_]{3,}\b")
NOISE_LINES = {
    "BRAVE",
    "FILE",
    "VIEW",
    "HISTORY",
    "BOOKMARKS",
    "PROFILES",
    "TAB",
    "WINDOW",
    "HELP",
    "OTHER BOOKMARKS",
    "ALL BOOKMARKS",
    "NEXUS",
    "ACTIVE",
    "DASHBOARD",
    "STAKINGS",
    "MYTEAM",
    "ACCOUNTS",
    "WITHDRAWAL",
    "CLUBS",
    "INFORMATIONS",
    "MY STAKING(S)",
    "ALL",
    "STAKINGID",
    "DATE",
    "PAYMENT METHOD",
    "VOLUME",
    "MODE",
    "MATURITY/EXPIRY",
    "ACTION",
    "APPROVED DATE",
    "DETAILS",
    "PDF",
    "ZOOM",
}


@dataclass
class ParseResult:
    records: list[StakingRecord]
    invalid_rows: int
    duplicate_rows: int


class RecordParser:
    def parse(self, ocr_text: str) -> tuple[list[StakingRecord], int, int]:
        cleaned_lines = [self._clean_line(line) for line in ocr_text.splitlines()]
        cleaned_lines = [line for line in cleaned_lines if line]

        records: list[StakingRecord] = []
        invalid_rows = 0
        duplicate_rows = 0
        seen_ids: set[str] = set()
        global_username = self._extract_global_username(cleaned_lines)

        staking_indices = [index for index, line in enumerate(cleaned_lines) if STAKING_ID_PATTERN.search(line)]
        if not staking_indices:
            return records, invalid_rows, duplicate_rows

        for position, start_index in enumerate(staking_indices):
            end_index = staking_indices[position + 1] if position + 1 < len(staking_indices) else len(cleaned_lines)
            block_lines = cleaned_lines[start_index:end_index]
            record = self._parse_row(block_lines, global_username)
            if record is None:
                invalid_rows += 1
                continue

            if record.staking_id in seen_ids:
                duplicate_rows += 1
                continue

            seen_ids.add(record.staking_id)
            records.append(record)

        return records, invalid_rows, duplicate_rows

    def _parse_row(self, lines: list[str], username: str | None) -> StakingRecord | None:
        window = " ".join(lines)
        staking_id_match = STAKING_ID_PATTERN.search(window)
        if staking_id_match is None:
            return None

        staking_id = staking_id_match.group(0).upper()
        mode_match = MODE_PATTERN.search(window)
        if mode_match is None:
            return None
        mode = mode_match.group(1).capitalize()

        dates = DATE_PATTERN.findall(window)
        if len(dates) < 2:
            return None
        staking_date = parse_date_text(dates[0])
        maturity_date = parse_date_text(dates[1])
        if staking_date is None or maturity_date is None or maturity_date <= staking_date:
            return None

        volume = self._extract_volume(window, staking_id)
        if volume is None:
            return None

        parsed_username = username or self._extract_username(window, staking_id_match.start())
        if parsed_username is None:
            return None

        staking_years = calculate_staking_years(staking_date, maturity_date)

        # ROI and maturity calculations
        elite_table = {50000: 0.0475, 100000: 0.05, 200000: 0.0525, 500000: 0.055}
        roi: float | str | None = None
        maturity: int | None = None
        maturity_reward: int | None = None
        roi_rewards: int | None = None

        if mode == "Regular":
            roi = 0.03
            maturity = int(volume)
            maturity_reward = maturity - volume
            roi_rewards = int(volume * roi * 60)
        elif mode == "Fixed":
            roi = 0.0
            if staking_years == 3:
                maturity = int(volume * 2.5)
            elif staking_years == 5:
                maturity = int(volume * 4)
            else:
                maturity = int(volume * max(staking_years + 1, 1))
            maturity_reward = maturity - volume
            roi_rewards = 0
        else:  # Elite
            if volume in elite_table:
                roi = elite_table[volume]
                # monthly ROI applied over 60 months
                maturity = int(volume + (volume * roi * 60))
                maturity_reward = maturity - volume
                roi_rewards = int(volume * roi * 60)
            else:
                roi = "Invalid Elite Volume"
                maturity = None
                maturity_reward = None
                roi_rewards = None

        return StakingRecord(
            username=parsed_username,
            staking_id=staking_id,
            mode=mode,
            volume=volume,
            staking_date=staking_date,
            maturity_date=maturity_date,
            roi=roi,
            staking_years=staking_years,
            maturity=maturity,
            maturity_reward=maturity_reward,
            roi_rewards=roi_rewards,
        )

    def _extract_volume(self, text: str, staking_id: str) -> int | None:
        cleaned = re.sub(r"\b\d{1,2}[/-]\d{1,2}[/-]\d{4}\b", " ", text)
        cleaned = re.sub(re.escape(staking_id), " ", cleaned, flags=re.IGNORECASE)
        cleaned = re.sub(r"\b(Regular|Fixed)\b", " ", cleaned, flags=re.IGNORECASE)
        candidates = [int(match.group(0)) for match in VOLUME_PATTERN.finditer(cleaned)]
        if not candidates:
            return None
        usable = [value for value in candidates if value >= 100]
        if not usable:
            return None
        return max(usable)

    def _extract_username(self, text: str, staking_id_start: int) -> str | None:
        before_id = text[:staking_id_start]
        tokens = [token for token in re.split(r"\s+", before_id) if token]
        candidates: list[str] = []
        for token in tokens:
            cleaned = re.sub(r"[^A-Z0-9_]", "", token.upper())
            if len(cleaned) >= 4 and any(character.isalpha() for character in cleaned):
                if cleaned not in NOISE_LINES:
                    candidates.append(cleaned)
        if not candidates:
            pattern_matches = USERNAME_PATTERN.findall(text.upper())
            candidates.extend(pattern_matches)
        filtered = [value for value in candidates if not value.startswith("STK")]
        if not filtered:
            return None
        return max(filtered, key=len)

    def _extract_global_username(self, lines: list[str]) -> str | None:
        page_anchor_index = None
        for index, line in enumerate(lines):
            normalized = re.sub(r"[^A-Z0-9_ ]", "", line.upper()).strip()
            if normalized == "NEXUS":
                page_anchor_index = index
                break

        search_start = page_anchor_index + 1 if page_anchor_index is not None else 0
        search_end = len(lines)
        for index in range(search_start, len(lines)):
            normalized = re.sub(r"[^A-Z0-9_ ]", "", lines[index].upper()).strip()
            if normalized in {"ACTIVE", "DASHBOARD"}:
                search_end = index
                break

        candidates: list[str] = []
        for line in lines[search_start:search_end]:
            normalized = re.sub(r"[^A-Z0-9_ ]", "", line.upper()).strip()
            if not normalized or normalized in NOISE_LINES:
                continue
            if "STK" in normalized or any(pattern in normalized for pattern in ("HTTP", "WWW", "NEXUS.VIN", "APPROVED", "DETAILS", "HTTP")):
                continue
            compact = normalized.replace(" ", "")
            if len(compact) >= 6 and any(character.isalpha() for character in compact) and compact.isalnum():
                candidates.append(compact)

        if candidates:
            def candidate_score(value: str) -> tuple[int, int, int]:
                letters = sum(character.isalpha() for character in value)
                digits = sum(character.isdigit() for character in value)
                return (1 if digits == 0 else 0, letters, -digits)

            return max(candidates, key=candidate_score)

        for line in lines:
            normalized = re.sub(r"[^A-Z0-9_ ]", "", line.upper()).strip()
            if not normalized or normalized in NOISE_LINES:
                continue
            if "STK" in normalized or any(pattern in normalized for pattern in ("HTTP", "WWW", "NEXUS.VIN", "APPROVED", "DETAILS")):
                continue
            compact = normalized.replace(" ", "")
            if len(compact) >= 6 and any(character.isalpha() for character in compact) and compact.isalnum():
                return compact
        return None

    def _calculate_total_rewards(self, volume: int, years: int) -> int:
        if years == 5:
            return int(volume * 5)
        if years == 3:
            return int(volume * 3.5)
        return int(volume * (1 + years))

    def _clean_line(self, line: str) -> str:
        line = re.sub(r"\s+", " ", line.strip())
        return line
