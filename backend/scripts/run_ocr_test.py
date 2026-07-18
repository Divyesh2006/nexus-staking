import sys
import os

# ensure backend package is importable when running from repo root
sys.path.insert(0, os.path.join(os.getcwd(), "backend"))

from app.services.ocr import OCRService

path = r"c:\Users\Pravin\OneDrive\Desktop\nexus-staking\sample-row2.png"
try:
    with open(path, "rb") as f:
        data = f.read()
except FileNotFoundError:
    print("sample image not found at", path)
    sys.exit(2)

svc = OCRService()
svc._ensure_paddle()
svc._ensure_rapidocr()

print("paddle available:", svc._paddle is not None)
print("rapid available:", svc._rapidocr is not None)

text = svc.extract_text(data)
print("extracted text length:", len(text))
print(repr(text[:1000]))
