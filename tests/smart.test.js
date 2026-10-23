// Tests for Smart fuel entry logic. The receipt and dashboard values used here
// come from the sample photos (BR Filling Station, Kadapa; ODO 18885, range 413).
// They live only in tests, never in the app.
import { test, assert } from './harness.js';
import { normaliseExtraction, normaliseFuelType } from '../js/smart/schema.js';
import { reviewChecks } from '../js/smart/checks.js';
import { findPossibleDuplicates } from '../js/smart/duplicates.js';
import { validateEntry } from '../js/core/validate.js';

const both = { receiptProvided: true, odometerProvided: true };
const sampleRaw = () => ({
  fuelCompany: 'Bharat Petroleum', fuelStation: 'BR Filling Station', location: 'Ukkayapalli Bypass Road, Kadapa',
  fuelType: 'Petrol', transactionDate: '2026-10-18', transactionTime: '17:53',
  quantityLitres: '00020.00', pricePerLitre: 116.64, totalAmount: '02332.80',
  receiptNumber: '252026326J303914', odometerKm: '18,885', dashboardRangeKm: 413, dashboardTime: '7:06',
  receiptIsFuel: true, odometerReadable: true, fieldsNeedingReview: ['receiptNumber'],
});
const car = { id: 'car', nickname: 'My car', type: 'four', fuelType: 'petrol', initialOdometer: 18000 };

test('Smart: sample receipt and dashboard are cleaned into the expected structure', () => {
  const x = normaliseExtraction(sampleRaw(), both);
  assert.equal(x.quantityLitres, 20);
  assert.equal(x.totalAmount, 2332.8);
  assert.equal(x.odometerKm, 18885);
  assert.equal(x.dashboardRangeKm, 413);
  assert.equal(x.dashboardTime, '07:06');
  assert.equal(x.transactionDate, '2026-10-18');
  assert.equal(x.receiptNumber, '252026326J303914', 'receipt number kept as text;');
  assert.equal(x.fuelType, 'petrol');
  assert.equal(x.fieldsNeedingReview.join(), 'receiptNumber');
});

test('Smart: receipt only leaves odometer fields empty', () => {
  const x = normaliseExtraction(sampleRaw(), { receiptProvided: true, odometerProvided: false });
  assert.equal(x.odometerKm, null);
  assert.equal(x.dashboardRangeKm, null);
  assert.equal(x.totalAmount, 2332.8);
});

test('Smart: odometer only leaves receipt fields empty', () => {
  const x = normaliseExtraction(sampleRaw(), { receiptProvided: false, odometerProvided: true });
  assert.equal(x.totalAmount, null);
  assert.equal(x.transactionDate, null);
  assert.equal(x.odometerKm, 18885);
  assert.equal(x.fieldsNeedingReview.length, 0, 'receipt review flags dropped;');
});

test('Smart: unreadable values become null and are flagged, never guessed', () => {
  const x = normaliseExtraction({ transactionDate: '18/10/26', quantityLitres: 'abc', transactionTime: '25:99', fuelType: 'Power99?' }, both);
  for (const f of ['transactionDate', 'quantityLitres', 'transactionTime']) {
    assert.equal(x[f], null, `${f};`);
    assert.ok(x.fieldsNeedingReview.includes(f), `${f} should need review`);
  }
  assert.equal(x.fuelType, null);
});

test('Smart: odometer equal to range is flagged', () => {
  const x = normaliseExtraction({ odometerKm: 413, dashboardRangeKm: 413 }, both);
  assert.ok(x.fieldsNeedingReview.includes('odometerKm'));
});

test('Smart: fuel words map to fuel types', () => {
  assert.equal(normaliseFuelType('PETROL'), 'petrol');
  assert.equal(normaliseFuelType('HSD'), 'diesel');
  assert.equal(normaliseFuelType(null), null);
});

const reviewVals = (o = {}) => ({
  date: '2026-10-18', quantity: 20, pricePerUnit: 116.64, totalAmount: 2332.8, odometer: 18885,
  fuelType: 'petrol', dashboardRangeKm: 413, receiptIsFuel: true, odometerReadable: true, sourceImages: both, ...o,
});
const codes = (list) => list.map((c) => c.code);

test('Checks: sample arithmetic matches (20 × 116.64 = 2332.80)', () => {
  const c = reviewChecks(reviewVals(), { vehicle: car, entries: [], today: '2026-10-22' });
  assert.ok(codes(c).includes('amount-match'));
  assert.ok(!c.some((x) => x.level === 'warn'), 'no warnings expected');
});

test('Checks: arithmetic mismatch is a warning', () => {
  const c = reviewChecks(reviewVals({ totalAmount: 2500 }), { vehicle: car, today: '2026-10-22' });
  assert.ok(codes(c).includes('amount-mismatch'));
});

test('Checks: diesel receipt for a petrol car', () => {
  const c = reviewChecks(reviewVals({ fuelType: 'diesel' }), { vehicle: car, today: '2026-10-22' });
  assert.ok(codes(c).includes('fuel-type-mismatch'));
});

test('Checks: not a fuel receipt / unreadable odometer', () => {
  const c = reviewChecks(reviewVals({ receiptIsFuel: false, odometerReadable: false, odometer: null }), { vehicle: car, today: '2026-10-22' });
  assert.ok(codes(c).includes('not-fuel-receipt'));
  assert.ok(codes(c).includes('odometer-unreadable'));
  assert.ok(codes(c).includes('odometer-missing'));
});

test('Checks: older than latest entry is allowed with an explanation', () => {
  const latest = { id: 'x', vehicleId: 'car', date: '2026-10-20', odometer: 19000 };
  const c = reviewChecks(reviewVals(), { vehicle: car, entries: [latest], today: '2026-10-22' });
  assert.ok(codes(c).includes('older-than-latest'));
});

test('Checks: huge odometer jump is flagged', () => {
  const prev = { id: 'x', vehicleId: 'car', date: '2026-10-01', odometer: 12000 };
  const c = reviewChecks(reviewVals(), { vehicle: car, entries: [prev], today: '2026-10-22' });
  assert.ok(codes(c).includes('odometer-jump'));
});

const saved = (o) => ({ id: 's1', vehicleId: 'car', date: '2026-10-18', time: '17:53', quantity: 20, totalAmount: 2332.8, odometer: 18885, receiptNumber: '252026326J303914', ...o });

test('Duplicates: same receipt number is a strong match', () => {
  const d = findPossibleDuplicates({ vehicleId: 'car', receiptNumber: '252026326j303914', date: '2026-10-19' }, [saved()]);
  assert.equal(d.length, 1);
  assert.ok(d[0].strong);
});

test('Duplicates: same litres and amount on a different date is not a duplicate', () => {
  const d = findPossibleDuplicates({ vehicleId: 'car', date: '2026-11-02', quantity: 20, totalAmount: 2332.8, odometer: 19300 }, [saved({ receiptNumber: null })]);
  assert.equal(d.length, 0);
});

test('Duplicates: other vehicles and the entry itself are ignored', () => {
  assert.equal(findPossibleDuplicates({ ...saved(), vehicleId: 'bike', id: 'n' }, [saved()]).length, 0);
  assert.equal(findPossibleDuplicates(saved(), [saved()]).length, 0);
});

test('Validation can leave duplicate handling to the caller', () => {
  const entry = { vehicleId: 'car', date: '2026-10-18', quantity: 20, totalAmount: 2332.8, odometer: 18885, pricePerUnit: 116.64 };
  const ctx = { vehicle: car, entries: [saved()], today: '2026-10-22' };
  assert.ok(validateEntry(entry, ctx).errors._form);
  assert.equal(validateEntry(entry, { ...ctx, checkDuplicates: false }).errors._form, undefined);
});
