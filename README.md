# Social Consensus Simulation

An interactive simulation exploring social consensus formation, polarization, and the influence of zealots in social networks.

## Overview

This project visualizes how opinions spread and evolve in social networks, with a focus on:

- How network structure affects opinion dynamics
- The role of zealots (individuals with fixed beliefs) in shaping consensus
- Tipping points where minority opinions can overtake majorities
- The impact of homophily (preference to connect with similar others)

## Features

- Interactive visualization of agent interactions in a social network
- Real-time tracking of opinion distribution over time
- Histogram showing belief distribution across the population
- Adjustable parameters:
  - Initial opinion distribution
  - Zealot proportions for each group
  - Population size
  - Network homophily

## How It Works

The simulation models agents with beliefs ranging from -1 (strong red) to +1 (strong blue). Agents interact through network connections, potentially shifting their beliefs based on these interactions. Zealots maintain fixed beliefs and influence others without being influenced themselves.

Network connections form with a bias toward similar opinions, controlled by the homophily parameter. Higher homophily creates more segregated communities, while lower homophily allows more cross-group connections.

## Try It Out

Visit the live simulation at: [https://saha-raj.github.io/social-consensus/](https://saha-raj.github.io/social-consensus/)

## Technical Details

For more information about the model assumptions and mechanics, see the [technical details](docs/technical_details.md).

## Citation

This simulation is inspired by research on tipping points in social convention:

Damon Centola, Joshua Becker, Devon Brackbill, and Andrea Baronchelli. "Experimental evidence for tipping points in social convention." *Science*, 360(6393), 1116-1119 (2018). DOI: [10.1126/science.aas8827](https://doi.org/10.1126/science.aas8827)

## Author

Created by Raj Saha, PhD 