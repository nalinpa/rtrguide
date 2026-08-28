import { renderHook, act } from "@testing-library/react-native";

jest.mock("@/lib/firebase", () => ({ auth: {} }));
jest.mock("firebase/auth", () => ({
  signInWithEmailAndPassword: jest.fn(),
  createUserWithEmailAndPassword: jest.fn(),
  sendPasswordResetEmail: jest.fn(),
}));

import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
} from "firebase/auth";
import { useAuthForm } from "@/lib/hooks/useAuthForm";

const mockSignIn = signInWithEmailAndPassword as jest.Mock;
const mockSignUp = createUserWithEmailAndPassword as jest.Mock;
const mockReset = sendPasswordResetEmail as jest.Mock;

describe("useAuthForm", () => {
  beforeEach(() => {
    mockSignIn.mockReset();
    mockSignUp.mockReset();
    mockReset.mockReset();
  });

  describe("canSubmit", () => {
    it("login mode requires both email and password", async () => {
      const { result } = await renderHook(() => useAuthForm("login"));
      expect(result.current.canSubmit).toBe(false);

      await act(async () => result.current.setEmail("a@b.com"));
      expect(result.current.canSubmit).toBe(false);

      await act(async () => result.current.setPassword("pw"));
      expect(result.current.canSubmit).toBe(true);
    });

    it("reset mode only requires email", async () => {
      const { result } = await renderHook(() => useAuthForm("reset"));
      expect(result.current.canSubmit).toBe(false);

      await act(async () => result.current.setEmail("a@b.com"));
      expect(result.current.canSubmit).toBe(true);
    });

    it("signup mode requires password to match confirm", async () => {
      const { result } = await renderHook(() => useAuthForm("signup"));
      await act(async () => {
        result.current.setEmail("a@b.com");
        result.current.setPassword("pw1");
        result.current.setConfirm("pw2");
      });
      expect(result.current.canSubmit).toBe(false);

      await act(async () => result.current.setConfirm("pw1"));
      expect(result.current.canSubmit).toBe(true);
    });
  });

  describe("title/subtitle", () => {
    it.each([
      ["login", "Welcome back", "Sign in to continue"],
      ["signup", "Create account", "Sign up to get started"],
      ["reset", "Reset your password", "We'll email you a reset link"],
    ] as const)("%s mode", async (mode, title, subtitle) => {
      const { result } = await renderHook(() => useAuthForm(mode));
      expect(result.current.title).toBe(title);
      expect(result.current.subtitle).toBe(subtitle);
    });
  });

  describe("submit", () => {
    it("signs in with email/password in login mode", async () => {
      mockSignIn.mockResolvedValue(undefined);
      const { result } = await renderHook(() => useAuthForm("login"));
      await act(async () => {
        result.current.setEmail("a@b.com");
        result.current.setPassword("pw");
      });

      await act(async () => result.current.submit());

      expect(mockSignIn).toHaveBeenCalledWith({}, "a@b.com", "pw");
      expect(result.current.busy).toBe(false);
      expect(result.current.err).toBeNull();
    });

    it("creates an account in signup mode", async () => {
      mockSignUp.mockResolvedValue(undefined);
      const { result } = await renderHook(() => useAuthForm("signup"));
      await act(async () => {
        result.current.setEmail("a@b.com");
        result.current.setPassword("pw");
        result.current.setConfirm("pw");
      });

      await act(async () => result.current.submit());

      expect(mockSignUp).toHaveBeenCalledWith({}, "a@b.com", "pw");
    });

    it("sends a reset email and sets a notice in reset mode", async () => {
      mockReset.mockResolvedValue(undefined);
      const { result } = await renderHook(() => useAuthForm("reset"));
      await act(async () => result.current.setEmail("a@b.com"));

      await act(async () => result.current.submit());

      expect(mockReset).toHaveBeenCalledWith({}, "a@b.com");
      expect(result.current.notice).toBe("Check your email for a reset link.");
    });

    it("surfaces the error message and clears busy when the request fails", async () => {
      mockSignIn.mockRejectedValue(new Error("bad credentials"));
      const { result } = await renderHook(() => useAuthForm("login"));
      await act(async () => {
        result.current.setEmail("a@b.com");
        result.current.setPassword("pw");
      });

      await act(async () => result.current.submit());

      expect(result.current.err).toBe("bad credentials");
      expect(result.current.busy).toBe(false);
    });

    it("falls back to a generic message for non-Error rejections", async () => {
      mockSignIn.mockRejectedValue("nope");
      const { result } = await renderHook(() => useAuthForm("login"));
      await act(async () => {
        result.current.setEmail("a@b.com");
        result.current.setPassword("pw");
      });

      await act(async () => result.current.submit());

      expect(result.current.err).toBe("Something went wrong");
    });
  });
});
