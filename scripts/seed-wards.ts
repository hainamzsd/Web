/**
 * Seed script to populate wards table from the Vietnam Provinces API
 * Run this once after applying the migrations
 *
 * Usage: npx tsx scripts/seed-wards.ts
 */

import { createClient } from '@supabase/supabase-js'

// Load environment variables
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

// Use service role key to bypass RLS
const supabase = createClient(supabaseUrl, supabaseServiceKey)

const API_BASE = 'https://provinces.open-api.vn/api/v2'

interface ApiWard {
  code: number
  name: string
  codename: string
  division_type: string
  province_code: number
}

interface ApiProvince {
  code: number
  name: string
  codename: string
  division_type: string
  phone_code: number
}

async function fetchWithRetry(url: string, retries = 3): Promise<any> {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url)
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
      return await response.json()
    } catch (error) {
      console.log(`  Retry ${i + 1}/${retries} for ${url}`)
      if (i === retries - 1) throw error
      await new Promise(r => setTimeout(r, 1000 * (i + 1))) // Exponential backoff
    }
  }
}

async function getProvincesFromDb(): Promise<number[]> {
  const { data, error } = await supabase
    .from('provinces')
    .select('code')
    .order('code')

  if (error) {
    throw new Error(`Failed to fetch provinces: ${error.message}`)
  }

  return data.map(p => p.code)
}

async function fetchWardsForProvince(provinceCode: number): Promise<ApiWard[]> {
  try {
    // Fetch province with depth=2 to get all wards directly under province
    // Note: The API structure is province -> wards (skipping district)
    const url = `${API_BASE}/p/${provinceCode}?depth=2`
    const data = await fetchWithRetry(url)

    if (!data.wards) {
      console.log(`  No wards found for province ${provinceCode}`)
      return []
    }

    // Map wards to include province_code
    return data.wards.map((ward: any) => ({
      code: ward.code,
      name: ward.name,
      codename: ward.codename,
      division_type: ward.division_type,
      province_code: provinceCode
    }))
  } catch (error) {
    console.error(`  Error fetching wards for province ${provinceCode}:`, error)
    return []
  }
}

async function insertWards(wards: ApiWard[]): Promise<number> {
  if (wards.length === 0) return 0

  // Insert in batches of 500
  const batchSize = 500
  let inserted = 0

  for (let i = 0; i < wards.length; i += batchSize) {
    const batch = wards.slice(i, i + batchSize)

    const { error } = await supabase
      .from('wards')
      .upsert(batch, {
        onConflict: 'code',
        ignoreDuplicates: false
      })

    if (error) {
      console.error(`  Error inserting batch: ${error.message}`)
    } else {
      inserted += batch.length
    }
  }

  return inserted
}

async function main() {
  console.log('='.repeat(60))
  console.log('Ward Seeding Script')
  console.log('='.repeat(60))
  console.log()

  // Step 1: Get provinces from database
  console.log('Step 1: Fetching provinces from database...')
  const provinceCodes = await getProvincesFromDb()
  console.log(`  Found ${provinceCodes.length} provinces`)
  console.log()

  // Step 2: Check current ward count
  const { count: existingCount } = await supabase
    .from('wards')
    .select('*', { count: 'exact', head: true })

  console.log(`Step 2: Current wards in database: ${existingCount || 0}`)
  console.log()

  // Step 3: Fetch and insert wards for each province
  console.log('Step 3: Fetching wards from API...')
  let totalWards = 0
  let totalInserted = 0

  for (const provinceCode of provinceCodes) {
    process.stdout.write(`  Province ${provinceCode}: `)

    const wards = await fetchWardsForProvince(provinceCode)
    totalWards += wards.length

    if (wards.length > 0) {
      const inserted = await insertWards(wards)
      totalInserted += inserted
      console.log(`${wards.length} wards fetched, ${inserted} inserted/updated`)
    } else {
      console.log('0 wards')
    }

    // Small delay to avoid rate limiting
    await new Promise(r => setTimeout(r, 100))
  }

  console.log()
  console.log('='.repeat(60))
  console.log('Summary')
  console.log('='.repeat(60))
  console.log(`  Provinces processed: ${provinceCodes.length}`)
  console.log(`  Total wards fetched: ${totalWards}`)
  console.log(`  Wards inserted/updated: ${totalInserted}`)

  // Final count
  const { count: finalCount } = await supabase
    .from('wards')
    .select('*', { count: 'exact', head: true })

  console.log(`  Final ward count in database: ${finalCount}`)
  console.log()
  console.log('Done!')
}

main().catch(error => {
  console.error('Fatal error:', error)
  process.exit(1)
})
