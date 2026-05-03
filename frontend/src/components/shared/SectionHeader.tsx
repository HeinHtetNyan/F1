interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  accent?: boolean;
  action?: React.ReactNode;
}

export function SectionHeader({ title, subtitle, accent, action }: SectionHeaderProps) {
  return (
    <div className="flex items-center justify-between px-3 py-2 border-b border-[--border]">
      <div className="flex items-center gap-2">
        {accent && <span className="w-1 h-4 rounded-sm bg-[--accent]" />}
        <span className="text-[11px] font-semibold uppercase tracking-widest text-[--text-secondary] font-mono">
          {title}
        </span>
        {subtitle && (
          <span className="text-[10px] text-[--text-muted] font-mono">{subtitle}</span>
        )}
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}
