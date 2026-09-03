const FRIENDLY_AUTH_ERRORS: Record<string, string> = {
  "auth/account-exists-with-different-credential":
    "An account already exists with this email — sign in with your password instead.",
  "auth/invalid-credential": "Incorrect email or password.",
  "auth/wrong-password": "Incorrect email or password.",
  "auth/user-not-found": "No account found with that email.",
  "auth/invalid-email": "That email address doesn't look right.",
  "auth/email-already-in-use": "An account with this email already exists.",
  "auth/weak-password": "Choose a password with at least 6 characters.",
  "auth/too-many-requests": "Too many attempts — try again in a few minutes.",
  "auth/network-request-failed": "Network error — check your connection and try again.",
  "auth/user-disabled": "This account has been disabled.",
};

export function getAuthErrorMessage(error: unknown): string {
  const code = (error as { code?: string })?.code;
  if (code && FRIENDLY_AUTH_ERRORS[code]) return FRIENDLY_AUTH_ERRORS[code];
  return error instanceof Error ? error.message : "Something went wrong";
}
