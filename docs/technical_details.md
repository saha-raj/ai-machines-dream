# Technical Details

This document provides a detailed explanation of the social consensus simulation model, including its mathematical formulation, implementation details, and theoretical background.

## Model Overview

The simulation models opinion dynamics in a social network with two groups holding opposing beliefs. It explores how individual interactions lead to collective behavior patterns, with special attention to the role of zealots (individuals with unwavering beliefs).

## Network Structure

### Agent Connections
- Each agent forms 1-3 connections with other agents
- Connection probability is influenced by homophily (h): P(same opinion connection) = h
- Higher homophily (h → 1) creates more segregated communities
- Lower homophily (h → 0.5) creates more integrated networks
- Connections are bidirectional and persist throughout the simulation

### Network Topology
- The network is represented as an undirected graph
- Agents are nodes, connections are edges
- The network is not fully connected but forms a small-world-like structure
- Community structure emerges naturally from homophilic connection preferences

## Belief System

### Belief Representation
- Beliefs range continuously from -1 (strong red) to +1 (strong blue)
- The sign of the belief value determines opinion category: negative = red, positive = blue
- Magnitude represents conviction strength: values closer to ±1 indicate stronger beliefs
- Initial beliefs are distributed at ±0.5 to represent moderate starting positions

### Zealots
- Zealots are agents with fixed extreme beliefs (±0.9)
- They influence others but never change their own beliefs
- Zealot proportion is configurable for each opinion group independently
- Zealots serve as "anchors" that can stabilize or shift group consensus

## Interaction Dynamics

### Agent Selection
- In each time step, random pairs of connected agents interact
- Selection probability is uniform across all network connections
- Each agent participates in approximately one interaction per time step

### Belief Update Mechanism
For non-zealot agents, beliefs update according to:

1. **Susceptibility Calculation**:
   - S = (opposing neighbors)/(total neighbors)
   - Higher exposure to opposing views increases susceptibility

2. **Belief Update Formula**:
   - b_new = b + sign(other's belief - own belief) × 0.1 × S × (1 - |other's belief|)
   - Where:
     - b is the current belief value
     - sign() returns +1 or -1 based on the direction of influence
     - 0.1 is the base influence rate
     - S is the susceptibility factor
     - (1 - |other's belief|) represents the persuasiveness factor

3. **Persuasiveness Factor**:
   - Moderate beliefs (closer to 0) are more persuasive than extreme ones
   - This creates a natural "pull toward the middle" effect
   - Zealots (at ±0.9) have reduced persuasiveness but never change

### Termination Conditions
The simulation runs until one of these conditions is met:
- One opinion becomes dominant (>90% of population)
- A stable equilibrium is reached (no significant change over 50 time steps)
- Maximum time steps (500) are reached

## Visualization Components

### Agent Network Visualization
- Agents are represented as circles in a force-directed layout
- Color represents belief: red to blue spectrum
- Size is uniform for all agents
- Zealots are outlined in black
- Network connections shown as light gray lines
- Active interactions highlighted with temporary connection lines

### Opinion Evolution Plot
- X-axis: time steps
- Y-axis: proportion of population holding each opinion
- Red line: proportion of red opinion (negative belief values)
- Blue line: proportion of blue opinion (positive belief values)
- Shows the dynamic evolution of opinion distribution over time

### Belief Distribution Histogram
- X-axis: belief values from -1 to +1
- Y-axis: count of agents
- Separate coloring for zealots and non-zealots
- Updates in real-time to show belief distribution changes
- Reveals polarization, consensus, or other distribution patterns

## Implementation Details

### Simulation Parameters
- Population size: Total number of agents (50-500)
- Initial opinion distribution: Proportion of red vs. blue agents (0-100%)
- Zealot fractions: Percentage of each group with fixed beliefs (0-50%)
- Network homophily: Tendency to connect with similar opinions (50-95%)

### Computational Considerations
- Time complexity: O(n) per time step where n is the number of agents
- Space complexity: O(n + e) where e is the number of connections
- Simulation speed scales approximately linearly with population size
- Force-directed layout uses D3's force simulation with custom forces

## Theoretical Background

This model draws from several established theories in social science:

1. **Social Influence Theory**: People tend to adjust their beliefs to align with those around them

2. **Homophily Principle**: "Birds of a feather flock together" - people tend to associate with similar others

3. **Minority Influence**: Under certain conditions, a committed minority can influence the majority

4. **Tipping Points**: Small changes in initial conditions can lead to dramatically different outcomes

5. **Echo Chambers**: Homophilic networks can reinforce existing beliefs and limit exposure to opposing views

The simulation particularly builds on Centola et al.'s (2018) experimental work on tipping points in social convention, which demonstrated that a committed minority of approximately 25% could overturn established social conventions under certain conditions.

## Limitations

Important limitations to consider when interpreting results:

- Real social networks are more complex and dynamic than this model
- People's susceptibility to influence varies individually and situationally
- The model assumes all non-zealot agents follow identical influence rules
- Real-world social influence occurs through multiple channels beyond direct connections
- The model does not account for external information sources or media influence
- Network structure is fixed after initialization rather than evolving over time

Despite these limitations, the model captures fundamental mechanisms that drive opinion dynamics and provides insights into how simple interaction rules can lead to complex collective behavior.