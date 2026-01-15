import { calculateArbitrage, findArbitrageOpportunities } from '../src/arbitrage.js';

describe('Arbitrage Calculation Logic', () => {

    test('should identify Strategy 1 (Poly YES + Kalshi NO) correctly', () => {
        const match = {
            polymarket: { title: 'Test', yesPrice: 40, noPrice: 60, marketId: 'p1' },
            kalshi: { title: 'Test', yesPrice: 60, noPrice: 40, marketId: 'k1' },
            similarity: 1
        };
        // Cost: 40 (Poly YES) + 40 (Kalshi NO) = 80
        // Profit: 100 - 80 = 20

        const result = calculateArbitrage(match);

        expect(result).not.toBeNull();
        expect(result.type).toBe('STRATEGY_1');
        expect(result.profit).toBe(20);
        expect(result.totalCost).toBe(80);
        expect(result.polymarketSide).toBe('YES');
        expect(result.kalshiSide).toBe('NO');
    });

    test('should identify Strategy 2 (Poly NO + Kalshi YES) correctly', () => {
        const match = {
            polymarket: { title: 'Test', yesPrice: 90, noPrice: 10, marketId: 'p1' },
            kalshi: { title: 'Test', yesPrice: 10, noPrice: 90, marketId: 'k1' },
            similarity: 1
        };
        // Cost: 10 (Poly NO) + 10 (Kalshi YES) = 20
        // Profit: 100 - 20 = 80

        const result = calculateArbitrage(match);

        expect(result).not.toBeNull();
        expect(result.type).toBe('STRATEGY_2');
        expect(result.profit).toBe(80);
        expect(result.totalCost).toBe(20);
        expect(result.polymarketSide).toBe('NO');
        expect(result.kalshiSide).toBe('YES');
    });

    test('should return null for unprofitable markets (No Arb)', () => {
        const match = {
            polymarket: { title: 'Test', yesPrice: 50, noPrice: 50, marketId: 'p1' },
            kalshi: { title: 'Test', yesPrice: 50, noPrice: 50, marketId: 'k1' },
            similarity: 1
        };
        // Strat 1 Cost: 50 + 50 = 100 (Profit 0)
        // Strat 2 Cost: 50 + 50 = 100 (Profit 0)

        const result = calculateArbitrage(match);
        expect(result).toBeNull();
    });

    test('should return null for losing markets', () => {
        const match = {
            polymarket: { title: 'Test', yesPrice: 60, noPrice: 40, marketId: 'p1' },
            kalshi: { title: 'Test', yesPrice: 60, noPrice: 40, marketId: 'k1' },
            similarity: 1
        };
        // Strat 1 Cost: 60 + 40 = 100
        // Strat 2 Cost: 60 + 40 = 100
        // Actually prices usually sum to >100 in reality due to vigorish, so cost > 100 implies loss

        const result = calculateArbitrage(match);
        expect(result).toBeNull();
    });

    test('findArbitrageOpportunities should filter by minProfit', () => {
        const matches = [
            {
                polymarket: { title: 'Good', yesPrice: 40, noPrice: 60 },
                kalshi: { title: 'Good', yesPrice: 60, noPrice: 40 },
                similarity: 1
            }, // Profit 20
            {
                polymarket: { title: 'Mediocre', yesPrice: 49, noPrice: 51 },
                kalshi: { title: 'Mediocre', yesPrice: 51, noPrice: 49 },
                similarity: 1
            } // Cost 49+49=98, Profit 2
        ];

        // If min profit is 10
        const highProfitOpps = findArbitrageOpportunities(matches, 10);
        expect(highProfitOpps.length).toBe(1);
        expect(highProfitOpps[0].outcome).toBe('Good');

        // If min profit is 1
        const allOpps = findArbitrageOpportunities(matches, 1);
        expect(allOpps.length).toBe(2);
    });
});
