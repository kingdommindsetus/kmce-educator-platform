export type SmileDesignerMessage = {
  role: "user" | "agent";
  content: string;
  action?: string;
  data?: Record<string, any>;
};

export async function handleSmileDesignerRequest(
  dentistId: number,
  message: string,
  conversationHistory: SmileDesignerMessage[] = []
): Promise<SmileDesignerMessage> {
  const context = buildContext(dentistId, conversationHistory);

  const systemPrompt = `You are Smile Designer, an AI agent that helps dental professionals create and sell cosmetic dentistry mockups.

Your capabilities:
1. Generate smile mockups - Help dentists create professional before/after visualizations of cosmetic treatments
2. Manage Shopify products - Automatically list mockups for sale in their Shopify store
3. Handle subscriptions - Manage billing and Stripe subscriptions
4. Track conversions - Monitor which patients show interest and book consultations

You can help dentists:
- Upload a patient photo and generate a cosmetic treatment mockup
- List mockups on Shopify with pricing
- Track mockup views and engagement
- Convert browsers into consultations and treatments

Available actions you can take:
- generate_smile_mockup: Create AI mockup from patient photo
- publish_to_shopify: List mockup on Shopify store
- track_engagement: Monitor mockup performance
- schedule_consultation: Schedule follow-up with interested patient

Always be helpful, professional, and focused on helping the dentist grow their cosmetic business.
When the dentist asks to do something, confirm the action before proceeding.
`;

  const messages = [
    { role: "system" as const, content: systemPrompt },
    ...conversationHistory.map(m => ({
      role: m.role,
      content: m.content,
    })),
    { role: "user" as const, content: message },
  ];

  // Call LLM to get next action
  const response = await fetch("/api/providers/llm", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      messages,
      temperature: 0.7,
      max_tokens: 1000,
    }),
  });

  const data = await response.json();

  if (!data.ok) {
    return {
      role: "agent",
      content: "I encountered an issue. Please try again.",
    };
  }

  const agentText = data.text;

  // Parse action from response if present
  let action: string | undefined;
  const actionMatch = agentText.match(/\[ACTION:(\w+)\]/);
  if (actionMatch) {
    action = actionMatch[1];
  }

  return {
    role: "agent",
    content: agentText,
    action,
  };
}

export async function executeSmileDesignerAction(
  dentistId: number,
  action: string,
  params: Record<string, any>
): Promise<{ success: boolean; data?: any; error?: string }> {

  switch (action) {
    case "GENERATE_MOCKUP":
      return generateSmileMockup(dentistId, params);

    case "PUBLISH_TO_SHOPIFY":
      return publishToShopify(dentistId, params);

    case "TRACK_ENGAGEMENT":
      return trackEngagement(dentistId, params);

    case "SCHEDULE_CONSULTATION":
      return scheduleConsultation(dentistId, params);

    default:
      return { success: false, error: "Unknown action" };
  }
}

async function generateSmileMockup(
  dentistId: number,
  params: { image_url: string; treatment_type: string; description?: string }
) {
  try {
    const response = await fetch("/api/smiles/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        dentist_id: dentistId,
        original_image_url: params.image_url,
        treatment_type: params.treatment_type,
        treatment_description: params.description,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return { success: false, error: data.error };
    }

    return {
      success: true,
      data: {
        mockup_id: data.mockup_id,
        status: data.status,
        message: data.message,
      },
    };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

async function publishToShopify(
  dentistId: number,
  params: { mockup_id: number; title?: string; description?: string; price?: number }
) {
  try {
    const response = await fetch("/api/shopify/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        dentist_id: dentistId,
        mockup_id: params.mockup_id,
        product_title: params.title,
        product_description: params.description,
        product_price_cents: params.price ? params.price * 100 : undefined,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return { success: false, error: data.error };
    }

    return {
      success: true,
      data: {
        shopify_product_id: data.shopify_product_id,
        product_url: data.product_url,
        message: data.message,
      },
    };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

async function trackEngagement(
  dentistId: number,
  params: { mockup_id: number }
) {
  // Placeholder for engagement tracking
  return {
    success: true,
    data: {
      views: 0,
      interested_leads: 0,
      conversion_rate: 0,
    },
  };
}

async function scheduleConsultation(
  dentistId: number,
  params: { patient_email: string; treatment_type: string }
) {
  // Placeholder for consultation scheduling
  return {
    success: true,
    data: {
      consultation_scheduled: true,
      message: "Consultation scheduled successfully",
    },
  };
}

function buildContext(
  dentistId: number,
  history: SmileDesignerMessage[]
): string {
  const recentActions = history.slice(-5);
  const context = `
Dentist ID: ${dentistId}
Recent interactions: ${recentActions.length}
Last messages: ${recentActions.map(m => `${m.role}: ${m.content.slice(0, 100)}`).join("\n")}
  `.trim();

  return context;
}
