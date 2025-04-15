/**
 * agent.js
 *
 * This module defines the Agent class for the Opinion Dynamics simulation.
 * Each agent represents an individual with a belief value ranging from -1 to +1,
 * where negative values represent "red" opinions and positive values represent "blue" opinions.
 */

// Constants for opinions
const RED = 'red';
const BLUE = 'blue';

/**
 * Agent class representing a participant in the Opinion Dynamics simulation
 */
class Agent {
    /**
     * Create a new agent
     * @param {number} beliefValue - The initial belief value (-1 to +1)
     * @param {boolean} isZealot - Whether this agent is a zealot (never changes belief)
     * @param {number} id - Unique identifier for this agent
     * @param {number[]} neighbors - Array of neighbor agent IDs
     * @param {number} zealotInfluenceProbability - Probability of adopting a zealot's opinion upon interaction
     */
    constructor(beliefValue, isZealot, id, neighbors = [], zealotInfluenceProbability = 1.0) {
        this.beliefValue = beliefValue;
        this.isZealot = isZealot;
        this.id = id;
        this.neighbors = neighbors; // Array of neighbor agent IDs
        this.zealotInfluenceProbability = zealotInfluenceProbability; // Probability of adopting a zealot's opinion

        // Track interactions for visualization and statistics
        this.interactionHistory = [];
        this.currentPairingId = null;
        this.isInPairing = false;
    }

    /**
     * Get the opinion color based on belief value
     * @returns {string} 'red' or 'blue'
     */
    get opinion() {
        return this.beliefValue < 0 ? RED : BLUE;
    }

    /**
     * Calculate the susceptibility of the agent to opinion change
     * based on the proportion of neighbors holding the opposing opinion
     * @param {Map<number, Agent>} agentMap - Map of all agents by their IDs
     * @returns {number} Susceptibility value between 0 and 1
     */
    calculateSusceptibility(agentMap) {
        if (this.neighbors.length === 0) return 0;

        // Count neighbors with opposing opinions
        const opposingNeighbors = this.neighbors.filter(neighborId => {
            const neighbor = agentMap.get(neighborId);
            return neighbor && neighbor.opinion !== this.opinion;
        });

        // Susceptibility is the fraction of neighbors with opposing opinions
        return opposingNeighbors.length / this.neighbors.length;
    }

    /**
     * Update the agent's belief based on interaction with another agent
     * Zealots never change their belief
     *
     * @param {Agent} otherAgent - The agent this agent is interacting with
     * @param {Map<number, Agent>} agentMap - Map of all agents by their IDs
     * @returns {boolean} Whether the opinion (sign of belief) changed
     */
    updateBelief(otherAgent, agentMap) {
        // Record the interaction
        this.interactionHistory.push({
            agentId: otherAgent.id,
            otherBelief: otherAgent.beliefValue,
            myBeliefBefore: this.beliefValue,
            time: Date.now()
        });

        // Zealots never change their belief
        if (this.isZealot) {
            return false;
        }

        // Store original opinion for change detection
        const originalOpinion = this.opinion;

        // Interaction with a zealot
        if (otherAgent.isZealot) {
            if (Math.random() < this.zealotInfluenceProbability) {
                this.beliefValue = otherAgent.beliefValue;
            }
        } else {
            // Interaction with a non-zealot
            const susceptibility = this.calculateSusceptibility(agentMap);
            const influenceStrength = 0.1 * susceptibility * (1 - Math.abs(otherAgent.beliefValue));
            const direction = Math.sign(otherAgent.beliefValue - this.beliefValue);
            this.beliefValue += direction * influenceStrength;
            this.beliefValue = Math.max(-1, Math.min(1, this.beliefValue));
        }

        // Check if opinion changed (sign flipped)
        return this.opinion !== originalOpinion;
    }

    /**
     * Reset the agent for a new simulation
     * @param {number} beliefValue - New initial belief value
     * @param {boolean} isZealot - New zealot status
     * @param {number[]} neighbors - New array of neighbor agent IDs
     */
    reset(beliefValue, isZealot, neighbors = []) {
        this.beliefValue = beliefValue;
        this.isZealot = isZealot;
        this.neighbors = neighbors;
        this.interactionHistory = [];
        this.currentPairingId = null;
        this.isInPairing = false;
    }
}

// Create a global agentModule object
window.agentModule = {
    Agent,
    RED,
    BLUE
};
