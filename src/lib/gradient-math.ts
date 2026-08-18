import { converter, formatHex } from 'culori';

const toOklch = converter('oklch');

export interface GradientStop {
  hex: string;
  position: number;
}

export interface GradientSample extends GradientStop {}

export function shortestHueDelta(from: number, to: number): number {
  return ((to - from + 540) % 360) - 180;
}

function clampPosition(position: number): number {
  return Math.min(100, Math.max(0, position));
}

function sortedStops(stops: GradientStop[]): GradientStop[] {
  return [...stops].sort((a, b) => a.position - b.position);
}

function colorAtPosition(stops: GradientStop[], position: number): string {
  const ordered = sortedStops(stops);
  const first = ordered[0];
  const last = ordered.at(-1);
  if (!first || !last) throw new Error('At least one gradient stop is required');
  if (position <= first.position) return first.hex.toLowerCase();
  if (position >= last.position) return last.hex.toLowerCase();

  const rightIndex = ordered.findIndex((stop) => stop.position >= position);
  const right = ordered[rightIndex];
  const left = ordered[rightIndex - 1];
  if (position === right.position) return right.hex.toLowerCase();

  const from = toOklch(left.hex);
  const to = toOklch(right.hex);
  if (!from || !to) throw new Error('Invalid gradient color');

  const progress = (position - left.position) / (right.position - left.position);
  const fromHue = from.h ?? to.h ?? 0;
  const toHue = to.h ?? from.h ?? 0;
  const hue = (fromHue + shortestHueDelta(fromHue, toHue) * progress + 360) % 360;

  return formatHex({
    mode: 'oklch',
    l: from.l + (to.l - from.l) * progress,
    c: from.c + (to.c - from.c) * progress,
    h: hue,
  });
}

export function interpolateOklchStops(stops: GradientStop[], sampleCount: number): GradientSample[] {
  if (sampleCount < 2) throw new Error('At least two samples are required');
  return Array.from({ length: sampleCount }, (_, index) => {
    const position = (index / (sampleCount - 1)) * 100;
    return { hex: colorAtPosition(stops, position), position };
  });
}

function formatPosition(position: number): string {
  return Number.isInteger(position) ? `${position}` : `${Math.round(position * 100) / 100}`;
}

export function buildNativeCssGradient(stops: GradientStop[], angle: number): string {
  const colorStops = sortedStops(stops)
    .map((stop) => `${stop.hex} ${formatPosition(clampPosition(stop.position))}%`)
    .join(', ');
  return `linear-gradient(${formatPosition(angle)}deg in oklch shorter hue, ${colorStops})`;
}

export function buildCompatibleCssGradient(
  stops: GradientStop[],
  angle: number,
  sampleCount = 24,
): string {
  const colorStops = interpolateOklchStops(stops, sampleCount)
    .map((stop) => `${stop.hex} ${formatPosition(stop.position)}%`)
    .join(', ');
  return `linear-gradient(${formatPosition(angle)}deg, ${colorStops})`;
}

function roundCoordinate(value: number): number {
  const rounded = Math.round(value * 1000) / 1000;
  return Math.abs(rounded) < 0.0005 ? 0 : rounded;
}

export function toFlutterAlignment(angle: number): { begin: [number, number]; end: [number, number] } {
  const radians = (angle * Math.PI) / 180;
  const x = Math.sin(radians);
  const y = -Math.cos(radians);
  return {
    begin: [roundCoordinate(-x), roundCoordinate(-y)],
    end: [roundCoordinate(x), roundCoordinate(y)],
  };
}

export function toSwiftUiPoints(angle: number): { start: [number, number]; end: [number, number] } {
  const { begin, end } = toFlutterAlignment(angle);
  return {
    start: [roundCoordinate((begin[0] + 1) / 2), roundCoordinate((begin[1] + 1) / 2)],
    end: [roundCoordinate((end[0] + 1) / 2), roundCoordinate((end[1] + 1) / 2)],
  };
}

function flutterColor(hex: string): string {
  return `Color(0xFF${hex.replace('#', '').toUpperCase()})`;
}

function swiftColor(hex: string): string {
  const channels = hex.match(/[A-Fa-f0-9]{2}/g);
  if (!channels || channels.length !== 3) throw new Error('Invalid gradient color');
  return `Color(red: ${parseInt(channels[0], 16) / 255}, green: ${parseInt(channels[1], 16) / 255}, blue: ${parseInt(channels[2], 16) / 255})`;
}

export function buildFlutterGradient(stops: GradientStop[], angle: number): string {
  const { begin, end } = toFlutterAlignment(angle);
  return `LinearGradient(\n  begin: const Alignment(${begin[0]}, ${begin[1]}),\n  end: const Alignment(${end[0]}, ${end[1]}),\n  colors: [\n${sortedStops(stops).map((stop) => `    ${flutterColor(stop.hex)},`).join('\n')}\n  ],\n  stops: [${sortedStops(stops).map((stop) => clampPosition(stop.position) / 100).join(', ')}],\n)`;
}

export function buildSwiftUiGradient(stops: GradientStop[], angle: number): string {
  const { start, end } = toSwiftUiPoints(angle);
  return `LinearGradient(\n  gradient: Gradient(stops: [\n${sortedStops(stops).map((stop) => `    Gradient.Stop(color: ${swiftColor(stop.hex)}, location: ${clampPosition(stop.position) / 100}),`).join('\n')}\n  ]),\n  startPoint: UnitPoint(x: ${start[0]}, y: ${start[1]}),\n  endPoint: UnitPoint(x: ${end[0]}, y: ${end[1]})\n)`;
}
