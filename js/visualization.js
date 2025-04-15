/**
 * visualization.js
 * 
 * This module handles the visualization of the Opinion Dynamics simulation
 * using D3.js. It creates visual representations of agents, their opinions,
 * and the evolution of opinions over time.
 */

/**
 * OpinionVisualizer class to handle all visualization aspects
 */
class OpinionVisualizer {
    /**
     * Create a new opinion visualizer
     * @param {Object} options - Visualization options
     * @param {string} options.agentPoolContainer - ID of the container element for agent pool visualization
     * @param {string} options.opinionPlotContainer - ID of the container element for opinion evolution plot
     */
    constructor(options = {}) {
        this.agentPoolContainerId = options.agentPoolContainer || 'agent-pool-container';
        this.opinionPlotContainerId = options.opinionPlotContainer || 'opinion-plot-container';
        
        // Get containers
        this.agentPoolContainer = d3.select(`#${this.agentPoolContainerId}`);
        this.opinionPlotContainer = d3.select(`#${this.opinionPlotContainerId}`);
        
        // Check if agent-pool-visualization exists, if not create it
        if (this.agentPoolContainer.select('.agent-pool-visualization').empty()) {
            this.agentPoolContainer.append('div')
                .attr('class', 'agent-pool-visualization');
        }
        
        // Get the agent pool visualization container
        this.agentPoolVisualization = this.agentPoolContainer.select('.agent-pool-visualization');
        
        // Get dimensions
        this.agentPoolWidth = this.agentPoolContainer.node().clientWidth;
        this.agentPoolHeight = this.agentPoolVisualization.node().clientHeight || 500;
        
        this.opinionPlotWidth = this.opinionPlotContainer.node().clientWidth;
        this.opinionPlotHeight = this.opinionPlotContainer.node().clientHeight || 500;
        
        this.margin = { top: 20, right: 40, bottom: 30, left: 60 };
        
        // Each plot gets half the container height
        this.plotHeight = (this.opinionPlotHeight / 2) - 20;  // -20 for gap between plots
        
        // Set up color scales for opinions
        this.colorScale = d3.scaleLinear()
            .domain([-1, 1])
            .range(['#ef476f', '#00a6fb']);
        
        // Initialize the SVGs
        this.agentPoolSvg = this.agentPoolVisualization.append('svg')
            .attr('width', this.agentPoolWidth)
            .attr('height', this.agentPoolHeight)
            .style('background-color', '#fff');
            
        this.opinionPlotSvg = this.opinionPlotContainer.append('svg')
            .attr('width', this.opinionPlotWidth)
            .attr('height', this.opinionPlotHeight)
            .style('background-color', '#fff');
            // .style('border', '2px solid red');  // Add temporary red border
            
        // Create a group for the agent pool visualization - CENTERED POSITIONING
        this.agentPoolGroup = this.agentPoolSvg.append('g')
            .attr('class', 'agent-pool')
            .attr('transform', `translate(${this.agentPoolWidth / 2}, ${this.agentPoolHeight / 2})`);
            
        // Define the radius of the circular area - make it slightly smaller to ensure it fits
        this.areaRadius = Math.min(this.agentPoolWidth * 0.4, this.agentPoolHeight / 2) * 0.9;
            
        // Remove the boundary circle - no longer needed
        
        // Create a group for pairing lines (below agents)
        this.pairingLinesGroup = this.agentPoolGroup.append('g')
            .attr('class', 'pairing-lines');
            
        // Create groups for both plots with proper vertical positioning
        this.opinionPlotGroup = this.opinionPlotSvg.append('g')
            .attr('class', 'opinion-plot')
            .attr('transform', `translate(${this.margin.left}, ${this.margin.top})`);
        
        this.histogramGroup = this.opinionPlotSvg.append('g')
            .attr('class', 'histogram')
            .attr('transform', `translate(${this.margin.left}, ${this.opinionPlotHeight/2 + this.margin.top})`);
        
        // Set up the force simulation for agent movement
        this.setupForceSimulation();
        
        // Initialize the opinion plot
        this.setupOpinionPlot();
        
        // Store agent data
        this.agentData = [];
        this.simulation = null;
        
        // Handle window resize
        window.addEventListener('resize', this.handleResize.bind(this));
    }
    
    /**
     * Get color for an agent based on opinion
     * @param {number} beliefValue - The agent's belief value (-1 to 1)
     * @returns {Object} Color and opacity
     */
    getAgentColor(beliefValue) {
        // Base colors
        const baseColor = beliefValue < 0 ? '#ef476f' : '#00a6fb';
        
        // Calculate opacity based on belief strength (absolute value)
        // Floor of 0.1 to ensure agents are always at least slightly visible
        const opacity = Math.max(0.1, Math.abs(beliefValue));
        
        return {
            color: baseColor,
            opacity: opacity
        };
    }
    
    /**
     * Handle window resize
     */
    handleResize() {
        // Update dimensions
        this.agentPoolWidth = this.agentPoolContainer.node().clientWidth;
        this.agentPoolHeight = this.agentPoolVisualization.node().clientHeight || 500;
        
        this.opinionPlotWidth = this.opinionPlotContainer.node().clientWidth;
        this.opinionPlotHeight = this.opinionPlotContainer.node().clientHeight || 500;
        
        // Update the plot height (half of container height)
        this.plotHeight = (this.opinionPlotHeight / 2) - 20;  // -20 for gap between plots
        
        // Update SVG dimensions
        this.agentPoolSvg
            .attr('width', this.agentPoolWidth)
            .attr('height', this.agentPoolHeight);
            
        this.opinionPlotSvg
            .attr('width', this.opinionPlotWidth)  // Add this line to update width
            .attr('height', this.opinionPlotHeight);
            
        // Update the area radius
        this.areaRadius = Math.min(this.agentPoolWidth * 0.4, this.agentPoolHeight / 2) * 0.9;
        
        // Update group positions - CENTERED POSITIONING
        this.agentPoolGroup
            .attr('transform', `translate(${this.agentPoolWidth / 2}, ${this.agentPoolHeight / 2})`);
            
        // Update the opinion plot group position
        this.opinionPlotGroup
            .attr('transform', `translate(${this.margin.left}, ${this.margin.top})`);
            
        // Update the histogram group position
        this.histogramGroup
            .attr('transform', `translate(${this.margin.left}, ${this.opinionPlotHeight/2 + this.margin.top})`);
        
        // Recalculate scales with new dimensions
        const plotWidth = this.opinionPlotWidth - this.margin.left - this.margin.right;
        
        // Update x scale for opinion plot
        if (this.xScale) {
            this.xScale.range([0, plotWidth]);
            // Update x-axis
            if (this.opinionPlotGroup.select('.x-axis').size()) {
                this.opinionPlotGroup.select('.x-axis')
                    .attr('transform', `translate(0, ${this.plotHeight - this.margin.top - this.margin.bottom})`)
                    .call(d3.axisBottom(this.xScale));
            }
        }
        
        // Update x scale for histogram
        if (this.histXScale) {
            this.histXScale.range([0, plotWidth]);
            // Update x-axis
            if (this.histogramGroup.select('.x-axis').size()) {
                this.histogramGroup.select('.x-axis')
                    .attr('transform', `translate(0, ${this.plotHeight - this.margin.top - this.margin.bottom})`)
                    .call(d3.axisBottom(this.histXScale));
            }
        }
        
        // Update the visualization
        if (this.simulation) {
            const stats = this.simulation.getStatistics();
            this.updateOpinionPlot();
            this.updateHistogram();
        }
    }
    
    /**
     * Set up the force simulation for agent movement
     */
    setupForceSimulation() {
        // Create a force simulation
        this.forceSimulation = d3.forceSimulation()
            // Moderate repulsion to prevent tight clustering
            .force('charge', d3.forceManyBody().strength(-15).distanceMax(150))
            // Increase collision strength to prevent overlap
            .force('collision', d3.forceCollide().radius(d => d.radius * 1.5).strength(0.8))
            // Stronger center force to keep agents in bounds naturally
            .force('center', d3.forceCenter(0, 0).strength(0.3))
            // Make network links weak but meaningful
            .force('link', d3.forceLink().id(d => d.id).strength(d => 0.05))
            // Similarity-based attraction/repulsion with belief-dependent strength
            .force('similarity', alpha => {
                if (!this.agentData) return;
                
                // Apply attraction/repulsion between agents based on opinion
                for (let i = 0; i < this.agentData.length; i++) {
                    const agent1 = this.agentData[i];
                    if (!agent1) continue;
                    
                    for (let j = i + 1; j < this.agentData.length; j++) {
                        const agent2 = this.agentData[j];
                        if (!agent2) continue;
                        
                        // Calculate similarity (same opinion = similar)
                        const sameSide = (agent1.beliefValue < 0 && agent2.beliefValue < 0) || 
                                        (agent1.beliefValue >= 0 && agent2.beliefValue >= 0);
                        
                        // Calculate vector between agents
                        const dx = agent2.x - agent1.x;
                        const dy = agent2.y - agent1.y;
                    
                    // Skip if any values are NaN
                    if (isNaN(dx) || isNaN(dy)) continue;
                    
                        // Calculate distance
                        const distance = Math.sqrt(dx * dx + dy * dy);
                        if (distance === 0) continue;
                        
                        // Calculate belief strength factor (sum of absolute belief values)
                        // This makes agents with stronger beliefs attract/repel more strongly
                        const beliefStrengthFactor = Math.abs(agent1.beliefValue) + Math.abs(agent2.beliefValue);
                        // Scale to a reasonable range (0.5 to 2.0)
                        const scaledStrengthFactor = 0.5 + (beliefStrengthFactor / 2);
                        
                        // Apply balanced forces with distance decay and belief strength
                        let force;
                        if (sameSide) {
                            // Attractive force for same opinion, scaled by belief strength
                            // Increased from 0.02 to 0.035 for stronger attraction
                            force = 0.035 * scaledStrengthFactor;
                        } else {
                            // Repulsive force for different opinion, scaled by belief strength
                            const maxRepulsion = -0.05 * scaledStrengthFactor;
                            const decayDistance = 100; // Distance at which repulsion starts to decay
                            
                            if (distance < decayDistance) {
                                force = maxRepulsion; // Full repulsion at close distances
            } else {
                                // Decay repulsion with distance
                                const decayFactor = decayDistance / distance;
                                force = maxRepulsion * decayFactor;
                            }
                        }
                        
                        const fx = dx / distance * force * alpha;
                        const fy = dy / distance * force * alpha;
                        
                        agent1.vx += fx;
                        agent1.vy += fy;
                        agent2.vx -= fx;
                        agent2.vy -= fy;
                    }
                }
            });
        
        // Set up tick function
        this.forceSimulation.on('tick', () => {
            // Update agent positions
            this.agentPoolGroup.selectAll('.agent')
                .attr('cx', d => d.x)
                .attr('cy', d => d.y);
                
            // Update network edges
            this.agentPoolGroup.selectAll('.network-edge')
                .attr('x1', d => {
                    if (!d.source || !d.source.x) return 0;
                    return d.source.x;
                })
                .attr('y1', d => {
                    if (!d.source || !d.source.y) return 0;
                    return d.source.y;
                })
                .attr('x2', d => {
                    if (!d.target || !d.target.x) return 0;
                    return d.target.x;
                })
                .attr('y2', d => {
                    if (!d.target || !d.target.y) return 0;
                    return d.target.y;
                });
            
        // Update pairing lines
        this.updatePairingLines();
        });
    }
    
    /**
     * Update the pairing lines between interacting agents
     */
    updatePairingLines() {
        // Clear previous pairing lines
        this.pairingLinesGroup.selectAll('.pairing-line').remove();
        
        if (!this.simulation || !this.simulation.currentPairing) return;
        
        const { agent1Index, agent2Index, path } = this.simulation.currentPairing;
        
        if (!path || path.length < 2) return;
        
        // Create a map of agent IDs to their data
        const agentDataMap = new Map();
        this.agentData.forEach(agent => {
            agentDataMap.set(agent.id, agent);
        });
        
        // Create lines for each segment of the path
        for (let i = 0; i < path.length - 1; i++) {
            const sourceId = path[i];
            const targetId = path[i + 1];
            
            const sourceData = agentDataMap.get(sourceId);
            const targetData = agentDataMap.get(targetId);
            
            if (sourceData && targetData) {
                this.pairingLinesGroup.append('line')
                    .attr('class', 'pairing-line')
                    .attr('x1', sourceData.x)
                    .attr('y1', sourceData.y)
                    .attr('x2', targetData.x)
                    .attr('y2', targetData.y)
                    .attr('stroke', '#8d99ae')
                    .attr('stroke-width', 2)
                    .attr('stroke-opacity', 0.8);
            }
        }
        
        // Also highlight the network edges along the path
        this.highlightNetworkPath(path);
    }
    
    /**
     * Highlight network edges along a path
     * @param {Array} path - Array of agent IDs forming the path
     */
    highlightNetworkPath(path) {
        // Reset all network edges to default appearance
        this.networkEdgesGroup.selectAll('.network-edge')
            .attr('stroke', '#ccc')
                .attr('stroke-width', 1)
            .attr('stroke-opacity', 0.6);
        
        // Highlight edges along the path
        if (path && path.length >= 2) {
            for (let i = 0; i < path.length - 1; i++) {
                const sourceId = path[i];
                const targetId = path[i + 1];
                
                // Find and highlight this edge
                this.networkEdgesGroup.selectAll('.network-edge')
                    .filter(d => 
                        (d.source.id === sourceId && d.target.id === targetId) || 
                        (d.source.id === targetId && d.target.id === sourceId)
                    )
                    .attr('stroke', '#8d99ae')
                    .attr('stroke-width', 2.5)
                    .attr('stroke-opacity', 0.9);
            }
        }
    }
    
    /**
     * Set up the opinion plot
     */
    setupOpinionPlot() {
        // Calculate plot dimensions
        const plotWidth = this.opinionPlotWidth - this.margin.left - this.margin.right;
        const plotHeight = this.plotHeight - this.margin.top - this.margin.bottom;
        
        // Create scales
        this.xScale = d3.scaleLinear()
            .domain([0, 100]) // Initial domain, will be updated
            .range([0, plotWidth]);
            
        this.yScale = d3.scaleLinear()
            .domain([0, 1]) // Proportion from 0 to 1
            .range([plotHeight, 0]);
            
        // Create axes
        this.xAxis = this.opinionPlotGroup.append('g')
            .attr('class', 'x-axis')
            .attr('transform', `translate(0, ${plotHeight})`)
            .call(d3.axisBottom(this.xScale));
            
        this.yAxis = this.opinionPlotGroup.append('g')
            .attr('class', 'y-axis')
            .call(d3.axisLeft(this.yScale).ticks(5).tickFormat(d3.format('.0%')));
            
        // Add axis labels
        this.opinionPlotGroup.append('text')
            .attr('class', 'x-axis-label')
            .attr('x', plotWidth / 2)
            .attr('y', plotHeight + 40)
            .attr('text-anchor', 'middle')
            .text('Interactions');
            
        this.opinionPlotGroup.append('text')
            .attr('class', 'y-axis-label')
            .attr('transform', 'rotate(-90)')
            .attr('x', -plotHeight / 2)
            .attr('y', -40)
            .attr('text-anchor', 'middle')
            .text('Opinion Proportion');
            
        // Create line generators
        this.redLine = d3.line()
            .x(d => this.xScale(d.interactionCount))
            .y(d => this.yScale(d.redProportion))
            .curve(d3.curveMonotoneX);
            
        this.blueLine = d3.line()
            .x(d => this.xScale(d.interactionCount))
            .y(d => this.yScale(d.blueProportion))
            .curve(d3.curveMonotoneX);
            
        // Add lines to the plot
        this.opinionPlotGroup.append('path')
            .attr('class', 'red-line')
            .attr('fill', 'none')
            .attr('stroke', '#ef476f')
            .attr('stroke-width', 2);
            
        this.opinionPlotGroup.append('path')
            .attr('class', 'blue-line')
            .attr('fill', 'none')
            .attr('stroke', '#00a6fb')
            .attr('stroke-width', 2);
            
        // Add legend with circular markers and current values - positioned at top left
        const legend = this.opinionPlotGroup.append('g')
            .attr('class', 'legend')
            .attr('transform', `translate(10, 8)`);  // Move up from 10 to 8
            
        // Red opinion legend
        legend.append('circle')
            .attr('cx', 7)
            .attr('cy', 7)
            .attr('r', 5)
            .attr('fill', '#ef476f');
            
        legend.append('text')
            .attr('x', 18)
            .attr('y', 11)
            .attr('fill', '#888')
            .style('font-size', '12px')
            .text('50%');
            
        // Blue opinion legend - increase spacing
        legend.append('circle')
            .attr('cx', 60)  // Increase from 50 to 60
            .attr('cy', 7)
            .attr('r', 5)
            .attr('fill', '#00a6fb');
            
        legend.append('text')
            .attr('x', 71)  // Increase from 61 to 71
            .attr('y', 11)
            .attr('fill', '#888')
            .style('font-size', '12px')
            .text('50%');

        // Hide axes, labels, and legend initially
        this.opinionPlotGroup.selectAll('.x-axis, .y-axis, .x-axis-label, .y-axis-label, .legend')
            .style('opacity', 0);
    }
    
    /**
     * Update the opinion plot with current data
     */
    updateOpinionPlot() {
        if (!this.simulation) return;
        
        const history = this.simulation.opinionHistory;
        if (history.length === 0) return;
        
        // Calculate plot dimensions
        const plotWidth = this.opinionPlotWidth - this.margin.left - this.margin.right;
        
        // Update x-axis domain dynamically based on current interaction count
        const currentInteractions = this.simulation.interactionCount;
        const maxInteractions = this.simulation.config.maxInteractions || 5000;
        
        // Set x-axis to show either the current progress or the full range
        // Always show at least up to 100 interactions
        const xMax = Math.max(currentInteractions * 1.2, 100);
        
        // Update the domain - ensure we don't exceed maxInteractions
        const newDomain = [0, Math.min(xMax, maxInteractions)];
        console.log("Updating x-axis domain:", newDomain);
        this.xScale.domain(newDomain);
        
        // Adjust number of ticks based on the range
        let tickCount = 10; // Default
        if (newDomain[1] > 1000 && newDomain[1] <= 5000) {
            tickCount = 5;  // Fewer ticks for 1k-5k range
        } else if (newDomain[1] > 5000) {
            tickCount = 3;  // Even fewer ticks for >5k
        }
        
        // Update the x-axis with the new domain and tick count
        this.xAxis.call(d3.axisBottom(this.xScale).ticks(tickCount));
        
        // For line smoothing, update the line generators based on interaction count
        if (currentInteractions > 5000) {
            // High smoothing for very large datasets
            this.redLine.curve(d3.curveBasis);
            this.blueLine.curve(d3.curveBasis);
        } else if (currentInteractions > 1000) {
            // Medium smoothing
            this.redLine.curve(d3.curveMonotoneX);
            this.blueLine.curve(d3.curveMonotoneX);
        } else {
            // Less smoothing for small datasets
            this.redLine.curve(d3.curveLinear);
            this.blueLine.curve(d3.curveLinear);
        }
        
        // Update lines
        this.opinionPlotGroup.select('.red-line')
            .attr('d', this.redLine(history));
            
        this.opinionPlotGroup.select('.blue-line')
            .attr('d', this.blueLine(history));

        // Update legend values with current proportions
        const lastState = history[history.length - 1];
        this.opinionPlotGroup.select('.legend')
            .selectAll('text')
            .each(function(d, i) {
                const value = i === 0 ? lastState.redProportion : lastState.blueProportion;
                d3.select(this).text(`${Math.round(value * 100)}%`);
            });

        // Show axes, labels, and legend when data is available
        if (this.simulation && this.simulation.opinionHistory.length > 0) {
            this.opinionPlotGroup.selectAll('.x-axis, .y-axis, .x-axis-label, .y-axis-label, .legend')
                .style('opacity', 1);
        }
    }
    
    /**
     * Add new method for histogram setup
     */
    setupHistogram() {
        const plotWidth = this.opinionPlotWidth - this.margin.left - this.margin.right;
        const plotHeight = this.plotHeight - this.margin.top - this.margin.bottom;
        
        // Create scales
        this.histXScale = d3.scaleLinear()
            .domain([-1.05, 1.05])  // Extend to 1.3 to ensure all values are captured
            .range([0, plotWidth]);
            
        this.histYScale = d3.scaleLinear()
            .range([plotHeight, 0]);
            
        // Create axes
        this.histXAxis = this.histogramGroup.append('g')
            .attr('class', 'x-axis')
            .attr('transform', `translate(0, ${plotHeight})`)
            .call(d3.axisBottom(this.histXScale));
            
        this.histYAxis = this.histogramGroup.append('g')
            .attr('class', 'y-axis')
            .call(d3.axisLeft(this.histYScale).ticks(5));  // Reduce to 5 ticks
            
        // Add x-axis label
        this.histogramGroup.append('text')
            .attr('class', 'x-axis-label')
            .attr('x', plotWidth / 2)
            .attr('y', plotHeight + 40)
            .attr('text-anchor', 'middle')
            .attr('fill', '#444')
            .style('font-size', '12px')
            .text('Belief Value');
    }
    
    /**
     * Add method to update histogram
     */
    updateHistogram() {
        if (!this.simulation) return;
        
        const plotWidth = this.opinionPlotWidth - this.margin.left - this.margin.right;
        const plotHeight = this.plotHeight - this.margin.top - this.margin.bottom;
        
        // Separate agents by opinion and zealot status
        const redNonZealots = this.simulation.agents.filter(a => a.beliefValue < 0 && !a.isZealot);
        const redZealots = this.simulation.agents.filter(a => a.beliefValue < 0 && a.isZealot);
        const blueNonZealots = this.simulation.agents.filter(a => a.beliefValue >= 0 && !a.isZealot);
        const blueZealots = this.simulation.agents.filter(a => a.beliefValue >= 0 && a.isZealot);

        const binWidth = 0.1;  // Fixed bin width
        const maxHeight = this.simulation.config.populationSize / 2;  // Fixed y-axis height

        // Single histogram for all values
        const histogram = d3.histogram()
            .domain([-1.3, 1.3])  // Match the x-axis scale
            .thresholds(d3.range(-1.3, 1.3 + binWidth, binWidth));

        // Generate histogram data
        const redNonZealotBins = histogram(redNonZealots.map(a => a.beliefValue));
        const redZealotBins = histogram(redZealots.map(a => a.beliefValue));
        const blueNonZealotBins = histogram(blueNonZealots.map(a => a.beliefValue));
        const blueZealotBins = histogram(blueZealots.map(a => a.beliefValue));

        // Set fixed y scale
        const allBins = [...redNonZealotBins, ...redZealotBins, ...blueNonZealotBins, ...blueZealotBins];
        const maxCount = d3.max(allBins, d => d.length);
        const roundedMax = Math.ceil(maxCount / (this.simulation.config.populationSize/10)) * (this.simulation.config.populationSize/10);
        this.histYScale.domain([0, roundedMax]);
        this.histYAxis.call(d3.axisLeft(this.histYScale).ticks(5));
        
        // Update bars for non-zealots
        const updateNonZealotBars = (data, className, color) => {
            const bars = this.histogramGroup.selectAll(`.${className}`)
                .data(data);
                
            // Remove old bars
            bars.exit().remove();
            
            // Add new bars
            bars.enter()
                .append('rect')
                .attr('class', className)
                .merge(bars)
                .attr('x', d => this.histXScale(d.x0))
                .attr('y', d => this.histYScale(d.length))
                .attr('width', d => Math.max(0, this.histXScale(d.x1) - this.histXScale(d.x0) - 1))
                .attr('height', d => plotHeight - this.histYScale(d.length))
                .attr('fill', color)
                .attr('opacity', 0.5);
        };
        
        // Update bars for zealots (with black border)
        const updateZealotBars = (data, className, color) => {
            const bars = this.histogramGroup.selectAll(`.${className}`)
                .data(data);
                
            // Remove old bars
            bars.exit().remove();
            
            // Add new bars
            bars.enter()
                .append('rect')
                .attr('class', className)
                .merge(bars)
                .attr('x', d => this.histXScale(d.x0))
                .attr('y', d => this.histYScale(d.length))
                .attr('width', d => Math.max(0, this.histXScale(d.x1) - this.histXScale(d.x0) - 1))
                .attr('height', d => plotHeight - this.histYScale(d.length))
                .attr('fill', color)
                .attr('opacity', 0.7)
                .attr('stroke', '#000')
                .attr('stroke-width', 1);
        };
        
        // Draw non-zealots first
        updateNonZealotBars(redNonZealotBins, 'red-non-zealot-bars', '#ef476f');
        updateNonZealotBars(blueNonZealotBins, 'blue-non-zealot-bars', '#00a6fb');
        
        // Draw zealots on top with black borders
        updateZealotBars(redZealotBins, 'red-zealot-bars', '#ef476f');
        updateZealotBars(blueZealotBins, 'blue-zealot-bars', '#00a6fb');
    }
    
    /**
     * Initialize the visualization with simulation data
     * @param {OpinionDynamicsSimulation} simulation - The simulation to visualize
     */
    initialize(simulation) {
        this.simulation = simulation;
        
        // Create agent data from simulation
        this.agentData = simulation.agents.map(agent => {
            // Random position within the boundary circle
            const angle = Math.random() * 2 * Math.PI;
            // Use square root for uniform distribution
            const radius = Math.sqrt(Math.random()) * this.areaRadius * 0.9;
            
            return {
                id: agent.id,
                beliefValue: agent.beliefValue,
                opinion: agent.opinion,
                isZealot: agent.isZealot,
                neighbors: agent.neighbors,
                x: radius * Math.cos(angle),
                y: radius * Math.sin(angle),
                radius: 5, // Base radius
                currentPairingId: agent.currentPairingId,
                isInPairing: agent.isInPairing
            };
        });
        
        // Create network edge data
        this.edgeData = [];
        this.agentData.forEach(agent => {
            agent.neighbors.forEach(neighborId => {
                this.edgeData.push({
                    source: agent.id,
                    target: neighborId
                });
            });
        });
        
        // Clear any existing elements to ensure proper layering
        this.networkEdgesGroup = this.agentPoolGroup.select('.network-edges');
        if (this.networkEdgesGroup.empty()) {
            // Create a group for network edges FIRST (so they appear behind agents)
            this.networkEdgesGroup = this.agentPoolGroup.append('g')
                .attr('class', 'network-edges');
        } else {
            this.networkEdgesGroup.selectAll('*').remove();
        }
        
        // Create network edges with lighter appearance
        this.networkEdgesGroup.selectAll('.network-edge')
            .data(this.edgeData)
            .enter()
            .append('line')
            .attr('class', 'network-edge')
            .attr('stroke', '#ccc')  // Much lighter color
            .attr('stroke-width', 1)  // Thinner
            .attr('stroke-opacity', 0.6);  // More transparent
        
        // Remove any existing agent circles
        this.agentPoolGroup.selectAll('.agent').remove();
        
        // Create agent circles AFTER edges so they appear on top
        this.agentPoolGroup.selectAll('.agent')
            .data(this.agentData, d => d.id)
            .enter()
            .append('circle')
            .attr('class', 'agent')
            .attr('r', d => d.radius)
            .attr('fill', d => this.getAgentColor(d.beliefValue).color)
            .attr('fill-opacity', d => this.getAgentColor(d.beliefValue).opacity)
            .attr('stroke', d => d.isZealot ? '#000' : 'none')
            .attr('stroke-width', d => d.isZealot ? 2 : 0)
            .attr('cx', d => d.x)
            .attr('cy', d => d.y);
        
        // Update the force simulation with new data
        this.forceSimulation
            .nodes(this.agentData)
            .force('link').links(this.edgeData);
            
        this.forceSimulation
            .alpha(1)
            .restart();
        
        // Clear existing elements
        this.opinionPlotGroup.selectAll('*').remove();
        this.histogramGroup.selectAll('*').remove();
        
        // Setup both plots
        this.setupOpinionPlot();
        this.setupHistogram();
        
        // Initial updates
        this.updateOpinionPlot();
        this.updateHistogram();
    }
    
    /**
     * Update the visualization with new simulation data
     * @param {Object} stats - Current simulation statistics
     */
    update(stats) {
        if (!this.simulation) return;
        
        // Update agent data
        this.simulation.agents.forEach(agent => {
            const agentData = this.agentData.find(d => d.id === agent.id);
            if (agentData) {
                agentData.beliefValue = agent.beliefValue;
                agentData.opinion = agent.opinion;
                agentData.isZealot = agent.isZealot;
                agentData.currentPairingId = agent.currentPairingId;
                agentData.isInPairing = agent.isInPairing;
            }
        });
        
        // Update agent circles
        this.agentPoolGroup.selectAll('.agent')
            .data(this.agentData, d => d.id)
            .attr('fill', d => this.getAgentColor(d.beliefValue).color)
            .attr('fill-opacity', d => this.getAgentColor(d.beliefValue).opacity)
            .attr('stroke', d => d.isZealot ? '#000' : 'none')
            .attr('stroke-width', d => d.isZealot ? 2 : 0);
            
        // Update pairing lines
        this.updatePairingLines();
            
        // Update the opinion plot
        this.updateOpinionPlot();
        
        // Update the histogram
        this.updateHistogram();
        
        // Update the force simulation
        this.forceSimulation.alpha(0.3).restart();
    }
    
    /**
     * Display the final state of the simulation
     * @param {Object} stats - Final simulation statistics
     */
    displayFinalState(stats) {
        // Update the visualization without adding final state text
        this.update(stats);
    }
    
    /**
     * Reset the visualization
     */
    reset() {
        // Clear agent circles
        this.agentPoolGroup.selectAll('.agent').remove();
        
        // Clear pairing lines
        this.pairingLinesGroup.selectAll('.pairing-line').remove();
        
        // Clear network edges
        if (this.networkEdgesGroup) {
            this.networkEdgesGroup.selectAll('.network-edge').remove();
        }
        
        // Clear opinion plot lines
        this.opinionPlotGroup.select('.red-line').attr('d', null);
        this.opinionPlotGroup.select('.blue-line').attr('d', null);
        
        // Hide axes and legend again
        this.opinionPlotGroup.selectAll('.x-axis, .y-axis, .x-axis-label, .y-axis-label, .legend')
            .style('opacity', 0);
        
        // Clear histogram completely - remove all elements
        this.histogramGroup.selectAll('*').remove();
        
        // Remove final state annotation
        this.opinionPlotGroup.selectAll('.final-state').remove();
        
        // Reset simulation reference
        this.simulation = null;
        this.agentData = [];
    }
}

// Create a global visualizationModule object
window.visualizationModule = {
    OpinionVisualizer
}; 