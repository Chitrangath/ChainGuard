import { NextResponse } from "next/server";

export class ApiError extends Error {
  constructor(
    public statusCode: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export function apiError(statusCode: number, message: string): NextResponse {
  return NextResponse.json({ error: message }, { status: statusCode });
}

export function handleApiError(error: unknown): NextResponse {
  if (error instanceof ApiError) {
    return apiError(error.statusCode, error.message);
  }

  console.error("Unexpected API error:", error);
  return apiError(500, "An unexpected error occurred");
}
