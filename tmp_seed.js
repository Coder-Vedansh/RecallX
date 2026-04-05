const scores = [
    { email: 'david.kim7@gmail.com', name: 'David Kim', levelsBeaten: 5, failures: 0 },
    { email: 'sarah.jenkins@yahoo.com', name: 'Sarah Jenkins', levelsBeaten: 5, failures: 2 },
    { email: 'alex.r88@outlook.com', name: 'Alex Rogers', levelsBeaten: 5, failures: 6 },
    { email: 'm.chen_code@gmail.com', name: 'Marcus Chen', levelsBeaten: 4, failures: 12 },
    { email: 'emma.w@proton.me', name: 'Emma Wallace', levelsBeaten: 3, failures: 25 },
    { email: 'j.thompson@gmail.com', name: 'James T.', levelsBeaten: 2, failures: 18 }
];

async function runSeed() {
    console.log("Starting seed sequence into Vercel DB...");
    for (let s of scores) {
        try {
            // Trying Live Production Deployment First
            let res = await fetch('https://recall-x-lake.vercel.app/api/leaderboard', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(s)
            });
            let data = await res.json();
            console.log(`Seeded ${s.name} (Live): ${data.success} | Error: ${data.error}`);
        } catch (e) {
            console.error(`Error on ${s.name}: ${e.message}`);
        }
    }
    console.log("Seeding complete!");
}

runSeed();
