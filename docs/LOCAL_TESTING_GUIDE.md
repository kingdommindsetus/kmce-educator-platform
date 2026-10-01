# Local Testing Guide - Smile Designer

## Prerequisites

Make sure you have:
- ✅ Node.js 18+ installed
- ✅ npm or yarn
- ✅ Git
- ✅ A modern browser (Chrome, Firefox, Safari, Edge)

## Step 1: Clone & Install

```bash
# Clone the repository (if not already done)
git clone https://github.com/kingdommindsetus/kmce-educator-platform.git
cd kmce-educator-platform

# Go to frontend directory
cd frontend

# Install dependencies
npm install
# or
yarn install
```

## Step 2: Set Up Environment Variables

Create a `.env.local` file in the `frontend/` directory:

```bash
# Copy the example
cp .env.example .env.local

# Edit .env.local and add these (at minimum for testing):
OPENAI_API_KEY=sk_test_...  # Get from OpenAI
STRIPE_SECRET_KEY=sk_test_... # Get from Stripe test mode
DATABASE_URL=postgresql://... # Your Neon DB or local Postgres
```

**For local testing without real integrations:**
```bash
# You can use placeholder values:
OPENAI_API_KEY=sk_test_placeholder
STRIPE_SECRET_KEY=sk_test_placeholder
DATABASE_URL=postgresql://localhost/kmce_test
```

## Step 3: Start Development Server

```bash
npm run dev
# or
yarn dev
```

You should see:
```
  ▲ Next.js 16.3.6
  - Local:        http://localhost:3000
  - Environments: .env.local

✓ Ready in 2.5s
```

## Step 4: Test the Pages

### Landing Page
**URL:** `http://localhost:3000/smile-designer/landing`

**What to test:**
- [ ] Page loads with hero section
- [ ] Scroll through features section
- [ ] Pricing cards are visible
- [ ] Testimonials display correctly
- [ ] FAQ section expands
- [ ] Email signup input works
- [ ] "Start Trial" button is clickable
- [ ] Mobile responsive (shrink browser width to 375px)

**Expected:** Beautiful marketing page with all sections visible

---

### Signup Page
**URL:** `http://localhost:3000/smile-designer/signup`

**Step 1 - Practice Info:**
- [ ] Page loads with form
- [ ] Enter email: `test@dentalclinic.com`
- [ ] Enter practice name: `Bright Smile Dental`
- [ ] Enter phone: `+1-555-123-4567`
- [ ] Select plan: "Starter"
- [ ] Click "Continue to Billing"

**Expected:** Progress indicator moves to Step 2

**Step 2 - Billing:**
- [ ] Billing information displays
- [ ] Click "Continue to Payment"

**Expected:** Would redirect to Stripe checkout (in production)

**Step 3 - Shopify:**
- [ ] Shopify connection form appears
- [ ] Instructions for getting Shopify credentials display
- [ ] Input fields for store URL, shop ID, access token
- [ ] Click "Back" to go back to previous step

**Expected:** Can navigate between steps

**Step 4 - Confirmation:**
- [ ] Success message displays
- [ ] "Go to Dashboard" button appears
- [ ] Mobile responsive

**Expected:** Full signup flow works

---

### Dashboard Page
**URL:** `http://localhost:3000/dashboard/smile-designer`

**What to test:**
- [ ] Page loads with chat interface
- [ ] "Smile Designer" header is visible
- [ ] Greeting message from agent displays
- [ ] Input field is ready for typing
- [ ] Type a test message: `"Hello, how does this work?"`
- [ ] Click "Send" button
- [ ] Wait 2-3 seconds for response

**Expected:** Agent responds with friendly greeting

**Test Commands:**
```
"Create a smile mockup"
"Publish to my Shopify store"
"What's my subscription status?"
"Connect my Shopify store"
```

**Expected:** Agent acknowledges each command and offers next steps

---

## Step 5: Test API Endpoints (Advanced)

### Using cURL:

**Generate Smile Mockup:**
```bash
curl -X POST http://localhost:3000/api/smiles/generate \
  -H "Content-Type: application/json" \
  -d '{
    "dentist_id": 1,
    "original_image_url": "https://example.com/smile.jpg",
    "treatment_type": "veneers",
    "treatment_description": "Professional veneers"
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "mockup_id": 123,
  "status": "PROCESSING"
}
```

### Create Dentist Account:
```bash
curl -X POST http://localhost:3000/api/dentist/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "dentist@practice.com",
    "practice_name": "Smile Dental",
    "phone": "+1-555-123-4567",
    "plan": "starter"
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "dentist": {
    "id": 1,
    "email": "dentist@practice.com",
    "practice_name": "Smile Dental",
    "subscription_plan": "starter"
  },
  "message": "Account created successfully..."
}
```

---

## Step 6: Browser DevTools Testing

Press `F12` to open DevTools and:

### Console Tab:
- [ ] No red errors
- [ ] No CORS warnings
- [ ] Network requests are successful

### Network Tab:
- [ ] API calls go to `/api/...` endpoints
- [ ] Responses are JSON
- [ ] Status codes are 200/201/400 (not 500)

### Elements Tab:
- [ ] Tailwind CSS classes are applied
- [ ] Colors and spacing look correct
- [ ] Form inputs are properly styled

---

## Step 7: Responsive Testing

Resize your browser to these widths and verify everything works:

| Size | Width | Device |
|------|-------|--------|
| Mobile | 375px | iPhone SE |
| Tablet | 768px | iPad |
| Desktop | 1920px | Full width |

**All pages should:**
- [ ] Text is readable
- [ ] Buttons are clickable
- [ ] Images load correctly
- [ ] No horizontal scroll
- [ ] Forms are usable

---

## Troubleshooting

### "Port 3000 already in use"
```bash
# Kill the process using port 3000
lsof -i :3000
kill -9 <PID>

# Or use a different port
npm run dev -- -p 3001
```

### "Cannot find module 'next'"
```bash
# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

### "database is not configured"
```bash
# Add DATABASE_URL to .env.local
# Or the schema creation will skip database tables
# Pages will still work, just API calls will fail
```

### "OpenAI API not configured"
This is fine for testing the UI. The mockup generation will show:
```json
{
  "ok": false,
  "error": "LLM_NOT_CONFIGURED"
}
```

Just means the AI features won't work without real API keys.

### Pages don't update after code changes
```bash
# Hard refresh the page
Cmd+Shift+R (Mac)
Ctrl+Shift+R (Windows/Linux)
```

---

## Testing Checklist

### Visual Testing
- [ ] Landing page looks professional
- [ ] Signup flow is intuitive
- [ ] Dashboard is user-friendly
- [ ] Mobile view is responsive
- [ ] Colors and fonts are correct
- [ ] All images load

### Functionality Testing
- [ ] Links navigate correctly
- [ ] Forms submit without errors
- [ ] Agent responds to messages
- [ ] Progress indicators work
- [ ] Buttons are clickable
- [ ] Inputs accept text

### API Testing
- [ ] Signup endpoint creates account
- [ ] Mockup endpoint returns mockup_id
- [ ] Agent endpoint responds
- [ ] Error handling works
- [ ] Status codes are correct

### Browser Compatibility
- [ ] Chrome ✓
- [ ] Firefox ✓
- [ ] Safari ✓
- [ ] Edge ✓
- [ ] Mobile Safari ✓
- [ ] Chrome Mobile ✓

---

## What to Look For

### Good Signs ✅
- Pages load in < 2 seconds
- No console errors
- Forms submit successfully
- Agent responds naturally
- Mobile looks great
- Styling is polished

### Red Flags 🚩
- Console has red error messages
- API calls fail (500 errors)
- Forms won't submit
- Pages take > 5 seconds to load
- Layout breaks on mobile
- Broken images

---

## Next Steps After Testing

1. **If everything works:**
   - Deploy to Vercel
   - Configure real Stripe keys
   - Get real OpenAI key
   - Launch to beta users

2. **If you find issues:**
   - Check the troubleshooting section
   - Review console errors
   - Check API response format
   - Ask in GitHub issues

3. **Ready to customize:**
   - Edit landing page copy
   - Change colors in Tailwind config
   - Add your logo
   - Customize pricing
   - Add your contact info

---

## Performance Tips

If the dev server is slow:

```bash
# Clear build cache
rm -rf .next

# Run with reduced memory usage
NODE_OPTIONS=--max_old_space_size=2048 npm run dev

# Use SWC compiler (faster)
# Already enabled by default in Next.js 16
```

---

## Common Customizations

### Change Landing Page Headline
**File:** `frontend/app/smile-designer/landing/page.tsx`
**Find:** `<h1>Turn Cosmetic Cases Into...`
**Edit:** Change the text and redeploy

### Change Pricing
**File:** `frontend/app/smile-designer/landing/page.tsx`
**Find:** Pricing section with plans
**Edit:** Update prices and features

### Change Dashboard Colors
**File:** `frontend/app/dashboard/smile-designer/page.tsx`
**Find:** Tailwind class names like `bg-indigo-600`
**Edit:** Change to your preferred colors

### Add Your Logo
**File:** `frontend/app/smile-designer/landing/page.tsx`
**Find:** "Smile Designer" text in navigation
**Replace:** With `<Image src="/logo.png" />`

---

## Questions?

If you run into issues:

1. Check console (F12 → Console tab)
2. Check Network tab for failed requests
3. Review error messages carefully
4. Check the troubleshooting section above
5. Refer to Next.js docs: https://nextjs.org/docs

**You got this! Happy testing! 🚀**
