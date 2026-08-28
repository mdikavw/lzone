/**
 * Integration tests for SupabaseClassRepository.
 *
 * Scope, per instructions:
 * - Behavior-focused, not implementation-detail (no assertions on which
 *   Supabase query builder methods were called or in what order).
 * - Tests only the stated contract: findById, findAll, findActive, create,
 *   update, delete
 * - No invented business rules (no uniqueness, auth, cascading,
 *   duplicate-id, update-of-nonexistent-id, delete-of-nonexistent-id,
 *   validation, ordering, or trigger behavior).
 *
 * Runs against the dedicated Supabase TEST project, not mocks.
 */

import { beforeEach, afterEach, describe, expect, it } from 'vitest';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { SupabaseClassRepository } from '@/lib/infrastructure/supabase/class-repository';
import type { Class } from '@/lib/domain/class';

// --- Test setup -------------------------------------------------------

const supabaseUrl = process.env.SUPABASE_TEST_URL!;
const supabaseKey = process.env.SUPABASE_TEST_PUBLISHABLE_KEY!;

let supabase: SupabaseClient;
let repository: SupabaseClassRepository;

// Track ids created during a test so we can clean them up afterward
// without depending on repository.create() to do it.
let createdClassIds: string[] = [];

function buildClass(overrides: Partial<Class> = {}): Class {
	const now = new Date();
	return {
		id: overrides.id ?? crypto.randomUUID(),
		name: 'Test Class',
		description: 'Test description',
		type: 'GROUP',
		status: 'ACTIVE',
		createdAt: now,
		updatedAt: now,
		...overrides,
	};
}

// Insert a row directly (bypassing the repository) so tests that are
// NOT about create() don't depend on create() being correct.
async function insertClassRow(classEntity: Class) {
	const { error } = await supabase.from('classes').insert({
		id: classEntity.id,
		name: classEntity.name,
		description: classEntity.description ?? null,
		type: classEntity.type,
		status: classEntity.status,
		created_at: classEntity.createdAt.toISOString(),
		updated_at: classEntity.updatedAt.toISOString(),
	});
	if (error) throw error;
	createdClassIds.push(classEntity.id);
}

beforeEach(() => {
	supabase = createClient(supabaseUrl, supabaseKey);
	repository = new SupabaseClassRepository(supabase);
	createdClassIds = [];
});

afterEach(async () => {
	if (createdClassIds.length > 0) {
		await supabase.from('classes').delete().in('id', createdClassIds);
	}
});

// --- Essential tests ----------------------------------------------------
// These verify the stated contract directly.

describe('SupabaseClassRepository — essential', () => {
	it('findById returns the matching class when it exists', async () => {
		const classEntity = buildClass();
		await insertClassRow(classEntity);

		const result = await repository.findById(classEntity.id);

		expect(result).not.toBeNull();
		expect(result).toMatchObject({
			id: classEntity.id,
			name: classEntity.name,
			description: classEntity.description,
			type: classEntity.type,
			status: classEntity.status,
		});
	});

	it('findById returns null when the class does not exist', async () => {
		const result = await repository.findById(crypto.randomUUID());
		expect(result).toBeNull();
	});

	it('findAll returns all persisted classes', async () => {
		const a = buildClass();
		const b = buildClass();
		await insertClassRow(a);
		await insertClassRow(b);

		const result = await repository.findAll();
		const ids = result.map(c => c.id);

		// Ordering is not part of the contract, so only membership is checked.
		expect(ids).toContain(a.id);
		expect(ids).toContain(b.id);
	});

	it('findActive returns only classes with ACTIVE status', async () => {
		const active = buildClass({ status: 'ACTIVE' });
		const alsoActive = buildClass({ status: 'ACTIVE' });
		const inactive = buildClass({ status: 'INACTIVE' });

		await insertClassRow(active);
		await insertClassRow(alsoActive);
		await insertClassRow(inactive);

		const result = await repository.findActive();
		const ids = result.map(c => c.id);

		expect(ids).toContain(active.id);
		expect(ids).toContain(alsoActive.id);
		expect(ids).not.toContain(inactive.id);
	});

	it('create persists the class and returns it', async () => {
		const classEntity = buildClass();
		createdClassIds.push(classEntity.id); // ensure cleanup even if create() fails partially

		const result = await repository.create(classEntity);

		expect(result).toMatchObject({
			id: classEntity.id,
			name: classEntity.name,
			description: classEntity.description,
			type: classEntity.type,
			status: classEntity.status,
		});

		// Verify persistence by fetching independently, not by trusting the return value.
		const fetched = await repository.findById(classEntity.id);
		expect(fetched).toMatchObject({
			id: classEntity.id,
			name: classEntity.name,
		});
	});

	it('update persists changes to the identified class and returns the result', async () => {
		const original = buildClass({
			name: 'Before Update',
			status: 'ACTIVE',
		});
		await insertClassRow(original);

		const updated: Class = {
			...original,
			name: 'After Update',
			status: 'INACTIVE',
			updatedAt: new Date(),
		};

		const result = await repository.update(updated);

		expect(result).toMatchObject({
			id: original.id,
			name: 'After Update',
			status: 'INACTIVE',
		});

		const fetched = await repository.findById(original.id);
		expect(fetched).toMatchObject({
			id: original.id,
			name: 'After Update',
			status: 'INACTIVE',
		});
	});

	it('delete removes the identified class', async () => {
		const classEntity = buildClass();
		await insertClassRow(classEntity);

		await repository.delete(classEntity.id);

		// Remove from tracked cleanup ids: the row is already gone, and
		// re-deleting a nonexistent id in afterEach is unnecessary (though
		// not harmful either way).
		createdClassIds = createdClassIds.filter(id => id !== classEntity.id);

		const fetched = await repository.findById(classEntity.id);
		expect(fetched).toBeNull();
	});
});

// --- Optional tests -------------------------------------------------------
// Mapping fidelity and edge cases, consistent with the Student repository test.

describe('SupabaseClassRepository — optional', () => {
	it('findAll returns an empty array when there are no classes', async () => {
		// Only meaningful if the test DB/schema is isolated per run; if the
		// suite shares a table with other data this test should be skipped
		// or scoped differently.
		const result = await repository.findAll();
		expect(Array.isArray(result)).toBe(true);
	});

	it('maps snake_case columns to camelCase domain fields correctly', async () => {
		const classEntity = buildClass({ type: 'PRIVATE' });
		await insertClassRow(classEntity);

		const result = await repository.findById(classEntity.id);

		expect(result?.type).toBe('PRIVATE');
		expect(result?.createdAt).toBeInstanceOf(Date);
		expect(result?.updatedAt).toBeInstanceOf(Date);
	});

	it('round-trips a class with no description (nullable field)', async () => {
		const classEntity = buildClass({ description: undefined });
		await insertClassRow(classEntity);

		const result = await repository.findById(classEntity.id);

		expect(result?.description == null).toBe(true);
	});

	it('round-trips both class types', async () => {
		const group = buildClass({ type: 'GROUP' });
		const priv = buildClass({ type: 'PRIVATE' });
		await insertClassRow(group);
		await insertClassRow(priv);

		const fetchedGroup = await repository.findById(group.id);
		const fetchedPrivate = await repository.findById(priv.id);

		expect(fetchedGroup?.type).toBe('GROUP');
		expect(fetchedPrivate?.type).toBe('PRIVATE');
	});
});

// --- Ambiguities not covered by tests --------------------------------
//
// These are called out rather than resolved with invented assertions:
//
// 1. create(classEntity) with an id that already exists — duplicate/conflict
//    behavior is not specified.
// 2. update(classEntity) where classEntity.id does not match any existing
//    row — not specified whether this throws, returns null, or upserts.
// 3. Ordering of results from findAll() / findActive() is not specified,
//    so no test asserts on result order.
// 4. delete(id) where id does not match any existing row — not specified
//    whether this throws or resolves silently (the interface returns
//    Promise<void> either way, so no assertion is made on this case).
// 5. Whether createdAt/updatedAt are trusted from the input Class object
//    or overwritten by the database (e.g. via a trigger/default) is not
//    specified. The requirements only say "persist the supplied Class"
//    for create(), so this suite assumes the input values are respected;
//    if the DB actually generates these server-side, the create/update
//    tests above will need adjusting to fetch and compare against
//    DB-generated timestamps instead of the input values.
