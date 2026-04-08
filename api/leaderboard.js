const { kv } = require('@vercel/kv');

module.exports = async function handler(req, res) {
    if (req.method === 'GET') {
        try {
            // Default to 'sequence' to act as backwards compatibility
            const gameType = req.query.game || 'sequence';
            const redisKey = `global_leaderboard_${gameType}`;
            
            // Fetch the massive Redis Cluster dynamically for specific game
            let lb = await kv.get(redisKey) || [];
            return res.status(200).json({ success: true, leaderboard: lb });
        } catch (err) {
            console.error("KV GET Error:", err);
            return res.status(500).json({ success: false, error: 'Failed to access Global DB' });
        }
    }

    if (req.method === 'POST') {
        try {
            const { gameType = 'sequence', email, name, levelsBeaten, failures } = req.body;
            if (!email || !name) {
                return res.status(400).json({ success: false, error: 'Missing parameters' });
            }

            const redisKey = `global_leaderboard_${gameType}`;

            // 1. Fetch current array database
            let lb = await kv.get(redisKey) || [];

            // 2. Insert new attempt
            lb.push({ 
                email, 
                name, 
                levelsBeaten: Number(levelsBeaten), 
                failures: Number(failures), 
                date: new Date().toISOString() 
            });

            // 3. Algorithmically Sort
            if (gameType === 'sequence') {
                // Highest Level -> Fewest Failures
                lb.sort((a, b) => {
                    if (b.levelsBeaten !== a.levelsBeaten) {
                        return b.levelsBeaten - a.levelsBeaten;
                    }
                    return a.failures - b.failures;
                });
            } else if (gameType === 'number') {
                // Highest Digits Beat -> Fewest Errors
                lb.sort((a, b) => {
                    if (b.levelsBeaten !== a.levelsBeaten) {
                        return b.levelsBeaten - a.levelsBeaten;
                    }
                    return a.failures - b.failures;
                });
            } else if (gameType === 'reaction') {
                // Only failures (ms) matters for reaction -> Fastest MS (Lowest Time) wins!
                // LevelsBeaten is always 1
                lb.sort((a, b) => a.failures - b.failures);
            } else if (gameType === 'puzzle') {
                // Only failures (moves) matters -> Fewest moves wins!
                // LevelsBeaten is always 1
                lb.sort((a, b) => a.failures - b.failures);
            } else {
                // Generic fallback
                lb.sort((a, b) => (b.levelsBeaten || 0) - (a.levelsBeaten || 0));
            }

            // 4. Truncate array so the Redis JSON blob doesn't infinitely expand
            const trimmedLb = lb.slice(0, 15);

            // 5. Hard Save back to Redis
            await kv.set(redisKey, trimmedLb);

            return res.status(200).json({ success: true, message: `Saved to Global DB (${gameType}) successfully` });
        } catch (err) {
            console.error("KV POST Error:", err);
            return res.status(500).json({ success: false, error: 'Failed to write to Global DB' });
        }
    }

    return res.status(405).json({ success: false, error: 'Method Not Allowed' });
}
