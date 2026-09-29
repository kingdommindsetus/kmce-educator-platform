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
