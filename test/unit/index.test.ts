import { getClientIp } from '../../src/index';

describe('getClientIp', () => {
  it('should return null for empty headers', () => {
    const headers = new Headers();
    expect(getClientIp(headers)).toBeNull();
  });

  it('should return IP from x-client-ip', () => {
    const headers = new Headers({ 'x-client-ip': '192.168.1.1' });
    expect(getClientIp(headers)).toBe('192.168.1.1');
  });

  it('should return IP from x-forwarded-for', () => {
    const headers = new Headers({ 'x-forwarded-for': '192.168.1.1' });
    expect(getClientIp(headers)).toBe('192.168.1.1');
  });

  it('should return first valid IP from x-forwarded-for with multiple IPs', () => {
    const headers = new Headers({ 'x-forwarded-for': '192.168.1.1, 10.0.0.1' });
    expect(getClientIp(headers)).toBe('192.168.1.1');
  });

  it('should skip unknown in x-forwarded-for', () => {
    const headers = new Headers({ 'x-forwarded-for': 'unknown, 192.168.1.1' });
    expect(getClientIp(headers)).toBe('192.168.1.1');
  });

  it('should return IP from cf-connecting-ip', () => {
    const headers = new Headers({ 'cf-connecting-ip': '192.168.1.1' });
    expect(getClientIp(headers)).toBe('192.168.1.1');
  });

  it('should return IP from do-connecting-ip', () => {
    const headers = new Headers({ 'do-connecting-ip': '192.168.1.1' });
    expect(getClientIp(headers)).toBe('192.168.1.1');
  });

  it('should return IP from fastly-client-ip', () => {
    const headers = new Headers({ 'fastly-client-ip': '192.168.1.1' });
    expect(getClientIp(headers)).toBe('192.168.1.1');
  });

  it('should return IP from true-client-ip', () => {
    const headers = new Headers({ 'true-client-ip': '192.168.1.1' });
    expect(getClientIp(headers)).toBe('192.168.1.1');
  });

  it('should return IP from x-real-ip', () => {
    const headers = new Headers({ 'x-real-ip': '192.168.1.1' });
    expect(getClientIp(headers)).toBe('192.168.1.1');
  });

  it('should return IP from x-cluster-client-ip', () => {
    const headers = new Headers({ 'x-cluster-client-ip': '192.168.1.1' });
    expect(getClientIp(headers)).toBe('192.168.1.1');
  });

  it('should return IP from x-envoy-external-address', () => {
    const headers = new Headers({ 'x-envoy-external-address': '192.168.1.1' });
    expect(getClientIp(headers)).toBe('192.168.1.1');
  });

  it('should return IP from x-envoy-client-address', () => {
    const headers = new Headers({ 'x-envoy-client-address': '192.168.1.1' });
    expect(getClientIp(headers)).toBe('192.168.1.1');
  });

  it('should return IP from x-original-forwarded-for', () => {
    const headers = new Headers({ 'x-original-forwarded-for': '192.168.1.1' });
    expect(getClientIp(headers)).toBe('192.168.1.1');
  });

  it('should ignore x-envoy-upstream-service-time (non-ip)', () => {
    const headers = new Headers({ 'x-envoy-upstream-service-time': '123' });
    expect(getClientIp(headers)).toBeNull();
  });

  it('should return IP from x-forwarded', () => {
    const headers = new Headers({ 'x-forwarded': '192.168.1.1' });
    expect(getClientIp(headers)).toBe('192.168.1.1');
  });

  it('should return IP from forwarded-for', () => {
    const headers = new Headers({ 'forwarded-for': '192.168.1.1' });
    expect(getClientIp(headers)).toBe('192.168.1.1');
  });

  it('should return IP from forwarded', () => {
    const headers = new Headers({ 'forwarded': '192.168.1.1' });
    expect(getClientIp(headers)).toBe('192.168.1.1');
  });

  it('should return IP from x-appengine-user-ip', () => {
    const headers = new Headers({ 'x-appengine-user-ip': '192.168.1.1' });
    expect(getClientIp(headers)).toBe('192.168.1.1');
  });

  it('should return IP from Cf-Pseudo-IPv4', () => {
    const headers = new Headers({ 'Cf-Pseudo-IPv4': '192.168.1.1' });
    expect(getClientIp(headers)).toBe('192.168.1.1');
  });

  it('should return null for invalid IP', () => {
    const headers = new Headers({ 'x-client-ip': 'invalid' });
    expect(getClientIp(headers)).toBeNull();
  });

  it('should prioritize x-client-ip over others', () => {
    const headers = new Headers({
      'x-client-ip': '192.168.1.1',
      'x-forwarded-for': '10.0.0.1'
    });
    expect(getClientIp(headers)).toBe('192.168.1.1');
  });

  it('should handle IPv6', () => {
    const headers = new Headers({ 'x-client-ip': '2001:db8::1' });
    expect(getClientIp(headers)).toBe('2001:db8::1');
  });

  it('should handle x-forwarded-for with port', () => {
    const headers = new Headers({ 'x-forwarded-for': '192.168.1.1:8080' });
    expect(getClientIp(headers)).toBe('192.168.1.1');
  });

  it('should parse Forwarded header for= token', () => {
    const headers = new Headers({ 'forwarded': 'for=192.168.1.1;by=203.0.113.43' });
    expect(getClientIp(headers)).toBe('192.168.1.1');
  });

  it('should parse Forwarded header with quoted IPv6', () => {
    const headers = new Headers({ 'forwarded': 'for="[2001:db8::1]";proto=https' });
    expect(getClientIp(headers)).toBe('2001:db8::1');
  });

  it('should handle x-forwarded-for with bracketed IPv6 and port', () => {
    const headers = new Headers({ 'x-forwarded-for': '[2001:db8::1]:8080' });
    expect(getClientIp(headers)).toBe('2001:db8::1');
  });

  it('should handle x-forwarded-for IPv6 without brackets but with port', () => {
    const headers = new Headers({ 'x-forwarded-for': '2001:db8::1:8080' });
    expect(getClientIp(headers)).toBe('2001:db8::1');
  });
});