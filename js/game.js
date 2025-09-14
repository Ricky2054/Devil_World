// 3D Game Engine using Three.js
class CryptoIslandGame {
    constructor() {
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.controls = null;
        this.island = null;
        this.treasureLocations = [];
        this.currentLocation = null;
        this.discoveredTreasures = [];
        this.gameState = 'menu'; // menu, playing, paused, gameOver
        this.energyConsumptionRate = 1; // Energy consumed per second
        this.lastEnergyUpdate = Date.now();
        
        this.init();
    }

    init() {
        this.setupScene();
        this.createIsland();
        this.setupLighting();
        this.setupControls();
        this.animate();
        this.startEnergyConsumption();
    }

    setupScene() {
        const canvas = document.getElementById('game-canvas');
        
        // Scene
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x87CEEB); // Sky blue
        
        // Camera
        this.camera = new THREE.PerspectiveCamera(
            75,
            canvas.clientWidth / canvas.clientHeight,
            0.1,
            1000
        );
        this.camera.position.set(0, 20, 30);
        
        // Renderer
        this.renderer = new THREE.WebGLRenderer({ 
            canvas: canvas,
            antialias: true 
        });
        this.renderer.setSize(canvas.clientWidth, canvas.clientHeight);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        
        // Handle window resize
        window.addEventListener('resize', () => this.onWindowResize());
    }

    createIsland() {
        // Create island base
        const islandGeometry = new THREE.CylinderGeometry(15, 20, 2, 32);
        const islandMaterial = new THREE.MeshLambertMaterial({ 
            color: 0x8B4513,
            transparent: true,
            opacity: 0.9
        });
        this.island = new THREE.Mesh(islandGeometry, islandMaterial);
        this.island.position.y = -1;
        this.island.receiveShadow = true;
        this.scene.add(this.island);

        // Add grass texture
        const grassGeometry = new THREE.CylinderGeometry(15, 20, 0.1, 32);
        const grassMaterial = new THREE.MeshLambertMaterial({ color: 0x228B22 });
        const grass = new THREE.Mesh(grassGeometry, grassMaterial);
        grass.position.y = 0.05;
        grass.receiveShadow = true;
        this.scene.add(grass);

        // Create treasure locations
        this.createTreasureLocations();
        
        // Add some vegetation
        this.addVegetation();
        
        // Add bunkers and structures
        this.addStructures();
    }

    createTreasureLocations() {
        const locations = [
            { x: -8, z: -5, type: 'bunker', name: 'Trump\'s Bunker', difficulty: 'easy' },
            { x: 10, z: 8, type: 'dig_site', name: 'Putin\'s Dig Site', difficulty: 'medium' },
            { x: -12, z: 10, type: 'safe', name: 'Modi\'s Safe', difficulty: 'hard' },
            { x: 5, z: -12, type: 'cave', name: 'Xi\'s Cave', difficulty: 'expert' },
            { x: 0, z: 0, type: 'center', name: 'Central Command', difficulty: 'legendary' }
        ];

        locations.forEach((loc, index) => {
            const location = this.createTreasureLocation(loc, index);
            this.treasureLocations.push(location);
            this.scene.add(location.mesh);
        });
    }

    createTreasureLocation(locationData, index) {
        let geometry, material, mesh;
        
        switch (locationData.type) {
            case 'bunker':
                geometry = new THREE.BoxGeometry(3, 2, 3);
                material = new THREE.MeshLambertMaterial({ color: 0x696969 });
                break;
            case 'dig_site':
                geometry = new THREE.CylinderGeometry(2, 2, 1, 8);
                material = new THREE.MeshLambertMaterial({ color: 0x8B4513 });
                break;
            case 'safe':
                geometry = new THREE.BoxGeometry(2, 1.5, 2);
                material = new THREE.MeshLambertMaterial({ color: 0xC0C0C0 });
                break;
            case 'cave':
                geometry = new THREE.SphereGeometry(2, 8, 6, 0, Math.PI * 2, 0, Math.PI * 0.5);
                material = new THREE.MeshLambertMaterial({ color: 0x2F4F4F });
                break;
            case 'center':
                geometry = new THREE.ConeGeometry(3, 4, 8);
                material = new THREE.MeshLambertMaterial({ color: 0xFFD700 });
                break;
        }

        mesh = new THREE.Mesh(geometry, material);
        mesh.position.set(locationData.x, 1, locationData.z);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        
        // Add glow effect for undiscovered treasures
        if (!this.discoveredTreasures.includes(index)) {
            const glowGeometry = new THREE.SphereGeometry(4, 16, 16);
            const glowMaterial = new THREE.MeshBasicMaterial({
                color: 0xFFD700,
                transparent: true,
                opacity: 0.3
            });
            const glow = new THREE.Mesh(glowGeometry, glowMaterial);
            glow.position.copy(mesh.position);
            glow.position.y += 2;
            this.scene.add(glow);
        }

        return {
            mesh,
            data: locationData,
            index,
            discovered: false
        };
    }

    addVegetation() {
        // Add some trees
        for (let i = 0; i < 20; i++) {
            const tree = this.createTree();
            const angle = (i / 20) * Math.PI * 2;
            const radius = 12 + Math.random() * 5;
            tree.position.set(
                Math.cos(angle) * radius,
                0,
                Math.sin(angle) * radius
            );
            this.scene.add(tree);
        }
    }

    createTree() {
        const group = new THREE.Group();
        
        // Trunk
        const trunkGeometry = new THREE.CylinderGeometry(0.3, 0.5, 3);
        const trunkMaterial = new THREE.MeshLambertMaterial({ color: 0x8B4513 });
        const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
        trunk.position.y = 1.5;
        trunk.castShadow = true;
        group.add(trunk);
        
        // Leaves
        const leavesGeometry = new THREE.SphereGeometry(2, 8, 6);
        const leavesMaterial = new THREE.MeshLambertMaterial({ color: 0x228B22 });
        const leaves = new THREE.Mesh(leavesGeometry, leavesMaterial);
        leaves.position.y = 4;
        leaves.castShadow = true;
        group.add(leaves);
        
        return group;
    }

    addStructures() {
        // Add some ruins and structures
        const ruinsGeometry = new THREE.BoxGeometry(1, 1, 1);
        const ruinsMaterial = new THREE.MeshLambertMaterial({ color: 0x696969 });
        
        for (let i = 0; i < 10; i++) {
            const ruin = new THREE.Mesh(ruinsGeometry, ruinsMaterial);
            ruin.position.set(
                (Math.random() - 0.5) * 30,
                0.5,
                (Math.random() - 0.5) * 30
            );
            ruin.scale.setScalar(Math.random() * 2 + 0.5);
            ruin.castShadow = true;
            this.scene.add(ruin);
        }
    }

    setupLighting() {
        // Ambient light
        const ambientLight = new THREE.AmbientLight(0x404040, 0.6);
        this.scene.add(ambientLight);
        
        // Directional light (sun)
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(50, 50, 50);
        directionalLight.castShadow = true;
        directionalLight.shadow.mapSize.width = 2048;
        directionalLight.shadow.mapSize.height = 2048;
        directionalLight.shadow.camera.near = 0.5;
        directionalLight.shadow.camera.far = 500;
        directionalLight.shadow.camera.left = -50;
        directionalLight.shadow.camera.right = 50;
        directionalLight.shadow.camera.top = 50;
        directionalLight.shadow.camera.bottom = -50;
        this.scene.add(directionalLight);
    }

    setupControls() {
        this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.maxPolarAngle = Math.PI / 2;
        this.controls.minDistance = 10;
        this.controls.maxDistance = 50;
    }

    onWindowResize() {
        const canvas = document.getElementById('game-canvas');
        this.camera.aspect = canvas.clientWidth / canvas.clientHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(canvas.clientWidth, canvas.clientHeight);
    }

    animate() {
        requestAnimationFrame(() => this.animate());
        
        this.controls.update();
        this.renderer.render(this.scene, this.camera);
    }

    startEnergyConsumption() {
        setInterval(() => {
            if (this.gameState === 'playing') {
                const now = Date.now();
                const timePassed = (now - this.lastEnergyUpdate) / 1000;
                
                if (timePassed >= 1) {
                    const energyConsumed = Math.floor(timePassed * this.energyConsumptionRate);
                    if (window.avalancheIntegration.consumeEnergy(energyConsumed)) {
                        this.updateUI();
                    } else {
                        this.gameOver();
                    }
                    this.lastEnergyUpdate = now;
                }
            }
        }, 1000);
    }

    exploreLocation(locationIndex) {
        const location = this.treasureLocations[locationIndex];
        if (!location || location.discovered) return false;

        // Check if player has enough energy
        if (!window.avalancheIntegration.consumeEnergy(15)) {
            this.showMessage("Not enough energy to explore!");
            return false;
        }

        this.currentLocation = location;
        location.discovered = true;
        this.discoveredTreasures.push(locationIndex);
        
        // Remove glow effect
        this.scene.children.forEach(child => {
            if (child.material && child.material.color && 
                child.material.color.getHex() === 0xFFD700 && 
                child.material.opacity === 0.3) {
                this.scene.remove(child);
            }
        });

        // Add treasure glow
        location.mesh.material.emissive = new THREE.Color(0xFFD700);
        location.mesh.material.emissiveIntensity = 0.3;

        this.updateUI();
        this.showMessage(`Discovered ${location.data.name}!`);
        
        return true;
    }

    digForTreasure() {
        if (!this.currentLocation) return false;

        if (!window.avalancheIntegration.consumeEnergy(20)) {
            this.showMessage("Not enough energy to dig!");
            return false;
        }

        // Simulate digging process
        const success = Math.random() < this.getDigSuccessRate();
        
        if (success) {
            const treasureValue = this.calculateTreasureValue();
            window.avalancheIntegration.addCoins(treasureValue);
            window.avalancheIntegration.addPoints(treasureValue * 10);
            window.avalancheIntegration.updateStreak(true);
            
            this.showMessage(`Found treasure worth ${treasureValue} coins!`);
            this.updateUI();
        } else {
            this.showMessage("Nothing found. Try again!");
        }

        return success;
    }

    getDigSuccessRate() {
        if (!this.currentLocation) return 0;
        
        const difficultyRates = {
            'easy': 0.7,
            'medium': 0.5,
            'hard': 0.3,
            'expert': 0.2,
            'legendary': 0.1
        };
        
        return difficultyRates[this.currentLocation.data.difficulty] || 0.5;
    }

    calculateTreasureValue() {
        if (!this.currentLocation) return 0;
        
        const baseValues = {
            'easy': 50,
            'medium': 100,
            'hard': 200,
            'expert': 500,
            'legendary': 1000
        };
        
        const baseValue = baseValues[this.currentLocation.data.difficulty] || 50;
        const streakBonus = window.avalancheIntegration.playerStats.streak * 10;
        
        return baseValue + streakBonus;
    }

    solvePuzzle(puzzleData) {
        if (!this.currentLocation) return false;

        if (!window.avalancheIntegration.consumeEnergy(25)) {
            this.showMessage("Not enough energy to solve puzzle!");
            return false;
        }

        // This will be handled by the puzzle system
        return true;
    }

    gameOver() {
        this.gameState = 'gameOver';
        this.showMessage("Game Over! You ran out of energy. Rest to restore energy or stake more coins!");
        
        // Reset streak
        window.avalancheIntegration.updateStreak(false);
        this.updateUI();
    }

    showMessage(message) {
        // Create temporary message display
        const messageDiv = document.createElement('div');
        messageDiv.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(0, 0, 0, 0.8);
            color: #FFD700;
            padding: 1rem 2rem;
            border-radius: 10px;
            border: 2px solid #FFD700;
            font-size: 1.2rem;
            z-index: 1000;
            animation: fadeInOut 3s ease-in-out;
        `;
        messageDiv.textContent = message;
        document.body.appendChild(messageDiv);
        
        setTimeout(() => {
            document.body.removeChild(messageDiv);
        }, 3000);
    }

    updateUI() {
        const stats = window.avalancheIntegration.playerStats;
        
        document.getElementById('player-coins').textContent = Math.floor(stats.coins);
        document.getElementById('player-energy').textContent = stats.energy;
        document.getElementById('player-streak').textContent = stats.streak;
        document.getElementById('player-points').textContent = stats.points;
        
        // Update energy bar color
        const energyElement = document.getElementById('player-energy');
        if (stats.energy < 20) {
            energyElement.classList.add('energy-low');
        } else {
            energyElement.classList.remove('energy-low');
        }
    }

    startGame() {
        this.gameState = 'playing';
        this.updateUI();
    }

    pauseGame() {
        this.gameState = 'paused';
    }

    resumeGame() {
        this.gameState = 'playing';
    }
}

// Initialize game
window.cryptoIslandGame = new CryptoIslandGame();
