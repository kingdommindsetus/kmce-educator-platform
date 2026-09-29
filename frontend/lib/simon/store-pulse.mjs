export function evaluateStorePulse(snapshot,cadence="DAILY",now=new Date()){
  const mode=String(cadence||"DAILY").toUpperCase()==="WEEKLY"?"WEEKLY":"DAILY";
  if(!snapshot){
    return {
      pulse_status:"NO_DATA",
      findings:[{code:"STORE_TELEMETRY_MISSING",severity:"YELLOW"}],
      actions:[{agent:"Alice",code:"CONNECT_STORE_TELEMETRY"}]
    };
  }

  let pulse_status="GREEN";
  const findings=[];
  const actions=[];
  const daysSince=(value)=>{
    if(!value)return null;
    const ms=now.getTime()-new Date(value).getTime();
    return Math.max(0,Math.floor(ms/86400000));
  };
  const campaignAge=daysSince(snapshot.last_campaign_at);
  const productAge=daysSince(snapshot.last_product_publish_at);

  if(Number(snapshot.products_active||0)===0){
    pulse_status="RED";
    findings.push({code:"NO_ACTIVE_PRODUCTS",severity:"RED"});
    actions.push({agent:"Alice",code:"RESTORE_ACTIVE_CATALOG"});
  }

  if(campaignAge===null || campaignAge>=7 || Number(snapshot.email_campaigns_7d||0)===0 || Number(snapshot.social_posts_7d||0)===0){
    if(pulse_status!=="RED")pulse_status="YELLOW";
    findings.push({code:"MARKETING_CADENCE_STALE",severity:"YELLOW"});
    actions.push({agent:"Snake",code:"RESTART_GROWTH_CADENCE"});
  }

  if(mode==="WEEKLY" && (Number(snapshot.new_products_14d||0)===0 || productAge===null || productAge>=14)){
    if(pulse_status!=="RED")pulse_status="YELLOW";
    findings.push({code:"PRODUCT_PIPELINE_STALE",severity:"YELLOW"});
    actions.push({agent:"Devon",code:"PROPOSE_DIGITAL_PRODUCT"});
    actions.push({agent:"Mercedes",code:"PROPOSE_MERCH_PRODUCT"});
  }

  if(Number(snapshot.sessions||0)>=100 && Number(snapshot.orders_count||0)===0){
    pulse_status="RED";
    findings.push({code:"TRAFFIC_WITHOUT_ORDERS",severity:"RED"});
    actions.push({agent:"Alice",code:"REVIEW_CONVERSION_BLOCKERS"});
    actions.push({agent:"Snake",code:"PREPARE_CONVERSION_RECOVERY"});
  }

  return {pulse_status,findings,actions};
}


export function storePulseTaskSpec(action){
  const specs={
    CONNECT_STORE_TELEMETRY:{title:"Connect Kingdom Mindset Store telemetry",instruction:"Verify the Kingdom Mindset Store Shopify connection and establish a daily metrics snapshot for Snake. Do not publish, email, discount, or change live pricing."},
    RESTORE_ACTIVE_CATALOG:{title:"Restore active store catalog",instruction:"Audit product status and storefront availability. Prepare corrective actions for Founder review; do not publish products without approval."},
    RESTART_GROWTH_CADENCE:{title:"Restart Kingdom Mindset Store growth cadence",instruction:"Prepare the next store growth campaign using current product and trend intelligence. Draft email, social, and outreach assets only; external sends and publishing remain approval-gated."},
    PROPOSE_DIGITAL_PRODUCT:{title:"Propose next digital store product",instruction:"Use Eyes and Snake demand intelligence to prepare one sellable digital-product concept, scope, asset list, and draft listing. Do not publish."},
    PROPOSE_MERCH_PRODUCT:{title:"Propose next merchandise collection item",instruction:"Use Eyes and Snake visual intelligence to prepare one merchandise concept with creative direction, variants, mockup requirements, and draft listing. Do not publish."},
    REVIEW_CONVERSION_BLOCKERS:{title:"Review storefront conversion blockers",instruction:"Audit product pages, pricing presentation, navigation, checkout friction, and merchandising for conversion blockers. Prepare recommendations only."},
    PREPARE_CONVERSION_RECOVERY:{title:"Prepare conversion recovery campaign",instruction:"Analyze traffic-without-order signals and prepare a conversion recovery campaign brief. No discounts, sends, ads, or publishing without approval."}
  };
  return specs[action?.code]||{title:"Review Store Pulse finding",instruction:"Review the Store Pulse finding and prepare an internal recommendation. Do not take external action."};
}
