export function LoadingOverlay() {
  return (
    <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-[--bg]/90 backdrop-blur-sm">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-2 border-[--border] border-t-[--accent] rounded-full animate-spin" />
        <div className="flex flex-col items-center gap-1">
          <span className="font-mono font-bold text-sm text-[--accent] tracking-widest uppercase">
            F1 Analytics
          </span>
          <span className="font-mono text-[10px] text-[--text-muted] animate-pulse">
            Connecting to live telemetry…
          </span>
        </div>
      </div>
    </div>
  );
}
