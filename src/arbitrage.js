export function calculateArbitrage(match) {
    const { polymarket, kalshi } = match;

    const strategy1Cost = polymarket.yesPrice + kalshi.noPrice;
    const strategy1Profit = 100 - strategy1Cost;

    const strategy2Cost = kalshi.yesPrice + polymarket.noPrice;
    const strategy2Profit = 100 - strategy2Cost;

    let bestStrategy = null;

    if (strategy1Profit > 0 && strategy1Profit >= strategy2Profit) {
        bestStrategy = {
            type: 'STRATEGY_1',
            description: `Buy YES on Polymarket (${polymarket.yesPrice}¢), Buy NO on Kalshi (${kalshi.noPrice}¢)`,
            polymarketSide: 'YES',
            kalshiSide: 'NO',
            totalCost: strategy1Cost,
            profit: strategy1Profit,
        };
    } else if (strategy2Profit > 0) {
        bestStrategy = {
            type: 'STRATEGY_2',
            description: `Buy YES on Kalshi (${kalshi.yesPrice}¢), Buy NO on Polymarket (${polymarket.noPrice}¢)`,
            polymarketSide: 'NO',
            kalshiSide: 'YES',
            totalCost: strategy2Cost,
            profit: strategy2Profit,
        };
    }

    if (!bestStrategy) return null;

    return {
        outcome: polymarket.title,
        similarity: match.similarity,
        ...bestStrategy,
        polymarketOutcome: polymarket,
        kalshiOutcome: kalshi,
    };
}

export function findArbitrageOpportunities(matches, minProfit = 1) {
    const opportunities = [];
    for (const match of matches) {
        const arb = calculateArbitrage(match);
        if (arb && arb.profit >= minProfit) opportunities.push(arb);
    }
    opportunities.sort((a, b) => b.profit - a.profit);
    return opportunities;
}

export function getBestOpportunity(opportunities) {
    return opportunities.length > 0 ? opportunities[0] : null;
}
