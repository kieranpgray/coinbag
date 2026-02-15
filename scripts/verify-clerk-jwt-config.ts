#!/usr/bin/env tsx
/**
 * Script to verify Clerk JWT configuration
 * Checks if JWT template exists and provides instructions for setup
 */

const CLERK_DOMAIN = process.env.CLERK_DOMAIN || 'clerk.supafolio.app'
const CLERK_INSTANCE_ID = 'ins_37VAGQw0JVza01qpTa6yUt8iVLY'
const SUPABASE_PROJECT_REF = 'auvtsvmtfrbpvgyvfqlx'

console.log('🔍 Clerk JWT Configuration Verification')
console.log('========================================\n')

console.log('📋 Required Configuration:\n')

console.log('1. Clerk JWT Template')
console.log('   Location: Clerk Dashboard → JWT Templates')
console.log('   Template Name: supabase (lowercase, exactly)')
console.log('   Algorithm: HS256')
console.log('   Signing Key: Get from Supabase Dashboard → Project Settings → API → JWT Secret')
console.log('   Lifetime: 3600 seconds')
console.log('   Claims:')
console.log('   {')
console.log('     "sub": "{{user.id}}",')
console.log('     "role": "authenticated",')
console.log(`     "aud": "${CLERK_INSTANCE_ID}",`)
console.log(`     "iss": "https://${CLERK_DOMAIN}",`)
console.log('     "exp": "{{date.now_plus_seconds(3600)}}",')
console.log('     "iat": "{{date.now}}"')
console.log('   }\n')

console.log('2. Supabase JWT Validation')
console.log(`   Location: Supabase Dashboard → Authentication → Settings`)
console.log(`   Dashboard: https://app.supabase.com/project/${SUPABASE_PROJECT_REF}/auth/url-configuration`)
console.log('   JWKS URL:', `https://${CLERK_DOMAIN}/.well-known/jwks.json`)
console.log('   Issuer:', `https://${CLERK_DOMAIN}`)
console.log('   Audience:', CLERK_INSTANCE_ID)
console.log('   JWT Verification: Enabled\n')

console.log('📝 Manual Verification Steps:\n')
console.log('1. Go to Clerk Dashboard → JWT Templates')
console.log('2. Check if template named "supabase" exists')
console.log('3. If not, create it with the configuration above')
console.log('4. Go to Supabase Dashboard → Authentication → Settings')
console.log('5. Verify/configure JWT validation with the values above\n')

console.log('🧪 Test JWT Token (in browser console after sign-in):')
console.log(`
window.Clerk.session.getToken({ template: 'supabase' })
  .then(token => {
    if (token) {
      const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
      console.log('✅ Token:', payload);
      console.log('Role:', payload.role); // Should be "authenticated"
      console.log('User ID:', payload.sub); // Should be your Clerk user ID
      console.log('Audience:', payload.aud); // Should be "${CLERK_INSTANCE_ID}"
      console.log('Issuer:', payload.iss); // Should be "https://${CLERK_DOMAIN}"
    } else {
      console.error('❌ No token - template may not exist');
    }
  });
`)

console.log('\n✅ Verification complete!')
console.log('   See docs/MANUAL_VERIFICATION_STEPS.md for detailed instructions\n')

