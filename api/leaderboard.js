const { kv } = require('@vercel/kv');

module.exports = async function handler(req, res) {
    if (req.method === 'GET') {
        try {
            // Fetch the massive Redis Cluster dynamically
            let lb = await kv.get('global_leaderboard') || [];
            return res.status(200).json({ success: true, leaderboard: lb });
        } catch (err) {
            console.error("KV GET Error:", err);
            return res.status(500).json({ success: false, error: 'Failed to access Global DB' });
        }
    }

    if (req.method === 'POST') {
        try {
            const { email, name, levelsBeaten, failures } = req.body;
            if (!email || !name) {
                return res.status(400).json({ success: false, error: 'Missing parameters' });
            }

            // 1. Fetch current array database
            let lb = await kv.get('global_leaderboard') || [];

            // 2. Insert new attempt
            lb.push({ 
                email, 
                name, 
                levelsBeaten: Number(levelsBeaten), 
                failures: Number(failures), 
                date: new Date().toISOString() 
            });

            // 3. Algorithmically Sort (Highest Level -> Fewest Failures)
            lb.sort((a, b) => {
                if (b.levelsBeaten !== a.levelsBeaten) {
                    return b.levelsBeaten - a.levelsBeaten;
                }
                return a.failures - b.failures;
            });

            // 4. Truncate array so the Redis JSON blob doesn't infinitely expand
            const trimmedLb = lb.slice(0, 15);

            // 5. Hard Save back to Redis
            await kv.set('global_leaderboard', trimmedLb);

            return res.status(200).json({ success: true, message: 'Saved to Global DB successfully' });
        } catch (err) {
            console.error("KV POST Error:", err);
            return res.status(500).json({ success: false, error: 'Failed to write to Global DB' });
        }
    }

    return res.status(405).json({ success: false, error: 'Method Not Allowed' });
}
