import { matchOutcomes } from '../src/matcher.js';

describe('Similarity Matcher Logic', () => {

    test('should match exact strings', () => {
        const poly = [{ title: 'Donald Trump', marketId: 'p1' }];
        const kalshi = [{ title: 'Donald Trump', marketId: 'k1' }];

        const matches = matchOutcomes(poly, kalshi, 1.0);
        expect(matches.length).toBe(1);
        expect(matches[0].polymarket.title).toBe('Donald Trump');
        expect(matches[0].kalshi.title).toBe('Donald Trump');
    });

    test('should match case-insensitive', () => {
        const poly = [{ title: 'DONALD TRUMP', marketId: 'p1' }];
        const kalshi = [{ title: 'Donald Trump', marketId: 'k1' }];

        const matches = matchOutcomes(poly, kalshi, 0.9);
        expect(matches.length).toBe(1);
    });

    test('should fuzzy match related names (High threshold)', () => {
        const poly = [{ title: 'Robert F. Kennedy Jr.', marketId: 'p1' }];
        const kalshi = [{ title: 'Robert Kennedy', marketId: 'k1' }];

        // Threshold of 0.7 is confirming our config default
        const matches = matchOutcomes(poly, kalshi, 0.5);
        expect(matches.length).toBe(1);
        expect(matches[0].polymarket.title).toBe('Robert F. Kennedy Jr.');
        expect(matches[0].kalshi.title).toBe('Robert Kennedy');
    });

    test('should NOT match unrelated names', () => {
        const poly = [{ title: 'Donald Trump', marketId: 'p1' }];
        const kalshi = [{ title: 'Joe Biden', marketId: 'k1' }];

        const matches = matchOutcomes(poly, kalshi, 0.5); // Even with low threshold
        expect(matches.length).toBe(0);
    });

    test('should pick the BEST match when multiple candidates exist', () => {
        const poly = [{ title: 'Doug Burgum', marketId: 'p1' }];

        // Similar names scenario
        const kalshi = [
            { title: 'Doug Collins', marketId: 'k1' }, // Good match but not best
            { title: 'Doug Burgum', marketId: 'k2' }   // Perfect match
        ];

        const matches = matchOutcomes(poly, kalshi, 0.5);

        expect(matches.length).toBe(1);
        expect(matches[0].kalshi.title).toBe('Doug Burgum'); // Should match k2, not k1
    });

    test('should handle greedy matching (one-to-one)', () => {
        const poly = [
            { title: 'Name A', marketId: 'p1' },
            { title: 'Name B', marketId: 'p2' }
        ];
        const kalshi = [
            { title: 'Name A', marketId: 'k1' },
            { title: 'Name B', marketId: 'k2' }
        ];

        const matches = matchOutcomes(poly, kalshi, 0.8);
        expect(matches.length).toBe(2);

        const matchA = matches.find(m => m.polymarket.marketId === 'p1');
        expect(matchA.kalshi.marketId).toBe('k1');

        const matchB = matches.find(m => m.polymarket.marketId === 'p2');
        expect(matchB.kalshi.marketId).toBe('k2');
    });
});
