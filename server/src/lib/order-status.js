// Order status state machine.
//
// `terminal` statuses (cancelled, refunded) cannot transition to anything —
// once a refund is issued or an order is cancelled, the row is frozen.
// All other transitions must be explicitly listed below; anything not
// listed is rejected by canTransition().

export const ORDER_STATUSES = [
  'placed', 'paid', 'shipped', 'out_for_delivery',
  'delivered', 'cancelled', 'refunded',
];

const TRANSITIONS = {
  placed:           ['paid', 'cancelled'],
  paid:             ['shipped', 'cancelled', 'refunded'],
  shipped:          ['out_for_delivery', 'delivered', 'refunded'],
  out_for_delivery: ['delivered', 'refunded'],
  delivered:        ['refunded'],
  cancelled:        [],
  refunded:         [],
};

export function isTerminal(status) {
  return TRANSITIONS[status]?.length === 0;
}

export function canTransition(from, to) {
  if (from === to) return true;
  return TRANSITIONS[from]?.includes(to) ?? false;
}

export function allowedNext(from) {
  return TRANSITIONS[from] ? [...TRANSITIONS[from]] : [];
}
