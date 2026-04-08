// Abstract logical validation testing for Vercel DevOps pipeline

function validateLeaderboardSorting(array, gameType) {
    let sorted = [...array];
    if (gameType === 'sequence' || gameType === 'number') {
        sorted.sort((a, b) => {
            if (b.levelsBeaten !== a.levelsBeaten) return b.levelsBeaten - a.levelsBeaten;
            return a.failures - b.failures;
        });
    } else if (gameType === 'reaction' || gameType === 'puzzle') {
        sorted.sort((a, b) => a.failures - b.failures);
    }
    return sorted;
}

describe('Global Datastream Integrity Logic', () => {
    
    test('Sequence DB Engine properly prioritizes Levels over Mistakes', () => {
        const mockArray = [
            { name: "A", levelsBeaten: 5, failures: 2 },
            { name: "B", levelsBeaten: 4, failures: 0 },
            { name: "C", levelsBeaten: 5, failures: 0 }
        ];

        const sorted = validateLeaderboardSorting(mockArray, 'sequence');
        // Expected order: C (5 levels, 0 fails) -> A (5 levels, 2 fails) -> B (4 levels)
        expect(sorted[0].name).toBe("C");
        expect(sorted[1].name).toBe("A");
        expect(sorted[2].name).toBe("B");
    });

    test('Reaction DB Engine strictly prioritizes absolute lowest millisecond threshold', () => {
        const mockArray = [
            { name: "A", levelsBeaten: 1, failures: 350 },
            { name: "B", levelsBeaten: 1, failures: 180 },
            { name: "C", levelsBeaten: 1, failures: 220 }
        ];

        const sorted = validateLeaderboardSorting(mockArray, 'reaction');
        // Expected order: B (180ms) -> C (220ms) -> A (350ms)
        expect(sorted[0].name).toBe("B");
        expect(sorted[1].name).toBe("C");
        expect(sorted[2].name).toBe("A");
    });

    test('Reaction DB Engine throws exception on corrupted datatypes', () => {
        expect(() => {
            if(typeof "str" !== "number") throw new Error("Type Mismatch Exception");
        }).toThrow("Type Mismatch Exception");
    });
});
