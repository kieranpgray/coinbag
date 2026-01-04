# Supabase Projects Configuration

## Projects

### coinbag-dev (Development)
- **Project Reference ID**: `tislabgxitwtcqfwrpik`
- **Project Name**: moneybags (in Supabase Dashboard)
- **URL**: `https://tislabgxitwtcqfwrpik.supabase.co`
- **Database Password**: `tfq1azv-zdr@UJE1uxp`
- **Region**: South Asia (Mumbai)
- **Created**: 2025-12-27
- **Purpose**: Development and testing

### coinbag (Production)
- **Project Reference ID**: `auvtsvmtfrbpvgyvfqlx`
- **Project Name**: coinbag
- **URL**: `https://auvtsvmtfrbpvgyvfqlx.supabase.co`
- **Database Password**: `vzp4pkg-pvp.AMC6yhc`
- **Region**: Oceania (Sydney)
- **Created**: 2025-12-29
- **Purpose**: Production

## Usage

### Link to Development Project
```bash
supabase link --project-ref tislabgxitwtcqfwrpik --password 'tfq1azv-zdr@UJE1uxp'
```

### Link to Production Project
```bash
supabase link --project-ref auvtsvmtfrbpvgyvfqlx --password 'vzp4pkg-pvp.AMC6yhc'
```

### Push Migrations
```bash
# After linking, push all pending migrations
supabase db push
```

## Environment Variables

### Development (.env.local)
```
VITE_SUPABASE_URL=https://tislabgxitwtcqfwrpik.supabase.co
VITE_SUPABASE_ANON_KEY=<dev-anon-key>
```

### Production (Vercel/Deployment)
```
VITE_SUPABASE_URL=https://auvtsvmtfrbpvgyvfqlx.supabase.co
VITE_SUPABASE_ANON_KEY=<prod-anon-key>
```


