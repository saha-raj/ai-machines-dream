document.addEventListener('DOMContentLoaded', function() {
    const container = document.getElementById('poe-viz-area');
    const loadingIndicator = document.getElementById('viz-loading-indicator');
    const pcaNoteDisplay = document.getElementById('pca-note-display');

    if (!container) {
        console.error("Visualization container #poe-viz-area not found.");
        return;
    }

    // --- Visualization Configuration ---
    const config = {
        cameraInitialDistanceFactor: 3, // Multiplier for distance between trajectory points for camera offset
        cameraOffsetVector: new THREE.Vector3(0, 0.5, 1), // Added offset direction relative to trajectory midpoint

        colors: {
            background: 0xffffff, // White
            ambientLight: 0xcccccc,
            directionalLight: 0xffffff,
            points: 0xaaaaaa,
            trajectoryLine: 0x555555, // Dark Gray
            predictionLine: 0x888888, // Slightly lighter dark Gray for visibility check
            trajectoryWordText: 'rgba(0, 0, 0, 0.8)', // Black
            trajectoryWordBg: 'rgba(220, 220, 220, 0.6)', // Increased alpha from 0.2 to 0.6
            predictedWordText: 'rgba(58, 134, 255, 0.9)', // Blue
            sampledWordText: 'rgba(51, 51, 51, 0.4)', // Dark Gray (#333), semi-transparent
        },
        opacity: {
            points: 0.4,
            trajectoryWordBg: 0.6, // Updated to match rgba alpha
        },
        scale: {
            predictedWordSprite: 0.35,
            sampledWordSprite: 0.3,
            trajectoryWordSprite: 0.4,
        },
        size: {
            points: 0.02,
        },
        lineWidth: {
            trajectory: 1,
            prediction: 2, // Increased from 1 to 2
        },
        font: {
            face: 'Arial',
            baseSize: 18, // Base font size for calculations
            internalResMultiplier: 2.5, // Multiplier for internal canvas resolution (48 / 18 ~ 2.6)
        },
        sampleRate: 0.005, // Show ~0.5% as text sprites
    };

    // --- Scene Setup (Three.js) ---
    let scene, camera, renderer, controls;
    let embeddingsGroup, trajectoryGroup, predictionLinesGroup; // Groups for objects
    let allEmbeddingData = []; // Store full embedding data for lookups
    let wordToEmbeddingMap = new Map(); // Map word strings to {x, y, z} objects

    function initThreeJS() {
        const width = container.clientWidth;
        const height = container.clientHeight;

        // Scene
        scene = new THREE.Scene();
        scene.background = new THREE.Color(config.colors.background);

        // Camera
        camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
        // Initial position will be set later based on trajectory

        // Renderer
        renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setSize(width, height);
        container.appendChild(renderer.domElement);

        // Controls
        controls = new THREE.OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.05;
        controls.screenSpacePanning = false;
        controls.minDistance = 0.1;
        controls.maxDistance = 100;

        // Lighting
        const ambientLight = new THREE.AmbientLight(config.colors.ambientLight, 0.6);
        scene.add(ambientLight);
        const directionalLight = new THREE.DirectionalLight(config.colors.directionalLight, 0.8);
        directionalLight.position.set(1, 1, 0).normalize();
        scene.add(directionalLight);

        // Groups
        embeddingsGroup = new THREE.Group();
        trajectoryGroup = new THREE.Group();
        predictionLinesGroup = new THREE.Group();
        scene.add(embeddingsGroup);
        scene.add(trajectoryGroup);
        scene.add(predictionLinesGroup);

        window.addEventListener('resize', onWindowResize, false);
        animate();
    }

    function onWindowResize() {
        const width = container.clientWidth;
        const height = container.clientHeight;
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
        renderer.setSize(width, height);
    }

    function animate() {
        requestAnimationFrame(animate);
        controls.update(); // only required if controls.enableDamping = true, or if controls.autoRotate = true
        renderer.render(scene, camera);
    }

    // --- Text Sprite Helper (Modified for Background) ---
    function createTextSprite(text, options = {}) {
        const fontface = options.fontface || config.font.face;
        const fontsize = options.fontsize || config.font.baseSize;
        // Calculate internal resolution based on multiplier
        const internalFontSize = fontsize * config.font.internalResMultiplier;
        const fontColor = options.fontColor || config.colors.sampledWordText; // Default to sampled word color
        const drawBackground = options.drawBackground || false;
        const backgroundColor = options.backgroundColor || 'rgba(255, 255, 255, 0.0)'; // Default transparent BG
        const scale = options.scale || 0.5; // Base scale

        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        context.font = `Bold ${internalFontSize}px ${fontface}`;

        const metrics = context.measureText(text);
        const textWidth = metrics.width;
        const padding = 10 * (internalFontSize / config.font.baseSize); // Scale padding based on base size
        canvas.width = textWidth + padding;
        canvas.height = internalFontSize + padding;

        context.font = `Bold ${internalFontSize}px ${fontface}`; // Re-apply after resize

        // Draw background rectangle if requested
        if (drawBackground) {
            context.fillStyle = backgroundColor;
            // Add a slight border radius? (optional)
             const borderRadius = 5 * (internalFontSize / config.font.baseSize);
             context.beginPath();
             context.moveTo(borderRadius, 0);
             context.lineTo(canvas.width - borderRadius, 0);
             context.quadraticCurveTo(canvas.width, 0, canvas.width, borderRadius);
             context.lineTo(canvas.width, canvas.height - borderRadius);
             context.quadraticCurveTo(canvas.width, canvas.height, canvas.width - borderRadius, canvas.height);
             context.lineTo(borderRadius, canvas.height);
             context.quadraticCurveTo(0, canvas.height, 0, canvas.height - borderRadius);
             context.lineTo(0, borderRadius);
             context.quadraticCurveTo(0, 0, borderRadius, 0);
             context.closePath();
             context.fill();
            // context.fillRect(0, 0, canvas.width, canvas.height); // Simpler rectangle
        }

        // Draw text
        context.fillStyle = fontColor;
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        context.fillText(text, canvas.width / 2, canvas.height / 2);

        const texture = new THREE.CanvasTexture(canvas);
        texture.generateMipmaps = false;
        texture.minFilter = THREE.LinearFilter;
        texture.magFilter = THREE.LinearFilter;
        texture.needsUpdate = true;

        // Ensure material uses vertex colors if needed, or set color here
        const spriteMaterial = new THREE.SpriteMaterial({
            map: texture,
            transparent: true,
             // Opacity is now primarily controlled by the fontColor's alpha,
             // but set depthTest=false might help overlapping transparent sprites
             depthTest: false,
             depthWrite: false, // Generally good for transparent sprites
             sizeAttenuation: true // Make sprites scale with distance
        });

        const sprite = new THREE.Sprite(spriteMaterial);
        const aspectRatio = canvas.width / canvas.height;
        sprite.scale.set(scale * aspectRatio, scale, 1);
        sprite.userData = { text: text };

        return sprite;
    }

    // --- Data Loading and Visualization ---
    function loadAndVisualizeData() {
        d3.json('output/visualization_data.json')
            .then(data => {
                console.log("Loaded visualization data:", data);
                loadingIndicator.style.display = 'none'; // Hide loading indicator
                allEmbeddingData = data.embeddings; // Store for potential future use

                // --- Create lookup map for embedding positions ---
                wordToEmbeddingMap.clear(); // Clear previous map if reloading data
                allEmbeddingData.forEach(emb => {
                    wordToEmbeddingMap.set(emb.word, { x: emb.x, y: emb.y, z: emb.z });
                });
                console.log(`Created wordToEmbeddingMap with ${wordToEmbeddingMap.size} entries.`);
                // --- End map creation ---

                // Display PCA note
                if (data.notes && data.notes.trajectory_pca) {
                    pcaNoteDisplay.textContent = `${data.notes.embedding_pca} ${data.notes.trajectory_projection} ${data.notes.trajectory_pca}`;
                 }

                // --- Extract Top Predicted Words from Last Step ---
                let topPredictedWords = new Set();
                let lastStepPredictions = []; // Keep ordered list for line drawing
                if (data.trajectory && data.trajectory.length > 0) {
                    const lastStep = data.trajectory[data.trajectory.length - 1];
                    if (lastStep.top_k_predictions) {
                        lastStepPredictions = lastStep.top_k_predictions; // Store the array
                        lastStepPredictions.forEach(pred => topPredictedWords.add(pred.word));
                         console.log("Top predicted words after last step:", Array.from(topPredictedWords));
                    }
                }
                // --- End Extraction ---


                // Clear previous visualizations if any
                clearScene();

                // Visualize Embeddings (Points and Text Sprites)
                visualizeEmbeddings(data.embeddings, topPredictedWords); // Pass the set of top words

                // Visualize Trajectory - this will now also set the camera and prediction lines
                visualizeTrajectory(data.trajectory, lastStepPredictions); // Pass predictions

            })
            .catch(error => {
                console.error('Error loading visualization_data.json:', error);
                loadingIndicator.textContent = 'Error loading data.';
                 pcaNoteDisplay.textContent = '';
                 wordToEmbeddingMap.clear(); // Clear map on error too
            });
    }

     function clearScene() {
        // Clear groups more robustly
        const clearGroup = (group) => {
             while (group.children.length > 0) {
                 const child = group.children[0];
                 group.remove(child);
                 // Dispose geometry and material if necessary (important for memory management)
                 if (child.geometry) child.geometry.dispose();
                 if (child.material) {
                     // Check if material is an array (like MultiMaterial)
                     if (Array.isArray(child.material)) {
                         child.material.forEach(m => m.dispose());
                     } else {
                         // Dispose texture if present
                         if (child.material.map) child.material.map.dispose();
                         child.material.dispose();
                     }
                 }
            }
        };
        clearGroup(embeddingsGroup);
        clearGroup(trajectoryGroup);
        clearGroup(predictionLinesGroup); // Clear prediction lines too
        allEmbeddingData = []; // Clear stored data
        wordToEmbeddingMap.clear(); // Clear the map
    }

    function visualizeEmbeddings(embeddings, topPredictedWords) {
        const pointPositions = [];
        const sampleRate = config.sampleRate;
        let greySpriteCount = 0;
        let blueSpriteCount = 0;

        embeddings.forEach(embedding => {
            const word = embedding.word;
            const position = { x: embedding.x, y: embedding.y, z: embedding.z };

            if (topPredictedWords.has(word)) {
                // ALWAYS show top predicted words as BLUE sprites (fully opaque)
                const sprite = createTextSprite(word, {
                    fontsize: config.font.baseSize, // Use base size
                    scale: config.scale.predictedWordSprite,
                    fontColor: config.colors.predictedWordText // Blue, Opaque
                });
                sprite.position.set(position.x, position.y, position.z);
                embeddingsGroup.add(sprite);
                blueSpriteCount++;
            } else {
                // For other words, apply random sampling
                if (Math.random() < sampleRate) {
                    // Show as a dark grey, semi-transparent sprite
                    const sprite = createTextSprite(word, {
                        fontsize: config.font.baseSize,
                        scale: config.scale.sampledWordSprite,
                        fontColor: config.colors.sampledWordText // #333 with 0.4 opacity from config
                    });
                    sprite.position.set(position.x, position.y, position.z);
                    embeddingsGroup.add(sprite);
                    greySpriteCount++;
                } else {
                    // Show as a grey point
                    pointPositions.push(position.x, position.y, position.z);
                }
            }
        });

        // Create point cloud for the remaining embeddings
        if (pointPositions.length > 0) {
            const pointGeometry = new THREE.BufferGeometry();
            pointGeometry.setAttribute('position', new THREE.Float32BufferAttribute(pointPositions, 3));
            const pointMaterial = new THREE.PointsMaterial({
                color: config.colors.points,
                size: config.size.points,
                sizeAttenuation: true,
                transparent: true,
                opacity: config.opacity.points
            });
            const points = new THREE.Points(pointGeometry, pointMaterial);
            embeddingsGroup.add(points);
            console.log(`Rendered ${pointPositions.length / 3} embedding points.`);
        }
        // Log sprite counts
        console.log(`Rendered ${blueSpriteCount} top predicted words as blue text sprites.`);
        console.log(`Rendered ${greySpriteCount} other words as dark grey text sprites.`);
    }

    function visualizeTrajectory(trajectory, lastStepPredictions) {
        if (!trajectory || trajectory.length === 0) {
             console.log("No trajectory data to visualize.");
             return; // Exit if no trajectory
        }

        const trajectoryPointsVec3 = []; // Store Vector3 for line
        trajectory.forEach(step => {
            trajectoryPointsVec3.push(new THREE.Vector3(step.hidden_state_3d.x, step.hidden_state_3d.y, step.hidden_state_3d.z));
        });

        // Create the line connecting thought points
        const lineMaterialTrajectory = new THREE.LineBasicMaterial({
            color: config.colors.trajectoryLine,
            linewidth: config.lineWidth.trajectory
        });
        const lineGeometryTrajectory = new THREE.BufferGeometry().setFromPoints(trajectoryPointsVec3);
        const trajectoryLine = new THREE.Line(lineGeometryTrajectory, lineMaterialTrajectory);
        trajectoryGroup.add(trajectoryLine);

        // --- Replace Spheres with Text Sprites with Backgrounds ---
        trajectory.forEach((step, index) => {
            const sprite = createTextSprite(step.input_word, {
                fontsize: config.font.baseSize * 1.2, // Slightly larger
                scale: config.scale.trajectoryWordSprite,
                fontColor: config.colors.trajectoryWordText, // Black, Opaque
                drawBackground: true, // Enable background
                backgroundColor: config.colors.trajectoryWordBg // Light Gray, semi-transparent
            });
            sprite.position.set(step.hidden_state_3d.x, step.hidden_state_3d.y, step.hidden_state_3d.z);
            sprite.userData = {
                 type: 'trajectory_word',
                 step: step.step,
                 inputWord: step.input_word,
                 predictions: step.top_k_predictions.map(p => `${p.word} (${p.score.toFixed(2)})`).join(', ')
             };
            trajectoryGroup.add(sprite);
        });
         console.log(`Rendered trajectory words with ${trajectory.length} steps.`);

        // --- Draw Prediction Lines ---
        if (trajectory.length > 0 && lastStepPredictions && lastStepPredictions.length > 0) {
            const lastStep = trajectory[trajectory.length - 1];
            const lastPointPos = new THREE.Vector3(
                lastStep.hidden_state_3d.x,
                lastStep.hidden_state_3d.y,
                lastStep.hidden_state_3d.z
            );

            const lineMaterialPrediction = new THREE.LineBasicMaterial({
                 color: config.colors.predictionLine,
                 linewidth: config.lineWidth.prediction
            });

            lastStepPredictions.forEach(pred => {
                if (wordToEmbeddingMap.has(pred.word)) {
                    const predictedWordPosData = wordToEmbeddingMap.get(pred.word);
                    const targetPos = new THREE.Vector3(
                        predictedWordPosData.x,
                        predictedWordPosData.y,
                        predictedWordPosData.z
                    );
                    const points = [lastPointPos, targetPos];
                    const lineGeometry = new THREE.BufferGeometry().setFromPoints(points);
                    const line = new THREE.Line(lineGeometry, lineMaterialPrediction);
                    predictionLinesGroup.add(line); // Add to its own group
                }
            });
            console.log(`Drew lines to ${predictionLinesGroup.children.length} predicted words.`);
        }

        // --- Set Initial Camera Position and Target ---
        if (trajectory.length > 0 && trajectoryPointsVec3.length >= 2) { // Need at least 2 points for direction
            const lastStep = trajectory[trajectory.length - 1];
            const lastPointPos = trajectoryPointsVec3[trajectoryPointsVec3.length - 1];
            const firstPointPos = trajectoryPointsVec3[0]; // Position after 'the'

             // Calculate midpoint between first and last trajectory points for better framing
             const midPoint = new THREE.Vector3().addVectors(firstPointPos, lastPointPos).multiplyScalar(0.5);

            let targetPos = null; // Position of the top predicted word's embedding
            if (lastStepPredictions && lastStepPredictions.length > 0) {
                const topPredictedWord = lastStepPredictions[0].word;
                if (wordToEmbeddingMap.has(topPredictedWord)) {
                     targetPos = wordToEmbeddingMap.get(topPredictedWord);
                     targetPos = new THREE.Vector3(targetPos.x, targetPos.y, targetPos.z); // Ensure Vector3
                     console.log(`Camera target: Top prediction '${topPredictedWord}' at`, targetPos);
                } else {
                     console.warn(`Top predicted word '${topPredictedWord}' not found in embedding map.`);
                }
            }
             // Use midpoint as fallback target if top prediction not found
             const finalTargetPos = targetPos || midPoint;

             // Position Camera to view both trajectory points
             // Vector from first point to last point
             const trajDirection = new THREE.Vector3().subVectors(lastPointPos, firstPointPos).normalize();
            // A vector somewhat perpendicular for the 'up' direction (crude)
            const perpDirection = new THREE.Vector3(0, 1, 0); // Simple Up
            if (Math.abs(trajDirection.y) > 0.9) perpDirection.set(1, 0, 0); // Use X if trajectory is vertical

            // Calculate offset direction perpendicular to trajectory and view direction
            const viewDirection = new THREE.Vector3().subVectors(finalTargetPos, midPoint).normalize();
            let offsetDirection = new THREE.Vector3().crossVectors(trajDirection, viewDirection).normalize();
             if (offsetDirection.lengthSq() < 0.1) { // Handle cases where directions are collinear
                 offsetDirection = perpDirection; // Use simple perpendicular if cross product is zero
             }

            // Calculate distance based on trajectory length
            const trajLength = firstPointPos.distanceTo(lastPointPos);
            const offsetDistance = Math.max(1.5, trajLength * config.cameraInitialDistanceFactor); // Ensure minimum distance

            // Calculate final camera position: start at midpoint, move back along offsetDirection
            const cameraPos = new THREE.Vector3().copy(midPoint).addScaledVector(offsetDirection, offsetDistance);

             // Add a slight offset based on configured vector if needed (e.g., slightly above)
             cameraPos.add(config.cameraOffsetVector);


            camera.position.copy(cameraPos);
            controls.target.copy(midPoint); // Look towards the center of the trajectory initially
            console.log(`Positioned camera to view trajectory at:`, camera.position, "Target set to midpoint:", midPoint);

            controls.update();
        } else if (trajectory.length > 0) {
            // Handle case with only one trajectory point (fallback)
            const lastPointPos = trajectoryPointsVec3[0];
             camera.position.copy(lastPointPos);
             camera.position.z += 2; // Move back slightly
             controls.target.copy(lastPointPos); // Look at the single point
             controls.update();
             console.log("Only one trajectory point, positioning camera nearby.");
        }
    }

    // --- Initialization Call ---
    initThreeJS();
    loadAndVisualizeData(); // Load data after setting up the scene

}); 