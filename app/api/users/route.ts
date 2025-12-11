import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

// Create admin client with service role key
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password, full_name, phone, police_id, role, province_id, ward_id } = body

    // Validate required fields
    if (!email || !password || !full_name || !role) {
      return NextResponse.json(
        { error: 'Missing required fields: email, password, full_name, role' },
        { status: 400 }
      )
    }

    // Validate role
    const validRoles = ['commune_officer', 'commune_supervisor', 'central_admin', 'system_admin']
    if (!validRoles.includes(role)) {
      return NextResponse.json(
        { error: 'Invalid role' },
        { status: 400 }
      )
    }

    // Validate province_id for supervisor
    if (role === 'commune_supervisor' && !province_id) {
      return NextResponse.json(
        { error: 'Province is required for supervisor role' },
        { status: 400 }
      )
    }

    // Validate province_id and ward_id for commune officer
    if (role === 'commune_officer') {
      if (!province_id) {
        return NextResponse.json(
          { error: 'Province is required for commune officer role' },
          { status: 400 }
        )
      }
      if (!ward_id) {
        return NextResponse.json(
          { error: 'Ward is required for commune officer role' },
          { status: 400 }
        )
      }
    }

    // 1. Create auth user
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm email
      user_metadata: {
        full_name,
        phone,
        police_id
      }
    })

    if (authError) {
      console.error('Auth error:', authError)
      return NextResponse.json(
        { error: authError.message },
        { status: 400 }
      )
    }

    const userId = authData.user.id

    // 2. Create profile
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .insert({
        id: userId,
        full_name,
        phone,
        police_id,
        province_id: province_id || null,
        ward_id: ward_id || null
      })

    if (profileError) {
      console.error('Profile error:', profileError)
      // Rollback: delete auth user
      await supabaseAdmin.auth.admin.deleteUser(userId)
      return NextResponse.json(
        { error: 'Failed to create profile: ' + profileError.message },
        { status: 500 }
      )
    }

    // 3. Create web_users entry
    const { error: webUserError } = await supabaseAdmin
      .from('web_users')
      .insert({
        profile_id: userId,
        role,
        province_id: province_id || null,
        ward_id: ward_id || null,
        is_active: true
      })

    if (webUserError) {
      console.error('Web user error:', webUserError)
      // Rollback: delete profile and auth user
      await supabaseAdmin.from('profiles').delete().eq('id', userId)
      await supabaseAdmin.auth.admin.deleteUser(userId)
      return NextResponse.json(
        { error: 'Failed to create web user: ' + webUserError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      user: {
        id: userId,
        email,
        full_name,
        role,
        province_id,
        ward_id
      }
    })

  } catch (error) {
    console.error('Create user error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// GET: List all users (for central admin)
export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from('web_users')
      .select(`
        *,
        profiles:profiles(full_name, phone, police_id),
        province:provinces(code, name),
        ward:wards(code, name)
      `)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Fetch users error:', error)
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ users: data })

  } catch (error) {
    console.error('Get users error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE: Delete a user
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('id')

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      )
    }

    // Get the profile_id from web_users
    const { data: webUser, error: fetchError } = await supabaseAdmin
      .from('web_users')
      .select('profile_id')
      .eq('id', userId)
      .single()

    if (fetchError || !webUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Delete web_user entry
    await supabaseAdmin.from('web_users').delete().eq('id', userId)

    // Delete profile
    await supabaseAdmin.from('profiles').delete().eq('id', webUser.profile_id)

    // Delete auth user
    await supabaseAdmin.auth.admin.deleteUser(webUser.profile_id)

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Delete user error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PATCH: Update user status (activate/deactivate)
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, is_active } = body

    if (!id || typeof is_active !== 'boolean') {
      return NextResponse.json(
        { error: 'Missing id or is_active' },
        { status: 400 }
      )
    }

    const { error } = await supabaseAdmin
      .from('web_users')
      .update({ is_active })
      .eq('id', id)

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Update user error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
