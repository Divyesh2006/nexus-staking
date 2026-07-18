from __future__ import annotations

import io
import re
from dataclasses import dataclass

import cv2
import numpy as np
from PIL import Image


@dataclass
class OCRResult:
    text: str


class OCRService:
    def __init__(self) -> None:
        # Delay importing and instantiating heavy OCR libraries until first use.
        self._paddle = None
        self._rapidocr = None
        self._tesseract = None
        self._paddle_initialized = False
        self._rapidocr_initialized = False
        self._tesseract_initialized = False

    def _ensure_paddle(self) -> None:
        if self._paddle_initialized:
            return
        self._paddle_initialized = True
        # Allow disabling heavy OCR backends via env var to avoid OOM on small hosts.
        import os
        if os.environ.get("SKIP_HEAVY_OCR", "true").lower() in ("1", "true", "yes"):
            self._paddle = None
            return
        try:
            from paddleocr import PaddleOCR  # type: ignore

            # instantiate only when needed
            self._paddle = PaddleOCR(use_textline_orientation=True, lang="en")
        except Exception:
            self._paddle = None

    def _ensure_rapidocr(self) -> None:
        if self._rapidocr_initialized:
            return
        self._rapidocr_initialized = True
        import os
        if os.environ.get("SKIP_HEAVY_OCR", "true").lower() in ("1", "true", "yes"):
            self._rapidocr = None
            return
        try:
            from rapidocr_onnxruntime import RapidOCR  # type: ignore

            self._rapidocr = RapidOCR()
        except Exception:
            self._rapidocr = None

    def _ensure_tesseract(self) -> None:
        if self._tesseract_initialized:
            return
        self._tesseract_initialized = True
        try:
            import pytesseract  # type: ignore

            self._tesseract = pytesseract
        except Exception:
            self._tesseract = None

    def extract_text(self, image_bytes: bytes) -> str:
        raw_image = self._load_image(image_bytes)
        rgb_image = cv2.cvtColor(raw_image, cv2.COLOR_BGR2RGB)

        # Try PaddleOCR if available (lazy-init)
        self._ensure_paddle()
        if self._paddle is not None:
            try:
                result = self._paddle.ocr(rgb_image, cls=True)
                lines = self._flatten_paddle_result(result)
                if lines:
                    return "\n".join(lines)
            except Exception:
                pass

        # Try RapidOCR if available (lazy-init)
        self._ensure_rapidocr()
        if self._rapidocr is not None:
            try:
                result, _elapsed = self._rapidocr(rgb_image)
                lines = self._flatten_rapidocr_result(result)
                if lines:
                    return "\n".join(lines)
                enlarged = cv2.resize(rgb_image, None, fx=2.0, fy=2.0, interpolation=cv2.INTER_CUBIC)
                result, _elapsed = self._rapidocr(enlarged)
                lines = self._flatten_rapidocr_result(result)
                if lines:
                    return "\n".join(lines)
            except Exception:
                pass

        # Fallback to pytesseract (lazy-init)
        self._ensure_tesseract()
        if self._tesseract is not None:
            try:
                return self._tesseract.image_to_string(Image.fromarray(self._prepare_image(image_bytes)))
            except Exception:
                pass
        return ""

    def _flatten_paddle_result(self, result: object) -> list[str]:
        lines: list[str] = []
        for page in result or []:
            for entry in page or []:
                text = entry[1][0] if entry and len(entry) > 1 else ""
                if text:
                    lines.append(text)
        return lines

    def _flatten_rapidocr_result(self, result: object) -> list[str]:
        lines: list[str] = []
        for entry in result or []:
            text = entry[1] if entry and len(entry) > 1 else ""
            if text:
                lines.append(text)
        return lines

    def _load_image(self, image_bytes: bytes) -> np.ndarray:
        file_buffer = np.frombuffer(image_bytes, dtype=np.uint8)
        image = cv2.imdecode(file_buffer, cv2.IMREAD_COLOR)
        if image is None:
            fallback = Image.open(io.BytesIO(image_bytes)).convert("RGB")
            image = cv2.cvtColor(np.array(fallback), cv2.COLOR_RGB2BGR)
        return image

    def _prepare_image(self, image_bytes: bytes) -> np.ndarray:
        image = self._load_image(image_bytes)
        image = cv2.resize(image, None, fx=2.0, fy=2.0, interpolation=cv2.INTER_CUBIC)
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        denoised = cv2.bilateralFilter(gray, 11, 17, 17)
        threshold = cv2.threshold(denoised, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)[1]
        return threshold
