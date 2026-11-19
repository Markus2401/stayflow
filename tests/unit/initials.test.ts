import { describe, expect, it } from 'vitest';
import { initials } from '../../src/brand';

describe('property monogram', () => {
  it('uses the first letters of the first two words', () => {
    expect(initials('Hillview Guesthouse')).toBe('HG');
    expect(initials('Maroela Lodge')).toBe('ML');
  });
  it('copes with one word, extra spaces and long names', () => {
    expect(initials('Annex')).toBe('A');
    expect(initials('  The   Old Mill Country House & Spa  ')).toBe('TO');
  });
  it('keeps non-Latin letters and emoji whole', () => {
    expect(initials('山景 旅馆')).toBe('山旅');
    expect(initials('🌿 Garden House')).toBe('🌿G');
  });
});
