import { describe, it, expect } from 'vitest';
import { canTransition, isTerminal, allowedNext, ORDER_STATUSES } from '../src/lib/order-status.js';

describe('order-status state machine', () => {
  it('allows the happy path placed → paid → shipped → out_for_delivery → delivered', () => {
    expect(canTransition('placed', 'paid')).toBe(true);
    expect(canTransition('paid', 'shipped')).toBe(true);
    expect(canTransition('shipped', 'out_for_delivery')).toBe(true);
    expect(canTransition('out_for_delivery', 'delivered')).toBe(true);
  });

  it('treats cancelled and refunded as terminal', () => {
    expect(isTerminal('cancelled')).toBe(true);
    expect(isTerminal('refunded')).toBe(true);
    expect(isTerminal('delivered')).toBe(false);
  });

  it('blocks the regressions we care about', () => {
    expect(canTransition('refunded', 'paid')).toBe(false);
    expect(canTransition('refunded', 'shipped')).toBe(false);
    expect(canTransition('cancelled', 'paid')).toBe(false);
    expect(canTransition('delivered', 'shipped')).toBe(false);
    expect(canTransition('shipped', 'placed')).toBe(false);
    expect(canTransition('paid', 'placed')).toBe(false);
  });

  it('allows refund from any paid-or-later, non-terminal state', () => {
    expect(canTransition('paid', 'refunded')).toBe(true);
    expect(canTransition('shipped', 'refunded')).toBe(true);
    expect(canTransition('out_for_delivery', 'refunded')).toBe(true);
    expect(canTransition('delivered', 'refunded')).toBe(true);
    expect(canTransition('placed', 'refunded')).toBe(false); // no payment yet
  });

  it('allows cancellation only before shipping', () => {
    expect(canTransition('placed', 'cancelled')).toBe(true);
    expect(canTransition('paid', 'cancelled')).toBe(true);
    expect(canTransition('shipped', 'cancelled')).toBe(false);
    expect(canTransition('delivered', 'cancelled')).toBe(false);
  });

  it('treats a same-state "transition" as a no-op success', () => {
    expect(canTransition('shipped', 'shipped')).toBe(true);
  });

  it('rejects unknown statuses', () => {
    expect(canTransition('placed', 'on_fire')).toBe(false);
    expect(canTransition('on_fire', 'paid')).toBe(false);
  });

  it('allowedNext returns a fresh array', () => {
    const a = allowedNext('paid');
    a.push('hacked');
    expect(allowedNext('paid')).not.toContain('hacked');
  });

  it('covers every ORDER_STATUSES value', () => {
    for (const s of ORDER_STATUSES) {
      expect(allowedNext(s)).toBeInstanceOf(Array);
    }
  });
});
