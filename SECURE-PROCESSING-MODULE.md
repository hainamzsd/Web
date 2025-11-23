# Secure Location Identification Processing Module

## Overview

This is a comprehensive, secure web application module designed for local government officers in Vietnam to process field-collected location identification data submitted via mobile apps. The system implements role-based regional access control, interactive map interfaces, workflow management, and data synchronization with the national database.

## Key Features

### 1. Role-Based Regional Access Control

**Implementation:** `lib/security/boundary-enforcement.ts`

- Officers can only view and interact with data within their authorized administrative boundary
- Three-tier access control:
  - **Commune Officers/Supervisors**: Limited to their commune (xã)
  - **Province Officials**: Limited to their province
  - **Central Admins**: Access to all of Vietnam
- Geographic validation using Leaflet bounds checking
- Administrative code validation (province_code, district_code, ward_code)

**Security Features:**
- Row-Level Security (RLS) policies in Supabase
- Client-side boundary enforcement
- Server-side validation through RLS
- Audit trail for all access attempts

### 2. Map Interface with Boundary Visualization

**Component:** `components/map/regional-boundary-map.tsx`

- Interactive map using Leaflet
- Out-of-bounds areas are:
  - Grayed out with 35% opacity black overlay
  - Marked with red boundary line
  - Non-selectable and non-editable
- Max bounds restriction prevents panning outside jurisdiction
- Automatic map fitting to user's authorized region

**Features:**
- GPS point visualization for submitted locations
- Polygon boundary display
- Real-time marker clustering
- Pop-up information cards
- Click-to-select functionality

### 3. Polygon Editing Tools

**Component:** `components/map/polygon-editor.tsx`

- Draw new polygons using Leaflet Draw
- Edit existing polygon boundaries
- Rectangle and freeform polygon support
- Real-time boundary validation
- Automatic rejection of polygons outside jurisdiction

**Validation:**
- All polygon vertices must be within allowed boundary
- Intersection detection
- Area calculation
- Error feedback with specific violation messages

### 4. Record Management Interface

**Component:** `components/records/record-processor.tsx`

A comprehensive UI for processing survey submissions with:

**Display Information:**
- Location details (coordinates, address, administrative codes)
- Owner information (name, ID, phone)
- Land parcel association (parcel code, area)
- Photos from mobile survey
- Status and workflow history
- GPS accuracy metrics

**Metadata Enrichment:**
- Owner name and contact details
- Structure type classification
- Legal status designation
- Land use type
- Cadastral parcel linking

### 5. Workflow Control System

**Service:** `lib/services/workflow-service.ts`

**Workflow States:**
```
pending → reviewed → approved_commune → approved_central → published
         ↓
      rejected
```

**Actions by Role:**

**Commune Officer:**
- Submit/Forward: `pending` → `reviewed`
- Edit records in pending/rejected status

**Commune Supervisor:**
- Approve: `reviewed` → `approved_commune`
- Reject: `reviewed` → `rejected`
- Can override officer submissions

**Central Admin:**
- Approve: `approved_commune` → `approved_central`
- Reject: `approved_commune` → `rejected`
- Assign location identifiers
- Trigger national database sync

**Features:**
- Permission validation before action
- Approval history tracking
- Rejection reason requirement
- Forward with notes capability
- Batch approval support

### 6. Land Parcel Association

**Integration Points:**
- Cadastral database lookup by parcel code
- Spatial selection on map
- Automatic data population (owner, area, boundaries)
- Conflict detection and resolution

**Search Methods:**
1. **By Parcel Code:** Direct lookup using cadastral reference
2. **By Spatial Selection:** Click on map to auto-associate
3. **By Owner Name:** Search owner database

### 7. Data Synchronization

**Service:** `lib/services/data-sync-service.ts`

**Sync Process:**
1. Query all `approved_central` records
2. Transform data to national database format
3. API call to national database endpoint
4. Mark as `published` on success
5. Log sync operation in audit trail
6. Handle retry for failed syncs

**Features:**
- Automatic scheduled sync (configurable interval)
- Manual sync trigger for urgent cases
- Batch processing with error handling
- Sync status dashboard
- Failure retry mechanism
- Transaction rollback on error

**Monitoring:**
- Last sync timestamp
- Pending sync count
- Total synced records
- Failed sync errors with details

### 8. Security & Authentication

**Authentication:** Supabase Auth
- Email/password authentication
- Role assignment during user creation
- Session management
- Automatic token refresh

**Row-Level Security (RLS):**
Location: `supabase/migrations/20250121_rls_policies.sql`

**Key Policies:**
- Commune officers see only their commune data
- Supervisors see their commune + approval rights
- Central admins see all data
- Geographic validation + administrative code matching
- Audit log for all data access

**Additional Security:**
- HTTPS-only communication
- Input validation and sanitization
- SQL injection prevention via Supabase client
- XSS protection
- CSRF token validation

### 9. Audit Logging

All actions are logged to `audit_logs` table:
- User ID and role
- Action type (view, edit, approve, reject, sync)
- Resource ID
- Timestamp
- IP address
- User agent
- Metadata (before/after state)

## System Architecture

### Frontend Stack
- **Framework:** Next.js 15 (App Router)
- **UI Library:** React 18
- **Styling:** Tailwind CSS
- **Map:** Leaflet + React Leaflet
- **State:** React Hooks + Zustand (optional)
- **Forms:** React Hook Form
- **Validation:** Zod

### Backend Stack
- **Database:** PostgreSQL (via Supabase)
- **Authentication:** Supabase Auth
- **Storage:** Supabase Storage (for photos)
- **API:** Supabase Realtime + REST
- **Row-Level Security:** PostgreSQL RLS

### Database Schema

**Key Tables:**
```sql
profiles                 -- User profile data
web_users               -- Role and jurisdiction assignment
survey_locations        -- Main survey data
approval_history        -- Workflow audit trail
location_identifiers    -- Assigned location codes
land_parcels           -- Cadastral database
system_config          -- System settings
audit_logs             -- Complete audit trail
```

## Usage Guide

### For Commune Officers

1. **Login** with credentials
2. **View pending surveys** in your commune
3. **Review each record:**
   - Check GPS accuracy
   - Verify photos
   - Validate location info
4. **Enrich metadata:**
   - Add owner information
   - Link to land parcel
   - Add notes
5. **Forward to supervisor** for approval

### For Commune Supervisors

1. **Login** with credentials
2. **Review forwarded surveys**
3. **Check officer's work:**
   - Validate metadata completeness
   - Verify polygon boundaries
   - Check photos quality
4. **Approve or Reject:**
   - Approve → sends to central admin
   - Reject → returns to officer with reason

### For Central Admins

1. **Login** with credentials
2. **Review commune-approved surveys**
3. **Final validation:**
   - Check data quality
   - Verify administrative codes
   - Validate against national standards
4. **Approve and assign location ID**
5. **Trigger national database sync**

## API Integration

### National Database Sync

**Endpoint Configuration:**
```typescript
// lib/services/data-sync-service.ts
const NATIONAL_DB_API = process.env.NATIONAL_DB_API_URL
const API_KEY = process.env.NATIONAL_DB_API_KEY

// Example sync payload
{
  location_identifier: "010001123456",
  latitude: 21.0285,
  longitude: 105.8542,
  province_code: "01",
  district_code: "001",
  ward_code: "001",
  address: "...",
  owner_name: "...",
  owner_id_number: "...",
  parcel_code: "...",
  land_area_m2: 150.5,
  photos: ["url1", "url2"],
  approved_at: "2025-01-23T10:30:00Z",
  approved_by: "central_admin_id"
}
```

## Installation & Setup

### 1. Environment Variables

Create `.env.local`:
```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# National Database API (configure when available)
NATIONAL_DB_API_URL=https://api.national-db.gov.vn
NATIONAL_DB_API_KEY=your_api_key
```

### 2. Database Migration

```bash
# Run migrations
npm run supabase:migrate

# Or apply manually
psql -h your_db_host -U postgres -d your_database -f supabase/migrations/20250121_web_platform_schema.sql
psql -h your_db_host -U postgres -d your_database -f supabase/migrations/20250121_rls_policies.sql
```

### 3. Create Users

```bash
# Run user creation script
node scripts/create-users.js

# Or manually via SQL
INSERT INTO web_users (profile_id, role, commune_code, province_code)
VALUES ('user_id', 'commune_officer', '00101', '01');
```

### 4. Configure Boundary Data

Update `lib/map/vietnam-administrative-data.ts` with complete province/district/commune data.

### 5. Run Application

```bash
npm install
npm run dev
```

Navigate to: `http://localhost:3000/commune/process`

## Testing

### Security Testing

1. **Test boundary enforcement:**
   - Try to access records outside jurisdiction
   - Attempt to edit restricted records
   - Test RLS policies with different roles

2. **Test workflow permissions:**
   - Verify role-based action restrictions
   - Test approval cascade
   - Verify rejection flow

### Functional Testing

1. **Test map interactions:**
   - Pan outside boundary (should be restricted)
   - Draw polygons across boundary (should be rejected)
   - Test marker click and selection

2. **Test record processing:**
   - Submit survey for review
   - Approve/reject workflows
   - Verify status transitions

3. **Test data sync:**
   - Sync approved records
   - Verify status change to published
   - Check audit logs

## Performance Optimization

- **Map rendering:** Uses clustering for 1000+ markers
- **Database queries:** Indexed on status, ward_code, created_at
- **RLS policies:** Optimized with proper WHERE clauses
- **Image optimization:** Next.js Image component
- **Code splitting:** Route-based lazy loading

## Monitoring & Maintenance

### Health Checks
- Database connection status
- Supabase API availability
- National database API status
- Sync queue status

### Alerts
- Failed sync operations
- RLS policy violations
- Authentication failures
- Unusual data access patterns

### Regular Maintenance
- Review audit logs weekly
- Monitor sync success rates
- Update boundary data annually
- Review and optimize RLS policies quarterly

## Support & Documentation

- **Technical Documentation:** This file
- **User Guide:** See `/docs/user-guide.md`
- **API Documentation:** See `/docs/api-reference.md`
- **Troubleshooting:** See `/docs/troubleshooting.md`

## License

Government of Vietnam - Internal Use Only
