import * as faceapi from 'face-api.js';

class FaceModelService {
    constructor() {
        this.isLoaded = false;
        this.loadingPromise = null;
    }

    async loadModels() {
        // If already loaded, return immediately
        if (this.isLoaded) return true;

        // If currently loading, return the existing promise to avoid duplicate loads
        if (this.loadingPromise) {
            return this.loadingPromise;
        }

        // Start loading (only once per instance)
        this.loadingPromise = (async () => {
            try {
                console.log('FaceModelService: Starting parallel model loading...');
                const startTime = performance.now();
                await Promise.all([
                    faceapi.nets.ssdMobilenetv1.loadFromUri('/models'),
                    faceapi.nets.faceLandmark68Net.loadFromUri('/models'),
                    faceapi.nets.faceRecognitionNet.loadFromUri('/models'),
                ]);
                this.isLoaded = true;
                const loadTime = performance.now() - startTime;
                console.log(`FaceModelService: Models loaded successfully in ${loadTime.toFixed(2)}ms`);

                // Automatically trigger warm-up after loading
                this.warmUp();

                return true;
            } catch (error) {
                console.error('FaceModelService: Failed to load models:', error);
                // Reset loading promise on error so it can be retried
                this.loadingPromise = null;
                throw error;
            }
        })();

        return this.loadingPromise;
    }

    async warmUp() {
        if (!this.isLoaded) return;

        try {
            console.log('FaceModelService: Warming up models...');
            const startTime = performance.now();

            // Create a dummy tensor (small black image) to initialize the WebGL backend
            // Using a tensor directly avoids DOM element creation overhead
            // 3D tensor: [height, width, channels] - standard for face-api
            const dummyTensor = faceapi.tf.zeros([150, 150, 3]);

            // Run a dummy detection + landmark + descriptor pass
            // This forces shader compilation for all networks we use
            await faceapi.detectSingleFace(dummyTensor, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.1 }))
                .withFaceLandmarks()
                .withFaceDescriptor();

            dummyTensor.dispose();

            const warmUpTime = performance.now() - startTime;
            console.log(`FaceModelService: Warm-up completed in ${warmUpTime.toFixed(2)}ms`);
        } catch (error) {
            // Warm-up failure shouldn't stop the app, but log it
            console.warn('FaceModelService: Warm-up failed (non-critical):', error);
        }
    }
}

// Create singleton instance
const faceModelService = new FaceModelService();

// Start loading models immediately on module import (non-blocking)
faceModelService.loadModels().catch(err => {
    console.warn('FaceModelService: Background loading failed (will retry on demand):', err);
});

export default faceModelService;
