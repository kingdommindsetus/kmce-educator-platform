import { NextResponse, NextRequest } from "next/server";
import { sql } from "../../../../../../lib/db";
import { requireFounder } from "../../../../../../lib/auth";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const u = await requireFounder();
  if (!u) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  try {
    const { id } = await params;
    const educatorId = parseInt(id);
    const { faculty, title, format, audience, educationalNeed } = await req.json();

    if (!faculty || !title || !format || !audience || !educationalNeed) {
      return NextResponse.json(
        { error: "All required fields must be provided" },
        { status: 400 }
      );
    }

    const q = sql();

    const result = await q`
      INSERT INTO courses(educator_id, plain_language_name, formal_id, format, audience, educational_need, status, created_by)
      VALUES(
        ${educatorId},
        ${title},
        'KM-' + to_char(now(), 'YYYY') + '-' + LPAD(CAST(currval('courses_id_seq') AS TEXT), 3, '0'),
        ${format},
        ${audience},
        ${educationalNeed},
        'PLANNING',
        ${u.email}
      )
      RETURNING *
    `;

    return NextResponse.json(result[0]);
  } catch (error) {
    console.error("Course creation error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create course" },
      { status: 500 }
    );
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const u = await requireFounder();
  if (!u) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  try {
    const { id } = await params;
    const educatorId = parseInt(id);
    const q = sql();

    const courses = await q`
      SELECT * FROM courses
      WHERE educator_id = ${educatorId}
      ORDER BY created_at DESC
    `;

    return NextResponse.json(courses);
  } catch (error) {
    console.error("Course fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch courses" },
      { status: 500 }
    );
  }
}
