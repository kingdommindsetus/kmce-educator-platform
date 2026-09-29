export const TOOL_AUTHORITY=Object.freeze({
  AUTO:"AUTO",
  CONTROLLED:"CONTROLLED",
  APPROVAL:"APPROVAL",
  FORBIDDEN:"FORBIDDEN",
});

export const KMCE_TOOL_REGISTRY=Object.freeze([
  {
    tool_id:"lead.dentist_discovery",
    label:"Dentist Lead Discovery",
    owner_agents:["Scout","Eyes","Claire","Simon"],
    provider:"Apify",
    actor_url:"https://apify.com/easyapi/dentalplans-com-dentist-scraper",
    authority:TOOL_AUTHORITY.AUTO,
    purpose:"Discover structured US dentist/practice leads and appointment availability.",
    writes:["leads","lead_evidence"],
    external_effect:false,
  },
  {
    tool_id:"lead.contact_enrich",
    label:"Contact Info Scraper",
    owner_agents:["Claire","Eyes","Simon"],
    provider:"Apify",
    actor_url:"https://apify.com/nexgendata/contact-info-scraper",
    authority:TOOL_AUTHORITY.CONTROLLED,
    purpose:"Extract emails, phones and social profiles from practice websites.",
    writes:["lead_evidence"],
    external_effect:false,
  },
  {
    tool_id:"lead.email_verify",
    label:"Bulk Email Verifier",
    owner_agents:["Claire","Echo","Simon"],
    provider:"Apify",
    actor_url:"https://apify.com/ryanclinton/bulk-email-verifier",
    authority:TOOL_AUTHORITY.CONTROLLED,
    purpose:"Validate syntax, MX, SMTP, disposable and catch-all risk before outreach.",
    writes:["lead_evidence"],
    external_effect:false,
  },
  {
    tool_id:"lead.phone_verify",
    label:"Bulk Phone Validator",
    owner_agents:["Claire","Echo","Simon"],
    provider:"Apify",
    actor_url:"https://apify.com/taroyamada/phone-number-validator",
    authority:TOOL_AUTHORITY.CONTROLLED,
    purpose:"Normalize and validate phone numbers for CRM use.",
    writes:["lead_evidence"],
    external_effect:false,
  },
  {
    tool_id:"research.academic",
    label:"Academic Research MCP",
    owner_agents:["Claire","Delivery/CE","Simon"],
    provider:"Apify MCP",
    actor_url:"https://apify.com/nexgendata/academic-research-mcp-server",
    authority:TOOL_AUTHORITY.AUTO,
    purpose:"Search scholarly papers, PubMed, arXiv and citation metadata for course research.",
    writes:["knowledge_documents"],
    external_effect:false,
  },
  {
    tool_id:"media.youtube_research",
    label:"YouTube MCP",
    owner_agents:["Tube","Claire","Simon"],
    provider:"Apify MCP",
    actor_url:"https://apify.com/nexgendata/youtube-media-mcp-server",
    authority:TOOL_AUTHORITY.AUTO,
    purpose:"Search YouTube and retrieve transcripts, channel data and comments for content/course research.",
    writes:["knowledge_documents"],
    external_effect:false,
  },
  {
    tool_id:"commerce.shopify_intelligence",
    label:"E-Commerce MCP",
    owner_agents:["Eve","Snake","Alice","Simon"],
    provider:"Apify MCP",
    actor_url:"https://apify.com/nexgendata/ecommerce-intelligence-mcp-server",
    authority:TOOL_AUTHORITY.AUTO,
    purpose:"Analyze Shopify stores and products for catalog, merchandising and competitive intelligence.",
    writes:["store_metrics_snapshots","store_catalog_favorites"],
    external_effect:false,
  },
  {
    tool_id:"website.quality_audit",
    label:"Website Quality Audit",
    owner_agents:["Alice","Sofia","Simon"],
    provider:"Approved audit provider",
    actor_url:null,
    authority:TOOL_AUTHORITY.AUTO,
    purpose:"Run SEO, accessibility, performance and technical-quality checks.",
    writes:["knowledge_documents"],
    external_effect:false,
  },
  {
    tool_id:"calendar.find_slots",
    label:"Calendar Availability",
    owner_agents:["Booker","Simon"],
    provider:"Google Calendar MCP",
    actor_url:null,
    authority:TOOL_AUTHORITY.AUTO,
    purpose:"Read availability and propose valid meeting windows.",
    writes:[],
    external_effect:false,
  },
  {
    tool_id:"calendar.book",
    label:"Calendar Booking",
    owner_agents:["Booker","Simon"],
    provider:"Google Calendar MCP",
    actor_url:null,
    authority:TOOL_AUTHORITY.APPROVAL,
    purpose:"Create or modify calendar events after founder/policy approval.",
    writes:["discovery_appointments"],
    external_effect:true,
  },
  {
    tool_id:"course.quiz_generate",
    label:"Course Quiz Generator",
    owner_agents:["Delivery/CE","Claire","Simon"],
    provider:"Approved education tool",
    actor_url:null,
    authority:TOOL_AUTHORITY.CONTROLLED,
    purpose:"Generate draft quiz items from approved course source material.",
    writes:["knowledge_documents"],
    external_effect:false,
  },
  {
    tool_id:"code.sandbox",
    label:"Safe Code Sandbox",
    owner_agents:["Simon","Devon"],
    provider:"Sandboxed execution provider",
    actor_url:null,
    authority:TOOL_AUTHORITY.CONTROLLED,
    purpose:"Execute bounded code for analysis and transformation without host shell access.",
    writes:[],
    external_effect:false,
  },
]);

export function toolsForAgent(agentName){
  return KMCE_TOOL_REGISTRY.filter(tool=>tool.owner_agents.includes(agentName));
}

export function getTool(toolId){
  return KMCE_TOOL_REGISTRY.find(tool=>tool.tool_id===toolId)||null;
}

export function toolCanAutoRun(toolId){
  const tool=getTool(toolId);
  return !!tool && (tool.authority===TOOL_AUTHORITY.AUTO || tool.authority===TOOL_AUTHORITY.CONTROLLED) && !tool.external_effect;
}
