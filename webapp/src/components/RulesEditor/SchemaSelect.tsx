import { FRIENDLY_FIELD_GROUPS } from '../../shared/schema/SchemaResolver';

export interface SchemaSelectProps {
  value: string;
  onChange: (friendlyLabel: string) => void;
  className?: string;
  id?: string;
}

export default function SchemaSelect({ value, onChange, className, id }: SchemaSelectProps) {
  return (
    <select
      id={id}
      className={className ?? 'vbb-control'}
      value={value}
      onChange={(event) => onChange(event.target.value)}
    >
      {Object.entries(FRIENDLY_FIELD_GROUPS).map(([group, labels]) => (
        <optgroup key={group} label={group}>
          {labels.map((label) => (
            <option key={label} value={label}>
              {label}
            </option>
          ))}
        </optgroup>
      ))}
    </select>
  );
}
