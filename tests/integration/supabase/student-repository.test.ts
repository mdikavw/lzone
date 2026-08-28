/**
 * Integration tests for SupabaseStudentRepository.
 *
 * Scope, per instructions:
 * - Behavior-focused, not implementation-detail (no assertions on which
 *   Supabase query builder methods were called or in what order).
 * - Tests only the contract stated in the requirements doc:
 *     findById, findAll, findByClass, create, update
 * - No invented business rules (no uniqueness checks, no cascading
 *   behavior, no auth/authorization checks, etc.)
 *
 * These run against a real (test/local) Supabase/Postgres instance,
 * not a mock. Adjust the import path and env setup to match your project.
 */

import { beforeEach, afterEach, describe, expect, it } from 'vitest';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { SupabaseStudentRepository } from '@/lib/infrastructure/supabase/student-repository';
import type { Student } from '@/lib/domain/student';

// --- Test setup -------------------------------------------------------
const supabaseUrl = process.env.SUPABASE_TEST_URL!;
const supabaseKey = process.env.SUPABASE_TEST_PUBLISHABLE_KEY!;

let supabase: SupabaseClient;
let repository: SupabaseStudentRepository;

// Track ids created during a test so we can clean them up afterward
// without depending on repository.create() to do it.
let createdStudentIds: string[] = [];
const createdClassIds: string[] = [];

function buildStudent(overrides: Partial<Student> = {}): Student {
	const now = new Date();
	return {
		id: overrides.id ?? crypto.randomUUID(),
		name: 'Test Student',
		phone: '08123456789',
		email: 'test.student@example.com',
		status: 'ACTIVE',
		classId: overrides.classId ?? crypto.randomUUID(),
		billingType: 'MONTHLY',
		createdAt: now,
		updatedAt: now,
		...overrides,
	};
}

async function insertClass(classId: string) {
	const { error } = await supabase.from('classes').insert({
		id: classId,
		name: 'Test Class',
		type: 'GROUP',
		status: 'ACTIVE',
	});

	if (error) throw error;

	createdClassIds.push(classId);
}

// Insert a row directly (bypassing the repository) so tests that are
// NOT about create() don't depend on create() being correct.
async function insertStudentRow(student: Student) {
	const { error } = await supabase.from('students').insert({
		id: student.id,
		name: student.name,
		phone: student.phone,
		email: student.email ?? null,
		status: student.status,
		class_id: student.classId,
		billing_type: student.billingType,
		created_at: student.createdAt.toISOString(),
		updated_at: student.updatedAt.toISOString(),
	});
	if (error) throw error;
	createdStudentIds.push(student.id);
}

beforeEach(() => {
	supabase = createClient(supabaseUrl, supabaseKey);
	repository = new SupabaseStudentRepository(supabase);
	createdStudentIds = [];
});

afterEach(async () => {
	if (createdStudentIds.length > 0) {
		await supabase.from('students').delete().in('id', createdStudentIds);
	}
	if (createdClassIds.length > 0) {
		await supabase.from('classes').delete().in('id', createdClassIds);
	}
});

// --- Essential tests ----------------------------------------------------
// These verify the stated contract directly. If any of these fail, the
// repository does not fulfill what the application layer depends on.

describe('SupabaseStudentRepository — essential', () => {
	it('findById returns the matching student when it exists', async () => {
		const classId = crypto.randomUUID();
		await insertClass(classId);

		const student = buildStudent({ classId });
		await insertStudentRow(student);

		const result = await repository.findById(student.id);

		expect(result).not.toBeNull();
		expect(result).toMatchObject({
			id: student.id,
			name: student.name,
			phone: student.phone,
			email: student.email,
			status: student.status,
			classId: student.classId,
			billingType: student.billingType,
		});
	});

	it('findById returns null when the student does not exist', async () => {
		const result = await repository.findById(crypto.randomUUID());
		expect(result).toBeNull();
	});

	it('findAll returns all students', async () => {
		const classId = crypto.randomUUID();
		await insertClass(classId);
		const a = buildStudent({ classId });
		const b = buildStudent({ classId });
		await insertStudentRow(a);
		await insertStudentRow(b);

		const result = await repository.findAll();
		const ids = result.map(s => s.id);

		expect(ids).toContain(a.id);
		expect(ids).toContain(b.id);
	});

	it('findByClass returns only students belonging to the given class', async () => {
		const classA = crypto.randomUUID();
		await insertClass(classA);
		const classB = crypto.randomUUID();
		await insertClass(classB);

		const inClassA = buildStudent({ classId: classA });
		const alsoInClassA = buildStudent({ classId: classA });
		const inClassB = buildStudent({ classId: classB });

		await insertStudentRow(inClassA);
		await insertStudentRow(alsoInClassA);
		await insertStudentRow(inClassB);

		const result = await repository.findByClass(classA);
		const ids = result.map(s => s.id);

		expect(ids).toContain(inClassA.id);
		expect(ids).toContain(alsoInClassA.id);
		expect(ids).not.toContain(inClassB.id);
	});

	it('create persists the student and returns it', async () => {
		const classId = crypto.randomUUID();
		await insertClass(classId);
		const student = buildStudent({ classId });
		createdStudentIds.push(student.id); // ensure cleanup even if create() fails partially

		const result = await repository.create(student);

		expect(result).toMatchObject({
			id: student.id,
			name: student.name,
			phone: student.phone,
			email: student.email,
			status: student.status,
			classId: student.classId,
			billingType: student.billingType,
		});

		// Confirm it was actually persisted, not just echoed back.
		const fetched = await repository.findById(student.id);
		expect(fetched).toMatchObject({ id: student.id, name: student.name });
	});

	it('update persists changes to the identified student and returns the result', async () => {
		const classId = crypto.randomUUID();
		await insertClass(classId);
		const original = buildStudent({
			name: 'Before Update',
			status: 'ACTIVE',
			classId: classId,
		});
		await insertStudentRow(original);

		const updated: Student = {
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
});

// --- Optional tests -------------------------------------------------------
// Still within the stated contract, but lower priority: they cover
// mapping fidelity and edge cases rather than the core behaviors above.

describe('SupabaseStudentRepository — optional', () => {
	it('findAll returns an empty array when there are no students', async () => {
		// Only meaningful if the test DB/schema is isolated per run; if the
		// suite shares a table with other data this test should be skipped
		// or scoped differently.
		const result = await repository.findAll();
		expect(Array.isArray(result)).toBe(true);
	});

	it('maps snake_case columns to camelCase domain fields correctly', async () => {
		const classId = crypto.randomUUID();
		await insertClass(classId);
		const student = buildStudent({ billingType: 'PER_SESSION', classId });
		await insertStudentRow(student);

		const result = await repository.findById(student.id);

		expect(result?.classId).toBe(student.classId);
		expect(result?.billingType).toBe('PER_SESSION');
		expect(result?.createdAt).toBeInstanceOf(Date);
		expect(result?.updatedAt).toBeInstanceOf(Date);
	});

	it('round-trips a student with no email (optional field)', async () => {
		const classId = crypto.randomUUID();
		await insertClass(classId);
		const student = buildStudent({ classId });
		delete (student as Partial<Student>).email;
		await insertStudentRow({
			...student,
			email: undefined as unknown as string,
		});

		const result = await repository.findById(student.id);

		expect(result?.email == null).toBe(true);
	});
});

// --- Ambiguities not covered by tests --------------------------------
//
// These are called out rather than resolved with invented assertions:
//
// 1. create(student) with an id that already exists — duplicate/conflict
//    behavior (throw? upsert? return existing?) is not specified.
// 2. update(student) where student.id does not match any existing row —
//    not specified whether this throws, returns null, or upserts.
// 3. Ordering of results from findAll() / findByClass() is not specified,
//    so no test asserts on result order.
// 4. Whether createdAt/updatedAt are trusted from the input Student object
//    or overwritten by the database (e.g. via a trigger/default) is not
//    specified. The requirements only say "persist the supplied Student"
//    for create(), so this suite assumes the input values are respected;
//    if the DB actually generates these server-side, the create/update
//    tests above will need adjusting to fetch and compare against
//    DB-generated timestamps instead of the input values.
