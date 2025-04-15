/**
 * tournament.js
 * 
 * This module implements the population simulation logic for the Prisoner's Dilemma.
 * It handles creating agents, pairing them, running games, and tracking results.
 * 
 * This implements a population of agents with two strategies that play against each other
 * in pairs, accumulating scores from all their interactions.
 */

/**
 * PopulationSimulation class to manage the entire simulation process
 */
class PopulationSimulation {
    /**
     * Create a new population simulation
     * @param {Object} config - Simulation configuration
     * @param {Object} config.strategies - Map of the two strategy IDs to use
     * @param {number} config.proportion - Proportion of agents using the first strategy (0-1)
     * @param {number} config.totalGames - Total number of games to play in the simulation
     * @param {number} config.populationSize - Total number of agents in the simulation
     * @param {number} config.gamesPerPairing - Number of consecutive games to play between each pair
     */
    constructor(config) {
        this.config = config;
        this.agents = [];
        this.possiblePairings = []; // All possible agent pairings
        this.gamesPlayed = 0;
        this.isRunning = false;
        this.isComplete = false;
        this.strategyStats = {};
        this.scoreDistributions = {};
        
        // Current pairing being played
        this.currentPairingIndex = -1;
        this.currentPairingGamesPlayed = 0;
        
        // Event callbacks
        this.onGameComplete = null;
        this.onSimulationComplete = null;
        this.onProgressUpdate = null;
    }
    
    /**
     * Initialize the simulation by creating agents based on strategy proportions
     */
    initialize() {
        this.agents = [];
        this.possiblePairings = [];
        this.gamesPlayed = 0;
        this.isRunning = false;
        this.isComplete = false;
        this.strategyStats = {};
        this.scoreDistributions = {};
        this.currentPairingIndex = -1;
        this.currentPairingGamesPlayed = 0;
        
        // Get the two strategies
        const strategies = Object.keys(this.config.strategies);
        if (strategies.length !== 2) {
            console.error("Population simulation requires exactly 2 strategies");
            return;
        }
        
        // Initialize strategy stats
        strategies.forEach(strategyId => {
            this.strategyStats[strategyId] = {
                count: 0,
                totalScore: 0,
                averageScore: 0,
                maxScore: 0,
                minScore: Infinity
            };
            
            this.scoreDistributions[strategyId] = {};
        });
        
        // Create agents based on proportion
        const strategy1 = strategies[0];
        const strategy2 = strategies[1];
        const strategy1Count = Math.round(this.config.populationSize * this.config.proportion);
        const strategy2Count = this.config.populationSize - strategy1Count;
        
        // Create agents for strategy 1
        for (let i = 0; i < strategy1Count; i++) {
            this.agents.push(new gameModule.Agent(strategy1, i));
            this.strategyStats[strategy1].count++;
        }
        
        // Create agents for strategy 2
        for (let i = 0; i < strategy2Count; i++) {
            this.agents.push(new gameModule.Agent(strategy2, strategy1Count + i));
            this.strategyStats[strategy2].count++;
        }
        
        // Create all possible pairings
        for (let i = 0; i < this.agents.length; i++) {
            for (let j = i + 1; j < this.agents.length; j++) {
                this.possiblePairings.push({
                    agent1Index: i,
                    agent2Index: j
                });
            }
        }
        
        // Shuffle the pairings for randomness
        this.shuffleArray(this.possiblePairings);
    }
    
    /**
     * Run a single game in the simulation
     * @returns {Object} Game results
     */
    runGame() {
        if (this.isComplete) {
            return null;
        }
        
        this.isRunning = true;
        
        // Check if we've played the total number of games
        if (this.gamesPlayed >= this.config.totalGames) {
            // All games have been played, simulation is complete
            this.isComplete = true;
            this.isRunning = false;
            
            // Calculate final statistics
            this.updateStatistics();
            
            if (this.onSimulationComplete) {
                this.onSimulationComplete({
                    strategyStats: this.strategyStats,
                    scoreDistributions: this.scoreDistributions
                });
            }
            
            return {
                gamesPlayed: this.gamesPlayed,
                totalGames: this.config.totalGames,
                isComplete: true,
                strategyStats: this.strategyStats,
                scoreDistributions: this.scoreDistributions
            };
        }
        
        // Check if we need to select a new pairing
        if (this.currentPairingIndex === -1 || 
            this.currentPairingGamesPlayed >= this.config.gamesPerPairing) {
            // Move to the next pairing
            this.currentPairingIndex = (this.currentPairingIndex + 1) % this.possiblePairings.length;
            this.currentPairingGamesPlayed = 0;
            
            // If we've gone through all pairings, shuffle again for variety
            if (this.currentPairingIndex === 0) {
                this.shuffleArray(this.possiblePairings);
            }
        }
        
        // Get the current pairing
        const selectedPairing = this.possiblePairings[this.currentPairingIndex];
        
        // Get the agents for this pairing
        const agent1 = this.agents[selectedPairing.agent1Index];
        const agent2 = this.agents[selectedPairing.agent2Index];
        
        // Play a single game for this pairing
        const initialScore1 = agent1.score;
        const initialScore2 = agent2.score;
        
        // Play one game
        gameModule.playGame(agent1, agent2);
        
        // Increment games played counters
        this.gamesPlayed++;
        this.currentPairingGamesPlayed++;
        
        // Calculate game scores (only for this game)
        const gameScore1 = agent1.score - initialScore1;
        const gameScore2 = agent2.score - initialScore2;
        
        // Update statistics
        this.updateStatistics();
        
        // Calculate progress
        const progress = (this.gamesPlayed / this.config.totalGames) * 100;
        
        // Store game results
        const gameResult = {
            gamesPlayed: this.gamesPlayed,
            totalGames: this.config.totalGames,
            game: {
                agent1: {
                    id: agent1.id,
                    strategyId: agent1.strategyId,
                    score: agent1.score,
                    gameScore: gameScore1
                },
                agent2: {
                    id: agent2.id,
                    strategyId: agent2.strategyId,
                    score: agent2.score,
                    gameScore: gameScore2
                }
            },
            currentPairing: {
                index: this.currentPairingIndex,
                gamesPlayed: this.currentPairingGamesPlayed,
                totalGames: this.config.gamesPerPairing
            },
            progress: progress,
            strategyStats: this.strategyStats,
            scoreDistributions: this.scoreDistributions,
            isComplete: false
        };
        
        // Trigger game complete callback
        if (this.onGameComplete) {
            this.onGameComplete(gameResult);
        }
        
        // Trigger progress update callback
        if (this.onProgressUpdate && this.gamesPlayed % 10 === 0) {
            this.onProgressUpdate({
                gamesPlayed: this.gamesPlayed,
                totalGames: this.config.totalGames,
                progress: progress,
                strategyStats: this.strategyStats,
                scoreDistributions: this.scoreDistributions
            });
        }
        
        this.isRunning = false;
        
        return gameResult;
    }
    
    /**
     * Update statistics about the current state of the simulation
     */
    updateStatistics() {
        // Reset statistics
        Object.keys(this.strategyStats).forEach(strategyId => {
            this.strategyStats[strategyId].totalScore = 0;
            this.strategyStats[strategyId].maxScore = 0;
            this.strategyStats[strategyId].minScore = Infinity;
            this.scoreDistributions[strategyId] = {};
        });
        
        // Calculate statistics based on current agent scores
        this.agents.forEach(agent => {
            const strategyId = agent.strategyId;
            const stats = this.strategyStats[strategyId];
            
            // Update total score
            stats.totalScore += agent.score;
            
            // Update max and min scores
            stats.maxScore = Math.max(stats.maxScore, agent.score);
            stats.minScore = Math.min(stats.minScore, agent.score);
            
            // Update score distribution
            if (!this.scoreDistributions[strategyId][agent.score]) {
                this.scoreDistributions[strategyId][agent.score] = 0;
            }
            this.scoreDistributions[strategyId][agent.score]++;
        });
        
        // Calculate average scores
        Object.keys(this.strategyStats).forEach(strategyId => {
            const stats = this.strategyStats[strategyId];
            stats.averageScore = stats.count > 0 ? stats.totalScore / stats.count : 0;
        });
    }
    
    /**
     * Shuffle an array in place using Fisher-Yates algorithm
     * @param {Array} array - The array to shuffle
     */
    shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
    }
    
    /**
     * Get current simulation statistics
     * @returns {Object} Current statistics
     */
    getStatistics() {
        return {
            gamesPlayed: this.gamesPlayed,
            totalGames: this.config.totalGames,
            progress: (this.gamesPlayed / this.config.totalGames) * 100,
            strategyStats: this.strategyStats,
            scoreDistributions: this.scoreDistributions,
            isComplete: this.isComplete,
            currentPairing: this.currentPairingIndex >= 0 ? {
                index: this.currentPairingIndex,
                gamesPlayed: this.currentPairingGamesPlayed,
                totalGames: this.config.gamesPerPairing
            } : null
        };
    }
}

// Create a global simulationModule object
window.simulationModule = {
    PopulationSimulation
}; 