from __future__ import annotations

from datetime import date
from typing import Literal

from pydantic import BaseModel, Field, computed_field


ModeType = Literal["Regular", "Fixed", "Elite"]


class StakingRecord(BaseModel):
    username: str = Field(min_length=1)
    staking_id: str = Field(min_length=1)
    mode: ModeType
    volume: int = Field(ge=0)
    staking_date: date
    maturity_date: date
    roi: float | str | None = None
    staking_years: int | None = None
    maturity: int | None = None
    maturity_reward: int | None = None
    roi_rewards: int | None = None

    @computed_field
    @property
    def maturity_display(self) -> int | None:
        return self.maturity


class ProcessResponse(BaseModel):
    records: list[StakingRecord]
    skipped_rows: int
    duplicate_count: int
    source_files: list[str]


class ExportRequest(BaseModel):
    records: list[StakingRecord]


class SummaryResponse(BaseModel):
    total_volume: int
    regular_count: int
    fixed_count: int
    total_rewards_sum: int
