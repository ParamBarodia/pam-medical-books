// Sanity write client — used to decrement stock when an order is paid.
// Falls back to a no-op if SANITY_PROJECT_ID isn't set (so local dev still works).
import 'dotenv/config';

const PROJECT_ID = process.env.SANITY_PROJECT_ID;
const DATASET = process.env.SANITY_DATASET || 'production';
const WRITE_TOKEN = process.env.SANITY_WRITE_TOKEN;
const IS_MOCK = !PROJECT_ID || !WRITE_TOKEN;

let sanity;
if (!IS_MOCK) {
  const { createClient } = await import('@sanity/client');
  sanity = createClient({
    projectId: PROJECT_ID,
    dataset: DATASET,
    token: WRITE_TOKEN,
    useCdn: false,
    apiVersion: '2024-01-01',
  });
}

// Decrement stock + increment soldCount atomically
export async function decrementStock(bookId, qty = 1) {
  if (IS_MOCK) {
    console.log(`[sanity/mock] decrementStock(${bookId}, ${qty})`);
    return { mock: true };
  }
  return sanity
    .patch(bookId)
    .dec({ stock: qty })
    .inc({ soldCount: qty })
    .commit({ autoGenerateArrayKeys: true });
}

// Restore stock (e.g., on cancel/refund)
export async function restoreStock(bookId, qty = 1) {
  if (IS_MOCK) {
    console.log(`[sanity/mock] restoreStock(${bookId}, ${qty})`);
    return { mock: true };
  }
  return sanity
    .patch(bookId)
    .inc({ stock: qty })
    .dec({ soldCount: qty })
    .commit();
}

// Fetch low-stock books for the daily admin email
export async function fetchLowStock(threshold = 5) {
  if (IS_MOCK) return [];
  return sanity.fetch(
    `*[_type == "book" && !archived && stock < $threshold && stock > 0]
       | order(stock asc)
     { _id, title, author, stock }`,
    { threshold }
  );
}

export const IS_MOCK_SANITY = IS_MOCK;
