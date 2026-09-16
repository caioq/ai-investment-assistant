import { afterEach, describe, expect, it, vi } from "vitest";

import { ApiError, apiFetch, apiFetchMultipart } from "./api-client";

function jsonResponse(status: number, body: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: vi.fn().mockResolvedValue(body),
  } as unknown as Response;
}

describe("apiFetch", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("sends credentials: 'include' and prefixes the configured base URL on a GET", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(200, { ok: true }));
    vi.stubGlobal("fetch", fetchMock);

    await apiFetch("/portfolio");

    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:3001/portfolio",
      expect.objectContaining({ credentials: "include" }),
    );
  });

  it("resolves a 204 response to undefined without calling res.json()", async () => {
    const res = jsonResponse(204, undefined);
    const fetchMock = vi.fn().mockResolvedValue(res);
    vi.stubGlobal("fetch", fetchMock);

    const result = await apiFetch("/auth/logout", { method: "POST" });

    expect(result).toBeUndefined();
    expect(res.json).not.toHaveBeenCalled();
  });

  it("rejects with an ApiError whose status is 404", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(jsonResponse(404, { message: "No analysis yet" }));
    vi.stubGlobal("fetch", fetchMock);

    const error = await apiFetch("/advisor/analysis/latest").catch((e) => e);

    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).status).toBe(404);
    expect((error as ApiError).body).toEqual({ message: "No analysis yet" });
  });
});

describe("apiFetchMultipart", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("sends the FormData body with no Content-Type header set", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(200, { created: 1 }));
    vi.stubGlobal("fetch", fetchMock);
    const formData = new FormData();
    formData.append("file", new Blob(["a,b"]), "test.csv");

    await apiFetchMultipart("/portfolio/holdings/upload", formData);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [, options] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(options.body).toBe(formData);
    expect(options.credentials).toBe("include");
    const headers = options.headers as Record<string, string> | undefined;
    expect(headers?.["Content-Type"]).toBeUndefined();
  });
});
