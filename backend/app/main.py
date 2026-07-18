from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from fastapi import FastAPI, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse

from app.core.config import get_settings
from app.models.schemas import ExportRequest, ProcessResponse, SummaryResponse, StakingRecord
from app.services.excel import build_excel_workbook
from app.services.ocr import OCRService
from app.services.parser import RecordParser

settings = get_settings()
app = FastAPI(title=settings.app_name)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

ocr_service = OCRService()
record_parser = RecordParser()


@app.on_event("startup")
def _log_startup_settings() -> None:
    # Log resolved CORS origins so deploy logs show what the app is using.
    try:
        import logging

        logging.info("Resolved CORS_ORIGINS: %s", settings.cors_origins)
    except Exception:
        pass


@app.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/api/process", response_model=ProcessResponse)
async def process_screenshots(files: list[UploadFile] = File(...)) -> ProcessResponse:
    all_records: list[StakingRecord] = []
    seen_ids: set[str] = set()
    skipped_rows = 0
    duplicate_count = 0
    source_files: list[str] = []

    for file in files:
        source_files.append(file.filename or "uploaded-image")
        payload = await file.read()
        ocr_text = ocr_service.extract_text(payload)
        parsed_records, invalid_rows, duplicate_rows = record_parser.parse(ocr_text)
        skipped_rows += invalid_rows
        duplicate_count += duplicate_rows
        for record in parsed_records:
            if record.staking_id in seen_ids:
                duplicate_count += 1
                continue
            seen_ids.add(record.staking_id)
            all_records.append(record)

    all_records.sort(key=lambda item: (item.staking_date, item.username, item.staking_id))
    return ProcessResponse(records=all_records, skipped_rows=skipped_rows, duplicate_count=duplicate_count, source_files=source_files)


@app.post("/api/export", response_model=None)
def export_excel(payload: ExportRequest):
    if not payload.records:
        return JSONResponse(status_code=400, content={"detail": "No valid staking records to export."})

    workbook_path = build_excel_workbook(payload.records, settings.generated_dir)
    return FileResponse(
        path=workbook_path,
        filename=Path(workbook_path).name,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    )


@app.get("/api/summary", response_model=SummaryResponse)
def summary() -> SummaryResponse:
    return SummaryResponse(total_volume=0, regular_count=0, fixed_count=0, total_rewards_sum=0)
