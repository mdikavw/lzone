import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/database.types';

const url = process.env.SUPABASE_TEST_URL!;
const key = process.env.SUPABASE_TEST_PUBLISHABLE_KEY!;

export const supabaseTestClient = createClient<Database>(url, key);
