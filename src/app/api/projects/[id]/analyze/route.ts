import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { handleApiError } from "@/lib/api-error";
import { enqueueAnalysis } from "@/lib/analysis-queue";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    const result = await enqueueAnalysis(db, id);
    if (result.kind === "missing") {
      return NextResponse.json(
        { error: "Project not found" },
        { status: 404 },
      );
    }
    if (result.kind === "capacity") {
      return NextResponse.json({ error: "Analysis capacity reached. Try again later." }, { status: 429 });
    }

    return NextResponse.json(
      {
        analysisId: result.analysis.id,
        status: result.analysis.status,
        reused: result.kind === "existing",
      },
      { status: result.kind === "created" ? 201 : 200 },
    );
  } catch (error) {
    return handleApiError(error);
  }
}
