export const AUTHORITY = Object.freeze({
  AUTO:"AUTO",
  CONTROLLED:"CONTROLLED",
  POLICY:"POLICY",
  APPROVAL:"APPROVAL",
  FORBIDDEN:"FORBIDDEN"
});

export const EMPLOYEES = Object.freeze([
  "Simon","Marie","Scout","Claire","Atlas","Sofia","Maven",
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

  "business.search": {owner:"Scout", provider:"Approved API registry", authority:AUTHORITY.AUTO},
  "web.search": {owner:"Scout", provider:"Firecrawl", authority:AUTHORITY.AUTO},
  "website.inspect": {owner:"Scout", provider:"Firecrawl", authority:AUTHORITY.AUTO},
  "browser.inspect": {owner:"Scout", provider:"Controlled Playwright MCP", authority:AUTHORITY.AUTO},

  "research.deep": {owner:"Claire", provider:"HyperResearch-derived pipeline", authority:AUTHORITY.AUTO},
  "lead.enrich": {owner:"Claire", provider:"Research providers", authority:AUTHORITY.CONTROLLED},
  "lead.qualify": {owner:"Atlas", provider:"KMCE scoring", authority:AUTHORITY.CONTROLLED},

  "campaign.plan": {owner:"Maven", provider:"KMCE campaign engine", authority:AUTHORITY.AUTO},
  "campaign.email.prepare": {owner:"Maven", provider:"Listmonk-compatible adapter", authority:AUTHORITY.CONTROLLED},

  "social.plan": {owner:"Sofia", provider:"Social-agent/ECC procedures", authority:AUTHORITY.AUTO},
  "social.publish": {owner:"Sofia", provider:"Approved social connectors", authority:AUTHORITY.APPROVAL},
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
