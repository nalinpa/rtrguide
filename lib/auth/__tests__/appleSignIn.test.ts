jest.mock("@/lib/firebase", () => ({ auth: {} }));
jest.mock("expo-apple-authentication", () => ({
  signInAsync: jest.fn(),
  AppleAuthenticationScope: { FULL_NAME: "FULL_NAME", EMAIL: "EMAIL" },
}));
jest.mock("expo-crypto", () => ({
  getRandomBytesAsync: jest.fn(),
  digestStringAsync: jest.fn(),
  CryptoDigestAlgorithm: { SHA256: "SHA256" },
}));
jest.mock("firebase/auth", () => ({
  OAuthProvider: jest.fn(),
  signInWithCredential: jest.fn(),
}));

import * as AppleAuthentication from "expo-apple-authentication";
import * as Crypto from "expo-crypto";
import { OAuthProvider, signInWithCredential } from "firebase/auth";
import { getAppleSignInErrorMessage, signInWithApple } from "@/lib/auth/appleSignIn";

const mockSignInAsync = AppleAuthentication.signInAsync as jest.Mock;
const mockGetRandomBytes = Crypto.getRandomBytesAsync as jest.Mock;
const mockDigest = Crypto.digestStringAsync as jest.Mock;
const mockOAuthProvider = OAuthProvider as unknown as jest.Mock;
const mockSignInWithCredential = signInWithCredential as jest.Mock;

describe("getAppleSignInErrorMessage", () => {
  it("returns a friendly message for the account-exists conflict", () => {
    const msg = getAppleSignInErrorMessage({ code: "auth/account-exists-with-different-credential" });
    expect(msg).toBe("An account already exists with this email — sign in with your password instead.");
  });

  it("returns the Error's message otherwise", () => {
    expect(getAppleSignInErrorMessage(new Error("network down"))).toBe("network down");
  });

  it("falls back to a generic message for non-Error, non-coded values", () => {
    expect(getAppleSignInErrorMessage("nope")).toBe("Something went wrong");
    expect(getAppleSignInErrorMessage(undefined)).toBe("Something went wrong");
  });
});

describe("signInWithApple", () => {
  const credential = { __credential: true };
  const mockCredentialFn = jest.fn().mockReturnValue(credential);

  beforeEach(() => {
    mockSignInAsync.mockReset();
    mockGetRandomBytes.mockReset().mockResolvedValue(new Uint8Array([0, 1, 2, 3]));
    mockDigest.mockReset().mockResolvedValue("hashed-nonce");
    mockOAuthProvider.mockReset().mockImplementation((providerId: string) => ({
      providerId,
      credential: mockCredentialFn,
    }));
    mockSignInWithCredential.mockReset();
    mockCredentialFn.mockClear();
  });

  it("exchanges the Apple identity token for a Firebase credential", async () => {
    mockSignInAsync.mockResolvedValue({ identityToken: "apple-id-token" });
    mockSignInWithCredential.mockResolvedValue(undefined);

    await signInWithApple();

    expect(mockSignInAsync).toHaveBeenCalledWith(
      expect.objectContaining({ nonce: "hashed-nonce" }),
    );
    expect(mockOAuthProvider).toHaveBeenCalledWith("apple.com");
    expect(mockCredentialFn).toHaveBeenCalledWith({
      idToken: "apple-id-token",
      rawNonce: "00010203",
    });
    expect(mockSignInWithCredential).toHaveBeenCalledWith({}, credential);
  });

  it("throws when Apple doesn't return an identity token", async () => {
    mockSignInAsync.mockResolvedValue({ identityToken: null });

    await expect(signInWithApple()).rejects.toThrow("Apple did not return an identity token");
    expect(mockSignInWithCredential).not.toHaveBeenCalled();
  });
});
