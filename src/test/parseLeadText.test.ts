import { describe, it, expect } from "vitest";
import { parseLeadText } from "@/lib/parseLeadText";

describe("parseLeadText emoji-labeled KV", () => {
  it("extracts fields from emoji-prefixed labeled text", () => {
    const text = `
    GHARPAYY⚡️ Your SuperStay Awaits!
    📝 Name: Rahul Sharma
    📱 Phone: +91 98765 43210
    ✉️ Email: rahul@example.com
    📍 Preferred Location/Landmark: Koramangala
    💰 Budget Range: ₹13-16k monthly
    📆 Move-in Date: 2026-03-20
    👨‍💻 (Student/Working): Working
    🏢 Room (Shared/Private): Private
    👫 NEED (Boys/Girls/Coed): Coed
    ✨ Special Requests: Near Sony World
    `;

    const parsed = parseLeadText(text);
    expect(parsed.name).toBe("Rahul Sharma");
    expect(parsed.phone).toBe("+919876543210");
    expect(parsed.email).toBe("rahul@example.com");
    expect(parsed.preferred_location.toLowerCase()).toContain("koramangala");
    expect(parsed.budget.toLowerCase()).toContain("13-16k");
    expect(parsed.move_in_date).toBe("2026-03-20");
    expect(parsed.notes.toLowerCase()).toContain("near sony world");
  });
});
