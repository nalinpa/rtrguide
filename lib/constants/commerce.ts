export const FULL_GUIDE_PRODUCT_ID = "full_guide_unlock";

// Entitlement lookups and claim-link redemption both hit this host, so they must
// never drift apart — a build pointing at staging validates real purchases against
// the wrong worker. Staging is https://commerce-staging.blacksands.app.
export const COMMERCE_BASE_URL = "https://commerce.blacksands.app";
