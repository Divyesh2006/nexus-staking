import type { InputHTMLAttributes } from 'react';
import { cn } from '../../utils/cn';

export function Switch({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className={cn('inline-flex cursor-pointer items-center gap-3', className)}>
      <input type="checkbox" className="peer sr-only" {...props} />
      <span className="relative h-6 w-11 rounded-full bg-slate-700 transition peer-checked:bg-sky-500 after:absolute after:left-0.5 after:top-0.5 after:h-5 after:w-5 after:rounded-full after:bg-white after:transition peer-checked:after:translate-x-5" />
    </label>
  );
}
