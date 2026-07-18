export type Mode = 'Regular' | 'Fixed' | 'Elite';

export interface StakingRecord {
  client_id?: string;
  username: string;
  staking_id: string;
  mode: Mode;
  volume: number;
  roi: number | string | null;
  staking_date: string;
  maturity_date: string;
  staking_years: number | null;
  maturity: number | null;
  maturity_reward: number | null;
  roi_rewards: number | null;
}

export interface ProcessResponse {
  records: StakingRecord[];
  skipped_rows: number;
  duplicate_count: number;
  source_files: string[];
}
