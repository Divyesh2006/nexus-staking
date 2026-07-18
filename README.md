# Nexus Staking Excel Generator

A modern React + FastAPI application that extracts staking records from Nexus "My Stakings" screenshots, validates and enriches the data, then exports a polished Excel report.

## Stack
- Frontend: React, Vite, Tailwind CSS, Framer Motion, Lucide Icons
- Backend: FastAPI
- OCR: PaddleOCR with Tesseract fallback
- Excel: OpenPyXL
- Image processing: OpenCV

## Structure
- frontend/
- backend/
- ocr/
- excel/
- uploads/
- generated/

## Local development
1. Start the backend from `backend/`.
2. Start the frontend from `frontend/`.
3. Upload one or more Nexus staking screenshots.
4. Review, edit, filter, and export the extracted data.

## Notes
- Duplicate staking IDs are removed automatically.
- Invalid rows are skipped.
- ROI and total rewards are calculated from staking mode and duration.
