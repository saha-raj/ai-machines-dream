/**
 * strategies.js
 * 
 * This module defines different strategies for the Prisoner's Dilemma game.
 * Each strategy is a function that takes the history of moves and returns
 * either 'cooperate' or 'defect'.
 * 
 * The history parameter is an array of objects, each containing:
 * - myMove: The player's previous move ('cooperate' or 'defect')
 * - opponentMove: The opponent's previous move ('cooperate' or 'defect')
 */

// Constants for moves
const COOPERATE = 'cooperate';
const DEFECT = 'defect';

/**
 * Strategy: Cooperator
 * This strategy always cooperates regardless of the opponent's moves.
 * 
 * @param {Array} history - Array of previous moves
 * @returns {string} Always returns 'cooperate'
 */
function cooperator(history) {
    return COOPERATE;
}

/**
 * Strategy: Defector
 * This strategy always defects regardless of the opponent's moves.
 * 
 * @param {Array} history - Array of previous moves
 * @returns {string} Always returns 'defect'
 */
function defector(history) {
    return DEFECT;
}

/**
 * Strategy: Tit for Tat
 * This strategy starts by cooperating, then copies the opponent's previous move.
 * 
 * @param {Array} history - Array of previous moves
 * @returns {string} 'cooperate' or 'defect' based on opponent's last move
 */
function titForTat(history) {
    // If this is the first move (no history), cooperate
    if (history.length === 0) {
        return COOPERATE;
    }
    
    // Otherwise, do what the opponent did last time
    const lastMove = history[history.length - 1];
    return lastMove.opponentMove;
}

/**
 * Strategy: Random
 * This strategy randomly chooses to cooperate or defect with equal probability.
 * 
 * @param {Array} history - Array of previous moves
 * @returns {string} Randomly returns 'cooperate' or 'defect'
 */
function random(history) {
    return Math.random() < 0.5 ? COOPERATE : DEFECT;
}

/**
 * Strategy: Grudger
 * This strategy cooperates until the opponent defects, then always defects.
 * 
 * @param {Array} history - Array of previous moves
 * @returns {string} 'cooperate' or 'defect' based on opponent's history
 */
function grudger(history) {
    // If this is the first move (no history), cooperate
    if (history.length === 0) {
        return COOPERATE;
    }
    
    // Check if opponent has ever defected
    for (let i = 0; i < history.length; i++) {
        if (history[i].opponentMove === DEFECT) {
            return DEFECT; // Hold a grudge forever
        }
    }
    
    // If opponent has never defected, cooperate
    return COOPERATE;
}

/**
 * Strategy: Detective
 * This strategy starts with a specific sequence, then switches to Tit for Tat
 * if the opponent ever defects, otherwise defects.
 * 
 * @param {Array} history - Array of previous moves
 * @returns {string} 'cooperate' or 'defect' based on strategy
 */
function detective(history) {
    // Initial sequence: cooperate, defect, cooperate, cooperate
    if (history.length === 0) return COOPERATE;
    if (history.length === 1) return DEFECT;
    if (history.length === 2) return COOPERATE;
    if (history.length === 3) return COOPERATE;
    
    // Check if opponent has ever defected
    let hasDefected = false;
    for (let i = 0; i < history.length; i++) {
        if (history[i].opponentMove === DEFECT) {
            hasDefected = true;
            break;
        }
    }
    
    // If opponent has defected, use Tit for Tat
    if (hasDefected) {
        return history[history.length - 1].opponentMove;
    }
    
    // If opponent always cooperated, defect
    return DEFECT;
}

/**
 * Strategy: Pavlov
 * This strategy starts by cooperating, then changes strategy only when receiving a low payoff.
 * Also known as "Win-Stay, Lose-Shift".
 * 
 * @param {Array} history - Array of previous moves
 * @returns {string} 'cooperate' or 'defect' based on previous outcome
 */
function pavlov(history) {
    // If this is the first move (no history), cooperate
    if (history.length === 0) {
        return COOPERATE;
    }
    
    const lastMove = history[history.length - 1];
    
    // Win-Stay, Lose-Shift logic:
    // - If I cooperated and opponent cooperated (good outcome) -> cooperate again
    // - If I defected and opponent defected (bad outcome) -> switch to cooperate
    // - If I cooperated and opponent defected (bad outcome) -> switch to defect
    // - If I defected and opponent cooperated (good outcome) -> defect again
    
    if ((lastMove.myMove === COOPERATE && lastMove.opponentMove === COOPERATE) ||
        (lastMove.myMove === DEFECT && lastMove.opponentMove === COOPERATE)) {
        // Good outcome, stay with the same move
        return lastMove.myMove;
    } else {
        // Bad outcome, switch moves
        return lastMove.myMove === COOPERATE ? DEFECT : COOPERATE;
    }
}

/**
 * Map of strategy IDs to their implementation functions
 */
const strategies = {
    'cooperator': {
        name: 'Cooperator',
        function: cooperator,
        description: 'Always cooperates regardless of opponent\'s moves.'
    },
    'defector': {
        name: 'Defector',
        function: defector,
        description: 'Always defects regardless of opponent\'s moves.'
    },
    'tit-for-tat': {
        name: 'Tit for Tat',
        function: titForTat,
        description: 'Starts by cooperating, then copies opponent\'s previous move.'
    },
    'random': {
        name: 'Random',
        function: random,
        description: 'Randomly chooses to cooperate or defect with equal probability.'
    },
    'grudger': {
        name: 'Grudger',
        function: grudger,
        description: 'Cooperates until the opponent defects, then always defects.'
    },
    'detective': {
        name: 'Detective',
        function: detective,
        description: 'Starts with a specific sequence, then switches to Tit for Tat if the opponent ever defects, otherwise defects.'
    },
    'pavlov': {
        name: 'Pavlov',
        function: pavlov,
        description: 'Starts by cooperating, then changes strategy only when receiving a low payoff.'
    }
};

// Create a global strategiesModule object
window.strategiesModule = {
    COOPERATE,
    DEFECT,
    strategies
}; 