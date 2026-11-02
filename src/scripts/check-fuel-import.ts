/**
 * Self-check for the fuel bulk import. Reads the database, writes nothing.
 *
 *   npx ts-node --transpile-only src/scripts/check-fuel-import.ts
 */
import assert from 'assert';
import { FuelFillingModel, notYetStored } from '../modules/keil/models/fuelFillingModel';

const row = (log_date: string, vehicle_id: string, liters: number, amount: number, company_id = 'c1') => ({ company_id, log_date, vehicle_id, liters, amount });

(async () => {
    const april = [row('2026-04-01', 'v1', 58.59, 5537.34), row('2026-04-01', 'v2', 24.21, 2317.86), row('2026-04-02', 'v1', 57.38, 5422.98)];
    const may = [row('2026-05-01', 'v1', 40, 3800)];

    // First upload: everything is new
    assert.strictEqual(notYetStored(april, []).length, 3);

    // The same register uploaded again with one more month: only the new month goes in
    assert.deepStrictEqual(notYetStored([...april, ...may], april), may);

    // The database returns numbers and dates in its own shape; they still match
    const asStored = [{ company_id: 'c1', log_date: '2026-04-01T00:00:00', vehicle_id: 'v1', liters: '58.590', amount: 5537.340001 }];
    assert.strictEqual(notYetStored(april, asStored).length, 2);

    // Two identical fillings on one day are two fillings
    const twice = [row('2026-04-03', 'v1', 20, 1900), row('2026-04-03', 'v1', 20, 1900)];
    assert.strictEqual(notYetStored(twice, []).length, 2, 'both go in the first time');
    assert.strictEqual(notYetStored(twice, [twice[0]]).length, 1, 'one stored, one still to add');
    assert.strictEqual(notYetStored(twice, twice).length, 0, 'both stored, nothing to add');

    // A different vehicle, amount or company is a different filling
    assert.strictEqual(notYetStored([row('2026-04-01', 'v9', 58.59, 5537.34)], april).length, 1);
    assert.strictEqual(notYetStored([row('2026-04-01', 'v1', 58.59, 5537.35)], april).length, 1);
    assert.strictEqual(notYetStored([row('2026-04-01', 'v1', 58.59, 5537.34, 'c2')], april).length, 1);

    // The listing still answers (now page by page) and each row comes back once
    const all = await FuelFillingModel.getAll({});
    assert.ok(Array.isArray(all));
    assert.strictEqual(new Set(all.map((r: any) => r.id)).size, all.length, 'no row repeated across pages');
    console.log(`fuel-import: all checks passed (listing returned ${all.length} rows)`);
})().catch(e => { console.error(e); process.exit(1); });
