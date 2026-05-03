import { useRef, useState } from 'react';
import { useLiveStore } from '../../store/liveStore';
import type { RadioMessage } from '../../store/liveStore';

function fmtAge(iso: string): string {
  try {
    const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
    if (diff < 60)   return `${diff}s`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m`;
    return `${Math.floor(diff / 3600)}h`;
  } catch {
    return '';
  }
}

function Avatar({ msg }: { msg: RadioMessage }) {
  const [imgFailed, setImgFailed] = useState(false);
  if (msg.headshot_url && !imgFailed) {
    return (
      <img
        src={msg.headshot_url}
        alt={msg.driver_acronym}
        className="w-9 h-9 rounded-full object-cover flex-shrink-0 border border-[--border2]"
        onError={() => setImgFailed(true)}
      />
    );
  }
  return (
    <div className="w-9 h-9 rounded-full flex-shrink-0 bg-[--border2] border border-[--border] flex items-center justify-center">
      <span className="font-mono font-bold text-[9px] text-[--text-secondary]">
        {msg.driver_acronym.slice(0, 3)}
      </span>
    </div>
  );
}

function RadioEntry({ msg }: { msg: RadioMessage }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);

  function togglePlay() {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) {
      audio.play().catch(() => {});
    } else {
      audio.pause();
      audio.currentTime = 0;
    }
  }

  return (
    <div className="px-3 py-2.5 border-b border-[--border]/40 hover:bg-[--panel2] transition-colors">
      <div className="flex items-start gap-2.5">
        <Avatar msg={msg} />
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline justify-between gap-1 mb-0.5">
            <span className="font-mono font-bold text-[11px] text-[--accent]">
              {msg.driver_acronym}
            </span>
            <span className="font-mono text-[8px] text-[--text-muted] flex-shrink-0">
              {fmtAge(msg.timestamp)}
            </span>
          </div>
          <p className="font-mono text-[8px] text-[--text-muted] truncate mb-1.5">
            {msg.driver_name}
          </p>
          {msg.recording_url && (
            <>
              <audio
                ref={audioRef}
                src={msg.recording_url}
                preload="none"
                onPlay={() => setPlaying(true)}
                onPause={() => setPlaying(false)}
                onEnded={() => setPlaying(false)}
              />
              <button
                onClick={togglePlay}
                className={`flex items-center gap-1.5 px-2 py-1 rounded-sm border transition-colors text-[8px] font-mono uppercase tracking-widest ${
                  playing
                    ? 'border-[--accent] text-[--accent] bg-[--accent]/10'
                    : 'border-[--border] text-[--text-secondary] hover:border-[--accent] hover:text-[--accent]'
                }`}
              >
                <span>{playing ? '◼' : '▶'}</span>
                <span>{playing ? 'Stop' : 'Play'}</span>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export function DriverRadio() {
  const radioMessages = useLiveStore(s => s.radioMessages);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-[--border] flex-shrink-0">
        <div className="flex items-center gap-1.5">
          <span className="w-1 h-3.5 rounded-sm bg-[--accent]" />
          <span className="font-mono text-[10px] uppercase tracking-widest text-[--text-secondary] font-semibold">
            Driver Radio
          </span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-[--accent] anim-live-dot" />
          <span className="font-mono text-[8px] text-[--accent] uppercase tracking-widest">Live</span>
        </div>
      </div>

      {/* Messages */}
      {radioMessages.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-2 px-4 py-8 text-center">
          <span className="text-2xl opacity-30">📻</span>
          <span className="font-mono text-[9px] text-[--text-muted]">Waiting for radio…</span>
          <span className="font-mono text-[8px] text-[--text-muted]/60 leading-relaxed max-w-[160px]">
            Audio transmissions will appear here during the race
          </span>
        </div>
      ) : (
        <div>
          {radioMessages.map((msg, i) => (
            <RadioEntry
              key={`${msg.driver_number}-${msg.timestamp}-${i}`}
              msg={msg}
            />
          ))}
        </div>
      )}
    </div>
  );
}
