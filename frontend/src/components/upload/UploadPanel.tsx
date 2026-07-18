import { motion } from 'framer-motion';
import { CloudUpload, ImageIcon, LoaderCircle, X } from 'lucide-react';
import { useMemo, useRef, useState } from 'react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';

interface UploadPanelProps {
  files: File[];
  previews: string[];
  processing: boolean;
  progress: number;
  stage: string;
  onFilesSelected: (files: File[]) => void;
  onRemoveFile: (index: number) => void;
}

export function UploadPanel({ files, previews, processing, progress, stage, onFilesSelected, onRemoveFile }: UploadPanelProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [dragActive, setDragActive] = useState(false);

  const helperLabel = useMemo(() => {
    if (processing) {
      return `${stage} · ${progress}%`;
    }
    return 'PNG, JPG, and JPEG only';
  }, [processing, progress, stage]);

  const handleFiles = (incoming: FileList | null) => {
    if (!incoming) {
      return;
    }
    const selectedFiles = Array.from(incoming).filter((file) => /image\/(png|jpeg)/.test(file.type));
    if (selectedFiles.length > 0) {
      onFilesSelected(selectedFiles);
    }
  };

  return (
    <Card className="overflow-hidden">
      <CardHeader>
        <div className="flex items-center justify-between gap-4">
          <div>
            <CardTitle>Upload screenshots</CardTitle>
            <CardDescription>Drop one or more Nexus My Stakings screenshots here or browse your files.</CardDescription>
          </div>
          <Badge>{helperLabel}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <div
          onDragOver={(event) => {
            event.preventDefault();
            setDragActive(true);
          }}
          onDragLeave={() => setDragActive(false)}
          onDrop={(event) => {
            event.preventDefault();
            setDragActive(false);
            handleFiles(event.dataTransfer.files);
          }}
          className={`rounded-3xl border border-dashed px-6 py-10 text-center transition ${dragActive ? 'border-sky-400 bg-sky-500/10' : 'border-slate-700 bg-slate-950/40'}`}
        >
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mx-auto flex max-w-xl flex-col items-center gap-4">
            {processing ? <LoaderCircle className="animate-spin text-sky-400" size={34} /> : <CloudUpload className="text-sky-400" size={34} />}
            <div>
              <h3 className="text-lg font-semibold text-white">Drag and drop your screenshots</h3>
              <p className="mt-1 text-sm text-slate-400">OCR reads each image, extracts staking rows, and prepares them for review.</p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <Button onClick={() => inputRef.current?.click()}>Browse Files</Button>
              <Button variant="secondary" onClick={() => inputRef.current?.click()}>Add more screenshots</Button>
            </div>
            <input
              ref={inputRef}
              type="file"
              accept="image/png,image/jpeg"
              multiple
              hidden
              onChange={(event) => handleFiles(event.target.files)}
            />
            <div className="text-xs uppercase tracking-[0.28em] text-slate-500">Supported: PNG, JPG, JPEG</div>
          </motion.div>
        </div>

        {processing ? (
          <div className="space-y-2">
            <div className="h-2 overflow-hidden rounded-full bg-slate-800">
              <div className="h-full rounded-full bg-gradient-to-r from-sky-400 via-cyan-400 to-emerald-400 transition-all" style={{ width: `${Math.max(progress, 5)}%` }} />
            </div>
            <p className="text-sm text-slate-400">{stage}</p>
          </div>
        ) : null}

        {files.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {files.map((file, index) => (
              <div key={`${file.name}-${index}`} className="group overflow-hidden rounded-2xl border border-slate-800 bg-slate-950/70">
                <div className="relative aspect-[4/3] bg-slate-900">
                  <img src={previews[index]} alt={file.name} className="h-full w-full object-cover" />
                  <button
                    type="button"
                    onClick={() => onRemoveFile(index)}
                    className="absolute right-3 top-3 rounded-full border border-slate-700 bg-slate-950/80 p-2 text-slate-200 opacity-90 transition hover:bg-slate-900"
                  >
                    <X size={16} />
                  </button>
                </div>
                <div className="flex items-center gap-2 px-4 py-3 text-sm text-slate-300">
                  <ImageIcon size={16} className="text-sky-400" />
                  <span className="truncate">{file.name}</span>
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
