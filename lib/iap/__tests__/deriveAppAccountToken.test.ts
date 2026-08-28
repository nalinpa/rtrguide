jest.mock("expo-crypto", () => ({
  digestStringAsync: jest.fn(),
  CryptoDigestAlgorithm: { SHA256: "SHA256" },
}));

import * as Crypto from "expo-crypto";
import { deriveAppAccountToken, formatAsUuid } from "@/lib/iap/deriveAppAccountToken";

const mockDigest = Crypto.digestStringAsync as jest.Mock;
const UUID_V4_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

describe("formatAsUuid", () => {
  it("produces a valid v4 UUID shape from a 32-char hex string", () => {
    const hex = "0123456789abcdef0123456789abcdef";
    expect(formatAsUuid(hex)).toMatch(UUID_V4_RE);
  });

  it("forces the version nibble to 4 regardless of input", () => {
    const hex = "ffffffffffffffffffffffffffffffff";
    const uuid = formatAsUuid(hex);
    expect(uuid[14]).toBe("4");
  });

  it("forces the variant nibble into the 8/9/a/b range", () => {
    const hex = "00000000000000000000000000000000";
    const uuid = formatAsUuid(hex);
    expect(["8", "9", "a", "b"]).toContain(uuid[19]);
  });

  it("only uses the first 32 hex characters of a longer digest", () => {
    const hex64 = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaabbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";
    expect(formatAsUuid(hex64)).toBe(formatAsUuid(hex64.slice(0, 32)));
  });
});

describe("deriveAppAccountToken", () => {
  beforeEach(() => {
    mockDigest.mockReset();
  });

  it("hashes a namespaced string containing the uid", async () => {
    mockDigest.mockResolvedValue("0123456789abcdef0123456789abcdef");

    await deriveAppAccountToken("user-1");

    expect(mockDigest).toHaveBeenCalledWith("SHA256", "blacksands.iap.appAccountToken.v1:user-1");
  });

  it("returns the digest formatted as a UUID", async () => {
    const hex = "0123456789abcdef0123456789abcdef";
    mockDigest.mockResolvedValue(hex);

    const token = await deriveAppAccountToken("user-1");

    expect(token).toBe(formatAsUuid(hex));
    expect(token).toMatch(UUID_V4_RE);
  });
});
