import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { handleApiError } from "@/lib/api-error";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    const project = await db.project.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!project) {
      return NextResponse.json(
        { error: "Project not found" },
        { status: 404 },
      );
    }

    const analysis = await db.analysis.create({
      data: {
        projectId: id,
        status: "QUEUED",
      },
    });

    return NextResponse.json(
      {
        analysisId: analysis.id,
        status: analysis.status,
      },
      { status: 201 },
    );
  } catch (error) {
    return handleApiError(error);
  }
}
