import { describe, expect, it } from 'vitest';
import { boundedText, validDate, readBody } from '../../server/validation';

describe('inputs at the Worker boundary',()=>{
  it('trims bounded names and rejects controls or blank strings',()=>{
    expect(boundedText('  A14  ',32)).toBe('A14');
    expect(boundedText(' ',32)).toBeNull();
    expect(boundedText('One\nTwo',32)).toBeNull();
    expect(boundedText('x'.repeat(33),32)).toBeNull();
  });
  it('accepts a leap date and rejects invalid calendar values',()=>{
    expect(validDate('2028-02-29')).toBe(true);
    expect(validDate('2026-02-29')).toBe(false);
    expect(validDate('0000-01-01')).toBe(false);
  });
  it('bounds request size and only accepts JSON objects',async()=>{
    const request = (body:string)=>new Request('http://127.0.0.1/',{method:'POST',headers:{'Content-Type':'application/json'},body});
    expect(await readBody(request('{"guest":"A"}'))).toEqual({guest:'A'});
    expect(await readBody(request('[]'))).toBeNull();
    expect(await readBody(request('{"guest":"'+'x'.repeat(4096)+'"}'))).toBeNull();
  });
});
