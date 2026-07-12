import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export interface GroupByOption<T extends string> {
  value: T;
  label: string;
}

interface GroupBySelectProps<T extends string> {
  value: T;
  onChange: (value: T) => void;
  options: ReadonlyArray<GroupByOption<T>>;
  label?: string;
  id?: string;
}

export function GroupBySelect<T extends string>({
  value,
  onChange,
  options,
  label = 'Agrupar por',
  id = 'group-by',
}: GroupBySelectProps<T>) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Select value={value} onValueChange={(v) => onChange(v as T)}>
        <SelectTrigger id={id}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
