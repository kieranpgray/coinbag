#!/bin/bash
# Setup script for CLI access to Supabase, Vercel, and Clerk

set -e

echo "🔧 Setting up CLI access for Supabase, Vercel, and Clerk..."
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# 1. Supabase CLI
echo -e "${YELLOW}📦 Supabase CLI:${NC}"
if command -v supabase &> /dev/null; then
  VERSION=$(supabase --version 2>&1 | head -1)
  echo -e "  ${GREEN}✅ Already installed: $VERSION${NC}"
  
  # Check if authenticated
  if supabase projects list &> /dev/null; then
    echo -e "  ${GREEN}✅ Already authenticated${NC}"
  else
    echo -e "  ${YELLOW}🔐 Not authenticated. Please run: supabase login${NC}"
    read -p "  Do you want to authenticate now? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
      supabase login
      read -p "  Enter Supabase project reference ID (or press Enter to skip): " project_ref
      if [ ! -z "$project_ref" ]; then
        supabase link --project-ref "$project_ref"
      fi
    fi
  fi
else
  echo -e "  ${RED}❌ Not installed${NC}"
  echo -e "  ${YELLOW}Install via: brew install supabase${NC}"
  echo -e "  ${YELLOW}Or: npm install -g supabase${NC}"
fi

echo ""

# 2. Vercel CLI
echo -e "${YELLOW}🚀 Vercel CLI:${NC}"
if command -v vercel &> /dev/null; then
  VERSION=$(vercel --version 2>&1)
  echo -e "  ${GREEN}✅ Already installed: $VERSION${NC}"
  
  # Check if authenticated
  if test -f ~/.vercel/auth.json; then
    echo -e "  ${GREEN}✅ Already authenticated${NC}"
  else
    echo -e "  ${YELLOW}🔐 Not authenticated. Please run: vercel login${NC}"
    read -p "  Do you want to authenticate now? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
      vercel login
      read -p "  Do you want to link this project? (y/n) " -n 1 -r
      echo
      if [[ $REPLY =~ ^[Yy]$ ]]; then
        vercel link
      fi
    fi
  fi
else
  echo -e "  ${RED}❌ Not installed${NC}"
  echo -e "  ${YELLOW}Installing Vercel CLI...${NC}"
  npm install -g vercel
  echo -e "  ${YELLOW}After installation, run: vercel login${NC}"
fi

echo ""

# 3. Clerk API Key
echo -e "${YELLOW}🔑 Clerk API Access:${NC}"
if [ -z "$CLERK_SECRET_KEY" ]; then
  echo -e "  ${RED}⚠️  CLERK_SECRET_KEY not set${NC}"
  echo -e "  ${YELLOW}📝 Get your secret key from:${NC}"
  echo -e "     https://dashboard.clerk.com → API Keys → Backend API"
  echo -e "  ${YELLOW}💡 Add to .env: CLERK_SECRET_KEY=sk_test_...${NC}"
  
  # Check if .env exists
  if [ -f .env ]; then
    if grep -q "CLERK_SECRET_KEY" .env; then
      echo -e "  ${YELLOW}⚠️  Found CLERK_SECRET_KEY in .env but not exported${NC}"
      echo -e "  ${YELLOW}💡 Source .env file: source .env${NC}"
    fi
  fi
else
  echo -e "  ${GREEN}✅ CLERK_SECRET_KEY is set${NC}"
  
  # Test API access
  echo -e "  ${YELLOW}🧪 Testing API access...${NC}"
  RESPONSE=$(curl -s -w "\n%{http_code}" -X GET "https://api.clerk.com/v1/users?limit=1" \
    -H "Authorization: Bearer $CLERK_SECRET_KEY" 2>&1)
  HTTP_CODE=$(echo "$RESPONSE" | tail -1)
  if [ "$HTTP_CODE" = "200" ]; then
    echo -e "  ${GREEN}✅ API access working${NC}"
  else
    echo -e "  ${RED}❌ API access failed (HTTP $HTTP_CODE)${NC}"
    echo -e "  ${YELLOW}Check your CLERK_SECRET_KEY${NC}"
  fi
fi

echo ""
echo -e "${GREEN}✅ CLI setup check complete!${NC}"
echo ""
echo "Next steps:"
echo "  1. Run 'supabase login' if not authenticated"
echo "  2. Run 'vercel login' if not authenticated"
echo "  3. Set CLERK_SECRET_KEY in .env for Clerk API access"

