import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useRaceStore } from '../../store/raceStore';
import { useLiveStore } from '../../store/liveStore';
import type { PosBounds } from '../../store/liveStore';
import { TEAM_COLORS, TIRE_COLORS } from '../../data/f1Data';
import type { Driver } from '../../types';

// Circuit definition type
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

// Miami International Autodrome
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

// Monaco Circuit de Monaco
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

// Silverstone Circuit
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

// Autodromo Nazionale Monza
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

// Circuit Spa-Francorchamps
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

// Autodromo Enzo e Dino Ferrari (Imola)
const IMOLA: CircuitDef = {
  name:    'Autodromo Enzo e Dino Ferrari',
  viewBox: '0 0 580 490',
  path:
    'M 480 390 L 120 390 ' +
    'C 90 390 72 375 68 350 ' +
    'L 64 270 ' +
    'C 62 240 70 212 86 194 ' +
    'C 102 176 124 170 142 178 ' +
    'C 160 186 168 206 162 224 ' +
    'C 156 242 138 250 120 244 ' +
    'L 96 236 ' +
    'C 78 228 68 208 72 186 ' +
    'L 80 140 ' +
    'C 84 116 98 98 118 90 ' +
    'C 138 82 162 86 178 100 ' +
    'L 260 100 ' +
    'C 288 100 312 108 328 124 ' +
    'C 344 140 348 162 340 182 ' +
    'C 332 202 316 214 298 216 ' +
    'C 280 218 264 208 258 192 ' +
    'C 252 176 258 158 272 150 ' +
    'C 286 142 304 146 312 160 ' +
    'L 340 200 ' +
    'C 352 224 356 252 348 278 ' +
    'L 440 278 ' +
    'C 468 278 490 292 500 314 ' +
    'C 510 336 506 362 492 376 ' +
    'C 490 384 486 390 480 390 Z',
  positions: [
    [440, 390], [380, 390], [318, 390], [254, 390],
    [190, 390], [80 , 370], [64 , 306], [66 , 238],
    [100, 196], [140, 224], [82 , 186], [84 , 130],
    [142, 90 ], [210, 100], [282, 104], [326, 136],
    [304, 200], [262, 196], [284, 152], [348, 246],
    [448, 280], [494, 346],
  ],
  drsZones: [
    { x: 124, y: 382, w: 352, h: 16 },
    { x: 348, y: 270, w: 90,  h: 16 },
  ],
  sectors: [
    { x: 320, y: 128, label: 'S1', color: '#FF1801' },
    { x: 88,  y: 182, label: 'S2', color: '#FFC906' },
    { x: 444, y: 382, label: 'S3', color: '#00FF87' },
  ],
  corners: [
    { x: 64,  y: 352, label: 'RIVAZZA' },
    { x: 164, y: 224, label: 'ACQUE MIN.' },
    { x: 286, y: 152, label: 'PIRATELLA' },
    { x: 498, y: 360, label: 'VARIANTE BASSA' },
  ],
  sfLine: [478, 382, 478, 398],
};

// Circuit de Barcelona-Catalunya
const BARCELONA: CircuitDef = {
  name:    'Circuit de Barcelona-Catalunya',
  viewBox: '0 0 580 490',
  path:
    'M 100 420 L 470 420 ' +
    'C 506 420 520 400 520 372 ' +
    'C 520 344 506 318 488 304 ' +
    'C 470 290 460 268 464 244 ' +
    'C 468 220 484 202 502 196 ' +
    'C 520 190 534 198 536 216 ' +
    'C 538 234 526 248 508 248 ' +
    'C 490 248 478 234 480 216 ' +
    'C 482 198 498 190 514 196 ' +
    'L 490 164 ' +
    'C 472 148 448 140 424 140 ' +
    'L 280 140 ' +
    'C 252 140 232 150 220 168 ' +
    'C 208 186 208 210 218 228 ' +
    'C 228 246 246 254 266 252 ' +
    'C 286 250 300 234 298 214 ' +
    'C 296 194 280 184 262 188 ' +
    'L 236 210 ' +
    'C 218 224 210 248 214 272 ' +
    'L 168 320 ' +
    'C 156 344 144 370 130 396 ' +
    'C 118 410 108 420 100 420 Z',
  positions: [
    [150, 420], [210, 420], [278, 420], [348, 420],
    [418, 420], [514, 378], [504, 280], [518, 210],
    [510, 240], [488, 224], [486, 164], [424, 142],
    [350, 142], [278, 142], [218, 164], [210, 228],
    [268, 252], [280, 200], [242, 210], [212, 262],
    [172, 316], [128, 390],
  ],
  drsZones: [
    { x: 104, y: 412, w: 362, h: 16 },
    { x: 224, y: 132, w: 200, h: 16 },
  ],
  sectors: [
    { x: 516, y: 376, label: 'S1', color: '#FF1801' },
    { x: 264, y: 258, label: 'S2', color: '#FFC906' },
    { x: 100, y: 412, label: 'S3', color: '#00FF87' },
  ],
  corners: [
    { x: 518, y: 418, label: 'T1' },
    { x: 518, y: 198, label: 'T5' },
    { x: 298, y: 250, label: 'T10 LA CAIXA' },
    { x: 132, y: 388, label: 'T16' },
  ],
  sfLine: [104, 412, 104, 428],
};

// ─── Circuit de Monaco (placeholder for city street layout already defined above) ─
// Red Bull Ring
const RED_BULL_RING: CircuitDef = {
  name:    'Red Bull Ring',
  viewBox: '0 0 580 490',
  path:
    'M 160 400 L 400 400 ' +
    'C 432 400 452 384 456 356 ' +
    'L 460 260 ' +
    'C 462 240 476 224 494 220 ' +
    'C 512 216 528 228 530 248 ' +
    'C 532 268 518 284 498 284 ' +
    'C 478 284 464 268 466 248 ' +
    'L 472 200 ' +
    'C 476 168 470 140 454 120 ' +
    'C 438 100 414 90 388 92 ' +
    'L 300 92 ' +
    'C 272 92 250 104 238 124 ' +
    'C 226 144 226 170 238 190 ' +
    'L 248 240 ' +
    'C 254 268 248 298 232 318 ' +
    'L 186 374 ' +
    'C 178 388 170 398 160 400 Z',
  positions: [
    [200, 400], [254, 400], [312, 400], [372, 400],
    [454, 380], [460, 286], [494, 258], [530, 260],
    [494, 284], [470, 206], [452, 116], [388, 92],
    [330, 92 ], [264, 94 ], [238, 148], [238, 196],
    [250, 252], [236, 308], [196, 366], [166, 398],
    [244, 400], [340, 400],
  ],
  drsZones: [
    { x: 164, y: 392, w: 232, h: 16 },
    { x: 298, y: 84,  w: 90,  h: 16 },
  ],
  sectors: [
    { x: 462, y: 290, label: 'S1', color: '#FF1801' },
    { x: 240, y: 240, label: 'S2', color: '#FFC906' },
    { x: 164, y: 392, label: 'S3', color: '#00FF87' },
  ],
  corners: [
    { x: 456, y: 398, label: 'T1 CASTROL' },
    { x: 530, y: 248, label: 'T3' },
    { x: 238, y: 168, label: 'T6 RINDT' },
    { x: 192, y: 364, label: 'T9 RINDT' },
  ],
  sfLine: [162, 392, 162, 408],
};

// Circuit Zandvoort
const ZANDVOORT: CircuitDef = {
  name:    'Circuit Zandvoort',
  viewBox: '0 0 580 490',
  path:
    'M 170 400 L 400 400 ' +
    'C 440 400 468 380 476 344 ' +
    'L 490 240 ' +
    'C 498 200 520 176 546 170 ' +
    'C 546 166 542 160 534 158 ' +
    'C 520 154 504 164 498 180 ' +
    'C 492 196 498 214 512 222 ' +
    'C 526 230 542 224 548 210 ' +
    'L 530 136 ' +
    'C 520 100 496 76 464 64 ' +
    'C 432 52 396 54 368 68 ' +
    'L 250 68 ' +
    'C 216 68 188 82 170 106 ' +
    'C 152 130 148 162 158 192 ' +
    'L 148 290 ' +
    'C 144 330 150 366 164 390 ' +
    'C 166 396 168 400 170 400 Z',
  positions: [
    [210, 400], [272, 400], [336, 400], [398, 400],
    [474, 358], [488, 256], [534, 180], [522, 222],
    [498, 196], [524, 142], [464, 66 ], [394, 56 ],
    [314, 66 ], [248, 68 ], [174, 104], [152, 162],
    [150, 228], [148, 290], [150, 350], [162, 390],
    [280, 402], [370, 402],
  ],
  drsZones: [
    { x: 174, y: 392, w: 222, h: 16 },
    { x: 254, y: 60,  w: 114, h: 16 },
  ],
  sectors: [
    { x: 490, y: 242, label: 'S1', color: '#FF1801' },
    { x: 152, y: 180, label: 'S2', color: '#FFC906' },
    { x: 174, y: 392, label: 'S3', color: '#00FF87' },
  ],
  corners: [
    { x: 474, y: 398, label: 'T1 TARZAN' },
    { x: 544, y: 176, label: 'T3 HUGENHOLTZ' },
    { x: 154, y: 136, label: 'T8' },
    { x: 148, y: 364, label: 'T14 ARIE LUYENDYK' },
  ],
  sfLine: [172, 392, 172, 408],
};

// Hungaroring
const BUDAPEST: CircuitDef = {
  name:    'Hungaroring',
  viewBox: '0 0 580 490',
  path:
    'M 120 300 L 420 300 ' +
    'C 456 300 480 280 484 248 ' +
    'C 488 216 468 188 440 182 ' +
    'C 412 176 386 194 380 222 ' +
    'C 374 250 390 278 416 284 ' +
    'C 442 290 466 274 470 248 ' +
    'L 462 188 ' +
    'C 450 144 422 112 384 98 ' +
    'C 346 84 304 88 272 108 ' +
    'L 210 142 ' +
    'C 180 158 164 184 164 212 ' +
    'C 164 240 180 264 204 274 ' +
    'L 168 312 ' +
    'C 152 332 136 356 124 380 ' +
    'C 120 388 118 296 120 300 Z',
  positions: [
    [164, 300], [218, 300], [278, 300], [340, 300],
    [402, 300], [480, 248], [442, 186], [380, 224],
    [414, 282], [464, 192], [460, 136], [386, 98 ],
    [320, 88 ], [260, 100], [210, 140], [166, 212],
    [200, 272], [172, 308], [152, 344], [124, 378],
    [310, 302], [370, 302],
  ],
  drsZones: [
    { x: 124, y: 292, w: 292, h: 16 },
    { x: 276, y: 82,  w: 108, h: 16 },
  ],
  sectors: [
    { x: 482, y: 246, label: 'S1', color: '#FF1801' },
    { x: 166, y: 210, label: 'S2', color: '#FFC906' },
    { x: 124, y: 292, label: 'S3', color: '#00FF87' },
  ],
  corners: [
    { x: 422, y: 298, label: 'T1' },
    { x: 482, y: 244, label: 'T2' },
    { x: 166, y: 210, label: 'T6' },
    { x: 128, y: 372, label: 'T11' },
  ],
  sfLine: [122, 292, 122, 308],
};

// Baku City Circuit
const BAKU: CircuitDef = {
  name:    'Baku City Circuit',
  viewBox: '0 0 580 490',
  path:
    'M 80 380 L 480 380 ' +
    'C 514 380 530 362 530 332 ' +
    'L 530 240 ' +
    'C 530 220 520 204 504 196 ' +
    'C 488 188 470 192 458 204 ' +
    'C 446 216 442 234 450 250 ' +
    'C 458 266 476 272 492 264 ' +
    'L 504 240 ' +
    'L 504 160 ' +
    'C 504 100 480 68 444 56 ' +
    'L 380 56 ' +
    'C 356 56 340 68 334 88 ' +
    'C 328 108 334 132 350 144 ' +
    'L 370 156 ' +
    'C 390 168 400 190 396 214 ' +
    'L 380 280 ' +
    'C 372 308 348 328 318 334 ' +
    'L 196 334 ' +
    'C 166 334 142 316 132 290 ' +
    'L 92 188 ' +
    'C 82 166 80 148 82 130 ' +
    'L 82 80 ' +
    'C 82 60 94 52 80 56 ' +
    'L 80 380 Z',
  positions: [
    [148, 380], [216, 380], [294, 380], [378, 380],
    [458, 380], [530, 320], [490, 240], [468, 208],
    [492, 264], [502, 180], [494, 100], [444, 58 ],
    [386, 58 ], [342, 90 ], [360, 148], [392, 210],
    [378, 278], [318, 334], [246, 334], [178, 334],
    [96 , 204], [80 , 140],
  ],
  drsZones: [
    { x: 84,  y: 372, w: 392, h: 16 },
    { x: 508, y: 152, w: 0,   h: 80 },
  ],
  sectors: [
    { x: 530, y: 330, label: 'S1', color: '#FF1801' },
    { x: 318, y: 332, label: 'S2', color: '#FFC906' },
    { x: 84,  y: 372, label: 'S3', color: '#00FF87' },
  ],
  corners: [
    { x: 480, y: 378, label: 'T1' },
    { x: 494, y: 262, label: 'T3' },
    { x: 346, y: 142, label: 'CASTLE' },
    { x: 80,  y: 136, label: 'T20' },
  ],
  sfLine: [82, 372, 82, 388],
};

// Marina Bay Street Circuit (Singapore)
const SINGAPORE: CircuitDef = {
  name:    'Marina Bay Street Circuit',
  viewBox: '0 0 580 490',
  path:
    'M 100 380 L 340 380 ' +
    'C 370 380 392 362 398 334 ' +
    'C 404 306 390 278 366 268 ' +
    'C 342 258 318 268 308 290 ' +
    'C 298 312 308 338 330 346 ' +
    'C 352 354 374 342 380 320 ' +
    'L 420 240 ' +
    'C 434 210 434 174 420 144 ' +
    'L 400 100 ' +
    'C 388 74 366 58 340 54 ' +
    'L 270 54 ' +
    'C 244 54 222 68 210 90 ' +
    'L 186 148 ' +
    'C 174 172 160 192 142 208 ' +
    'L 108 238 ' +
    'C 88 254 76 278 76 304 ' +
    'L 76 350 ' +
    'C 76 368 86 380 100 380 Z',
  positions: [
    [140, 380], [196, 380], [256, 380], [320, 380],
    [390, 348], [340, 268], [308, 308], [372, 320],
    [420, 220], [416, 158], [400, 104], [340, 56 ],
    [282, 54 ], [212, 88 ], [188, 148], [160, 198],
    [118, 234], [84 , 276], [78 , 322], [78 , 360],
    [240, 382], [310, 382],
  ],
  drsZones: [
    { x: 104, y: 372, w: 232, h: 16 },
    { x: 394, y: 188, w: 24,  h: 56 },
  ],
  sectors: [
    { x: 398, y: 330, label: 'S1', color: '#FF1801' },
    { x: 80,  y: 298, label: 'S2', color: '#FFC906' },
    { x: 104, y: 372, label: 'S3', color: '#00FF87' },
  ],
  corners: [
    { x: 340, y: 378, label: 'T1' },
    { x: 338, y: 268, label: 'T10' },
    { x: 270, y: 54 , label: 'T14' },
    { x: 80,  y: 300, label: 'T18' },
  ],
  sfLine: [102, 372, 102, 388],
};

// Circuit of the Americas
const COTA: CircuitDef = {
  name:    'Circuit of the Americas',
  viewBox: '0 0 580 490',
  path:
    'M 100 420 L 440 420 ' +
    'C 474 420 496 400 500 368 ' +
    'C 504 336 488 306 462 294 ' +
    'C 436 282 410 292 398 316 ' +
    'L 374 380 ' +
    'C 362 406 340 420 314 420 ' +
    'L 296 420 ' +
    'C 270 420 250 406 240 382 ' +
    'L 224 336 ' +
    'C 214 310 196 290 174 278 ' +
    'L 144 262 ' +
    'C 118 248 104 222 104 194 ' +
    'L 104 140 ' +
    'C 104 112 116 88 136 72 ' +
    'L 200 60 ' +
    'C 232 52 268 56 296 72 ' +
    'C 324 88 340 116 340 148 ' +
    'L 344 200 ' +
    'C 346 228 360 252 382 264 ' +
    'L 450 280 ' +
    'C 480 288 500 308 506 336 ' +
    'L 508 260 ' +
    'C 510 232 520 208 538 192 ' +
    'C 522 182 518 164 522 144 ' +
    'C 528 120 548 106 570 106 ' +
    'L 560 80 ' +
    'C 548 60 528 50 506 52 ' +
    'C 484 54 466 68 460 90 ' +
    'L 450 148 ' +
    'C 444 174 426 194 402 202 ' +
    'L 360 216 ' +
    'C 338 224 324 244 324 268 ' +
    'L 318 300 ',
  positions: [
    [148, 420], [206, 420], [270, 420], [334, 420],
    [400, 420], [462, 354], [412, 298], [374, 376],
    [240, 390], [224, 346], [166, 278], [130, 218],
    [104, 158], [134, 74 ], [206, 60 ], [284, 64 ],
    [332, 108], [344, 170], [374, 260], [448, 276],
    [510, 284], [520, 196],
  ],
  drsZones: [
    { x: 104, y: 412, w: 332, h: 16 },
    { x: 340, y: 136, w: 12,  h: 70 },
  ],
  sectors: [
    { x: 502, y: 366, label: 'S1', color: '#FF1801' },
    { x: 108, y: 192, label: 'S2', color: '#FFC906' },
    { x: 104, y: 412, label: 'S3', color: '#00FF87' },
  ],
  corners: [
    { x: 436, y: 418, label: 'T1' },
    { x: 104, y: 148, label: 'T11' },
    { x: 200, y: 58 , label: 'T12' },
    { x: 344, y: 196, label: 'T16 BACK STRAIGHT' },
  ],
  sfLine: [104, 412, 104, 428],
};

// Autodromo José Carlos Pace (Interlagos)
const INTERLAGOS: CircuitDef = {
  name:    'Autodromo José Carlos Pace',
  viewBox: '0 0 580 490',
  path:
    // Anti-clockwise circuit
    'M 440 380 L 440 160 ' +
    'C 440 124 420 100 390 92 ' +
    'L 330 80 ' +
    'C 300 74 272 82 254 102 ' +
    'C 236 122 232 150 244 174 ' +
    'L 270 224 ' +
    'C 284 252 280 284 262 306 ' +
    'C 244 328 218 338 192 332 ' +
    'C 166 326 148 306 148 280 ' +
    'L 148 234 ' +
    'C 148 208 158 186 176 172 ' +
    'C 194 158 218 154 238 162 ' +
    'C 258 170 270 190 266 212 ' +
    'C 262 234 244 246 224 242 ' +
    'C 204 238 192 220 196 200 ' +
    'L 210 160 ' +
    'C 222 128 246 106 278 98 ' +
    'L 140 100 ' +
    'C 108 100 84 118 72 146 ' +
    'C 60 174 64 208 82 232 ' +
    'L 100 270 ' +
    'C 112 300 112 334 100 362 ' +
    'L 90 390 ' +
    'C 104 408 130 420 162 420 ' +
    'L 400 420 ' +
    'C 424 420 440 402 440 380 Z',
  positions: [
    [440, 348], [440, 280], [440, 214], [440, 160],
    [396, 94 ], [324, 78 ], [248, 100], [264, 172],
    [270, 222], [250, 292], [186, 330], [148, 278],
    [148, 228], [196, 170], [230, 242], [208, 162],
    [268, 100], [160, 102], [80 , 138], [78 , 210],
    [96 , 268], [92 , 360],
  ],
  drsZones: [
    { x: 432, y: 152, w: 16, h: 230 },
    { x: 64,  y: 100, w: 76, h: 16  },
  ],
  sectors: [
    { x: 444, y: 100, label: 'S1', color: '#FF1801' },
    { x: 150, y: 278, label: 'S2', color: '#FFC906' },
    { x: 100, y: 382, label: 'S3', color: '#00FF87' },
  ],
  corners: [
    { x: 436, y: 158, label: 'SENNA S' },
    { x: 148, y: 282, label: 'DESCIDA' },
    { x: 80,  y: 144, label: 'SUBIDA' },
    { x: 90 , y: 388, label: 'JUNÇÃO' },
  ],
  sfLine: [434, 372, 446, 372],
};

// Yas Marina Circuit (Abu Dhabi)
const ABU_DHABI: CircuitDef = {
  name:    'Yas Marina Circuit',
  viewBox: '0 0 580 490',
  path:
    'M 100 360 L 440 360 ' +
    'C 470 360 488 340 490 312 ' +
    'L 490 260 ' +
    'C 490 240 478 222 460 216 ' +
    'C 442 210 424 218 416 234 ' +
    'L 396 288 ' +
    'C 388 312 368 330 344 334 ' +
    'L 296 334 ' +
    'C 270 334 250 316 246 290 ' +
    'L 240 244 ' +
    'C 234 218 216 198 192 192 ' +
    'L 148 182 ' +
    'C 120 176 100 156 96 128 ' +
    'L 92 88 ' +
    'C 90 64 102 46 122 40 ' +
    'L 220 40 ' +
    'C 248 40 272 52 286 72 ' +
    'L 308 110 ' +
    'C 322 130 346 142 372 142 ' +
    'L 440 142 ' +
    'C 470 142 492 122 496 92 ' +
    'C 500 62 480 38 450 34 ' +
    'C 420 30 394 50 390 80 ' +
    'C 386 110 408 136 438 138 ' +
    'L 476 130 ' +
    'C 504 122 520 96 514 68 ' +
    'L 530 160 ' +
    'C 534 188 526 216 508 234 ' +
    'L 500 290 ' +
    'C 498 312 506 340 520 358 ' +
    'L 520 420 ' +
    'C 520 444 500 460 474 460 ' +
    'L 160 460 ' +
    'C 130 460 106 442 100 416 ' +
    'L 100 360 Z',
  positions: [
    [148, 360], [210, 360], [278, 360], [348, 360],
    [488, 312], [462, 234], [408, 284], [344, 334],
    [278, 334], [244, 270], [180, 188], [104, 128],
    [90 , 80 ], [148, 40 ], [226, 40 ], [292, 88 ],
    [372, 142], [448, 142], [498, 92 ], [440, 136],
    [188, 460], [356, 460],
  ],
  drsZones: [
    { x: 104, y: 352, w: 332, h: 16 },
    { x: 286, y: 32,  w: 86,  h: 16 },
  ],
  sectors: [
    { x: 490, y: 310, label: 'S1', color: '#FF1801' },
    { x: 96,  y: 126, label: 'S2', color: '#FFC906' },
    { x: 104, y: 352, label: 'S3', color: '#00FF87' },
  ],
  corners: [
    { x: 440, y: 358, label: 'T1' },
    { x: 490, y: 256, label: 'T5' },
    { x: 92,  y: 86 , label: 'T9' },
    { x: 494, y: 90 , label: 'T11' },
  ],
  sfLine: [102, 352, 102, 368],
};

// Suzuka Circuit
const SUZUKA: CircuitDef = {
  name:    'Suzuka Circuit',
  viewBox: '0 0 580 490',
  path:
    // Iconic figure-8 layout
    'M 100 370 L 320 370 ' +
    'C 350 370 374 350 380 322 ' +
    'C 386 294 372 264 348 252 ' +
    'C 324 240 298 248 286 270 ' +
    'C 274 292 282 318 304 328 ' +
    'C 326 338 350 328 358 306 ' +
    'L 380 240 ' +
    'C 390 212 400 182 406 152 ' +
    'C 412 122 410 92 400 68 ' +
    'C 390 44 372 30 350 28 ' +
    'L 280 28 ' +
    'C 254 28 234 44 226 68 ' +
    'C 218 92 222 122 234 148 ' +
    'L 280 220 ' +
    'C 294 244 294 272 280 296 ' +
    'C 266 320 244 332 220 330 ' +
    'L 170 318 ' +
    'C 144 310 124 290 118 264 ' +
    'L 110 216 ' +
    'C 104 190 108 162 120 140 ' +
    'L 140 100 ' +
    'C 154 76 178 62 206 62 ' +
    'L 160 70 ' +
    'C 134 76 114 94 106 120 ' +
    'L 96 300 ' +
    'C 92 328 100 354 112 366 ' +
    'C 108 368 104 370 100 370 Z',
  positions: [
    [148, 370], [206, 370], [268, 370], [332, 370],
    [374, 322], [306, 274], [356, 306], [378, 244],
    [402, 176], [406, 108], [376, 48 ], [310, 28 ],
    [252, 28 ], [228, 68 ], [234, 136], [278, 218],
    [278, 282], [228, 326], [172, 318], [118, 272],
    [110, 210], [106, 154],
  ],
  drsZones: [
    { x: 104, y: 362, w: 212, h: 16 },
    { x: 226, y: 20,  w: 86,  h: 16 },
  ],
  sectors: [
    { x: 382, y: 244, label: 'S1', color: '#FF1801' },
    { x: 228, y: 320, label: 'S2', color: '#FFC906' },
    { x: 104, y: 362, label: 'S3', color: '#00FF87' },
  ],
  corners: [
    { x: 318, y: 368, label: 'T1 FIRST' },
    { x: 360, y: 304, label: 'CROSSOVER' },
    { x: 310, y: 28 , label: 'DEGNER' },
    { x: 116, y: 264, label: 'SPOON' },
  ],
  sfLine: [102, 362, 102, 378],
};

// Circuit Gilles Villeneuve (Montréal)
const MONTREAL: CircuitDef = {
  name:    'Circuit Gilles Villeneuve',
  viewBox: '0 0 580 490',
  path:
    // Main straight — very long, going right
    'M 80 430 L 455 430 ' +
    // T1 — right-hand sweeper at end of straight
    'C 494 430 516 412 516 380 ' +
    // T2-T3 chicane
    'L 515 346 ' +
    'C 514 326 527 309 541 299 ' +
    // Right side heading north — T4-T7 gentle sweepers
    'C 546 276 541 249 530 225 ' +
    'L 524 190 ' +
    'C 518 158 506 134 488 116 ' +
    // Top-right section curving left toward hairpin
    'L 438 100 ' +
    'C 398 88 354 84 318 88 ' +
    // Top section heading left
    'L 240 96 ' +
    'C 208 102 185 120 175 148 ' +
    // L\'Épingle — tight right-hand hairpin
    'C 157 177 152 209 166 235 ' +
    'C 180 261 205 273 228 268 ' +
    // Post-hairpin — curve east then turn south
    'C 252 264 264 256 264 292 ' +
    // Left side heading south — T9-T11
    'L 258 346 ' +
    'C 252 373 238 394 216 407 ' +
    // Wall of Champions chicane
    'C 194 419 163 427 138 426 ' +
    'C 120 425 108 422 110 430 ' +
    'L 90 430 ' +
    'L 80 430 Z',
  positions: [
    [130, 430], [195, 430], [268, 430], [352, 430],
    [510, 394], [514, 348], [538, 303], [530, 249],
    [524, 196], [505, 148], [456, 99 ],
    [384, 87 ], [298, 88 ], [238, 96 ],
    [175, 148], [162, 222], [216, 268],
    [260, 336], [250, 383], [215, 408],
    [148, 425], [92,  430],
  ],
  drsZones: [
    { x:  84, y: 422, w: 368, h: 16 },
    { x: 246, y:  82, w: 108, h: 14 },
  ],
  sectors: [
    { x: 526, y: 246, label: 'S1', color: '#FF1801' },
    { x: 162, y: 220, label: 'S2', color: '#FFC906' },
    { x: 148, y: 416, label: 'S3', color: '#00D2BE' },
  ],
  corners: [
    { x: 510, y: 382, label: 'T1'        },
    { x: 162, y: 214, label: "L'ÉPINGLE" },
    { x: 148, y: 425, label: 'WALL'      },
  ],
  sfLine: [268, 420, 268, 440],
};

// Generic oval fallback
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

// Circuit registry
const CIRCUITS: Record<string, CircuitDef> = {
  // Existing circuits
  miami:              MIAMI,
  monaco:             MONACO,
  montecarlo:         MONACO,       // OpenF1 "Monte Carlo"
  silverstone:        SILVERSTONE,
  monza:              MONZA,
  autodromo:          MONZA,        // "Autodromo Nazionale Monza"
  spa:                SPA,
  francorchamps:      SPA,
  // 2026 additions
  imola:              IMOLA,
  enzodino:           IMOLA,        // full name contains "Enzo e Dino"
  barcelona:          BARCELONA,
  catalunya:          BARCELONA,
  redbullring:        RED_BULL_RING,
  spielberg:          RED_BULL_RING, // location name for Red Bull Ring
  austria:            RED_BULL_RING,
  zandvoort:          ZANDVOORT,
  hungaroring:        BUDAPEST,
  budapest:           BUDAPEST,
  hungary:            BUDAPEST,
  baku:               BAKU,
  azerbaijan:         BAKU,
  singapore:          SINGAPORE,
  marinabay:          SINGAPORE,
  cota:               COTA,
  austin:             COTA,
  americas:           COTA,
  interlagos:         INTERLAGOS,
  saopaulopaulo:      INTERLAGOS,   // strip accents/spaces
  yasmarina:          ABU_DHABI,
  abudhabi:           ABU_DHABI,
  suzuka:             SUZUKA,
  japan:              SUZUKA,
  montreal:           MONTREAL,
  villeneuve:         MONTREAL,
  gillesvilleneuve:   MONTREAL,
  canada:             MONTREAL,
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

// GPS → SVG coordinate mapping
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

// Tooltip
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

// Main component
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

        {/* Circuit infield fill */}
        <path d={circuit.path} fill="#0b0d18" stroke="none" />

        {/* Track layers */}
        <path d={circuit.path} fill="none" stroke="#06070c"            strokeWidth={38} strokeLinejoin="round" strokeLinecap="round" />
        <path d={circuit.path} fill="none" stroke="#1a1c2e"            strokeWidth={30} strokeLinejoin="round" strokeLinecap="round" />
        <path d={circuit.path} fill="none" stroke="url(#track-grad)"   strokeWidth={22} strokeLinejoin="round" strokeLinecap="round" />
        <path d={circuit.path} fill="none" stroke="#343860"            strokeWidth={14} strokeLinejoin="round" strokeLinecap="round" />
        <path d={circuit.path} fill="none" stroke="#3d4370"            strokeWidth={8}  strokeLinejoin="round" strokeLinecap="round" />
        <path d={circuit.path} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={24} strokeLinejoin="round" strokeLinecap="round" />
        <path d={circuit.path} fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth={1.5}
          strokeLinejoin="round" strokeLinecap="round" strokeDasharray="10 9" />

        {/* DRS zones */}
        {circuit.drsZones.map((z, i) => (
          <g key={i}>
            <rect x={z.x} y={z.y} width={z.w} height={z.h} fill="#0093CC" opacity={0.22} rx={3} />
            <rect x={z.x} y={z.y} width={z.w} height={z.h} fill="none" stroke="#0093CC" strokeWidth={0.8} opacity={0.4} rx={3} />
          </g>
        ))}

        {/* Sector markers */}
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

        {/* Start/finish line */}
        <line x1={sfX1} y1={sfY1} x2={sfX2} y2={sfY2}
          stroke="#ffffff" strokeWidth={2.5} opacity={0.55} />
        <rect x={sfX1 - 4} y={sfY1} width={4} height={4} fill="#fff" opacity={0.4} />
        <rect x={sfX1}     y={sfY1 + 4} width={4} height={4} fill="#fff" opacity={0.4} />
        <rect x={sfX1 - 4} y={sfY1 + 8} width={4} height={4} fill="#fff" opacity={0.4} />

        {/* Car dots */}
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

        {/* Tooltip */}
        {hoveredCode && driverByCode[hoveredCode] && codeToXY[hoveredCode] && (
          <Tooltip
            cx={codeToXY[hoveredCode][0]}
            cy={codeToXY[hoveredCode][1]}
            d={driverByCode[hoveredCode]}
            vbWidth={vbW}
            vbHeight={vbH}
          />
        )}

        {/* Generic circuit name overlay */}
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

        {/* Corner labels */}
        {circuit.corners.map((c, i) => (
          <text key={i} x={c.x} y={c.y} fontSize={7} fontFamily="monospace" fill="#3d4356"
            textAnchor="middle">
            {c.label}
          </text>
        ))}

        {/* DRS legend */}
        <g transform={`translate(8, ${vbH - 14})`}>
          <rect x={0} y={0} width={9} height={9} fill="#0093CC" opacity={0.6} rx={1.5} />
          <text x={12} y={8} fontSize={7} fontFamily="monospace" fill="#3d4356">DRS Zone</text>
        </g>

        {/* GPS / fallback indicator */}
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
