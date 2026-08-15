import { computeStats } from '../../src/services/telemetry.service.js';

describe('telemetry.service computeStats', () => {
  it('computes avg/min/max per field, ignoring missing/non-numeric values', () => {
    const readings = [
      { voltage: 220, current: 1.5, temperature: 30 },
      { voltage: 230, current: 1.7, temperature: 34 },
      { voltage: 218, current: '1.2', temperature: null }, // malformed samples
    ];
    const stats = computeStats(readings);

    expect(stats.voltage).toEqual({ avg: 222.67, min: 218, max: 230 });
    expect(stats.current).toEqual({ avg: 1.6, min: 1.5, max: 1.7 }); // '1.2' excluded, not coerced
    expect(stats.temperature).toEqual({ avg: 32, min: 30, max: 34 }); // null excluded
  });

  it('returns nulls for a field with no numeric samples at all', () => {
    const stats = computeStats([{ voltage: 220 }]);
    expect(stats.power).toEqual({ avg: null, min: null, max: null });
  });

  it('handles an empty reading set without throwing', () => {
    const stats = computeStats([]);
    expect(stats.voltage).toEqual({ avg: null, min: null, max: null });
  });
});
