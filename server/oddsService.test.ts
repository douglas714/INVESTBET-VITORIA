import { describe, expect, it } from "vitest";
import { fetchSports } from "./oddsService";

describe("oddsService - API Key Validation", () => {
  it("should successfully fetch sports with valid API key", async () => {
    // This test validates that THE_ODDS_API_KEY is correctly configured
    const sports = await fetchSports();
    
    expect(sports).toBeDefined();
    expect(Array.isArray(sports)).toBe(true);
    expect(sports.length).toBeGreaterThan(0);
    
    // Verify structure of sports data
    const firstSport = sports[0];
    expect(firstSport).toHaveProperty("key");
    expect(firstSport).toHaveProperty("title");
  }, 15000); // 15 second timeout for API call
});
