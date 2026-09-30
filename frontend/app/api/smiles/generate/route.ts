import { NextResponse } from "next/server";
import { sql, ensureSchema } from "../../../../lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    await ensureSchema();
    const body = await req.json().catch(() => ({}));

    const {
      dentist_id,
      patient_name,
      patient_email,
      original_image_url,
      treatment_type,
      treatment_description,
    } = body;

    if (!dentist_id || !original_image_url || !treatment_type) {
      return NextResponse.json(
        { error: "Missing required fields: dentist_id, original_image_url, treatment_type" },
        { status: 400 }
      );
    }

    const q = sql();

    // Verify dentist exists
    const dentist = await q`SELECT id FROM dentist_accounts WHERE id = ${dentist_id}`;
    if (!dentist || dentist.length === 0) {
      return NextResponse.json({ error: "Dentist not found" }, { status: 404 });
    }

    // Create mockup record in PENDING status
    const mockup = await q`
      INSERT INTO smile_mockups (
        dentist_id,
        patient_name,
        patient_email,
        original_image_url,
        treatment_type,
        treatment_description,
        ai_generation_status
      ) VALUES (
        ${dentist_id},
        ${patient_name || null},
        ${patient_email || null},
        ${original_image_url},
        ${treatment_type},
        ${treatment_description || null},
        'PROCESSING'
      )
      RETURNING id, dentist_id, ai_generation_status, created_at
    `;

    const mockupId = mockup[0].id;

    // Queue AI generation job (async)
    // In production, this would push to a queue like Bull/Redis
    // For now, simulate the generation
    queueSmileGeneration(mockupId, original_image_url, treatment_type);

    return NextResponse.json({
      success: true,
      mockup_id: mockupId,
      status: "PROCESSING",
      message: "Smile mockup generation started. Check back shortly.",
    });
  } catch (error) {
    console.error("Error in smile generation:", error);
    return NextResponse.json(
      { error: "Failed to generate smile mockup" },
      { status: 500 }
    );
  }
}

async function queueSmileGeneration(mockupId: number, imageUrl: string, treatmentType: string) {
  // This would normally push to a queue system
  // For MVP, we'll simulate it with a setTimeout
  setTimeout(async () => {
    await generateSmileMockup(mockupId, imageUrl, treatmentType);
  }, 2000);
}

async function generateSmileMockup(mockupId: number, imageUrl: string, treatmentType: string) {
  try {
    const q = sql();
    const openaiApiKey = process.env.OPENAI_API_KEY;

    if (!openaiApiKey) {
      await q`
        UPDATE smile_mockups
        SET ai_generation_status = 'FAILED',
            ai_error_message = 'OpenAI API key not configured'
        WHERE id = ${mockupId}
      `;
      return;
    }

    // For MVP, we'll use OpenAI Vision + DALL-E to generate the mockup
    // 1. Analyze the original image with Vision
    // 2. Generate a modified image with DALL-E based on treatment type

    const prompt = buildPromptForTreatment(treatmentType);

    // Call OpenAI API to generate mockup
    const response = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${openaiApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "dall-e-3",
        prompt: `Dental smile design mockup. Original image: ${imageUrl}. ${prompt}`,
        n: 1,
        size: "1024x1024",
        quality: "hd",
      }),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok || !data.data?.[0]?.url) {
      throw new Error(data?.error?.message || "Failed to generate image");
    }

    const mockupImageUrl = data.data[0].url;

    // Update mockup with generated image
    await q`
      UPDATE smile_mockups
      SET ai_generation_status = 'SUCCESS',
          mockup_image_url = ${mockupImageUrl},
          updated_at = now()
      WHERE id = ${mockupId}
    `;

  } catch (error) {
    const q = sql();
    await q`
      UPDATE smile_mockups
      SET ai_generation_status = 'FAILED',
          ai_error_message = ${String(error).slice(0, 500)}
      WHERE id = ${mockupId}
    `;
  }
}

function buildPromptForTreatment(treatmentType: string): string {
  const prompts: Record<string, string> = {
    veneers: "Show the smile with bright white porcelain veneers, perfectly aligned and natural looking",
    whitening: "Show the smile with professional teeth whitening, bright and radiant",
    orthodontics: "Show the smile after orthodontic treatment with perfectly straight aligned teeth",
    gum_contouring: "Show the smile with improved gum line and proportions after gum contouring",
    composite: "Show the smile with composite bonding and reshaping for improved aesthetics",
    smile_makeover: "Show the smile after a complete smile makeover with all cosmetic improvements",
  };

  return prompts[treatmentType] || prompts.smile_makeover;
}
