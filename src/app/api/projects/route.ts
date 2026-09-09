import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { createProjectSchema } from "@/lib/validation";
import { handleApiError } from "@/lib/api-error";
import { presentEvidence } from "@/lib/evidence";

export async function GET() {
  try {
    const projects = await db.project.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        analyses: {
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
    });

    const projectsWithLatest = projects.map((project) => {
      const latest = project.analyses[0];
      const evidence = latest
        ? presentEvidence(latest.evidenceVersion, latest.riskScore, latest.deploymentStatus)
        : null;
      return ({
      id: project.id,
      name: project.name,
      repositoryUrl: project.repositoryUrl,
      description: project.description,
      createdAt: project.createdAt.toISOString(),
      updatedAt: project.updatedAt.toISOString(),
      latestRiskScore: evidence?.riskScore ?? null,
      latestDeploymentStatus: evidence?.deploymentStatus ?? null,
      latestEvidenceStatus: evidence?.evidenceStatus ?? null,
    });
    });

    return NextResponse.json(projectsWithLatest);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const result = createProjectSchema.safeParse(body);

    if (!result.success) {
      const message = result.error.issues.map((i) => i.message).join(", ");
      return NextResponse.json({ error: message }, { status: 400 });
    }

    const project = await db.project.create({
      data: {
        name: result.data.name,
        repositoryUrl: result.data.repositoryUrl,
        description: result.data.description,
      },
    });

    return NextResponse.json(
      {
        id: project.id,
        name: project.name,
        repositoryUrl: project.repositoryUrl,
        description: project.description,
        createdAt: project.createdAt.toISOString(),
      },
      { status: 201 },
    );
  } catch (error) {
    return handleApiError(error);
  }
}
