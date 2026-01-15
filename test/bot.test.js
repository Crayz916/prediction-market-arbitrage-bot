import { jest } from '@jest/globals';

// Mock pmxtjs before importing the bot
jest.unstable_mockModule('pmxtjs', () => ({
    default: {
        polymarket: class { },
        kalshi: class { }
    }
}));

describe('ArbitrageBot', () => {
    let ArbitrageBot;
    let bot;
    const entryAmountCents = 1000;
    const polyPrice = 40;
    const kalshiPrice = 50;

    // Contracts = Amount / Price
    const polyContracts = Math.floor(entryAmountCents / polyPrice); // 25
    const kalshiContracts = Math.floor(entryAmountCents / kalshiPrice); // 20

    beforeAll(async () => {
        const module = await import('../src/bot.js');
        ArbitrageBot = module.ArbitrageBot;
    });

    beforeEach(() => {
        bot = Object.create(ArbitrageBot.prototype);
        bot.config = {
            minProfitCents: 1,
            tradingMode: 'CONSERVATIVE',
            tradeAmountCents: entryAmountCents,
            dryRun: false
        };

        // Mock clients
        bot.polymarket = { createOrder: jest.fn().mockResolvedValue({ id: 'poly_order_1' }) };
        bot.kalshi = { createOrder: jest.fn().mockResolvedValue({ id: 'kalshi_order_1' }) };

        // Setup a standard position for PnL and Exit tests
        bot.currentPosition = {
            amount: entryAmountCents, // Legacy field, kept for reference if needed
            shares: {
                polymarket: polyContracts,
                kalshi: kalshiContracts
            },
            outcomeIds: {
                polymarket: 'poly_yes_id',
                kalshi: 'kalshi_no_id'
            },
            entryPrices: {
                polymarket: polyPrice,
                kalshi: kalshiPrice
            },
            opportunity: {
                outcome: 'Test Event',
                polymarketOutcome: { marketId: 'poly_mkt', yesId: 'poly_yes_id', noId: 'poly_no_id' },
                kalshiOutcome: { marketId: 'kalshi_mkt', yesId: 'kalshi_yes_id', noId: 'kalshi_no_id' },
                polymarketSide: 'YES',
                kalshiSide: 'NO'
            },
            entryTime: Date.now() - 10000 // Entered 10s ago
        };
    });

    describe('PnL Calculation', () => {
        test('should calculate 0 PnL when prices have not changed', () => {
            const polyOutcomes = [{ marketId: 'poly_mkt', yesPrice: 40, noPrice: 60 }];
            const kalshiOutcomes = [{ marketId: 'kalshi_mkt', yesPrice: 50, noPrice: 50 }];

            const pnl = bot.calculateCurrentPnL(polyOutcomes, kalshiOutcomes);

            // Value = (25 * 40) + (20 * 50) = 1000 + 1000 = 2000
            // Cost = (25 * 40) + (20 * 50) = 2000
            // PnL = 0
            expect(pnl).toBeCloseTo(0, 4);
        });

        test('should calculate positive PnL when prices move in favor', () => {
            // Price goes UP to 50
            const polyOutcomes = [{ marketId: 'poly_mkt', yesPrice: 50, noPrice: 50 }];

            // Price goes UP to 55 (NO side price)
            const kalshiOutcomes = [{ marketId: 'kalshi_mkt', yesPrice: 45, noPrice: 55 }];

            const pnl = bot.calculateCurrentPnL(polyOutcomes, kalshiOutcomes);

            // New Value = (25 * 50) + (20 * 55) = 1250 + 1100 = 2350
            // Cost = 2000
            // Exp PnL = 350
            expect(pnl).toBeCloseTo(350, 4);
        });

        test('should calculate negative PnL when prices move against', () => {
            // Price drops to 30
            const polyOutcomes = [{ marketId: 'poly_mkt', yesPrice: 30, noPrice: 70 }];
            // Price drops to 40
            const kalshiOutcomes = [{ marketId: 'kalshi_mkt', yesPrice: 60, noPrice: 40 }];

            const pnl = bot.calculateCurrentPnL(polyOutcomes, kalshiOutcomes);

            // New Value = (25 * 30) + (20 * 40) = 750 + 800 = 1550
            // Cost = 2000
            // Exp PnL = -450
            expect(pnl).toBeCloseTo(-450, 4);
        });
    });

    describe('Execution Logic', () => {
        test('should execute BUY orders correctly on entry', async () => {
            // Clear position to test entry
            bot.currentPosition = null;

            const opportunity = {
                outcome: 'New Opp',
                description: 'Buy YES Poly, Buy NO Kalshi',
                profit: 10,
                polymarketOutcome: { marketId: 'p_m', yesPrice: 40, noPrice: 60, yesId: 'p_yes', noId: 'p_no' },
                kalshiOutcome: { marketId: 'k_m', yesPrice: 50, noPrice: 50, yesId: 'k_yes', noId: 'k_no' },
                polymarketSide: 'YES',
                kalshiSide: 'NO'
            };

            const success = await bot.executeArbitrage(opportunity);

            expect(success).toBe(true);

            // Verify Polymarket Order
            expect(bot.polymarket.createOrder).toHaveBeenCalledWith({
                marketId: 'p_m',
                outcomeId: 'p_yes',
                side: 'buy',
                amount: 25, // 1000 / 40
                type: 'market'
            });

            // Verify Kalshi Order
            expect(bot.kalshi.createOrder).toHaveBeenCalledWith({
                marketId: 'k_m',
                outcomeId: 'k_no',
                side: 'buy',
                amount: 20, // 1000 / 50
                type: 'market'
            });

            // Verify State Update
            expect(bot.currentPosition).not.toBeNull();
            expect(bot.currentPosition.shares.polymarket).toBe(25);
            expect(bot.currentPosition.shares.kalshi).toBe(20);
        });

        test('should execute SELL orders correctly on exit', async () => {
            // currentPosition is already set in beforeEach
            await bot.exitPosition();

            // Verify Polymarket Order
            expect(bot.polymarket.createOrder).toHaveBeenCalledWith({
                marketId: 'poly_mkt',
                outcomeId: 'poly_yes_id', // Matches position.outcomeIds.polymarket
                side: 'sell',
                amount: polyContracts, // Matches position.shares.polymarket
                type: 'market'
            });

            // Verify Kalshi Order
            expect(bot.kalshi.createOrder).toHaveBeenCalledWith({
                marketId: 'kalshi_mkt',
                outcomeId: 'kalshi_no_id', // Matches position.outcomeIds.kalshi
                side: 'sell',
                amount: kalshiContracts, // Matches position.shares.kalshi
                type: 'market'
            });

            // Verify Position Cleared
            expect(bot.currentPosition).toBeNull();
        });
    });
});
