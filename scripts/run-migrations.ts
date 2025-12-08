/**
 * Run migrations directly using Supabase client
 * Usage: npx tsx scripts/run-migrations.ts
 */

import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing environment variables:')
  console.error('- NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? 'OK' : 'MISSING')
  console.error('- SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? 'OK' : 'MISSING')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function runMigration(filePath: string) {
  const fileName = path.basename(filePath)
  console.log(`\nRunning migration: ${fileName}`)
  console.log('-'.repeat(60))

  const sql = fs.readFileSync(filePath, 'utf-8')

  // Split by semicolons but be careful with functions that contain semicolons
  // We'll run the whole file as one statement since Supabase supports it
  const { error } = await supabase.rpc('exec_sql', { sql_query: sql }).single()

  if (error) {
    // If exec_sql doesn't exist, try running directly
    // This is a workaround - we'll need to use the REST API
    console.log(`Note: exec_sql not available, migration needs to be run in Supabase SQL Editor`)
    console.log(`File: ${filePath}`)
    return false
  }

  console.log(`✓ Migration completed: ${fileName}`)
  return true
}

async function main() {
  console.log('='.repeat(60))
  console.log('Migration Runner')
  console.log('='.repeat(60))

  const migrationsDir = path.join(__dirname, '..', 'supabase', 'migrations')

  // Find our new migration files
  const migrationFiles = [
    '20251203_add_provinces_wards_catalog.sql',
    '20251203_add_province_ward_foreign_keys.sql'
  ]

  console.log('\nChecking if provinces table exists...')

  const { data: existingProvinces, error: checkError } = await supabase
    .from('provinces')
    .select('code')
    .limit(1)

  if (!checkError && existingProvinces) {
    console.log('✓ Provinces table already exists!')
    console.log('  Migrations may have already been applied.')

    const { count } = await supabase
      .from('provinces')
      .select('*', { count: 'exact', head: true })

    console.log(`  Current province count: ${count}`)

    if (count && count > 0) {
      console.log('\nMigrations appear to be already applied. Skipping...')
      console.log('You can now run: npm run seed:wards')
      return
    }
  }

  console.log('\n⚠️  Migrations need to be run manually in Supabase SQL Editor')
  console.log('\nPlease follow these steps:')
  console.log('1. Go to your Supabase Dashboard: https://supabase.com/dashboard')
  console.log('2. Select your project')
  console.log('3. Go to SQL Editor')
  console.log('4. Run the following migration files in order:')

  for (const file of migrationFiles) {
    const fullPath = path.join(migrationsDir, file)
    console.log(`\n   - ${file}`)
    console.log(`     Path: ${fullPath}`)
  }

  console.log('\n5. After running migrations, come back and run: npm run seed:wards')
}

main().catch(error => {
  console.error('Error:', error)
  process.exit(1)
})
