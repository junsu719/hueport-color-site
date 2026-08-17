import { converter } from 'culori';
import { describe, expect, it } from 'vitest';
import {
  buildCompatibleCssGradient,
  buildFlutterGradient,
  buildNativeCssGradient,
  buildSwiftUiGradient,
  interpolateOklchStops,
  shortestHueDelta,
  toFlutterAlignment,
  toSwiftUiPoints,
  type GradientStop,
} from '../src/lib/gradient-math';

const toOklch = converter('oklch');

describe('OKLCH interpolation', () => {
  it('takes the short hue arc across zero degrees', () => {
    expect(shortestHueDelta(350, 10)).toBe(20);
    expect(shortestHueDelta(10, 350)).toBe(-20);
  });

  it('keeps a saturated midpoint for a high-contrast hue pair', () => {
    const samples = interpolateOklchStops([
      { hex: '#0000FF', position: 0 },
      { hex: '#FFFF00', position: 100 },
    ], 3);
    const midpoint = toOklch(samples[1].hex);

    expect(samples.map((sample) => sample.position)).toEqual([0, 50, 100]);
    expect(midpoint?.c).toBeGreaterThan(0.12);
  });
});

describe('CSS exports', () => {
  const stops: GradientStop[] = [
    { hex: '#112233', position: 0 },
    { hex: '#AABBCC', position: 100 },
  ];

  it('emits native CSS that explicitly requests OKLCH shorter-hue interpolation', () => {
    expect(buildNativeCssGradient(stops, 45)).toBe(
      'linear-gradient(45deg in oklch shorter hue, #112233 0%, #AABBCC 100%)',
    );
  });

  it('emits a sampled sRGB compatibility gradient with the requested number of stops', () => {
    const css = buildCompatibleCssGradient(stops, 90, 5);

    expect(css.startsWith('linear-gradient(90deg, ')).toBe(true);
    expect((css.match(/%/g) ?? []).length).toBe(5);
    expect(css).toContain('#112233 0%');
    expect(css).toContain('#aabbcc 100%');
  });
});

describe('platform angle conversion', () => {
  it('maps CSS 90 degrees to left-to-right Flutter and SwiftUI endpoints', () => {
    expect(toFlutterAlignment(90)).toEqual({ begin: [-1, 0], end: [1, 0] });
    expect(toSwiftUiPoints(90)).toEqual({ start: [0, 0.5], end: [1, 0.5] });
  });

  it('maps CSS 0 degrees to bottom-to-top endpoints', () => {
    expect(toFlutterAlignment(0)).toEqual({ begin: [0, 1], end: [0, -1] });
    expect(toSwiftUiPoints(0)).toEqual({ start: [0.5, 1], end: [0.5, 0] });
  });

  it('exports Flutter colors, stops, and the matching direction', () => {
    expect(
      buildFlutterGradient(
        [
          { hex: '#000000', position: 0 },
          { hex: '#FFFFFF', position: 100 },
        ],
        90,
      ),
    ).toContain('begin: const Alignment(-1, 0)');
    expect(
      buildFlutterGradient(
        [
          { hex: '#000000', position: 0 },
          { hex: '#FFFFFF', position: 100 },
        ],
        90,
      ),
    ).toContain('Color(0xFFFFFFFF)');
  });

  it('exports SwiftUI colors, locations, and the matching direction', () => {
    const swift = buildSwiftUiGradient(
      [
        { hex: '#000000', position: 0 },
        { hex: '#FFFFFF', position: 100 },
      ],
      0,
    );

    expect(swift).toContain('Gradient.Stop(color: Color(red: 0, green: 0, blue: 0), location: 0)');
    expect(swift).toContain('startPoint: UnitPoint(x: 0.5, y: 1)');
  });
});
