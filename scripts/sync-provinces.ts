/**
 * Script to sync provinces data from open API to Supabase
 * Run with: npx tsx scripts/sync-provinces.ts
 */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

const API_URL = 'https://provinces.open-api.vn/api/v2/'

interface ProvinceAPI {
  name: string
  code: number
  division_type: string
  codename: string
  phone_code: number
}

async function syncProvinces() {
  console.log('🚀 Starting provinces sync...')

  // Create Supabase client with service role key (bypasses RLS)
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

  try {
    // 1. Fetch provinces from API
    console.log('📥 Fetching provinces from API...')
    const response = await fetch(API_URL)

    if (!response.ok) {
      throw new Error(`API error: ${response.status} ${response.statusText}`)
    }

    const provinces: ProvinceAPI[] = await response.json()
    console.log(`✅ Fetched ${provinces.length} provinces from API`)

    // 2. Delete all existing provinces
    console.log('🗑️ Deleting existing provinces...')
    const { error: deleteError } = await supabase
      .from('provinces')
      .delete()
      .neq('code', -1) // Delete all (code != -1 matches all real records)

    if (deleteError) {
      console.error('Delete error:', deleteError)
      throw deleteError
    }
    console.log('✅ Deleted existing provinces')

    // 3. Insert new provinces
    console.log('📤 Inserting new provinces...')
    const provincesData = provinces.map(p => ({
      code: p.code,
      name: p.name,
      codename: p.codename,
      division_type: p.division_type,
      phone_code: p.phone_code,
    }))

    const { data: insertedData, error: insertError } = await supabase
      .from('provinces')
      .insert(provincesData)
      .select()

    if (insertError) {
      console.error('Insert error:', insertError)
      throw insertError
    }

    console.log(`✅ Inserted ${insertedData?.length || provincesData.length} provinces`)

    // 4. Verify
    const { count } = await supabase
      .from('provinces')
      .select('*', { count: 'exact', head: true })

    console.log(`\n🎉 Sync complete! Total provinces in database: ${count}`)

    // Print sample
    console.log('\n📋 Sample provinces:')
    provinces.slice(0, 5).forEach(p => {
      console.log(`  - [${p.code}] ${p.name} (${p.codename})`)
    })

  } catch (error) {
    console.error('❌ Sync failed:', error)
    process.exit(1)
  }
}

syncProvinces()
