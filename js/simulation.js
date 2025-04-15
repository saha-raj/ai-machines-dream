/**
 * simulation.js
 * 
 * This module implements the Opinion Dynamics simulation logic.
 * It handles creating agents, pairing them for interactions, and tracking
 * the evolution of opinions over time.
 */

/**
 * OpinionDynamicsSimulation class to manage the entire simulation process
 */
class OpinionDynamicsSimulation {
    /**
     * Create a new opinion dynamics simulation
     * @param {Object} config - Simulation configuration
     * @param {number} config.populationSize - Total number of agents in the simulation
     * @param {number} config.redProportion - Initial proportion of agents with red opinion (0-1)
     * @param {number} config.zealotFraction - Fraction of red agents that are zealots (0-1)
     * @param {number} config.simulationSpeed - Speed of the simulation (1-10)
     */
    constructor(config) {
        this.config = config;
        this.agents = [];
        this.isRunning = false;
        this.isComplete = false;
        this.interactionCount = 0;
        this.opinionCounts = { red: 0, blue: 0 };
        this.opinionHistory = []; // Track opinion counts over time
        this.currentPairing = null;
        
        // Event callbacks
        this.onInteractionComplete = null;
        this.onSimulationComplete = null;
        this.onProgressUpdate = null;
    }
    
    /**
     * Initialize the simulation by creating agents based on parameters
     */
    initialize() {
        this.agents = [];
        this.isRunning = false;
        this.isComplete = false;
        this.interactionCount = 0;
        this.opinionCounts = { red: 0, blue: 0 };
        this.opinionHistory = [];
        this.currentPairing = null;
        
        // Calculate agent counts
        const totalAgents = this.config.populationSize;
        const redAgents = Math.round(totalAgents * this.config.redProportion);
        const blueAgents = totalAgents - redAgents;
        
        // Calculate zealot counts for both red and blue
        const redZealotCount = Math.round(redAgents * this.config.redZealotFraction);
        const blueZealotCount = Math.round(blueAgents * this.config.blueZealotFraction);
        
        // Helper function for normal distribution
        const normalRandom = (mean, stdDev) => {
            // Box-Muller transform
            let u = 0, v = 0;
            while(u === 0) u = Math.random();
            while(v === 0) v = Math.random();
            const z = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
            return mean + z * stdDev;
        };
        
        // Generate red agents with normally distributed beliefs
        let redAgentBeliefs = [];
        for (let i = 0; i < redAgents; i++) {
            // Generate belief values normally distributed around -0.5
            let beliefValue = normalRandom(-0.5, 0.2);
            // Ensure values stay between -1 and 0
            beliefValue = Math.max(-1, Math.min(0, beliefValue));
            redAgentBeliefs.push({
                beliefValue: beliefValue,
                id: i
            });
        }
        
        // Sort red agents by belief strength (most extreme first)
        redAgentBeliefs.sort((a, b) => Math.abs(a.beliefValue) - Math.abs(b.beliefValue));
        redAgentBeliefs.reverse();
        
        // Create red agents (assign zealot status to top n%)
        for (let i = 0; i < redAgentBeliefs.length; i++) {
            const isZealot = i < redZealotCount;
            this.agents.push(new agentModule.Agent(
                redAgentBeliefs[i].beliefValue, 
                isZealot, 
                redAgentBeliefs[i].id
            ));
        }
        
        // Generate blue agents with normally distributed beliefs
        let blueAgentBeliefs = [];
        for (let i = 0; i < blueAgents; i++) {
            // Generate belief values normally distributed around +0.5
            let beliefValue = normalRandom(0.5, 0.2);
            // Ensure values stay between 0 and 1
            beliefValue = Math.max(0, Math.min(1, beliefValue));
            blueAgentBeliefs.push({
                beliefValue: beliefValue,
                id: redAgents + i
            });
        }
        
        // Sort blue agents by belief strength (most extreme first)
        blueAgentBeliefs.sort((a, b) => Math.abs(a.beliefValue) - Math.abs(b.beliefValue));
        blueAgentBeliefs.reverse();
        
        // Create blue agents (assign zealot status to top n%)
        for (let i = 0; i < blueAgentBeliefs.length; i++) {
            const isZealot = i < blueZealotCount;
            this.agents.push(new agentModule.Agent(
                blueAgentBeliefs[i].beliefValue, 
                isZealot, 
                blueAgentBeliefs[i].id
            ));
        }
        
        // Set up network connections with homophily
        this.setupNetworkWithHomophily();
        
        // Update initial opinion counts
        this.updateOpinionCounts();
        
        // Record initial state
        this.recordOpinionState();
    }
    
    /**
     * Set up network connections with homophily preferences
     */
    setupNetworkWithHomophily() {
        const totalAgents = this.agents.length;
        const homophily = this.config.homophily || 0.5;
        
        // Create arrays of red and blue agent IDs for easier selection
        const redAgentIds = this.agents
            .filter(agent => agent.opinion === agentModule.RED)
            .map(agent => agent.id);
        
        const blueAgentIds = this.agents
            .filter(agent => agent.opinion === agentModule.BLUE)
            .map(agent => agent.id);
        
        // Set up connections for each agent
        this.agents.forEach(agent => {
            const neighbors = [];
            
            // Determine number of connections for this agent (between 1-3)
            let connectionCount = Math.floor(Math.random() * 3) + 1;
            
            // Try to add the desired number of connections
            let attempts = 0;
            const maxAttempts = 50; // Increase max attempts to find suitable neighbors
            
            while (neighbors.length < connectionCount && attempts < maxAttempts) {
                attempts++;
                
                // Determine if this connection should be homophilic (same opinion)
                let targetSameOpinion = Math.random() < homophily;
                
                // Select a neighbor based on homophily preference
                let neighborId;
                
                if (targetSameOpinion) {
                    // Try to connect to same opinion
                    const potentialNeighbors = agent.opinion === agentModule.RED ? redAgentIds : blueAgentIds;
                    
                    if (potentialNeighbors.length > 1) { // Ensure there are other agents with same opinion
                        // Select random agent with same opinion (excluding self)
                        let index;
                        do {
                            index = Math.floor(Math.random() * potentialNeighbors.length);
                            neighborId = potentialNeighbors[index];
                        } while (neighborId === agent.id || neighbors.includes(neighborId));
                    } else {
                        // If we can't find same-opinion neighbors, we'll still respect homophily
                        // by potentially reducing the number of connections rather than connecting randomly
                        continue;
                    }
                } else {
                    // Try to connect to opposite opinion
                    const potentialNeighbors = agent.opinion === agentModule.RED ? blueAgentIds : redAgentIds;
                    
                    if (potentialNeighbors.length > 0) { // Ensure there are agents with opposite opinion
                        // Select random agent with opposite opinion
                        const index = Math.floor(Math.random() * potentialNeighbors.length);
                        neighborId = potentialNeighbors[index];
                        if (neighbors.includes(neighborId)) {
                            continue;
                        }
                    } else {
                        // If we can't find opposite-opinion neighbors, we'll still respect homophily
                        // by potentially reducing the number of connections rather than connecting randomly
                        continue;
                    }
                }
                
                // Add the neighbor
                if (neighborId !== undefined && neighborId !== agent.id && !neighbors.includes(neighborId)) {
                    neighbors.push(neighborId);
                }
            }
            
            // If we couldn't make any connections despite many attempts, ensure at least one connection
            // but still try to respect homophily as much as possible
            if (neighbors.length === 0) {
                // Determine if we should prioritize same-opinion connection based on homophily
                let preferSameOpinion = homophily >= 0.5;
                
                // Try to find at least one neighbor
                if (preferSameOpinion) {
                    // First try same opinion
                    const sameOpinionNeighbors = agent.opinion === agentModule.RED ? redAgentIds : blueAgentIds;
                    for (const potentialId of sameOpinionNeighbors) {
                        if (potentialId !== agent.id) {
                            neighbors.push(potentialId);
                            break;
                        }
                    }
                    
                    // If still no neighbors, try opposite opinion
                    if (neighbors.length === 0) {
                        const oppositeOpinionNeighbors = agent.opinion === agentModule.RED ? blueAgentIds : redAgentIds;
                        if (oppositeOpinionNeighbors.length > 0) {
                            neighbors.push(oppositeOpinionNeighbors[0]);
                        }
                    }
                } else {
                    // First try opposite opinion
                    const oppositeOpinionNeighbors = agent.opinion === agentModule.RED ? blueAgentIds : redAgentIds;
                    if (oppositeOpinionNeighbors.length > 0) {
                        neighbors.push(oppositeOpinionNeighbors[0]);
                    } else {
                        // If still no neighbors, try same opinion
                        const sameOpinionNeighbors = agent.opinion === agentModule.RED ? redAgentIds : blueAgentIds;
                        for (const potentialId of sameOpinionNeighbors) {
                            if (potentialId !== agent.id) {
                                neighbors.push(potentialId);
                                break;
                            }
                        }
                    }
                }
            }
            
            agent.neighbors = neighbors;
        });
        
        // Log network statistics for debugging
        this.logNetworkStatistics();
    }
    
    /**
     * Log statistics about the network connections
     */
    logNetworkStatistics() {
        let sameOpinionConnections = 0;
        let differentOpinionConnections = 0;
        let totalConnections = 0;
        
        this.agents.forEach(agent => {
            agent.neighbors.forEach(neighborId => {
                const neighbor = this.agents.find(a => a.id === neighborId);
                if (neighbor) {
                    totalConnections++;
                    if (agent.opinion === neighbor.opinion) {
                        sameOpinionConnections++;
                    } else {
                        differentOpinionConnections++;
                    }
                }
            });
        });
        
        console.log("Network Statistics:");
        console.log(`Total connections: ${totalConnections}`);
        console.log(`Same opinion connections: ${sameOpinionConnections} (${(sameOpinionConnections / totalConnections * 100).toFixed(2)}%)`);
        console.log(`Different opinion connections: ${differentOpinionConnections} (${(differentOpinionConnections / totalConnections * 100).toFixed(2)}%)`);
        
        // Log homophily settings
        console.log(`Homophily setting: ${this.config.homophily}`);
    }
    
    /**
     * Update counts of agents with each opinion
     */
    updateOpinionCounts() {
        this.opinionCounts = {
            red: this.agents.filter(agent => agent.opinion === agentModule.RED).length,
            blue: this.agents.filter(agent => agent.opinion === agentModule.BLUE).length
        };
    }
    
    /**
     * Record the current state of opinions in the simulation
     */
    recordOpinionState() {
        const totalAgents = this.agents.length;
        const redCount = this.opinionCounts.red;
        const blueCount = this.opinionCounts.blue;
        
        // Calculate proportions
        const redProportion = redCount / totalAgents;
        const blueProportion = blueCount / totalAgents;
        
        // Add to history
        this.opinionHistory.push({
            interactionCount: this.interactionCount,
            redCount,
            blueCount,
            redProportion,
            blueProportion
        });
        
        // Keep history from growing too large by removing oldest entries
        if (this.opinionHistory.length > 1000) {
            this.opinionHistory = this.opinionHistory.slice(-1000);
        }
    }
    
    /**
     * Run a single interaction between two connected agents
     * @returns {Object} Interaction results
     */
    runInteraction() {
        if (this.isComplete) {
            return null;
        }
        
        this.isRunning = true;
        
        // Clear previous pairing
        if (this.currentPairing) {
            const agent1 = this.agents[this.currentPairing.agent1Index];
            const agent2 = this.agents[this.currentPairing.agent2Index];
            
            if (agent1) {
                agent1.isInPairing = false;
                agent1.currentPairingId = null;
            }
            
            if (agent2) {
                agent2.isInPairing = false;
                agent2.currentPairingId = null;
            }
            
            // Clear path information
            this.currentPairing.path = null;
        }
        
        // Find a pair of connected agents
        const { agent1Index, agent2Index, path } = this.findConnectedAgentPair();
        
        // If no connected pair could be found, try again or end simulation
        if (agent1Index === -1 || agent2Index === -1) {
            console.log("Could not find connected agent pair. Network may be disconnected.");
            this.isComplete = true;
            this.isRunning = false;
            return null;
        }
        
        const agent1 = this.agents[agent1Index];
        const agent2 = this.agents[agent2Index];
        
        // Set up pairing for visualization
        agent1.isInPairing = true;
        agent1.currentPairingId = agent2.id;
        agent2.isInPairing = true;
        agent2.currentPairingId = agent1.id;
        
        this.currentPairing = {
            agent1Index,
            agent2Index,
            path // Store the path between agents for visualization
        };
        
        // Record opinions before interaction
        const agent1OpinionBefore = agent1.opinion;
        const agent2OpinionBefore = agent2.opinion;
        const agent1BeliefBefore = agent1.beliefValue;
        const agent2BeliefBefore = agent2.beliefValue;
        
        // Create agent map for neighbor lookups
        const agentMap = new Map();
        this.agents.forEach(agent => {
            agentMap.set(agent.id, agent);
        });
        
        // Agents interact and potentially update beliefs
        const agent1Changed = agent1.updateBelief(agent2, agentMap);
        const agent2Changed = agent2.updateBelief(agent1, agentMap);
        
        // Increment interaction count
        this.interactionCount++;
        
        // Update opinion counts if any agent changed opinion
        if (agent1Changed || agent2Changed) {
            this.updateOpinionCounts();
        }
        
        // Record state periodically (every 10 interactions)
        if (this.interactionCount % 10 === 0) {
            this.recordOpinionState();
        }
        
        // Check for equilibrium or dominance
        this.checkCompletionConditions();
        
        // Create interaction result object
        const interactionResult = {
            interactionCount: this.interactionCount,
            agents: {
                agent1: {
                    id: agent1.id,
                    opinionBefore: agent1OpinionBefore,
                    opinionAfter: agent1.opinion,
                    beliefBefore: agent1BeliefBefore,
                    beliefAfter: agent1.beliefValue,
                    changed: agent1Changed,
                    isZealot: agent1.isZealot
                },
                agent2: {
                    id: agent2.id,
                    opinionBefore: agent2OpinionBefore,
                    opinionAfter: agent2.opinion,
                    beliefBefore: agent2BeliefBefore,
                    beliefAfter: agent2.beliefValue,
                    changed: agent2Changed,
                    isZealot: agent2.isZealot
                }
            },
            opinionCounts: this.opinionCounts,
            currentPairing: this.currentPairing,
            isComplete: this.isComplete
        };
        
        // Trigger interaction complete callback
        if (this.onInteractionComplete) {
            this.onInteractionComplete(interactionResult);
        }
        
        // Trigger progress update callback periodically
        if (this.onProgressUpdate && this.interactionCount % 50 === 0) {
            this.onProgressUpdate({
                interactionCount: this.interactionCount,
                opinionCounts: this.opinionCounts,
                opinionHistory: this.opinionHistory,
                currentPairing: this.currentPairing,
                isComplete: this.isComplete
            });
        }
        
        // If simulation is complete, trigger completion callback
        if (this.isComplete && this.onSimulationComplete) {
            this.onSimulationComplete({
                interactionCount: this.interactionCount,
                opinionCounts: this.opinionCounts,
                opinionHistory: this.opinionHistory
            });
        }
        
        this.isRunning = false;
        
        return interactionResult;
    }
    
    /**
     * Find a pair of agents that are connected directly or indirectly
     * @returns {Object} Object containing agent indices and the path between them
     */
    findConnectedAgentPair() {
        // Randomly decide whether to look for direct or indirect connections
        const preferIndirect = Math.random() < 0.3; // 30% chance to prefer indirect connections
        
        if (!preferIndirect) {
            // Try to find a directly connected pair first (more efficient)
            for (let attempts = 0; attempts < 5; attempts++) {
                const agent1Index = Math.floor(Math.random() * this.agents.length);
                const agent1 = this.agents[agent1Index];
                
                if (agent1.neighbors.length > 0) {
                    // Randomly select one of agent1's neighbors
                    const neighborIndex = Math.floor(Math.random() * agent1.neighbors.length);
                    const agent2Id = agent1.neighbors[neighborIndex];
                    const agent2Index = this.agents.findIndex(a => a.id === agent2Id);
                    
                    if (agent2Index !== -1) {
                        // Direct connection - path is just the two agents
                        return { 
                            agent1Index, 
                            agent2Index, 
                            path: [agent1.id, agent2Id] 
                        };
                    }
                }
            }
        }
        
        // Look for an indirectly connected pair using breadth-first search
        // Try multiple starting points to increase variety
        for (let attempts = 0; attempts < 3; attempts++) {
            const agent1Index = Math.floor(Math.random() * this.agents.length);
            const agent1 = this.agents[agent1Index];
            
            // Find all agents reachable from agent1 using BFS
            const { reachableAgents, paths } = this.findReachableAgents(agent1.id);
            
            if (reachableAgents.length > 1) { // At least one other agent is reachable
                // Filter paths to find those with length > 2 (indirect connections)
                const indirectPaths = [];
                for (const agentId in paths) {
                    if (paths[agentId].length > 2 && agentId !== agent1.id.toString()) {
                        indirectPaths.push({
                            agentId: parseInt(agentId),
                            path: paths[agentId]
                        });
                    }
                }
                
                // If we found indirect paths, randomly select one
                if (indirectPaths.length > 0) {
                    const selectedPath = indirectPaths[Math.floor(Math.random() * indirectPaths.length)];
                    const agent2Index = this.agents.findIndex(a => a.id === selectedPath.agentId);
                    
                    if (agent2Index !== -1) {
                        return { 
                            agent1Index, 
                            agent2Index, 
                            path: selectedPath.path 
                        };
                    }
                }
                
                // If no indirect paths or we couldn't find the agent, fall back to any reachable agent
                const reachableIndex = Math.floor(Math.random() * (reachableAgents.length - 1)) + 1;
                const agent2Id = reachableAgents[reachableIndex];
                const agent2Index = this.agents.findIndex(a => a.id === agent2Id);
                
                if (agent2Index !== -1) {
                    return { 
                        agent1Index, 
                        agent2Index, 
                        path: paths[agent2Id] 
                    };
                }
            }
        }
        
        // If we still couldn't find a connected pair, try direct connections again
        const agent1Index = Math.floor(Math.random() * this.agents.length);
        const agent1 = this.agents[agent1Index];
        
        if (agent1.neighbors.length > 0) {
            const neighborIndex = Math.floor(Math.random() * agent1.neighbors.length);
            const agent2Id = agent1.neighbors[neighborIndex];
            const agent2Index = this.agents.findIndex(a => a.id === agent2Id);
            
            if (agent2Index !== -1) {
                return { 
                    agent1Index, 
                    agent2Index, 
                    path: [agent1.id, agent2Id] 
                };
            }
        }
        
        // If we still couldn't find a connected pair, return invalid indices
        return { agent1Index: -1, agent2Index: -1, path: null };
    }
    
    /**
     * Find all agents reachable from a starting agent using BFS
     * @param {number} startAgentId - ID of the starting agent
     * @returns {Object} Object containing reachable agents and paths to them
     */
    findReachableAgents(startAgentId) {
        const visited = new Set();
        const queue = [startAgentId];
        visited.add(startAgentId);
        
        // Track paths to each reachable agent
        const paths = {};
        paths[startAgentId] = [startAgentId];
        
        while (queue.length > 0) {
            const currentId = queue.shift();
            const currentAgent = this.agents.find(a => a.id === currentId);
            
            if (!currentAgent) continue;
            
            for (const neighborId of currentAgent.neighbors) {
                if (!visited.has(neighborId)) {
                    visited.add(neighborId);
                    queue.push(neighborId);
                    
                    // Record the path to this neighbor
                    paths[neighborId] = [...paths[currentId], neighborId];
                }
            }
        }
        
        return { 
            reachableAgents: Array.from(visited), 
            paths 
        };
    }
    
    /**
     * Check if the simulation has reached completion conditions
     */
    checkCompletionConditions() {
        // Check for opinion dominance (all agents have the same opinion)
        if (this.opinionCounts.red === 0 || this.opinionCounts.blue === 0) {
            console.log("Simulation complete: One opinion dominates");
            this.isComplete = true;
            return;
        }
        
        // Stop after the maximum number of interactions
        const maxInteractions = this.config.maxInteractions || 5000;
        if (this.interactionCount >= maxInteractions) {
            console.log(`Reached max interactions: ${maxInteractions}`);
            this.isComplete = true;
        }
    }
    
    /**
     * Get current simulation statistics
     * @returns {Object} Current statistics
     */
    getStatistics() {
        return {
            interactionCount: this.interactionCount,
            opinionCounts: this.opinionCounts,
            opinionHistory: this.opinionHistory,
            currentPairing: this.currentPairing,
            isComplete: this.isComplete,
            zealotCount: this.agents.filter(agent => agent.isZealot).length,
            redZealotCount: this.agents.filter(agent => agent.isZealot && agent.opinion === agentModule.RED).length,
            blueZealotCount: this.agents.filter(agent => agent.isZealot && agent.opinion === agentModule.BLUE).length
        };
    }
}

// Create a global simulationModule object
window.simulationModule = {
    OpinionDynamicsSimulation
}; 