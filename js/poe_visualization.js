document.addEventListener('DOMContentLoaded', function() {
    const container = document.getElementById('poe-viz-area');
    const loadingIndicator = document.getElementById('viz-loading-indicator');
    const pcaNoteDisplay = document.getElementById('pca-note-display');

    if (!container) {
        console.error("Visualization container #poe-viz-area not found.");
        return;
    }

    // --- Scene Setup (Three.js) ---
    let scene, camera, renderer, controls;
    let embeddingsGroup, trajectoryGroup, predictionLinesGroup; // Groups for objects
    let allEmbeddingData = []; // Store full embedding data for lookups

    function initThreeJS() {
        const width = container.clientWidth;
        const height = container.clientHeight;

        // Scene
        scene = new THREE.Scene();
        scene.background = new THREE.Color(0xffffff); // White background

        // Camera
        camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
        camera.position.z = 15; // Adjust starting camera position

        // Renderer
        renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setSize(width, height);
        container.appendChild(renderer.domElement); // Add renderer canvas to the container

        // Controls
        controls = new THREE.OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true; // an animation loop is required when either damping or auto-rotation are enabled
        controls.dampingFactor = 0.05;
        controls.screenSpacePanning = false;
        controls.minDistance = 1;
        controls.maxDistance = 100;

        // Lighting
        const ambientLight = new THREE.AmbientLight(0xcccccc, 0.6);
        scene.add(ambientLight);
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(1, 1, 0).normalize();
        scene.add(directionalLight);

        // Groups to hold visualization elements
        embeddingsGroup = new THREE.Group();
        trajectoryGroup = new THREE.Group();
        predictionLinesGroup = new THREE.Group(); // For lines to predictions
        scene.add(embeddingsGroup);
        scene.add(trajectoryGroup);
        scene.add(predictionLinesGroup);


        // Handle window resize
        window.addEventListener('resize', onWindowResize, false);

        // Start animation loop
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

    // --- Text Sprite Helper ---
    function createTextSprite(text, options = {}) {
        const fontface = options.fontface || 'Arial';
        const fontsize = options.fontsize || 24; // Increase fontsize for clarity
        const fontColor = options.fontColor || 'rgba(0, 0, 0, 1.0)'; // Black text
        const backgroundColor = options.backgroundColor || 'rgba(255, 255, 255, 0.0)'; // Transparent background
        const scale = options.scale || 0.5; // Adjust scale as needed

        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        context.font = `Bold ${fontsize}px ${fontface}`;

        // Measure text width for canvas sizing
        const metrics = context.measureText(text);
        const textWidth = metrics.width;

        // Set canvas size slightly larger than text for padding
        canvas.width = textWidth + 10; // Add some padding
        canvas.height = fontsize + 10; // Add some padding

        // Re-apply font settings after resizing canvas
        context.font = `Bold ${fontsize}px ${fontface}`;
        context.fillStyle = backgroundColor;
        context.fillRect(0, 0, canvas.width, canvas.height);
        context.fillStyle = fontColor;
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        context.fillText(text, canvas.width / 2, canvas.height / 2);

        const texture = new THREE.CanvasTexture(canvas);
        texture.needsUpdate = true;

        const spriteMaterial = new THREE.SpriteMaterial({ map: texture, transparent: true });
        const sprite = new THREE.Sprite(spriteMaterial);

        // Scale the sprite appropriately
        // Consider aspect ratio of the canvas
        const aspectRatio = canvas.width / canvas.height;
        sprite.scale.set(scale * aspectRatio, scale, 1);

        sprite.userData = { text: text }; // Store text for potential interaction

        return sprite;
    }


    // --- Data Loading and Visualization ---
    function loadAndVisualizeData() {
        d3.json('output/visualization_data.json')
            .then(data => {
                console.log("Loaded visualization data:", data);
                loadingIndicator.style.display = 'none'; // Hide loading indicator
                allEmbeddingData = data.embeddings; // Store for later use

                // Display PCA note
                if (data.notes && data.notes.trajectory_pca) {
                    pcaNoteDisplay.textContent = `PCA Notes: ${data.notes.embedding_pca} ${data.notes.trajectory_projection} ${data.notes.trajectory_pca}`;
                 }


                // Clear previous visualizations if any
                clearScene();

                // Visualize Embeddings (Points and Text Sprites)
                visualizeEmbeddings(data.embeddings);

                // Visualize Trajectory
                visualizeTrajectory(data.trajectory);

                // Optional: Visualize prediction lines (can be complex)
                // visualizePredictionLinks(data.trajectory, data.embeddings);

                // Adjust camera to fit the scene - postpone until trajectory is added maybe
                // fitCameraToObject(embeddingsGroup, 1.5); // Adjust fit factor as needed

            })
            .catch(error => {
                console.error('Error loading visualization_data.json:', error);
                loadingIndicator.textContent = 'Error loading data.';
                 pcaNoteDisplay.textContent = '';
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
        clearGroup(predictionLinesGroup);
        allEmbeddingData = []; // Clear stored data
    }

    function visualizeEmbeddings(embeddings) {
        const pointPositions = [];
        const spritePositions = [];
        const sampleRate = 0.01; // Show ~1% as text sprites

        embeddings.forEach(embedding => {
            if (Math.random() < sampleRate) {
                // Create and add text sprite
                const sprite = createTextSprite(embedding.word, { fontsize: 18, scale: 0.5 });
                sprite.position.set(embedding.x, embedding.y, embedding.z);
                embeddingsGroup.add(sprite);
            } else {
                // Add position for point cloud
                pointPositions.push(embedding.x, embedding.y, embedding.z);
            }
        });

        // Create point cloud for the remaining embeddings
        if (pointPositions.length > 0) {
            const pointGeometry = new THREE.BufferGeometry();
            pointGeometry.setAttribute('position', new THREE.Float32BufferAttribute(pointPositions, 3));
            const pointMaterial = new THREE.PointsMaterial({ color: 0xaaaaaa, size: 0.05, sizeAttenuation: true });
            const points = new THREE.Points(pointGeometry, pointMaterial);
            embeddingsGroup.add(points);
            console.log(`Rendered ${pointPositions.length / 3} embedding points.`);
        }
        console.log(`Rendered ${embeddingsGroup.children.length - (pointPositions.length > 0 ? 1 : 0)} text sprites.`);
    }


    function visualizeTrajectory(trajectory) {
        if (!trajectory || trajectory.length === 0) return;

        const points = [];
        trajectory.forEach(step => {
            points.push(new THREE.Vector3(step.hidden_state_3d.x, step.hidden_state_3d.y, step.hidden_state_3d.z));
        });

        // Create the line
        // Use LineMaterial for potential thickness control (requires LineSegmentsGeometry and LineGeometry)
        // Basic line for now:
        const lineMaterial = new THREE.LineBasicMaterial({ color: 0x0000ff, linewidth: 2 }); // Blue line
        const lineGeometry = new THREE.BufferGeometry().setFromPoints(points);
        const trajectoryLine = new THREE.Line(lineGeometry, lineMaterial);
        trajectoryGroup.add(trajectoryLine);

        // Add points at each step
        const pointGeometry = new THREE.SphereGeometry(0.1, 16, 16); // Slightly larger spheres for trajectory steps
        trajectory.forEach((step, index) => {
            // Make first point distinct?
            const color = (index === 0) ? 0x00ff00 : 0xff0000; // Green start, Red steps
            const pointMaterial = new THREE.MeshStandardMaterial({ color: color });
            const sphere = new THREE.Mesh(pointGeometry, pointMaterial);
            sphere.position.set(step.hidden_state_3d.x, step.hidden_state_3d.y, step.hidden_state_3d.z);
            // Add user data for interaction (input word, predictions)
            sphere.userData = {
                 type: 'trajectory_step',
                 step: step.step,
                 inputWord: step.input_word,
                 predictions: step.top_k_predictions.map(p => `${p.word} (${p.score.toFixed(2)})`).join(', ')
             };
            trajectoryGroup.add(sphere);
        });
         console.log(`Rendered trajectory with ${trajectory.length} steps.`);
         // TODO: Add Raycasting for hover/click interaction on trajectory points

         // Set camera to follow the last point? Example:
         // if (points.length > 0) {
         //    const lastPoint = points[points.length - 1];
         //    camera.position.copy(lastPoint).add(new THREE.Vector3(1, 1, 3)); // Offset slightly
         //    controls.target.copy(lastPoint); // Look at the last point
         // }
    }


    // --- Initialization Call ---
    initThreeJS();
    loadAndVisualizeData(); // Load data after setting up the scene

}); 