// DEMO READER for Stage 1. It does not look at the photos at all.
// It returns invented values so the capture and review screens can be built
// and tested before the real reader (Stage 2) exists. Every value it returns
// is labelled as demo data in the interface.

import { todayStr } from '../../core/dates.js';
import { round2 } from '../../core/calc.js';

export const info = {
  id: 'mock',
  label: 'Demo reader',
  isDemo: true,
  privacy: 'Demo mode: your photos stay on this device. Nothing is uploaded.',
};

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

export async function extract({ receipt, odometer, vehicle, lastEntry, onProgress, signal }) {
  const step = async (id) => { onProgress?.(id); await wait(550); if (signal?.aborted) throw new DOMException('Cancelled', 'AbortError'); };
  await step('send');
  if (location.hash.includes('demo=fail')) { await step('read'); throw new Error('Demo reader: simulated failure (remove demo=fail from the address to stop this).'); }

  const two = vehicle?.type === 'two';
  const out = { fieldsNeedingReview: [] };
  await step('read');
  if (receipt) {
    const qty = two ? 4.5 : 25;
    const price = 105.5;
    Object.assign(out, {
      fuelCompany: 'Demo Petroleum', fuelStation: 'Demo Fuel Station', location: 'Sample Road',
      fuelType: vehicle?.fuelType || 'petrol', transactionDate: todayStr(), transactionTime: '09:30',
      quantityLitres: qty, pricePerLitre: price, totalAmount: round2(qty * price), receiptNumber: 'DEMO-0001',
      receiptIsFuel: true,
    });
    out.fieldsNeedingReview.push('fuelStation');
  }
  if (odometer) {
    const base = lastEntry?.odometer ?? vehicle?.initialOdometer ?? 10000;
    Object.assign(out, { odometerKm: base + (two ? 180 : 420), dashboardRangeKm: two ? 150 : 380, dashboardTime: '09:35', odometerReadable: true });
    out.fieldsNeedingReview.push('odometerKm');
  }
  return out;
}
