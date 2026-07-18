import { motion } from 'framer-motion';
import { ArrowDownAZ, ArrowUpAZ, Pencil, Trash2 } from 'lucide-react';
import type { StakingRecord } from '../../lib/types';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { Select } from '../ui/select';
import { Badge } from '../ui/badge';
import { Table, TableContainer } from '../ui/table';

interface RecordsTableProps {
  records: StakingRecord[];
  search: string;
  modeFilter: 'All' | 'Regular' | 'Fixed' | 'Elite';
  sortBy: 'date' | 'volume';
  sortDirection: 'asc' | 'desc';
  onSearchChange: (value: string) => void;
  onModeFilterChange: (value: 'All' | 'Regular' | 'Fixed' | 'Elite') => void;
  onSortByChange: (value: 'date' | 'volume') => void;
  onToggleSortDirection: () => void;
  onUpdateRecord: (clientId: string, record: StakingRecord) => void;
  onRemoveRecord: (clientId: string) => void;
}

export function RecordsTable({
  records,
  search,
  modeFilter,
  sortBy,
  sortDirection,
  onSearchChange,
  onModeFilterChange,
  onSortByChange,
  onToggleSortDirection,
  onUpdateRecord,
  onRemoveRecord
}: RecordsTableProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <CardTitle>Extracted staking records</CardTitle>
            <CardDescription>Search, filter, sort, and edit any value before exporting the workbook.</CardDescription>
          </div>
          <div className="flex flex-wrap gap-3">
            <div className="w-56">
              <Input placeholder="Search by Staking ID" value={search} onChange={(event) => onSearchChange(event.target.value)} />
            </div>
            <div className="w-44">
              <Select value={modeFilter} onChange={(event) => onModeFilterChange(event.target.value as 'All' | 'Regular' | 'Fixed')}>
                <option value="All">All modes</option>
                <option value="Regular">Regular</option>
                <option value="Fixed">Fixed</option>
                <option value="Elite">Elite</option>
              </Select>
            </div>
            <div className="w-36">
              <Select value={sortBy} onChange={(event) => onSortByChange(event.target.value as 'date' | 'volume')}>
                <option value="date">Sort by Date</option>
                <option value="volume">Sort by Volume</option>
              </Select>
            </div>
            <Button variant="secondary" onClick={onToggleSortDirection}>
              {sortDirection === 'asc' ? <ArrowUpAZ size={16} /> : <ArrowDownAZ size={16} />}
              {sortDirection === 'asc' ? 'Ascending' : 'Descending'}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <TableContainer>
          <div className="overflow-x-auto">
            <Table>
              <thead className="bg-slate-900/80 text-xs uppercase tracking-[0.2em] text-slate-400">
                <tr>
                  {['Username', 'Staking ID', 'Mode', 'Volume', 'ROI', 'ROI Rewards', 'Staking Date', 'Maturity Date', 'Years', 'Maturity', 'Maturity Reward', 'Actions'].map((heading) => (
                    <th key={heading} className="whitespace-nowrap border-b border-slate-800 px-4 py-3">{heading}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {records.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="px-4 py-10 text-center text-slate-400">
                      No matching records found.
                    </td>
                  </tr>
                ) : (
                  records.map((record) => (
                    <motion.tr key={record.client_id ?? record.staking_id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="border-b border-slate-800/70 align-top">
                      <td className="px-4 py-3">
                        <Input value={record.username} onChange={(event) => onUpdateRecord(record.client_id ?? record.staking_id, { ...record, username: event.target.value })} />
                      </td>
                      <td className="px-4 py-3">
                        <Input value={record.staking_id} onChange={(event) => onUpdateRecord(record.client_id ?? record.staking_id, { ...record, staking_id: event.target.value })} />
                      </td>
                      <td className="px-4 py-3">
                        <Select value={record.mode} onChange={(event) => onUpdateRecord(record.client_id ?? record.staking_id, { ...record, mode: event.target.value as 'Regular' | 'Fixed' | 'Elite' })}>
                          <option value="Regular">Regular</option>
                          <option value="Fixed">Fixed</option>
                          <option value="Elite">Elite</option>
                        </Select>
                      </td>
                      <td className="px-4 py-3">
                        <Input type="number" value={record.volume} onChange={(event) => onUpdateRecord(record.client_id ?? record.staking_id, { ...record, volume: Number(event.target.value || 0) })} />
                      </td>
                      <td className="px-4 py-3">
                        {typeof record.roi === 'string' ? (
                          <Badge className="justify-center">{record.roi}</Badge>
                        ) : (
                          <Badge className="justify-center">{Math.round((record.roi ?? 0) * 10000) / 100}%</Badge>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center font-medium text-slate-100">{record.roi_rewards ? record.roi_rewards.toLocaleString() : '-'}</td>
                      <td className="px-4 py-3">
                        <Input type="date" value={record.staking_date} onChange={(event) => onUpdateRecord(record.client_id ?? record.staking_id, { ...record, staking_date: event.target.value })} />
                      </td>
                      <td className="px-4 py-3">
                        <Input type="date" value={record.maturity_date} onChange={(event) => onUpdateRecord(record.client_id ?? record.staking_id, { ...record, maturity_date: event.target.value })} />
                      </td>
                      <td className="px-4 py-3 text-center text-slate-200">{record.staking_years ?? '-'}</td>
                      <td className="px-4 py-3 text-center font-medium text-slate-100">{record.maturity ? record.maturity.toLocaleString() : '-'}</td>
                      <td className="px-4 py-3 text-center font-medium text-slate-100">{record.maturity_reward ? record.maturity_reward.toLocaleString() : '-'}</td>
                      <td className="px-4 py-3">
                        <Button variant="ghost" onClick={() => onRemoveRecord(record.client_id ?? record.staking_id)}>
                          <Trash2 size={16} />
                          Remove
                        </Button>
                      </td>
                    </motion.tr>
                  ))
                )}
              </tbody>
            </Table>
          </div>
        </TableContainer>
      </CardContent>
    </Card>
  );
}
