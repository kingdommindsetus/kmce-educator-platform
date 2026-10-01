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
      mockup_id,
      product_title,
      product_description,
      product_price_cents,
    } = body;

    if (!dentist_id || !mockup_id) {
      return NextResponse.json(
        { error: "Missing required fields: dentist_id, mockup_id" },
        { status: 400 }
      );
    }

    const q = sql();

    // Get dentist and verify Shopify connection
    const dentist = await q`
      SELECT id, shopify_store_url, shopify_access_token, shopify_shop_id
      FROM dentist_accounts
      WHERE id = ${dentist_id}
    `;

    if (!dentist || dentist.length === 0) {
      return NextResponse.json({ error: "Dentist not found" }, { status: 404 });
    }

    const dentistAccount = dentist[0];
    if (!dentistAccount.shopify_access_token || !dentistAccount.shopify_shop_id) {
      return NextResponse.json(
        { error: "Shopify not connected. Please connect your Shopify store first." },
        { status: 400 }
      );
    }

    // Get mockup
    const mockupResult = await q`
      SELECT id, mockup_image_url, treatment_type, ai_generation_status
      FROM smile_mockups
      WHERE id = ${mockup_id} AND dentist_id = ${dentist_id}
    `;

    if (!mockupResult || mockupResult.length === 0) {
      return NextResponse.json({ error: "Mockup not found" }, { status: 404 });
    }

    const mockup = mockupResult[0];
    if (mockup.ai_generation_status !== "SUCCESS") {
      return NextResponse.json(
        { error: "Mockup generation not complete" },
        { status: 400 }
      );
    }

    // Create product in Shopify
    const shopifyProduct = await createShopifyProduct(
      dentistAccount.shopify_shop_id,
      dentistAccount.shopify_access_token,
      {
        title: product_title || `Smile Design - ${mockup.treatment_type}`,
        description: product_description || `Professional cosmetic dentistry mockup showcasing ${mockup.treatment_type}`,
        price: product_price_cents ? (product_price_cents / 100).toString() : "99.99",
        image: mockup.mockup_image_url,
      }
    );

    if (!shopifyProduct.success) {
      return NextResponse.json(
        { error: `Failed to create Shopify product: ${shopifyProduct.error}` },
        { status: 500 }
      );
    }

    // Update mockup with Shopify product ID
    await q`
      UPDATE smile_mockups
      SET shopify_product_id = ${shopifyProduct.productId},
          product_title = ${shopifyProduct.title},
          product_description = ${shopifyProduct.description},
          product_price_cents = ${shopifyProduct.priceCents},
          is_listed_for_sale = true,
          updated_at = now()
      WHERE id = ${mockup_id}
    `;

    // Create sync record
    await q`
      INSERT INTO shopify_product_sync (
        dentist_id,
        smile_mockup_id,
        shopify_product_id,
        shopify_handle,
        sync_status,
        last_sync_at
      ) VALUES (
        ${dentist_id},
        ${mockup_id},
        ${shopifyProduct.productId},
        ${shopifyProduct.handle},
        'SYNCED',
        now()
      )
    `;

    return NextResponse.json({
      success: true,
      shopify_product_id: shopifyProduct.productId,
      shopify_handle: shopifyProduct.handle,
      product_url: `https://${dentistAccount.shopify_shop_id}.myshopify.com/products/${shopifyProduct.handle}`,
      message: "Mockup published to Shopify successfully",
    });

  } catch (error) {
    console.error("Error in Shopify sync:", error);
    return NextResponse.json(
      { error: "Failed to sync mockup to Shopify" },
      { status: 500 }
    );
  }
}

async function createShopifyProduct(
  shopId: string,
  accessToken: string,
  productData: { title: string; description: string; price: string; image: string }
) {
  try {
    const response = await fetch(`https://${shopId}.myshopify.com/admin/api/2024-01/graphql.json`, {
      method: "POST",
      headers: {
        "X-Shopify-Access-Token": accessToken,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query: `
          mutation CreateProduct($input: ProductInput!) {
            productCreate(input: $input) {
              product {
                id
                handle
                title
                description
              }
              userErrors {
                field
                message
              }
            }
          }
        `,
        variables: {
          input: {
            title: productData.title,
            bodyHtml: productData.description,
            productType: "Smile Mockup",
            vendor: "Smile Designer",
            variants: {
              create: [
                {
                  price: productData.price,
                  sku: `SMILE-${Date.now()}`,
                },
              ],
            },
            image: {
              src: productData.image,
            },
          },
        },
      }),
    });

    const data = await response.json().catch(() => ({}));
    const product = data?.data?.productCreate?.product;
    const errors = data?.data?.productCreate?.userErrors;

    if (errors && errors.length > 0) {
      return {
        success: false,
        error: errors[0]?.message || "Failed to create product",
      };
    }

    if (!product) {
      return {
        success: false,
        error: "No product returned from Shopify",
      };
    }

    // Extract ID from Shopify's gid format
    const productId = product.id.split("/").pop();

    return {
      success: true,
      productId,
      handle: product.handle,
      title: product.title,
      description: product.description,
      priceCents: Math.round(parseFloat(productData.price) * 100),
    };

  } catch (error) {
    return {
      success: false,
      error: String(error).slice(0, 500),
    };
  }
}
