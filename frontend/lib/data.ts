export const educator={
 id:1,
 legal_name:"Timothy Adams",
 public_name:"Dr. Timothy Adams",
 credentials:"DDS, D.ASBA, D.ACSDD",
 professional_title:"Lead Faculty & Clinical Innovator | Craniofacial Biodentistry & Airway Development",
 status:"ACTIVE"
};

export const leads=[
 {id:1,practice_name:"Airway Ortho AZ",decision_maker:"Dr. Chris Munkel",city:"Phoenix",state:"AZ",qualification_score:13,pipeline_stage:"PENDING_APPROVAL",assigned_agent:"Gatekeeper",evidence:"TMJ, sleep therapy, airway orthodontics and craniofacial pain focus.",qualification_reason:"airway + sleep + TMJ + craniofacial + verified contact + official evidence",email:"info@chrismunkelsmiles.com",phone:"(623) 580-4600"},
 {id:2,practice_name:"Healing Dentistry",decision_maker:"Dr. Marija Mitic",city:"Phoenix",state:"AZ",qualification_score:11,pipeline_stage:"PENDING_APPROVAL",assigned_agent:"Gatekeeper",evidence:"Biological dentistry; airway-driven dentistry; sleep medicine and sleep apnea services.",qualification_reason:"biological + airway + sleep + verified contact + official evidence",email:"office@healingdentistry.com",phone:"602-273-0013"},
 {id:3,practice_name:"Swiss Biologic Dentistry",decision_maker:"Dr. Amelia M. Ellingson",city:"Phoenix",state:"AZ",qualification_score:10,pipeline_stage:"PENDING_APPROVAL",assigned_agent:"Gatekeeper",evidence:"Biologic dentistry with airway/TMJ focus and sleep appliances.",qualification_reason:"biologic + airway + TMJ + sleep + verified contact + official evidence",email:"dental@swissbiologic.com",phone:"602-956-4800"},
 {id:4,practice_name:"Agave Sleep & Wellness",decision_maker:"Dr. Beth Hamann",city:"Phoenix",state:"AZ",qualification_score:10,pipeline_stage:"PENDING_APPROVAL",assigned_agent:"Gatekeeper",evidence:"Dental sleep medicine practice treating obstructive sleep apnea and TMJ/TMD.",qualification_reason:"sleep + TMJ + verified contact + official evidence",email:"team@agavesleep.com",phone:"(602) 357-7539"},
 {id:5,practice_name:"A Breath of Health",decision_maker:"Dr. Ingo Mahn",city:"Phoenix",state:"AZ",qualification_score:11,pipeline_stage:"PENDING_APPROVAL",assigned_agent:"Gatekeeper",evidence:"Airway management office screening for airway disorders, sleep apnea and TMJ symptoms.",qualification_reason:"airway + sleep + TMJ + verified phone/form + official evidence",email:null,phone:"(602) 922-7852"},
 {id:6,practice_name:"Honeybee Pediatric Airway & Tongue-tie Specialist",decision_maker:"Dr. Nez Mutlu",city:"Scottsdale",state:"AZ",qualification_score:9,pipeline_stage:"PENDING_APPROVAL",assigned_agent:"Gatekeeper",evidence:"Board-certified pediatric dentist focused on airway health, oral function, sleep-disordered breathing and growth.",qualification_reason:"airway + sleep + verified contact + official evidence",email:"drNez@HoneybeeTongue-tie.com",phone:"(480) 915-8510"},
 {id:7,practice_name:"Southwest Orofacial Group",decision_maker:null,city:"Phoenix",state:"AZ",qualification_score:10,pipeline_stage:"PENDING_APPROVAL",assigned_agent:"Gatekeeper",evidence:"Orofacial group treating TMJ disorders, facial pain and obstructive sleep apnea with CPAP alternatives.",qualification_reason:"orofacial/TMJ + sleep + verified phone + official evidence",email:null,phone:"(602) 992-1486"},
 {id:8,practice_name:"Phoenix Biological Dentistry",decision_maker:"Dr. Maryam Hamdan",city:"Phoenix",state:"AZ",qualification_score:5,pipeline_stage:"PENDING_APPROVAL",assigned_agent:"Gatekeeper",evidence:"Founder-led biological dentistry practice with functional medicine orientation.",qualification_reason:"biological + verified contact + official evidence",email:"info@phxbiologic.com",phone:"602-900-1857"},
 {id:9,practice_name:"AZ Sleep & TMJ Solutions",decision_maker:"Dr. Sara Vizcarra",city:"Scottsdale",state:"AZ",qualification_score:12,pipeline_stage:"PENDING_APPROVAL",assigned_agent:"Gatekeeper",evidence:"Dental practice specializing in sleep apnea, TMJ disorders, craniofacial pain and headaches.",qualification_reason:"sleep + TMJ + craniofacial + verified contact + official evidence",email:"info@azsleepandtmj.com",phone:"(480) 515-6209"},
 {id:10,practice_name:"TMJ & Sleep Therapy Centre of Phoenix - East",decision_maker:"Dr. Thomas M. Sims",city:"Scottsdale",state:"AZ",qualification_score:12,pipeline_stage:"PENDING_APPROVAL",assigned_agent:"Gatekeeper",evidence:"Dentist-led practice focused on TMJ, craniofacial pain, sleep-disordered breathing and airway concerns.",qualification_reason:"TMJ + craniofacial + sleep + airway + verified contact + evidence",email:"web@tmjsleepaz.com",phone:"(480) 248-7788"}
];

export function draftFor(lead:any){
 const name=lead.decision_maker||"Doctor";
 return `Subject: Phoenix education opportunity with Dr. Timothy Adams

Hello ${name},

I'm reaching out from Kingdom Mindset CE regarding Dr. Timothy Adams, DDS, D.ASBA, D.ACSDD and his educational program, Craniofacial Biodentistry & Advanced Airway Integration.

Your practice stood out to our team because of ${lead.evidence}

We're currently building the Phoenix interest list and would be glad to send details as they are finalized. Event date, CE hours, and tuition are still pending, so I don't want to give you information that has not been confirmed.

Would you like us to send the finalized program information when it is available?

Kingdom Mindset CE
AGD PACE Provider #441585`;
}
