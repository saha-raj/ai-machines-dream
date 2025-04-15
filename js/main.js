/**
 * main.js
 * 
 * This is the main entry point for the Opinion Dynamics simulation application.
 * It initializes the application, sets up event listeners, and coordinates
 * the interaction between different modules.
 */

// Wait for the DOM to be fully loaded
document.addEventListener('DOMContentLoaded', function() {
    // DOM elements
    const proportionSlider = document.getElementById('proportion-slider');
    const proportionLabelLeft = document.getElementById('proportion-label-left');
    const proportionLabelRight = document.getElementById('proportion-label-right');
    const redZealotFractionSlider = document.getElementById('red-zealot-fraction');
    const blueZealotFractionSlider = document.getElementById('blue-zealot-fraction');
    const populationSizeSlider = document.getElementById('population-size');
    const startButton = document.getElementById('start-simulation');
    const stopButton = document.getElementById('stop-simulation');
    const resetButton = document.getElementById('reset-simulation');
    const runningIndicator = document.getElementById('running-indicator');
    const homophilySlider = document.getElementById('homophily');
    
    // Opinion colors
    const opinionColors = {
        'red': '#ef476f',
        'blue': '#00a6fb'
    };
    
    // Current proportion value (0.5 = 50% red, 50% blue)
    let currentProportion = 0.5;
    
    // Initialize proportion control
    updateProportionControl(currentProportion);
    
    // Add event listener for proportion slider
    proportionSlider.addEventListener('input', function() {
        // Calculate proportion directly from slider value
        currentProportion = this.value / 100;
        updateProportionControl(currentProportion);
        
        // Reset visualization if simulation exists and is complete
        if (simulation && simulation.isComplete) {
            visualizer.reset();
            simulation = null;
        }
    });
    
    // Function to update the proportion control UI
    function updateProportionControl(proportion) {
        // Update labels - directly use slider value for labels
        const sliderValue = proportionSlider.value;
        proportionLabelLeft.textContent = `${sliderValue}%`;
        proportionLabelRight.textContent = `${100 - sliderValue}%`;
        
        // Update slider background to match button position
        proportionSlider.style.background = `linear-gradient(to right, 
            ${opinionColors.red} 0%, 
            ${opinionColors.red} ${sliderValue}%, 
            ${opinionColors.blue} ${sliderValue}%, 
            ${opinionColors.blue} 100%)`;
    }
    
    // Update slider values as they change
    redZealotFractionSlider.addEventListener('input', function() {
        const redZealotFractionValue = document.querySelector('.param-group:nth-child(2) .slider-max');
        redZealotFractionValue.textContent = `${Math.round(this.value * 100)}%`;
        
        // Reset visualization if simulation exists and is complete
        if (simulation && simulation.isComplete) {
            visualizer.reset();
            simulation = null;
        }
    });
    
    blueZealotFractionSlider.addEventListener('input', function() {
        const blueZealotFractionValue = document.querySelector('.param-group:nth-child(3) .slider-max');
        blueZealotFractionValue.textContent = `${Math.round(this.value * 100)}%`;
        
        // Reset visualization if simulation exists and is complete
        if (simulation && simulation.isComplete) {
            visualizer.reset();
            simulation = null;
        }
    });
    
    populationSizeSlider.addEventListener('input', function() {
        const populationSizeValue = document.querySelector('.param-group:nth-child(4) .slider-max');
        populationSizeValue.textContent = this.value;
        
        // Reset visualization if simulation exists and is complete
        if (simulation && simulation.isComplete) {
            visualizer.reset();
            simulation = null;
        }
    });
    
    // Simulation and visualizer instances
    let simulation = null;
    let visualizer = null;
    let isRunning = false;
    let stopRequested = false;
    let nextInteractionTimeout = null;
    
    // Initialize the visualizer
    visualizer = new visualizationModule.OpinionVisualizer({
        agentPoolContainer: 'agent-pool-container',
        opinionPlotContainer: 'opinion-plot-container'
    });
    
    // Track whether simulation has been auto-started
    let hasAutoStarted = false;

    // Create an Intersection Observer to detect when simulation container is visible
    const observer = new IntersectionObserver((entries) => {
        // If simulation container is visible and we haven't auto-started yet
        if (entries[0].isIntersecting && !hasAutoStarted && !isRunning) {
            hasAutoStarted = true;
            // Simulate clicking the start button
            startButton.click();
        }
    }, { threshold: 0.5 }); // Trigger when at least 50% of the element is visible

    // Start observing the simulation container
    observer.observe(document.querySelector('.simulation-container'));
    
    // Start simulation button click handler
    startButton.addEventListener('click', function() {
        if (isRunning) return;
        
        // Reset stop flag
        stopRequested = false;
        
        // Disable controls during simulation
        startButton.disabled = true;
        stopButton.disabled = false;
        proportionSlider.disabled = true;
        redZealotFractionSlider.disabled = true;
        blueZealotFractionSlider.disabled = true;
        populationSizeSlider.disabled = true;
        homophilySlider.disabled = true;
        
        // Show running indicator
        runningIndicator.classList.remove('hidden');
        
        // Get parameters
        const redProportion = currentProportion;
        
        // Create simulation configuration
        const config = {
            populationSize: parseInt(populationSizeSlider.value),
            redProportion: redProportion,
            redZealotFraction: parseFloat(redZealotFractionSlider.value),
            blueZealotFraction: parseFloat(blueZealotFractionSlider.value),
            homophily: parseFloat(homophilySlider.value),
            maxInteractions: 10000,
            simulationSpeed: 5
        };
        
        // Initialize simulation
        simulation = new simulationModule.OpinionDynamicsSimulation(config);
        
        // Set up simulation callbacks
        simulation.onInteractionComplete = function(interactionResult) {
            // Update visualization
            visualizer.update(simulation.getStatistics());
            
            // If simulation is not complete and not stopped, run next interaction after a delay
            if (!simulation.isComplete && !stopRequested) {
                // Use a fixed small delay for maximum speed
                const delay = 10;
                nextInteractionTimeout = setTimeout(() => {
                    simulation.runInteraction();
                }, delay);
            } else {
                // Simulation is complete or stopped
                simulationComplete();
            }
        };
        
        simulation.onProgressUpdate = function(stats) {
            // Update visualization periodically
            visualizer.update(stats);
        };
        
        simulation.onSimulationComplete = function(results) {
            // Final update when simulation is complete
            visualizer.update(simulation.getStatistics());
            simulationComplete();
        };
        
        // Function to handle simulation completion
        function simulationComplete() {
            // Display final stats
            displayFinalStats(simulation);
            
            // Re-enable controls
            startButton.disabled = false;
            stopButton.disabled = true;
            proportionSlider.disabled = false;
            redZealotFractionSlider.disabled = false;
            blueZealotFractionSlider.disabled = false;
            populationSizeSlider.disabled = false;
            homophilySlider.disabled = false;
            
            // Hide running indicator
            runningIndicator.classList.add('hidden');
            
            isRunning = false;
        }
        
        // Initialize simulation and visualizer
        simulation.initialize();
        visualizer.initialize(simulation);
        
        // Allow network to settle before starting interactions
        runningIndicator.innerHTML = '<div class="spinner"></div><span>Settling network...</span>';
        
        // Run the force simulation for a while to let positions stabilize
        visualizer.forceSimulation.alpha(1).restart();
        
        // Wait for network to settle before starting interactions
        setTimeout(() => {
            runningIndicator.innerHTML = '<div class="spinner"></div><span>Running...</span>';
            
            // Display initial statistics
            const initialStats = simulation.getStatistics();
            visualizer.update(initialStats);
            
            // Start the simulation
            isRunning = true;
            setTimeout(() => {
                simulation.runInteraction();
            }, 100);
        }, 2000); // Allow 2 seconds for network to settle
    });
    
    // Stop simulation button click handler
    stopButton.addEventListener('click', function() {
        if (!isRunning || !simulation) return;
        
        stopRequested = true;
        stopButton.disabled = true;
        
        // If there's a pending timeout, clear it
        if (nextInteractionTimeout) {
            clearTimeout(nextInteractionTimeout);
            nextInteractionTimeout = null;
        }
        
        // If simulation is running, mark it as complete
        if (isRunning) {
            // Display final stats
            displayFinalStats(simulation);
            
            // Re-enable controls
            startButton.disabled = false;
            stopButton.disabled = true;
            proportionSlider.disabled = false;
            redZealotFractionSlider.disabled = false;
            blueZealotFractionSlider.disabled = false;
            populationSizeSlider.disabled = false;
            homophilySlider.disabled = false;
            
            // Hide running indicator
            runningIndicator.classList.add('hidden');
            
            isRunning = false;
        }
    });
    
    // Reset visualization button click handler
    resetButton.addEventListener('click', function() {
        if (visualizer) {
            visualizer.reset();
        }
        
        if (simulation && isRunning) {
            // If simulation is running, stop it
            stopButton.click();
        }
        
        // Reset sliders to default values
        proportionSlider.value = 50;
        redZealotFractionSlider.value = 0.05;
        blueZealotFractionSlider.value = 0.05;
        populationSizeSlider.value = 100;
        homophilySlider.value = 0.7;
        
        // Update slider displays
        updateProportionControl();
        document.querySelector('.param-group:nth-child(2) .slider-max').textContent = '5%';
        document.querySelector('.param-group:nth-child(3) .slider-max').textContent = '5%';
        document.querySelector('.param-group:nth-child(4) .slider-max').textContent = '100';
        document.querySelector('.param-group:nth-child(5) .slider-max').textContent = '70%';
        
        simulation = null;
        redZealotFractionSlider.disabled = false;
        blueZealotFractionSlider.disabled = false;
    });
    
    // Function to display final statistics
    function displayFinalStats(simulation) {
        const stats = simulation.getStatistics();
        
        // Display final opinion distribution
        visualizer.displayFinalState(stats);
    }
    
    // Handle window resize
    window.addEventListener('resize', () => {
        if (visualizer) {
            visualizer.handleResize();
            
            // Update the visualization if simulation exists
            if (simulation) {
                const stats = simulation.getStatistics();
                visualizer.update(stats);
            }
        }
    });
    
    // Update the event listener for the homophily slider
    homophilySlider.addEventListener('input', function() {
        const homophilyValue = document.querySelector('.param-group:nth-child(5) .slider-max');
        homophilyValue.textContent = `${Math.round(this.value * 100)}%`;
        
        // Reset visualization if simulation exists and is complete
        if (simulation && simulation.isComplete) {
            visualizer.reset();
            simulation = null;
        }
    });

    // Initialize homophily slider value
    document.querySelector('.param-group:nth-child(5) .slider-max').textContent = `${Math.round(homophilySlider.value * 100)}%`;

    // Find the simulation container
    const simulationContainer = document.querySelector('.simulation-container');
    
    if (simulationContainer) {
        // Find the simulation grid
        const simulationGrid = simulationContainer.querySelector('.simulation-grid');
        
        if (simulationGrid) {
            // Create the inner container
            const simulationInner = document.createElement('div');
            simulationInner.className = 'simulation-inner';
            
            // Move the grid into the inner container
            simulationContainer.removeChild(simulationGrid);
            simulationInner.appendChild(simulationGrid);
            simulationContainer.appendChild(simulationInner);
            
            console.log('Added simulation inner container');
        }
    }
});