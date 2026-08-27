import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { analysisHistoryFilterSchema } from "@/lib/validation";
import { handleApiError } from "@/lib/api-error";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);

    const filterResult = analysisHistoryFilterSchema.safeParse({
      page: searchParams.get("page") ?? undefined,
      pageSize: searchParams.get("pageSize") ?? undefined,
      status: searchParams.get("status") ?? undefined,
      deploymentStatus: searchParams.get("deploymentStatus") ?? undefined,
    });

    if (!filterResult.success) {
      return NextResponse.json(
        { error: "Invalid filter parameters", details: filterResult.error.issues },
        { status: 400 },
      );
    }

    const { page, pageSize, status, deploymentStatus } = filterResult.data;

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

    const where = {
      projectId: id,
      ...(status ? { status } : {}),
      ...(deploymentStatus ? { deploymentStatus } : {}),
    };

    const [analyses, total] = await Promise.all([
      db.analysis.findMany({
        where,
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: {
          id: true,
          status: true,
          riskScore: true,
          deploymentStatus: true,
          compilationStatus: true,
          testStatus: true,
          totalTests: true,
          passedTests: true,
          failedTests: true,
          startedAt: true,
          completedAt: true,
          createdAt: true,
          _count: { select: { findings: true } },
        },
      }),
      db.analysis.count({ where }),
    ]);

    return NextResponse.json({
      analyses: analyses.map((a) => ({
        id: a.id,
        status: a.status,
        riskScore: a.riskScore,
        deploymentStatus: a.deploymentStatus,
        compilationStatus: a.compilationStatus,
        testStatus: a.testStatus,
        totalTests: a.totalTests,
        passedTests: a.passedTests,
        failedTests: a.failedTests,
        startedAt: a.startedAt?.toISOString() ?? null,
        completedAt: a.completedAt?.toISOString() ?? null,
        createdAt: a.createdAt.toISOString(),
        findingCount: a._count.findings,
      })),
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
