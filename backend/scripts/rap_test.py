from rapidocr_onnxruntime import RapidOCR
print('import ok')
try:
    r = RapidOCR()
    print('instantiated', type(r))
except Exception as e:
    import traceback
    print('instantiate error', e)
    traceback.print_exc()
