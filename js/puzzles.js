// Puzzle System for Crypto Island Treasure Hunt
class PuzzleSystem {
    constructor() {
        this.currentPuzzle = null;
        this.puzzleTypes = {
            'crypto_riddle': this.cryptoRiddlePuzzle,
            'number_sequence': this.numberSequencePuzzle,
            'cipher_decode': this.cipherDecodePuzzle,
            'blockchain_puzzle': this.blockchainPuzzle,
            'treasure_map': this.treasureMapPuzzle
        };
    }

    generatePuzzle(difficulty = 'medium') {
        const puzzleTypes = Object.keys(this.puzzleTypes);
        const randomType = puzzleTypes[Math.floor(Math.random() * puzzleTypes.length)];
        
        this.currentPuzzle = this.puzzleTypes[randomType](difficulty);
        return this.currentPuzzle;
    }

    cryptoRiddlePuzzle(difficulty) {
        const riddles = {
            'easy': {
                question: "What has keys but no locks, space but no room, and you can enter but not go inside?",
                answer: "keyboard",
                hint: "Think about computer peripherals"
            },
            'medium': {
                question: "I'm a digital ledger that's distributed, immutable, and transparent. What am I?",
                answer: "blockchain",
                hint: "The technology behind cryptocurrencies"
            },
            'hard': {
                question: "I'm a 64-character string that proves ownership without revealing identity. What am I?",
                answer: "private key",
                hint: "Essential for crypto wallet security"
            },
            'expert': {
                question: "I'm a consensus mechanism that uses proof of work, created by someone named Satoshi. What am I?",
                answer: "bitcoin",
                hint: "The first cryptocurrency"
            },
            'legendary': {
                question: "I'm a smart contract platform that enables decentralized applications. My native token is ETH. What am I?",
                answer: "ethereum",
                hint: "The second largest cryptocurrency by market cap"
            }
        };

        return {
            type: 'crypto_riddle',
            difficulty: difficulty,
            question: riddles[difficulty].question,
            correctAnswer: riddles[difficulty].answer.toLowerCase(),
            hint: riddles[difficulty].hint,
            points: this.getPointsForDifficulty(difficulty)
        };
    }

    numberSequencePuzzle(difficulty) {
        const sequences = {
            'easy': {
                sequence: [2, 4, 6, 8, ?],
                answer: "10",
                hint: "Even numbers in order"
            },
            'medium': {
                sequence: [1, 1, 2, 3, 5, ?],
                answer: "8",
                hint: "Each number is the sum of the two preceding ones"
            },
            'hard': {
                sequence: [2, 6, 12, 20, 30, ?],
                answer: "42",
                hint: "n * (n + 1)"
            },
            'expert': {
                sequence: [1, 4, 9, 16, 25, ?],
                answer: "36",
                hint: "Perfect squares"
            },
            'legendary': {
                sequence: [1, 8, 27, 64, 125, ?],
                answer: "216",
                hint: "Perfect cubes"
            }
        };

        return {
            type: 'number_sequence',
            difficulty: difficulty,
            question: `Complete the sequence: ${sequences[difficulty].sequence.join(', ')}`,
            correctAnswer: sequences[difficulty].answer,
            hint: sequences[difficulty].hint,
            points: this.getPointsForDifficulty(difficulty)
        };
    }

    cipherDecodePuzzle(difficulty) {
        const ciphers = {
            'easy': {
                encoded: "IFMMP",
                answer: "hello",
                hint: "Caesar cipher with shift of 1"
            },
            'medium': {
                encoded: "KHOOR",
                answer: "hello",
                hint: "Caesar cipher with shift of 3"
            },
            'hard': {
                encoded: "MJQQT",
                answer: "hello",
                hint: "Caesar cipher with shift of 5"
            },
            'expert': {
                encoded: "GDKKN",
                answer: "hello",
                hint: "Caesar cipher with shift of -1"
            },
            'legendary': {
                encoded: "EBIIL",
                answer: "hello",
                hint: "Caesar cipher with shift of -3"
            }
        };

        return {
            type: 'cipher_decode',
            difficulty: difficulty,
            question: `Decode this message: "${ciphers[difficulty].encoded}"`,
            correctAnswer: ciphers[difficulty].answer.toLowerCase(),
            hint: ciphers[difficulty].hint,
            points: this.getPointsForDifficulty(difficulty)
        };
    }

    blockchainPuzzle(difficulty) {
        const puzzles = {
            'easy': {
                question: "What is the maximum supply of Bitcoin?",
                answer: "21000000",
                hint: "21 million coins"
            },
            'medium': {
                question: "What is the block time for Bitcoin?",
                answer: "10",
                hint: "Approximately 10 minutes"
            },
            'hard': {
                question: "What is the halving interval for Bitcoin?",
                answer: "210000",
                hint: "Blocks between halvings"
            },
            'expert': {
                question: "What is the current block reward for Bitcoin?",
                answer: "6.25",
                hint: "After the 2020 halving"
            },
            'legendary': {
                question: "What is the total number of Bitcoin halvings?",
                answer: "32",
                hint: "Total halvings until all coins are mined"
            }
        };

        return {
            type: 'blockchain_puzzle',
            difficulty: difficulty,
            question: puzzles[difficulty].question,
            correctAnswer: puzzles[difficulty].answer.toLowerCase(),
            hint: puzzles[difficulty].hint,
            points: this.getPointsForDifficulty(difficulty)
        };
    }

    treasureMapPuzzle(difficulty) {
        const maps = {
            'easy': {
                question: "On a treasure map, if you go 3 steps North, 2 steps East, then 1 step South, what's your final direction from start?",
                answer: "northeast",
                hint: "Calculate the net movement"
            },
            'medium': {
                question: "A treasure is buried at coordinates (5,3). If you're at (2,1), how many steps do you need to take?",
                answer: "5",
                hint: "Use the distance formula"
            },
            'hard': {
                question: "If a treasure is 10 steps away at 30 degrees North of East, how many steps East do you need?",
                answer: "8.66",
                hint: "Use trigonometry: 10 * cos(30°)"
            },
            'expert': {
                question: "A treasure map shows a triangle with sides 3, 4, and 5. What's the area?",
                answer: "6",
                hint: "It's a right triangle"
            },
            'legendary': {
                question: "If you're at (0,0) and the treasure is at (3,4), what's the angle from North?",
                answer: "53.13",
                hint: "arctan(3/4) in degrees"
            }
        };

        return {
            type: 'treasure_map',
            difficulty: difficulty,
            question: maps[difficulty].question,
            correctAnswer: maps[difficulty].answer.toLowerCase(),
            hint: maps[difficulty].hint,
            points: this.getPointsForDifficulty(difficulty)
        };
    }

    getPointsForDifficulty(difficulty) {
        const points = {
            'easy': 50,
            'medium': 100,
            'hard': 200,
            'expert': 500,
            'legendary': 1000
        };
        return points[difficulty] || 100;
    }

    checkAnswer(playerAnswer) {
        if (!this.currentPuzzle) return false;
        
        const isCorrect = playerAnswer.toLowerCase().trim() === this.currentPuzzle.correctAnswer;
        
        if (isCorrect) {
            // Award points
            window.avalancheIntegration.addPoints(this.currentPuzzle.points);
            window.avalancheIntegration.updateStreak(true);
            
            // Add coins based on difficulty
            const coinReward = this.currentPuzzle.points / 10;
            window.avalancheIntegration.addCoins(coinReward);
            
            // Restore some energy
            window.avalancheIntegration.restoreEnergy(10);
        } else {
            // Lose streak on wrong answer
            window.avalancheIntegration.updateStreak(false);
        }
        
        return isCorrect;
    }

    getHint() {
        if (!this.currentPuzzle) return "No active puzzle";
        return this.currentPuzzle.hint;
    }

    getCurrentPuzzle() {
        return this.currentPuzzle;
    }

    clearPuzzle() {
        this.currentPuzzle = null;
    }

    // Special puzzle for legendary treasures
    generateLegendaryPuzzle() {
        return {
            type: 'legendary_combo',
            difficulty: 'legendary',
            question: "Solve this multi-step puzzle: 1) What is 2^10? 2) What is the square root of that number? 3) What is that number in binary?",
            correctAnswer: "32",
            hint: "2^10 = 1024, sqrt(1024) = 32, 32 in binary is 100000",
            points: 2000,
            steps: [
                "Calculate 2^10",
                "Find the square root",
                "Convert to binary"
            ]
        };
    }

    // Puzzle for finding specific leader's treasure
    generateLeaderPuzzle(leader) {
        const leaderPuzzles = {
            'trump': {
                question: "What was the year when Bitcoin was first created?",
                answer: "2009",
                hint: "The year of the first block"
            },
            'putin': {
                question: "What is the name of the first cryptocurrency?",
                answer: "bitcoin",
                hint: "Created by Satoshi Nakamoto"
            },
            'modi': {
                question: "What does 'HODL' stand for in crypto culture?",
                answer: "hold",
                hint: "A misspelling that became a meme"
            },
            'xi': {
                question: "What is the process of creating new Bitcoin called?",
                answer: "mining",
                hint: "Using computational power to secure the network"
            }
        };

        return {
            type: 'leader_specific',
            difficulty: 'expert',
            question: leaderPuzzles[leader].question,
            correctAnswer: leaderPuzzles[leader].answer.toLowerCase(),
            hint: leaderPuzzles[leader].hint,
            points: 1500,
            leader: leader
        };
    }
}

// Initialize puzzle system
window.puzzleSystem = new PuzzleSystem();
