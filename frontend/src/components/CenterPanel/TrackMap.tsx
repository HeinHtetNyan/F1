import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useRaceStore } from '../../store/raceStore';
import { useLiveStore } from '../../store/liveStore';
import type { PosBounds } from '../../store/liveStore';
import { TEAM_COLORS, TIRE_COLORS } from '../../data/f1Data';
import type { Driver } from '../../types';

// ─── Circuit definition type ──────────────────────────────────────────────────
interface CircuitDef {
  name:       string;
  viewBox:    string;
  path:       string;
  positions:  [number, number][];
  drsZones:   { x: number; y: number; w: number; h: number }[];
  sectors:    { x: number; y: number; label: string; color: string }[];
  corners:    { x: number; y: number; label: string }[];
  sfLine:     [number, number, number, number];  // x1,y1,x2,y2
}

// ─── Miami International Autodrome ───────────────────────────────────────────
const MIAMI: CircuitDef = {
  name:    'Miami International Autodrome',
  viewBox: '0 0 580 490',
  path:
    'M 108 42 L 456 42 ' +
    'C 484 42 498 52 498 78 ' +
    'C 498 104 512 112 526 108 ' +
    'C 540 104 538 120 524 130 ' +
    'C 510 140 500 162 498 188 ' +
    'C 496 214 484 238 468 250 ' +
    'L 460 272 ' +
    'C 452 292 450 314 455 334 ' +
    'C 460 354 452 370 436 374 ' +
    'C 420 378 406 368 402 352 ' +
    'C 398 336 406 318 420 312 ' +
    'C 434 306 446 310 448 326 ' +
    'C 450 342 438 354 424 356 ' +
    'C 410 358 398 374 402 398 ' +
    'C 406 422 402 444 390 458 ' +
    'C 378 472 356 480 330 478 ' +
    'L 252 478 ' +
    'C 220 478 192 466 172 450 ' +
    'C 152 434 128 432 112 444 ' +
    'C 96 456 84 452 80 436 ' +
    'C 74 420 78 396 84 368 ' +
    'L 84 200 ' +
    'C 84 152 88 108 96 72 ' +
    'C 100 52 106 42 108 42 Z',
  positions: [
    [142, 42],  [190, 42],  [240, 42],  [292, 42],
    [344, 42],  [396, 42],  [490, 68],  [520, 112],
    [494, 178], [464, 250], [452, 318], [430, 368],
    [424, 336], [414, 388], [396, 452], [322, 478],
    [252, 478], [188, 456], [110, 442], [80, 406],
    [84, 296],  [84, 170],
  ],
  drsZones: [
    { x: 112, y: 34, w: 342, h: 16 },
    { x: 396, y: 348, w: 52, h: 16 },
  ],
  sectors: [
    { x: 464, y: 248, label: 'S1', color: '#FF1801' },
    { x: 394, y: 470, label: 'S2', color: '#FFC906' },
    { x: 112, y: 32,  label: 'S3', color: '#00FF87' },
  ],
  corners: [
    { x: 462, y: 39,  label: 'T1' },
    { x: 452, y: 383, label: 'T7' },
    { x: 285, y: 490, label: 'STADIUM' },
    { x: 102, y: 464, label: 'T17' },
  ],
  sfLine: [122, 32, 122, 52],
};

// ─── Monaco Circuit de Monaco ─────────────────────────────────────────────────
const MONACO: CircuitDef = {
  name:    'Circuit de Monaco',
  viewBox: '0 0 580 490',
  path:
    // Main straight (bottom, left to right)
    'M 80 390 L 350 390 ' +
    // Sainte Dévote T1 (bottom-right, tight right hairpin)
    'C 380 390 400 380 408 360 ' +
    // Beau Rivage ascent (right side going up)
    'L 440 200 ' +
    // Casino Square area (top-right curves)
    'C 448 170 460 148 470 138 ' +
    'C 480 128 490 130 494 142 ' +
    'C 498 154 492 170 480 178 ' +
    // Mirabeau — hairpin approach
    'C 460 190 450 210 458 236 ' +
    // Loews / Grand Hotel hairpin (tight, going back left)
    'C 466 262 464 286 448 298 ' +
    'C 432 310 412 308 400 294 ' +
    'C 388 280 388 258 400 246 ' +
    'C 412 234 430 232 440 240 ' +
    // Portier into tunnel
    'C 448 248 440 270 424 284 ' +
    'L 360 320 ' +
    // Tunnel (dashed in display, shown as track)
    'C 340 328 320 330 310 338 ' +
    'L 290 360 ' +
    // Nouvelle chicane
    'C 278 374 260 384 244 380 ' +
    'C 228 376 220 360 230 346 ' +
    'C 240 332 258 330 272 338 ' +
    // Tabac → Swimming pool
    'C 284 346 288 368 276 380 ' +
    'C 264 392 244 394 228 386 ' +
    // Swimming Pool Section (left-right-left)
    'L 190 370 ' +
    'C 178 364 172 350 180 338 ' +
    'C 188 326 204 324 214 332 ' +
    'C 224 340 222 358 210 366 ' +
    'L 170 380 ' +
    // La Rascasse (tight left hairpin at bottom)
    'C 148 386 130 382 118 370 ' +
    'C 106 358 108 340 122 332 ' +
    'C 136 324 154 328 162 342 ' +
    // Anthony Noghès (right, back onto main straight)
    'C 168 356 152 374 134 378 ' +
    'C 112 384 88 390 80 390 Z',
  positions: [
    [120, 390], [165, 390], [210, 390], [275, 390],
    [340, 388], [402, 370], [432, 300], [442, 268],
    [430, 244], [448, 200], [468, 150], [490, 138],
    [480, 178], [460, 220], [398, 294], [364, 322],
    [304, 342], [258, 376], [194, 372], [212, 338],
    [168, 348], [128, 362],
  ],
  drsZones: [
    { x: 84, y: 382, w: 260, h: 16 },
  ],
  sectors: [
    { x: 408, y: 358, label: 'S1', color: '#FF1801' },
    { x: 264, y: 388, label: 'S2', color: '#FFC906' },
    { x: 80,  y: 380, label: 'S3', color: '#00FF87' },
  ],
  corners: [
    { x: 400, y: 388, label: 'T1' },
    { x: 452, y: 308, label: 'LOEWS' },
    { x: 240, y: 396, label: 'CHICANE' },
    { x: 122, y: 326, label: 'RASCASSE' },
  ],
  sfLine: [80, 382, 80, 398],
};

// ─── Silverstone Circuit ──────────────────────────────────────────────────────
const SILVERSTONE: CircuitDef = {
  name:    'Silverstone Circuit',
  viewBox: '0 0 580 490',
  path:
    // Pit straight (bottom-ish, going right)
    'M 120 380 L 400 380 ' +
    // Copse (top-right, fast right)
    'C 450 380 480 360 490 330 ' +
    // Maggots/Becketts (flowing right-left-right)
    'C 500 300 495 270 480 250 ' +
    'C 460 226 450 200 460 175 ' +
    'C 470 150 490 134 510 130 ' +
    'C 530 126 542 136 540 154 ' +
    'C 538 172 522 182 504 176 ' +
    // Chapel (right)
    'C 488 170 476 158 480 142 ' +
    // Hangar straight
    'L 360 120 ' +
    // Stowe (right)
    'C 310 120 280 130 268 152 ' +
    // Vale/Club (left-right complex)
    'C 256 174 260 200 272 218 ' +
    'C 284 236 280 260 264 274 ' +
    'C 248 288 224 288 208 274 ' +
    'C 192 260 192 236 208 224 ' +
    // Abbey (right)
    'C 224 212 244 208 254 218 ' +
    'C 264 228 264 250 252 260 ' +
    // Farm/Village/The Loop
    'L 200 300 ' +
    'C 174 320 152 338 130 356 ' +
    // Woodcote (return to pit straight)
    'C 114 368 112 374 120 380 Z',
  positions: [
    [160, 380], [220, 380], [280, 380], [340, 380],
    [396, 380], [490, 316], [492, 260], [468, 178],
    [510, 140], [440, 120], [380, 120], [320, 122],
    [278, 148], [260, 202], [270, 252], [248, 286],
    [206, 262], [218, 218], [256, 250], [214, 308],
    [158, 352], [124, 374],
  ],
  drsZones: [
    { x: 124, y: 372, w: 272, h: 16 },
    { x: 300, y: 112, w: 140, h: 16 },
  ],
  sectors: [
    { x: 488, y: 342, label: 'S1', color: '#FF1801' },
    { x: 258, y: 292, label: 'S2', color: '#FFC906' },
    { x: 120, y: 372, label: 'S3', color: '#00FF87' },
  ],
  corners: [
    { x: 486, y: 376, label: 'COPSE' },
    { x: 476, y: 154, label: 'CHAPEL' },
    { x: 258, y: 264, label: 'CLUB' },
    { x: 130, y: 350, label: 'WOODCOTE' },
  ],
  sfLine: [122, 372, 122, 388],
};

// ─── Autodromo Nazionale Monza ────────────────────────────────────────────────
const MONZA: CircuitDef = {
  name:    'Autodromo Nazionale Monza',
  viewBox: '0 0 580 490',
  path:
    // Main straight (top, going right)
    'M 100 80 L 460 80 ' +
    // Curva Grande (right, top-right)
    'C 510 80 540 110 540 160 ' +
    // Variante del Rettifilo (first chicane, right-left)
    'C 540 200 520 220 500 228 ' +
    'C 480 236 468 254 474 276 ' +
    'C 480 298 500 308 520 300 ' +
    'C 540 292 548 268 538 248 ' +
    // Curva di Lesmo 1 & 2
    'C 526 228 524 200 540 180 ' +
    'C 558 160 564 198 558 240 ' +
    'L 540 340 ' +
    // Variante Ascari (chicane, right-left)
    'C 536 368 520 388 498 392 ' +
    'C 476 396 460 378 462 356 ' +
    'C 464 334 482 322 502 326 ' +
    'C 522 330 532 350 524 370 ' +
    // Curva Parabolica (wide right, bottom-right)
    'C 514 392 494 416 464 428 ' +
    'C 434 440 400 440 370 428 ' +
    // Return straight (bottom, going left)
    'L 160 428 ' +
    // Variante della Roggia chicane (left side, right-left)
    'C 130 428 110 416 100 398 ' +
    'C 90 380 96 358 116 348 ' +
    'C 136 338 158 344 166 362 ' +
    'C 174 380 162 400 142 404 ' +
    // Return to pit straight
    'C 120 408 104 398 100 374 ' +
    'L 100 80 Z',
  positions: [
    [150, 80],  [210, 80],  [270, 80],  [330, 80],
    [390, 80],  [452, 80],  [540, 188], [510, 288],
    [544, 200], [550, 280], [540, 350], [502, 392],
    [480, 360], [520, 330], [468, 430], [380, 430],
    [280, 430], [180, 430], [120, 408], [140, 356],
    [170, 378], [104, 360],
  ],
  drsZones: [
    { x: 104, y: 72, w: 352, h: 16 },
    { x: 104, y: 420, w: 352, h: 16 },
  ],
  sectors: [
    { x: 536, y: 158, label: 'S1', color: '#FF1801' },
    { x: 500, y: 400, label: 'S2', color: '#FFC906' },
    { x: 100, y: 72,  label: 'S3', color: '#00FF87' },
  ],
  corners: [
    { x: 510, y: 76,  label: 'CURVA GRANDE' },
    { x: 542, y: 358, label: 'ASCARI' },
    { x: 468, y: 446, label: 'PARABOLICA' },
    { x: 96, y: 350,  label: 'ROGGIA' },
  ],
  sfLine: [104, 72, 104, 88],
};

// ─── Circuit Spa-Francorchamps ────────────────────────────────────────────────
const SPA: CircuitDef = {
  name:    'Circuit de Spa-Francorchamps',
  viewBox: '0 0 580 490',
  path:
    // Main straight (top-left, going right)
    'M 60 120 L 320 120 ' +
    // La Source hairpin (tight right)
    'C 360 120 390 136 400 164 ' +
    // Eau Rouge / Raidillon (descent and climb)
    'C 410 192 400 228 382 254 ' +
    'C 364 280 360 306 372 332 ' +
    // Kemmel straight (going right-ish)
    'L 450 340 ' +
    // Les Combes chicane (right-left)
    'C 488 340 510 328 516 308 ' +
    'C 522 288 508 268 488 266 ' +
    'C 468 264 454 280 458 300 ' +
    'C 462 320 480 326 494 318 ' +
    // Malmedy, Rivage, Pouhon
    'C 510 308 520 290 520 260 ' +
    'L 520 200 ' +
    'C 520 164 508 140 490 126 ' +
    'C 472 112 450 110 432 120 ' +
    // Campus, Stavelot
    'C 408 132 396 158 400 190 ' +
    'C 404 222 420 246 440 254 ' +
    // Blanchimont (fast right)
    'C 460 262 474 280 468 306 ' +
    'C 460 334 440 350 416 354 ' +
    'L 340 370 ' +
    // Bus Stop chicane (right-left at bottom)
    'C 300 376 276 368 266 350 ' +
    'C 256 332 266 312 284 306 ' +
    'C 302 300 320 310 326 328 ' +
    'C 332 346 318 366 300 368 ' +
    // Return to pit straight
    'L 200 380 ' +
    'C 160 380 120 362 90 334 ' +
    'C 68 314 56 288 54 260 ' +
    'L 54 180 ' +
    'C 54 152 56 134 60 120 Z',
  positions: [
    [100, 120], [160, 120], [220, 120], [280, 120],
    [390, 158], [376, 276], [440, 340], [510, 300],
    [476, 266], [518, 220], [516, 166], [436, 126],
    [402, 186], [432, 252], [414, 350], [344, 370],
    [282, 308], [308, 330], [268, 360], [196, 380],
    [60, 298],  [56, 196],
  ],
  drsZones: [
    { x: 64, y: 112, w: 252, h: 16 },
    { x: 374, y: 332, w: 72, h: 16 },
  ],
  sectors: [
    { x: 398, y: 158, label: 'S1', color: '#FF1801' },
    { x: 462, y: 356, label: 'S2', color: '#FFC906' },
    { x: 60,  y: 112, label: 'S3', color: '#00FF87' },
  ],
  corners: [
    { x: 384, y: 116, label: 'LA SOURCE' },
    { x: 368, y: 282, label: 'EAU ROUGE' },
    { x: 508, y: 262, label: 'LES COMBES' },
    { x: 264, y: 360, label: 'BUS STOP' },
  ],
  sfLine: [64, 112, 64, 128],
};

// ─── Generic oval fallback ────────────────────────────────────────────────────
const GENERIC: CircuitDef = {
  name:    'Circuit',
  viewBox: '0 0 580 490',
  path:    'M 290 125 C 450 125 510 175 510 245 C 510 315 450 365 290 365 C 130 365 70 315 70 245 C 70 175 130 125 290 125 Z',
  positions: [
    [290, 125], [352, 130], [409, 144], [456, 166],
    [489, 194], [508, 228], [508, 262], [489, 296],
    [456, 324], [409, 346], [352, 360], [290, 365],
    [228, 360], [171, 346], [124, 324], [91,  296],
    [72,  262], [72,  228], [91,  194], [124, 166],
    [171, 144], [228, 130],
  ],
  drsZones: [],
  sectors:  [],
  corners:  [],
  sfLine:   [284, 118, 284, 134],
};

// ─── Circuit registry ─────────────────────────────────────────────────────────
const CIRCUITS: Record<string, CircuitDef> = {
  miami:       MIAMI,
  monaco:      MONACO,
  montecarlo:  MONACO,    // OpenF1 returns "Monte Carlo"
  silverstone: SILVERSTONE,
  monza:       MONZA,
  spa:         SPA,
};

function getCircuit(circuitName: string | undefined, location?: string | undefined): CircuitDef {
  for (const name of [circuitName, location]) {
    if (!name) continue;
    const key = name.toLowerCase().replace(/[^a-z]/g, '');
    if (CIRCUITS[key]) return CIRCUITS[key];
    for (const [k, def] of Object.entries(CIRCUITS)) {
      if (key.includes(k) || k.includes(key)) return def;
    }
  }
  return GENERIC;
}

// ─── GPS → SVG coordinate mapping ────────────────────────────────────────────
function normalizeGps(
  x: number, y: number,
  bounds: PosBounds,
  vbW: number, vbH: number,
): [number, number] {
  const pad    = 52;
  const rangeX = bounds.maxX - bounds.minX || 1;
  const rangeY = bounds.maxY - bounds.minY || 1;
  const availW = vbW - pad * 2;
  const availH = vbH - pad * 2;
  const scale  = Math.min(availW / rangeX, availH / rangeY);
  const offX   = pad + (availW - rangeX * scale) / 2;
  const offY   = pad + (availH - rangeY * scale) / 2;
  // Flip Y: GPS y increases upward, SVG y increases downward
  return [
    offX + (x - bounds.minX) * scale,
    offY + (bounds.maxY - y) * scale,
  ];
}

// ─── Tooltip ──────────────────────────────────────────────────────────────────
function Tooltip({
  cx, cy, d, vbWidth, vbHeight,
}: { cx: number; cy: number; d: Driver; vbWidth: number; vbHeight: number }) {
  const color     = TEAM_COLORS[d.code] ?? '#fff';
  const tireColor = TIRE_COLORS[d.tire] ?? '#fff';
  const W = 110, H = 74;

  const tx = cx > vbWidth  * 0.65 ? cx - W - 14 : cx + 14;
  const ty = cy > vbHeight * 0.82 ? cy - H - 8  : cy + 4;

  return (
    <g pointerEvents="none" style={{ animation: 'fade-in 0.08s ease' }}>
      <rect x={tx + 2} y={ty + 2} width={W} height={H} rx={4} fill="rgba(0,0,0,0.7)" />
      <rect x={tx} y={ty} width={W} height={H} rx={4}
        fill="#0e1016" stroke={color} strokeWidth={0.8} strokeOpacity={0.55} />
      <rect x={tx} y={ty} width={3} height={H} rx={2} fill={color} />

      <text x={tx + 10} y={ty + 19} fontSize={13}
        fontFamily="'JetBrains Mono', monospace" fontWeight="700" fill={color}>
        {d.code}
      </text>
      <text x={tx + 10} y={ty + 32} fontSize={8}
        fontFamily="'JetBrains Mono', monospace" fill="#9ca3af">
        {d.name.split(' ').slice(-1)[0]}
      </text>
      <text x={tx + 10} y={ty + 44} fontSize={8}
        fontFamily="'JetBrains Mono', monospace" fill="#6b7280">
        P{d.pos} · {d.gap}
      </text>
      <text x={tx + 10} y={ty + 56} fontSize={8}
        fontFamily="'JetBrains Mono', monospace"
        fill={d.fastestLap ? '#9B59FF' : '#4b5563'}>
        {d.lastLap}
      </text>
      <text x={tx + 10} y={ty + 68} fontSize={7}
        fontFamily="'JetBrains Mono', monospace" fill="#3d4356">
        {d.pitCount} stop{d.pitCount !== 1 ? 's' : ''}
      </text>

      <circle cx={tx + W - 18} cy={ty + 30} r={13} fill={tireColor} />
      <text x={tx + W - 18} y={ty + 33} textAnchor="middle"
        fontSize={9} fontFamily="'JetBrains Mono', monospace"
        fontWeight="700" fill="#000">
        {d.tire}
      </text>
      <text x={tx + W - 18} y={ty + 47} textAnchor="middle"
        fontSize={7} fontFamily="'JetBrains Mono', monospace" fill={tireColor}>
        {d.laps}L
      </text>
    </g>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
type AnimState = Record<string, 'gain' | 'loss'>;

export const TrackMap = React.memo(function TrackMap() {
  const liveDrivers  = useLiveStore(s => s.drivers);
  const simDrivers   = useRaceStore(s => s.drivers);
  const liveEvents   = useLiveStore(s => s.events);
  const simEvents    = useRaceStore(s => s.events);
  const session      = useLiveStore(s => s.session);
  const carPositions = useLiveStore(s => s.carPositions);
  const posBounds    = useLiveStore(s => s._posBounds);
  const numToCode    = useLiveStore(s => s._numToCode);

  const drivers = liveDrivers.length > 0 ? liveDrivers : simDrivers;
  const events  = liveEvents.length  > 0 ? liveEvents  : simEvents;

  const circuit = useMemo(
    () => getCircuit(session?.circuitName, session?.location),
    [session?.circuitName, session?.location],
  );

  const [vbW, vbH] = useMemo(() => {
    const [, , w, h] = circuit.viewBox.split(' ').map(Number);
    return [w, h];
  }, [circuit.viewBox]);

  // True when GPS bounds are stable and we have positions for most of the grid
  const hasGps = useMemo(() => {
    if (!posBounds) return false;
    const rangeX = posBounds.maxX - posBounds.minX;
    const rangeY = posBounds.maxY - posBounds.minY;
    return Object.keys(carPositions).length >= 5 && rangeX > 0 && rangeY > 0;
  }, [carPositions, posBounds]);

  // Reverse lookup: driver code → driver_number
  const codeToNum = useMemo(() => {
    const map: Record<string, number> = {};
    for (const [num, code] of Object.entries(numToCode)) map[code] = Number(num);
    return map;
  }, [numToCode]);

  const [hoveredCode, setHoveredCode]       = useState<string | null>(null);
  const [animatedCars, setAnimatedCars]     = useState<AnimState>({});
  const [eventHighlight, setEventHighlight] = useState<Set<string>>(new Set());

  const prevDriversRef = useRef<Driver[]>([]);

  const driverByCode = useMemo(
    () => Object.fromEntries(drivers.map(d => [d.code, d])),
    [drivers],
  );

  const codeToXY = useMemo(() => {
    const map: Record<string, [number, number]> = {};
    for (const d of drivers) {
      let xy: [number, number] | null = null;

      if (hasGps && posBounds) {
        const num = codeToNum[d.code];
        const gps = num != null ? carPositions[num] : undefined;
        if (gps) xy = normalizeGps(gps.x, gps.y, posBounds, vbW, vbH);
      }

      if (!xy) {
        const idx = d.pos - 1;
        if (idx >= 0 && idx < circuit.positions.length) xy = circuit.positions[idx];
      }

      if (xy) map[d.code] = xy;
    }
    return map;
  }, [drivers, hasGps, carPositions, posBounds, codeToNum, circuit.positions, vbW, vbH]);

  useEffect(() => {
    const changes: AnimState = {};
    for (const d of drivers) {
      const prev = prevDriversRef.current.find(p => p.code === d.code);
      if (prev && prev.pos !== d.pos) {
        changes[d.code] = d.pos < prev.pos ? 'gain' : 'loss';
      }
    }
    prevDriversRef.current = drivers;
    if (!Object.keys(changes).length) return;
    setAnimatedCars(changes);
    const t = setTimeout(() => setAnimatedCars({}), 1400);
    return () => clearTimeout(t);
  }, [drivers]);

  useEffect(() => {
    const fresh = events.find(e => e.type === 'overtake' && e.fresh);
    if (!fresh) return;
    const codes = (fresh.text.match(/\b[A-Z]{3}\b/g) ?? [])
      .filter(c => c in driverByCode);
    if (!codes.length) return;
    setEventHighlight(new Set(codes));
    const t = setTimeout(() => setEventHighlight(new Set()), 2000);
    return () => clearTimeout(t);
  }, [events, driverByCode]);

  const [sfX1, sfY1, sfX2, sfY2] = circuit.sfLine;

  return (
    <div className="relative w-full h-full overflow-hidden" style={{ background: '#06070c' }}>
      <svg
        viewBox={circuit.viewBox}
        preserveAspectRatio="xMidYMid meet"
        className="w-full h-full"
      >
        <defs>
          <linearGradient id="track-grad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%"   stopColor="#2a2e4a" />
            <stop offset="100%" stopColor="#1e2138" />
          </linearGradient>
          <filter id="car-glow-green" x="-80%" y="-80%" width="260%" height="260%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feFlood floodColor="#00FF87" floodOpacity="0.7" result="c" />
            <feComposite in="c" in2="blur" operator="in" result="g" />
            <feMerge><feMergeNode in="g" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          <filter id="car-glow-red" x="-80%" y="-80%" width="260%" height="260%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feFlood floodColor="#FF1801" floodOpacity="0.7" result="c" />
            <feComposite in="c" in2="blur" operator="in" result="g" />
            <feMerge><feMergeNode in="g" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>

        {/* ── Circuit infield fill ─────────────────────────────────────────── */}
        <path d={circuit.path} fill="#0b0d18" stroke="none" />

        {/* ── Track layers ─────────────────────────────────────────────────── */}
        <path d={circuit.path} fill="none" stroke="#06070c"            strokeWidth={38} strokeLinejoin="round" strokeLinecap="round" />
        <path d={circuit.path} fill="none" stroke="#1a1c2e"            strokeWidth={30} strokeLinejoin="round" strokeLinecap="round" />
        <path d={circuit.path} fill="none" stroke="url(#track-grad)"   strokeWidth={22} strokeLinejoin="round" strokeLinecap="round" />
        <path d={circuit.path} fill="none" stroke="#343860"            strokeWidth={14} strokeLinejoin="round" strokeLinecap="round" />
        <path d={circuit.path} fill="none" stroke="#3d4370"            strokeWidth={8}  strokeLinejoin="round" strokeLinecap="round" />
        <path d={circuit.path} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={24} strokeLinejoin="round" strokeLinecap="round" />
        <path d={circuit.path} fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth={1.5}
          strokeLinejoin="round" strokeLinecap="round" strokeDasharray="10 9" />

        {/* ── DRS zones ────────────────────────────────────────────────────── */}
        {circuit.drsZones.map((z, i) => (
          <g key={i}>
            <rect x={z.x} y={z.y} width={z.w} height={z.h} fill="#0093CC" opacity={0.22} rx={3} />
            <rect x={z.x} y={z.y} width={z.w} height={z.h} fill="none" stroke="#0093CC" strokeWidth={0.8} opacity={0.4} rx={3} />
          </g>
        ))}

        {/* ── Sector markers ───────────────────────────────────────────────── */}
        {circuit.sectors.map(m => (
          <g key={m.label}>
            <circle cx={m.x} cy={m.y} r={12} fill={m.color} opacity={0.15} />
            <circle cx={m.x} cy={m.y} r={9}  fill={m.color} opacity={0.92} />
            <text x={m.x} y={m.y + 0.5} textAnchor="middle" dominantBaseline="middle"
              fontSize={7} fontFamily="monospace" fontWeight="700" fill="#000">
              {m.label}
            </text>
          </g>
        ))}

        {/* ── Start/finish line ─────────────────────────────────────────────── */}
        <line x1={sfX1} y1={sfY1} x2={sfX2} y2={sfY2}
          stroke="#ffffff" strokeWidth={2.5} opacity={0.55} />
        <rect x={sfX1 - 4} y={sfY1} width={4} height={4} fill="#fff" opacity={0.4} />
        <rect x={sfX1}     y={sfY1 + 4} width={4} height={4} fill="#fff" opacity={0.4} />
        <rect x={sfX1 - 4} y={sfY1 + 8} width={4} height={4} fill="#fff" opacity={0.4} />

        {/* ── Car dots ─────────────────────────────────────────────────────── */}
        {drivers.map(d => {
          const xy = codeToXY[d.code];
          if (!xy) return null;
          const [cx, cy] = xy;
          const color     = TEAM_COLORS[d.code] ?? '#ffffff';
          const isHovered = hoveredCode === d.code;
          const anim      = animatedCars[d.code];
          const isEvent   = eventHighlight.has(d.code);
          const baseR     = d.pos <= 3 ? 10 : 7;
          const r         = isHovered ? baseR + 2.5 : baseR;
          const glowFilter = anim === 'gain' || isEvent ? 'url(#car-glow-green)'
            : anim === 'loss' ? 'url(#car-glow-red)' : undefined;

          return (
            <g
              key={d.code}
              onMouseEnter={() => setHoveredCode(d.code)}
              onMouseLeave={() => setHoveredCode(null)}
              style={{ cursor: 'pointer' }}
            >
              <circle cx={cx} cy={cy} r={baseR + 5} fill={color} opacity={0.07} />
              {isHovered && (
                <circle cx={cx} cy={cy} r={r + 7}
                  fill="none" stroke={color} strokeWidth={1.5} opacity={0.5} />
              )}
              {anim === 'gain' && (
                <circle cx={cx} cy={cy} r={r + 4}
                  fill="none" stroke="#00FF87" strokeWidth={2}
                  style={{ transformBox: 'fill-box', transformOrigin: 'center',
                    animation: 'ring-gain 1.4s ease-out forwards' }} />
              )}
              {anim === 'loss' && (
                <circle cx={cx} cy={cy} r={r + 4}
                  fill="none" stroke="#FF1801" strokeWidth={2}
                  style={{ transformBox: 'fill-box', transformOrigin: 'center',
                    animation: 'ring-loss 1.4s ease-out forwards' }} />
              )}
              {isEvent && !anim && (
                <circle cx={cx} cy={cy} r={r + 5}
                  fill="none" stroke="#00FF87" strokeWidth={1.5}
                  style={{ transformBox: 'fill-box', transformOrigin: 'center',
                    animation: 'ring-gain 2s ease-out forwards', opacity: 0.8 }} />
              )}
              <circle cx={cx} cy={cy + 1} r={r - 1} fill="rgba(0,0,0,0.35)" />
              <circle
                cx={cx} cy={cy} r={r}
                fill={color}
                stroke={d.fastestLap ? '#9B59FF' : 'rgba(0,0,0,0.7)'}
                strokeWidth={d.fastestLap ? 2.5 : 1}
                filter={glowFilter}
                style={{ filter: isHovered ? `drop-shadow(0 0 7px ${color})` : undefined }}
              />
              <circle cx={cx - r * 0.3} cy={cy - r * 0.3} r={r * 0.28}
                fill="rgba(255,255,255,0.25)" />
              {d.pos <= 3 && (
                <text x={cx} y={cy + 0.5} textAnchor="middle" dominantBaseline="middle"
                  fontSize={7} fontFamily="'JetBrains Mono', monospace"
                  fontWeight="700" fill="rgba(0,0,0,0.7)"
                  style={{ pointerEvents: 'none', userSelect: 'none' }}>
                  {d.pos}
                </text>
              )}
              {(d.pos <= 5 || isHovered) && (
                <text
                  x={cx} y={cy - r - 5}
                  textAnchor="middle"
                  fontSize={isHovered ? 11 : 9}
                  fontFamily="'JetBrains Mono', monospace"
                  fontWeight="700"
                  fill={color}
                  stroke="#06070c"
                  strokeWidth={2.5}
                  paintOrder="stroke"
                  style={{ pointerEvents: 'none', userSelect: 'none' }}>
                  {d.code}
                </text>
              )}
            </g>
          );
        })}

        {/* ── Tooltip ──────────────────────────────────────────────────────── */}
        {hoveredCode && driverByCode[hoveredCode] && codeToXY[hoveredCode] && (
          <Tooltip
            cx={codeToXY[hoveredCode][0]}
            cy={codeToXY[hoveredCode][1]}
            d={driverByCode[hoveredCode]}
            vbWidth={vbW}
            vbHeight={vbH}
          />
        )}

        {/* ── Generic circuit name overlay ──────────────────────────────────── */}
        {circuit === GENERIC && (
          <g>
            <text x={vbW / 2} y={vbH / 2 - 8} textAnchor="middle"
              fontSize={16} fontFamily="'JetBrains Mono', monospace"
              fontWeight="700" fill="#3d4460" letterSpacing="1">
              {session?.circuitName ?? '—'}
            </text>
            <text x={vbW / 2} y={vbH / 2 + 12} textAnchor="middle"
              fontSize={8} fontFamily="monospace" fill="#272b3b">
              no layout available
            </text>
          </g>
        )}

        {/* ── Corner labels ─────────────────────────────────────────────────── */}
        {circuit.corners.map((c, i) => (
          <text key={i} x={c.x} y={c.y} fontSize={7} fontFamily="monospace" fill="#3d4356"
            textAnchor="middle">
            {c.label}
          </text>
        ))}

        {/* ── DRS legend ─────────────────────────────────────────────────────── */}
        <g transform={`translate(8, ${vbH - 14})`}>
          <rect x={0} y={0} width={9} height={9} fill="#0093CC" opacity={0.6} rx={1.5} />
          <text x={12} y={8} fontSize={7} fontFamily="monospace" fill="#3d4356">DRS Zone</text>
        </g>

        {/* ── GPS / fallback indicator ───────────────────────────────────────── */}
        <g transform={`translate(${vbW - 8}, ${vbH - 14})`}>
          <circle cx={-4} cy={4} r={3.5}
            fill={hasGps ? '#00FF87' : '#6b7280'}
            opacity={hasGps ? 0.9 : 0.5}>
            {hasGps && (
              <animate attributeName="opacity" values="0.9;0.4;0.9" dur="2s" repeatCount="indefinite" />
            )}
          </circle>
          <text x={-12} y={8} fontSize={7} fontFamily="monospace"
            fill={hasGps ? '#00FF87' : '#4b5563'} textAnchor="end" opacity={hasGps ? 0.8 : 0.4}>
            {hasGps ? 'GPS LIVE' : 'POSITION'}
          </text>
        </g>
      </svg>
    </div>
  );
});
