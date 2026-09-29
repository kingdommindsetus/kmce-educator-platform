export const AUTHORITY = Object.freeze({
  AUTO:"AUTO",
  CONTROLLED:"CONTROLLED",
  POLICY:"POLICY",
  APPROVAL:"APPROVAL",
  FORBIDDEN:"FORBIDDEN"
});

export const EMPLOYEES = Object.freeze([
  "Simon","Marie","Scout","Claire","Atlas","Sofia","Maven",
  "Mark","Cammy","Lucy","Tube","Helios","Eyes","Eve","Alice","Devon","Mercedes","Snake",
  "Gatekeeper","Echo","Booker","Flow","Ledger","Delivery/CE"
]);

export const CAPABILITIES = Object.freeze({
  "knowledge.search": {owner:"Simon", provider:"Obsidian", authority:AUTHORITY.AUTO},
  "relationship.search": {owner:"Simon", provider:"Graphify", authority:AUTHORITY.AUTO},
  "llm.generate": {owner:"Simon", provider:"OmniRoute", authority:AUTHORITY.AUTO},
  "procedure.lookup": {owner:"Gatekeeper", provider:"ECC", authority:AUTHORITY.AUTO},

  "task.triage": {owner:"Marie", provider:"Marie policy engine", authority:AUTHORITY.AUTO},
  "task.delegate": {owner:"Marie", provider:"agent_tasks", authority:AUTHORITY.CONTROLLED},
  "task.follow_up": {owner:"Marie", provider:"Neon", authority:AUTHORITY.CONTROLLED},
  "executive.brief": {owner:"Marie", provider:"Neon + Simon", authority:AUTHORITY.AUTO},

  "business.search": {owner:"Scout", provider:"KMCE Tool Registry", authority:AUTHORITY.AUTO},
  "lead.dentist_discovery": {owner:"Scout", provider:"Apify DentalPlans", authority:AUTHORITY.AUTO},
  "lead.contact_enrich": {owner:"Claire", provider:"Apify Contact Info Scraper", authority:AUTHORITY.CONTROLLED},
  "lead.email_verify": {owner:"Claire", provider:"Apify Email Verifier", authority:AUTHORITY.CONTROLLED},
  "lead.phone_verify": {owner:"Claire", provider:"Apify Phone Validator", authority:AUTHORITY.CONTROLLED},
  "web.search": {owner:"Scout", provider:"Firecrawl", authority:AUTHORITY.AUTO},
  "website.inspect": {owner:"Scout", provider:"Firecrawl", authority:AUTHORITY.AUTO},
  "browser.inspect": {owner:"Scout", provider:"Controlled Playwright MCP", authority:AUTHORITY.AUTO},

  "research.deep": {owner:"Claire", provider:"Academic Research MCP + KMCE knowledge", authority:AUTHORITY.AUTO},
  "media.youtube_research": {owner:"Tube", provider:"YouTube MCP", authority:AUTHORITY.AUTO},
  "commerce.shopify_intelligence": {owner:"Eve", provider:"E-Commerce MCP", authority:AUTHORITY.AUTO},
  "website.quality_audit": {owner:"Alice", provider:"KMCE Tool Registry", authority:AUTHORITY.AUTO},
  "course.quiz_generate": {owner:"Delivery/CE", provider:"KMCE Tool Registry", authority:AUTHORITY.CONTROLLED},
  "code.sandbox": {owner:"Simon", provider:"Sandboxed execution provider", authority:AUTHORITY.CONTROLLED},
  "lead.enrich": {owner:"Claire", provider:"Research providers", authority:AUTHORITY.CONTROLLED},
  "lead.qualify": {owner:"Atlas", provider:"KMCE scoring", authority:AUTHORITY.CONTROLLED},

  "campaign.plan": {owner:"Mark", provider:"NERVS + KMCE marketing skills", authority:AUTHORITY.AUTO},
  "marketing.campaign.prepare": {owner:"Mark", provider:"NERVS campaign workflow", authority:AUTHORITY.CONTROLLED},
  "campaign.generate": {owner:"Cammy", provider:"KMCE campaign generation engine", authority:AUTHORITY.CONTROLLED},
  "campaign.cost.estimate": {owner:"Cammy", provider:"KMCE campaign economics model", authority:AUTHORITY.CONTROLLED},
  "campaign.target.score": {owner:"Cammy", provider:"KMCE audience scoring model", authority:AUTHORITY.CONTROLLED},
  "campaign.variant.generate": {owner:"Cammy", provider:"KMCE campaign experiment engine", authority:AUTHORITY.CONTROLLED},
  "campaign.email.prepare": {owner:"Mark", provider:"Listmonk-compatible adapter", authority:AUTHORITY.CONTROLLED},
  "blog.prepare": {owner:"Mark", provider:"KMCE marketing skills", authority:AUTHORITY.CONTROLLED},
  "marketing.show.plan": {owner:"Mark", provider:"KMCE editorial workflow", authority:AUTHORITY.CONTROLLED},

  "social.plan": {owner:"Mark", provider:"KMCE marketing skills", authority:AUTHORITY.AUTO},
  "social.content.adapt": {owner:"Lucy", provider:"NERVS social adapter layer", authority:AUTHORITY.CONTROLLED},
  "social.calendar.prepare": {owner:"Lucy", provider:"NERVS scheduler", authority:AUTHORITY.CONTROLLED},
  "social.comment.triage": {owner:"Lucy", provider:"Approved social connectors", authority:AUTHORITY.CONTROLLED},
  "social.reply.draft": {owner:"Lucy", provider:"NERVS social adapter layer", authority:AUTHORITY.CONTROLLED},
  "social.reply.send": {owner:"Lucy", provider:"Approved social connectors", authority:AUTHORITY.APPROVAL},
  "social.performance.collect": {owner:"Lucy", provider:"Approved social analytics connectors", authority:AUTHORITY.CONTROLLED},
  "social.publish": {owner:"Lucy", provider:"Approved social connectors", authority:AUTHORITY.APPROVAL},

  "video.plan": {owner:"Tube", provider:"AgentTube-derived workflow", authority:AUTHORITY.CONTROLLED},
  "video.package.prepare": {owner:"Tube", provider:"Tube production workflow", authority:AUTHORITY.CONTROLLED},
  "video.generate": {owner:"Tube", provider:"Helios + approved video providers", authority:AUTHORITY.CONTROLLED},
  "video.publish": {owner:"Tube", provider:"Approved video connectors", authority:AUTHORITY.APPROVAL},

  "seo.audit": {owner:"Sofia", provider:"ECC SEO + approved providers", authority:AUTHORITY.AUTO},

  "outreach.draft": {owner:"Echo", provider:"Internal draft engine", authority:AUTHORITY.AUTO},
  "outreach.send": {owner:"Echo", provider:"Controlled Gmail/provider connector", authority:AUTHORITY.APPROVAL},

  "calendar.find_slots": {owner:"Booker", provider:"Calendar connector", authority:AUTHORITY.AUTO},
  "calendar.book": {owner:"Booker", provider:"Calendar connector", authority:AUTHORITY.POLICY},

  "onboarding.checklist": {owner:"Flow", provider:"KMCE service catalog", authority:AUTHORITY.CONTROLLED},
  "document.request": {owner:"Flow", provider:"Approved communications connector", authority:AUTHORITY.APPROVAL},

  "payment.request": {owner:"Ledger", provider:"Stripe", authority:AUTHORITY.APPROVAL},
  "payment.reconcile": {owner:"Ledger", provider:"Stripe + accounting ledger", authority:AUTHORITY.CONTROLLED},
  "refund.execute": {owner:"Ledger", provider:"Stripe", authority:AUTHORITY.APPROVAL},
  "entitlement.release": {owner:"Ledger", provider:"KMCE fulfillment engine", authority:AUTHORITY.POLICY},

  "ce.issue": {owner:"Delivery/CE", provider:"KMCE CE engine", authority:AUTHORITY.POLICY},
  "audit.append": {owner:"Gatekeeper", provider:"Neon append-only audit", authority:AUTHORITY.CONTROLLED},

  "authority.change_self": {owner:"Simon", provider:null, authority:AUTHORITY.FORBIDDEN},
  "security.credentials.change": {owner:"Kimberly", provider:null, authority:AUTHORITY.FORBIDDEN},
  "contract.sign_as_founder": {owner:"Kimberly", provider:null, authority:AUTHORITY.FORBIDDEN},
  "audit.delete": {owner:"Kimberly", provider:null, authority:AUTHORITY.FORBIDDEN},
  "ledger.rewrite_history": {owner:"Ledger", provider:null, authority:AUTHORITY.FORBIDDEN}
});

export function resolveCapability(name){
  return CAPABILITIES[name] || null;
}

export function canAutoExecute(name){
  const c=resolveCapability(name);
  return !!c && (c.authority===AUTHORITY.AUTO || c.authority===AUTHORITY.CONTROLLED);
}
