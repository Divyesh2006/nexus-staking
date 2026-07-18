import { useEffect, useMemo, useState } from 'react';
import { Download, RotateCcw, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';
import { AppShell } from './components/layout/AppShell';
import { UploadPanel } from './components/upload/UploadPanel';
import { SummaryCards } from './components/summary/SummaryCards';
import { RecordsTable } from './components/records/RecordsTable';
import { Button } from './components/ui/button';
import { Card, CardContent } from './components/ui/card';
import { exportExcel, processScreenshots } from './lib/api';
import type { StakingRecord } from './lib/types';

function calculateYears(stakingDate: string, maturityDate: string) {
  const start = new Date(stakingDate);
  const end = new Date(maturityDate);
  let years = end.getFullYear() - start.getFullYear();
  const monthDifference = end.getMonth() - start.getMonth();
  if (monthDifference < 0 || (monthDifference === 0 && end.getDate() < start.getDate())) {
    years -= 1;
  }
  return Math.max(years, 0);
}

function recalculateRecord(record: StakingRecord): StakingRecord {
  const stakingYears = calculateYears(record.staking_date, record.maturity_date);
  const eliteTable: Record<number, number> = { 50000: 0.0475, 100000: 0.05, 200000: 0.0525, 500000: 0.055 };

  let roi: number | string | null = null;
  let maturity: number | null = null;
  let maturityReward: number | null = null;

  if (record.mode === 'Regular') {
    roi = 0.03;
    maturity = record.volume;
    maturityReward = maturity - record.volume;
  } else if (record.mode === 'Fixed') {
    roi = 0;
    if (stakingYears === 3) {
      maturity = Math.round(record.volume * 2.5);
    } else if (stakingYears === 5) {
      maturity = record.volume * 4;
    } else {
      maturity = Math.round(record.volume * Math.max(stakingYears + 1, 1));
    }
    maturityReward = maturity - record.volume;
  } else {
    // Elite
    if (eliteTable[record.volume]) {
      roi = eliteTable[record.volume];
      maturity = Math.round(record.volume + record.volume * (roi as number) * 60);
      maturityReward = maturity - record.volume;
    } else {
      roi = 'Invalid Elite Volume';
      maturity = null;
      maturityReward = null;
    }
  }

  let roiRewards: number | null = null;
  if (typeof roi === 'number') {
    roiRewards = Math.round(record.volume * roi * 60);
  } else if (record.mode === 'Fixed') {
    roiRewards = 0;
  } else {
    roiRewards = null;
  }

  return {
    ...record,
    roi,
    staking_years: stakingYears,
    maturity,
    maturity_reward: maturityReward,
    roi_rewards: roiRewards,
  };
}

function normalizeRecords(records: StakingRecord[]) {
  return records.map((record) => recalculateRecord({ ...record, client_id: record.client_id ?? crypto.randomUUID() }));
}

async function downloadWorkbook(records: StakingRecord[]) {
  const blob = await exportExcel(records.map((record) => recalculateRecord(record)));
  const firstUsername = records[0]?.username?.trim() || 'Nexus';
  const safeName = `${firstUsername.replace(/[^A-Za-z0-9_\-]/g, '') || 'Nexus'}_Stakings.xlsx`;
  const downloadUrl = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = downloadUrl;
  anchor.download = safeName;
  anchor.click();
  URL.revokeObjectURL(downloadUrl);
  return safeName;
}

export default function App() {
  const [darkMode, setDarkMode] = useState(true);
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [records, setRecords] = useState<StakingRecord[]>([]);
  const [search, setSearch] = useState('');
  const [modeFilter, setModeFilter] = useState<'All' | 'Regular' | 'Fixed' | 'Elite'>('All');
  const [sortBy, setSortBy] = useState<'date' | 'volume'>('date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [stage, setStage] = useState('Waiting for screenshots');
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
  }, [darkMode]);

  useEffect(() => {
    return () => {
      previews.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [previews]);

  const visibleRecords = useMemo(() => {
    const filtered = records.filter((record) => {
      const matchesSearch = record.staking_id.toLowerCase().includes(search.toLowerCase());
      const matchesMode = modeFilter === 'All' || record.mode === modeFilter;
      return matchesSearch && matchesMode;
    });

    return [...filtered].sort((left, right) => {
      const direction = sortDirection === 'asc' ? 1 : -1;
      if (sortBy === 'volume') {
        return (left.volume - right.volume) * direction;
      }
      return (new Date(left.staking_date).getTime() - new Date(right.staking_date).getTime()) * direction;
    });
  }, [modeFilter, records, search, sortBy, sortDirection]);

  const summary = useMemo(() => {
    return records.reduce(
      (accumulator, record) => {
        accumulator.totalVolume += record.volume;
        accumulator.totalRewardsSum += record.maturity_reward ?? 0;
        if (record.mode === 'Regular') {
          accumulator.regularCount += 1;
        } else if (record.mode === 'Fixed') {
          accumulator.fixedCount += 1;
        }
        return accumulator;
      },
      { totalVolume: 0, regularCount: 0, fixedCount: 0, totalRewardsSum: 0 }
    );
  }, [records]);

  const updateFiles = (nextFiles: File[]) => {
    setMessage(null);
    setFiles(nextFiles);
    previews.forEach((url) => URL.revokeObjectURL(url));
    const nextPreviews = nextFiles.map((file) => URL.createObjectURL(file));
    setPreviews(nextPreviews);
  };

  const handleProcess = async (nextFiles: File[]) => {
    if (nextFiles.length === 0) {
      return;
    }
    setProcessing(true);
    setProgress(0);
    setStage('Preparing screenshots');
    try {
      updateFiles(nextFiles);
      const response = await processScreenshots(nextFiles, (value, nextStage) => {
        setProgress(value);
        setStage(nextStage);
      });
      setProgress(75);
      setStage('Validating extracted rows');
      const normalized = normalizeRecords(response.records);
      setRecords(normalized);
      setProgress(100);
      setStage('Ready for review');
      setMessage(`Processed ${response.records.length} records. Skipped ${response.skipped_rows} invalid rows and ${response.duplicate_count} duplicates.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Failed to process screenshots.');
      setRecords([]);
    } finally {
      setProcessing(false);
    }
  };

  const handleExport = async () => {
    if (records.length === 0) {
      return;
    }
    setMessage('Generating Excel workbook...');
    try {
      const safeName = await downloadWorkbook(records);
      setMessage(`Downloaded ${safeName}`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Failed to export workbook.');
    }
  };

  const handleClear = () => {
    setFiles([]);
    previews.forEach((url) => URL.revokeObjectURL(url));
    setPreviews([]);
    setRecords([]);
    setSearch('');
    setModeFilter('All');
    setSortBy('date');
    setSortDirection('desc');
    setProgress(0);
    setStage('Waiting for screenshots');
    setMessage(null);
  };

  const handleUpdateRecord = (clientId: string, record: StakingRecord) => {
    setRecords((current) => current.map((item) => (item.client_id === clientId ? recalculateRecord({ ...record, client_id: clientId }) : item)));
  };

  const handleRemoveRecord = (clientId: string) => {
    setRecords((current) => current.filter((item) => item.client_id !== clientId));
  };

  return (
    <AppShell darkMode={darkMode} onToggleTheme={() => setDarkMode((value) => !value)}>
      <div className="space-y-6">
        {message ? (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
            <Card className="border-sky-500/30 bg-sky-500/10">
              <CardContent className="py-4 text-sm text-sky-100">{message}</CardContent>
            </Card>
          </motion.div>
        ) : null}

        <UploadPanel
          files={files}
          previews={previews}
          processing={processing}
          progress={progress}
          stage={stage}
          onFilesSelected={handleProcess}
          onRemoveFile={(index) => {
            const nextFiles = files.filter((_, currentIndex) => currentIndex !== index);
            if (nextFiles.length === 0) {
              handleClear();
              return;
            }
            handleProcess(nextFiles);
          }}
        />

        <SummaryCards
          totalVolume={summary.totalVolume}
          regularCount={summary.regularCount}
          fixedCount={summary.fixedCount}
          totalRewardsSum={summary.totalRewardsSum}
        />

        <RecordsTable
          records={visibleRecords}
          search={search}
          modeFilter={modeFilter}
          sortBy={sortBy}
          sortDirection={sortDirection}
          onSearchChange={setSearch}
          onModeFilterChange={setModeFilter}
          onSortByChange={setSortBy}
          onToggleSortDirection={() => setSortDirection((direction) => (direction === 'asc' ? 'desc' : 'asc'))}
          onUpdateRecord={handleUpdateRecord}
          onRemoveRecord={handleRemoveRecord}
        />

        <div className="grid gap-4 md:grid-cols-3">
          <Button onClick={handleExport} disabled={records.length === 0 || processing} className="h-12">
            <Download size={16} /> Generate Excel
          </Button>
          <Button variant="secondary" onClick={handleClear} className="h-12">
            <RotateCcw size={16} /> Clear All
          </Button>
          <Card>
            <CardContent className="flex h-12 items-center gap-2 py-0 text-sm text-slate-300">
              <Sparkles size={16} className="text-cyan-400" />
              Duplicate staking IDs are removed automatically and invalid rows are ignored.
            </CardContent>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
