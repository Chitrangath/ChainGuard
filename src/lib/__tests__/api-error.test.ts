import { describe, it, expect } from "vitest";
import { ApiError, apiError, handleApiError } from "../api-error";

describe("ApiError", () => {
  it("creates error with status code and message", () => {
    const error = new ApiError(404, "Not found");
    expect(error.statusCode).toBe(404);
    expect(error.message).toBe("Not found");
    expect(error.name).toBe("ApiError");
  });
});

describe("apiError", () => {
  it("returns NextResponse with error JSON", async () => {
    const response = apiError(400, "Bad request");
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body).toEqual({ error: "Bad request" });
  });
});

describe("handleApiError", () => {
  it("handles ApiError", async () => {
    const response = handleApiError(new ApiError(404, "Not found"));
    expect(response.status).toBe(404);
    const body = await response.json();
    expect(body).toEqual({ error: "Not found" });
  });

  it("handles unknown errors", async () => {
    const response = handleApiError(new Error("something"));
    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body).toEqual({ error: "An unexpected error occurred" });
  });
});
