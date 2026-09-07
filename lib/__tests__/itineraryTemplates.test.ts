import { ITINERARY_TEMPLATES, defaultTemplateKey } from "../itineraryTemplates";

describe("defaultTemplateKey", () => {
  it("picks a free template for locked (non-premium) users, never blank", () => {
    const key = defaultTemplateKey(true);
    expect(key).not.toBeNull();
    expect(ITINERARY_TEMPLATES.find((t) => t.key === key)?.free).toBe(true);
  });

  it("defaults to blank (None) for unlocked (premium) users", () => {
    expect(defaultTemplateKey(false)).toBeNull();
  });
});
