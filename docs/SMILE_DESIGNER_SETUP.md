# Smile Designer Setup Guide

## Overview

Smile Designer is a complete ecosystem for dental professionals to create, manage, and sell cosmetic dentistry mockups through your Shopify store.

**Flow:**
1. Dentist subscribes via Stripe (recurring billing)
2. Dentist uploads patient photo → AI generates realistic smile mockup
3. Mockup auto-publishes to dentist's Shopify store
4. Patients buy mockups as digital products ($49-199)
5. Mockups drive consultation bookings and treatment sales

## Environment Variables Required

Add these to your `.env.local`:

```bash
# Existing OpenAI API (for LLM and image generation)
OPENAI_API_KEY=sk_...

# Stripe
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PUBLISHABLE_KEY=pk_live_...

# Database (already configured)
DATABASE_URL=postgresql://...

# Smile Designer specific
SMILE_DESIGNER_OPENAI_MODEL=gpt-4-vision  # for analyzing patient photos
SMILE_DESIGNER_SHOPIFY_API_VERSION=2024-01
```

## Database Schema

The following tables are automatically created on first run:

- `dentist_accounts` - Dentist subscription and Shopify connection data
- `smile_mockups` - Generated mockups with AI status and Shopify links
- `shopify_product_sync` - Tracks which mockups are synced to Shopify
- `smile_designer_subscriptions` - Stripe subscription details
- `smile_mockup_gallery` - Curated galleries for public sharing

All tables include proper indexing for performance.

## API Endpoints

### Generate Smile Mockup
```bash
POST /api/smiles/generate
Content-Type: application/json

{
  "dentist_id": 1,
  "original_image_url": "https://...",
  "treatment_type": "veneers",  # or whitening, orthodontics, etc.
  "treatment_description": "Professional veneers on upper teeth",
  "patient_name": "John Doe",
  "patient_email": "john@example.com"
}
```

Response:
```json
{
  "success": true,
  "mockup_id": 123,
  "status": "PROCESSING",
  "message": "Smile mockup generation started..."
}
```

### Publish to Shopify
```bash
POST /api/shopify/sync
Content-Type: application/json

{
  "dentist_id": 1,
  "mockup_id": 123,
  "product_title": "Smile Mockup - Veneers",
  "product_description": "See how you'll look with professional porcelain veneers",
  "product_price_cents": 9999  # $99.99
}
```

### Manage Subscriptions
```bash
POST /api/subscriptions/stripe
Content-Type: application/json

{
  "action": "create",  # create, get, or cancel
  "dentist_id": 1,
  "email": "dentist@practice.com",
  "plan": "starter"  # starter ($49.99/mo), professional ($99.99/mo), enterprise ($299.99/mo)
}
```

### Stripe Webhooks
Configure in Stripe Dashboard:
- Endpoint: `https://yourdomain.com/api/webhooks/stripe`
- Events to subscribe: 
  - `customer.subscription.updated`
  - `customer.subscription.deleted`
  - `invoice.paid`
  - `invoice.payment_failed`

### Agent Conversation
```bash
POST /api/agents/smile-designer
Content-Type: application/json
Authorization: Bearer <base64_encoded_dentist_id>

{
  "message": "Create a smile mockup for Dr. Smith's new veneer patient"
}
```

## Integration with KMCE Platform

Smile Designer integrates seamlessly with your existing system:

1. **Database**: Uses same Neon PostgreSQL connection
2. **LLM**: Uses your configured OpenAI/OmniRoute provider
3. **Agent System**: New "Smile Designer" agent works like Scout, Claire, etc.
4. **Commerce**: Reuses existing `commerce_transactions` table for revenue tracking
5. **Auth**: Can use founder auth or create dentist-specific JWT tokens

## Shopify Connection

Dentists need to:
1. Create Shopify store (if they don't have one)
2. Create a "Private App" in Shopify Admin
3. Get: `Access Token`, `Shop ID`, `Store URL`
4. Provide these during onboarding

We handle the API communication automatically.

## Payment Plans

### Starter ($49.99/month)
- Up to 50 mockups/month
- Basic Shopify sync
- 14-day free trial
- Email support

### Professional ($99.99/month)
- Unlimited mockups
- Advanced analytics
- Gallery templates
- Priority support

### Enterprise ($299.99/month)
- Everything in Professional
- Custom integrations
- Dedicated success manager
- Quarterly business reviews

## Testing Locally

1. Start dev server: `npm run dev`
2. Navigate to: `http://localhost:3000/dashboard/smile-designer`
3. Test via agent chat interface

For API testing:
```bash
curl -X POST http://localhost:3000/api/smiles/generate \
  -H "Content-Type: application/json" \
  -d '{
    "dentist_id": 1,
    "original_image_url": "https://example.com/smile.jpg",
    "treatment_type": "whitening"
  }'
```

## Revenue Model

**Your Take:**
- 15% of subscription revenue
- Example: 100 dentists at $49.99/month = $5,000 MRR → $750/month to you

**Dentist Revenue:**
- Average mockup sells for $99
- ~20-30% conversion rate from mockup viewer to consultation
- Average cosmetic case = $3,000-5,000
- Dentist makes back subscription in 1-2 mockups

## Monitoring & Analytics

Key metrics to track:
- Active subscriptions by plan
- Mockups generated per day
- Shopify product sync success rate
- Conversion rate (mockup view → consultation)
- Average revenue per dentist per month

All data available via existing dashboard or custom queries on `commerce_transactions` and `smile_mockups` tables.

## Scaling Considerations

Current MVP supports:
- ~1000 dentists without optimization
- ~100 concurrent mockup generations (async queue recommended)
- Daily limits enforced via OpenAI API quotas

For scaling:
1. Add async job queue (Bull/Redis) for image generation
2. Implement image caching (S3 or Cloudinary)
3. Add rate limiting per dentist
4. Implement mockup gallery CDN caching

## Troubleshooting

**Mockup generation stuck in PROCESSING:**
- Check OpenAI API key and usage limits
- Check database for errors in `ai_error_message` field
- Verify image URL is publicly accessible

**Shopify sync fails:**
- Verify Shopify access token hasn't expired
- Check Shopify API rate limits (100 requests/second)
- Review error in `shopify_product_sync.last_sync_error`

**Stripe webhook not working:**
- Verify webhook secret is correct
- Check Stripe webhook delivery logs
- Confirm endpoint is publicly accessible

## Next Steps

1. Configure environment variables
2. Set up Stripe account and webhook
3. Get OpenAI API key with vision access
4. Deploy to Vercel with new env vars
5. Create first dentist account for testing
6. Launch to beta group of dentists
7. Collect feedback and iterate

## Support

Refer to:
- `/api/smiles/generate` for image processing
- `/api/shopify/sync` for Shopify integration
- `/api/subscriptions/stripe` for billing logic
- `/lib/smile-designer-agent.ts` for AI orchestration
