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

# Configure CORS middleware carefully:
# - If the configured origins include '*' or are empty, allow all origins (no credentials).
# - Otherwise, use the explicit list and allow credentials.
cors_origins = settings.cors_origins or []
allow_all = False
if any(origin == "*" for origin in cors_origins):
    allow_all = True
if not cors_origins:
    # No origins configured: default to allowing only localhost for safety
    cors_origins = ["http://localhost:5173", "http://127.0.0.1:5173","https://nexus-staking.vercel.app"]

if allow_all:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=False,
        allow_methods=["*"],
        allow_headers=["*"],
    )
else:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

# Log chosen CORS configuration on startup for debugging
def _log_cors_config() -> None:
    try:
        import logging

        logging.info("CORS configured. allow_all=%s, origins=%s", allow_all, cors_origins)
    except Exception:
        pass


# Explicit HTTP middleware to ensure CORS headers are present on all responses
from starlette.requests import Request
from starlette.responses import Response


@app.middleware("http")
async def ensure_cors_headers(request: Request, call_next):
    origin = request.headers.get("origin")
    allowed_origin = None
    if allow_all:
        allowed_origin = "*"
    elif origin and origin in cors_origins:
        allowed_origin = origin

    # Handle preflight
    if request.method == "OPTIONS":
        headers = {}
        if allowed_origin:
            headers["Access-Control-Allow-Origin"] = allowed_origin
        headers["Access-Control-Allow-Methods"] = "POST, GET, OPTIONS, PUT, DELETE, PATCH"
        request_headers = request.headers.get("access-control-request-headers")
        headers["Access-Control-Allow-Headers"] = request_headers or "*"
        headers["Access-Control-Max-Age"] = "86400"
        if not allow_all:
            headers["Access-Control-Allow-Credentials"] = "true"
        return Response(status_code=200, headers=headers)

    response = await call_next(request)
    if allowed_origin:
        response.headers["Access-Control-Allow-Origin"] = allowed_origin
    if not allow_all:
        response.headers["Access-Control-Allow-Credentials"] = "true"
    return response

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
    import logging, traceback
    all_records: list[StakingRecord] = []
    seen_ids: set[str] = set()
    skipped_rows = 0
    duplicate_count = 0
    source_files: list[str] = []

    try:
        for file in files:
            source_files.append(file.filename or "uploaded-image")
            payload = await file.read()
            ocr_text = ocr_service.extract_text(payload)
            # Debug logging: show OCR output length and small preview
            try:
                import logging

                preview = (ocr_text or "").replace("\n", " ")[:300]
                logging.info("OCR output for %s: length=%d, preview=%s", file.filename or "uploaded-image", len(ocr_text or ""), preview)
            except Exception:
                pass
            parsed_records, invalid_rows, duplicate_rows = record_parser.parse(ocr_text)
        skipped_rows += invalid_rows
        duplicate_count += duplicate_rows
        for record in parsed_records:
            if record.staking_id in seen_ids:
                duplicate_count += 1
                continue
            seen_ids.add(record.staking_id)
            all_records.append(record)
    except Exception as exc:
        # Log full traceback for debugging (will appear in Render logs)
        logging.error("Error in /api/process: %s", exc)
        logging.error(traceback.format_exc())
        # Return a controlled 500 response so gateway does not drop CORS headers
        from fastapi import HTTPException

        raise HTTPException(status_code=500, detail=str(exc))

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
