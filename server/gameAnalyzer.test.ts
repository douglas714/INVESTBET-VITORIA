import { describe, expect, it } from "vitest";
import { analyzeGame, analyzeGames } from "./gameAnalyzer";
import { OddsGame } from "./oddsService";

describe("gameAnalyzer", () => {
  describe("analyzeGame", () => {
    it("should approve a game that meets all criteria", () => {
      const game: OddsGame = {
        id: "test-game-1",
        sport_key: "soccer_epl",
        sport_title: "English Premier League",
        commence_time: new Date().toISOString(),
        home_team: "Manchester City",
        away_team: "Arsenal",
        bookmakers: [
          {
            key: "test-bookmaker",
            title: "Test Bookmaker",
            markets: [
              {
                key: "h2h",
                outcomes: [
                  { name: "Manchester City", price: 1.5 },
                  { name: "Draw", price: 4.0 },
                  { name: "Arsenal", price: 5.0 },
                ],
              },
            ],
          },
        ],
      };

      const result = analyzeGame(game);

      expect(result.approved).toBe(true);
      expect(result.homeOdd).toBe(1.5);
      expect(result.drawOdd).toBe(4.0);
      expect(result.awayOdd).toBe(5.0);
      expect(result.rejectionReasons).toHaveLength(0);
    });

    it("should reject a game where home team is not favorite", () => {
      const game: OddsGame = {
        id: "test-game-2",
        sport_key: "soccer_epl",
        sport_title: "English Premier League",
        commence_time: new Date().toISOString(),
        home_team: "Arsenal",
        away_team: "Manchester City",
        bookmakers: [
          {
            key: "test-bookmaker",
            title: "Test Bookmaker",
            markets: [
              {
                key: "h2h",
                outcomes: [
                  { name: "Arsenal", price: 5.0 },
                  { name: "Draw", price: 4.0 },
                  { name: "Manchester City", price: 1.5 },
                ],
              },
            ],
          },
        ],
      };

      const result = analyzeGame(game);

      expect(result.approved).toBe(false);
      expect(result.rejectionReasons.length).toBeGreaterThan(0);
      expect(result.rejectionReasons.some((r) => r.includes("not favorite"))).toBe(
        true
      );
    });

    it("should reject a game where odds are not in correct order", () => {
      const game: OddsGame = {
        id: "test-game-3",
        sport_key: "soccer_epl",
        sport_title: "English Premier League",
        commence_time: new Date().toISOString(),
        home_team: "Manchester City",
        away_team: "Arsenal",
        bookmakers: [
          {
            key: "test-bookmaker",
            title: "Test Bookmaker",
            markets: [
              {
                key: "h2h",
                outcomes: [
                  { name: "Manchester City", price: 1.5 },
                  { name: "Draw", price: 5.0 }, // Draw odd higher than away
                  { name: "Arsenal", price: 4.0 },
                ],
              },
            ],
          },
        ],
      };

      const result = analyzeGame(game);

      expect(result.approved).toBe(false);
      expect(
        result.rejectionReasons.some((r) => r.includes("not in correct order"))
      ).toBe(true);
    });

    it("should calculate odd difference correctly", () => {
      const game: OddsGame = {
        id: "test-game-4",
        sport_key: "soccer_epl",
        sport_title: "English Premier League",
        commence_time: new Date().toISOString(),
        home_team: "Manchester City",
        away_team: "Arsenal",
        bookmakers: [
          {
            key: "test-bookmaker",
            title: "Test Bookmaker",
            markets: [
              {
                key: "h2h",
                outcomes: [
                  { name: "Manchester City", price: 1.5 },
                  { name: "Draw", price: 4.0 },
                  { name: "Arsenal", price: 6.0 },
                ],
              },
            ],
          },
        ],
      };

      const result = analyzeGame(game);

      expect(result.oddDifference).toBe(4.5); // 6.0 - 1.5
    });
  });

  describe("analyzeGames", () => {
    it("should select top 6 games by priority", () => {
      const games: OddsGame[] = Array.from({ length: 10 }, (_, i) => ({
        id: `game-${i}`,
        sport_key: "soccer_epl",
        sport_title: "English Premier League",
        commence_time: new Date().toISOString(),
        home_team: `Home Team ${i}`,
        away_team: `Away Team ${i}`,
        bookmakers: [
          {
            key: "test-bookmaker",
            title: "Test Bookmaker",
            markets: [
              {
                key: "h2h",
                outcomes: [
                  { name: `Home Team ${i}`, price: 1.5 + i * 0.1 },
                  { name: "Draw", price: 4.0 },
                  { name: `Away Team ${i}`, price: 5.0 + i * 0.2 },
                ],
              },
            ],
          },
        ],
      }));

      const result = analyzeGames(games);

      expect(result.approved.length).toBeLessThanOrEqual(6);
      expect(result.logs.length).toBeGreaterThan(0);

      // First game should have lowest home odd
      if (result.approved.length > 1) {
        expect(result.approved[0]!.homeOdd).toBeLessThanOrEqual(
          result.approved[1]!.homeOdd
        );
      }
    });

    it("should log analysis results", () => {
      const games: OddsGame[] = [
        {
          id: "game-1",
          sport_key: "soccer_epl",
          sport_title: "English Premier League",
          commence_time: new Date().toISOString(),
          home_team: "Manchester City",
          away_team: "Arsenal",
          bookmakers: [
            {
              key: "test-bookmaker",
              title: "Test Bookmaker",
              markets: [
                {
                  key: "h2h",
                  outcomes: [
                    { name: "Manchester City", price: 1.5 },
                    { name: "Draw", price: 4.0 },
                    { name: "Arsenal", price: 5.0 },
                  ],
                },
              ],
            },
          ],
        },
      ];

      const result = analyzeGames(games);

      expect(result.logs.length).toBeGreaterThan(0);
      expect(result.logs.some((log) => log.includes("Starting analysis"))).toBe(true);
      expect(result.logs.some((log) => log.includes("APPROVED"))).toBe(true);
    });
  });
});
