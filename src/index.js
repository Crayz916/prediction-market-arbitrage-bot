/**
 * Entry point for the arbitrage bot
 */

import 'dotenv/config';
import { config } from '../config.js';
import { ArbitrageBot } from './bot.js';

async function main() {
    console.clear();
    console.log('PREDICTION MARKET ARBITRAGE BOT - https://pmxt.dev\n');

    // Validate configuration
    if (!config.polymarketUrl || !config.kalshiUrl) {
        console.error('Error: Please configure market URLs in config.js');
        process.exit(1);
    }

    if (!config.dryRun) {
        if (!config.polymarketPrivateKey || !config.kalshiApiKey || !config.kalshiApiSecret) {
            console.error('Error: API credentials required for live trading');
            console.error('   Set dryRun: true in config.js for testing without credentials');
            process.exit(1);
        }
    }

    // Create and start bot
    const bot = new ArbitrageBot(config);

    // Handle graceful shutdown
    process.on('SIGINT', () => {
        bot.stop();
        process.exit(0);
    });

    // Start the bot
    try {
        await bot.start();
    } catch (error) {
        console.error('Fatal error:', error.message);
        console.error(error.stack);
        process.exit(1);
    }
}

main();
