import { motion } from 'framer-motion';
import { ChartColumn, Coins, Landmark, Shield } from 'lucide-react';
import { Card, CardContent } from '../ui/card';

interface SummaryCardsProps {
  totalVolume: number;
  regularCount: number;
  fixedCount: number;
  totalRewardsSum: number;
}

export function SummaryCards({ totalVolume, regularCount, fixedCount, totalRewardsSum }: SummaryCardsProps) {
  const items = [
    { label: 'Total Volume', value: totalVolume.toLocaleString(), icon: Coins },
    { label: 'Regular Count', value: regularCount.toLocaleString(), icon: Shield },
    { label: 'Fixed Count', value: fixedCount.toLocaleString(), icon: Landmark },
    { label: 'Rewards Sum', value: totalRewardsSum.toLocaleString(), icon: ChartColumn }
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {items.map((item, index) => (
        <motion.div key={item.label} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }}>
          <Card>
            <CardContent className="flex items-center justify-between gap-4">
              <div>
                <div className="text-sm text-slate-400">{item.label}</div>
                <div className="mt-2 text-2xl font-semibold text-white">{item.value}</div>
              </div>
              <div className="rounded-2xl border border-slate-800 bg-slate-900 p-3 text-sky-400">
                <item.icon size={22} />
              </div>
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </div>
  );
}
