import * as faceapi from 'face-api.js';

class FaceModelService {
    constructor() {
        this.isLoaded = false;
        this.loadingPromise = null;
    }

    async loadModels() {
        // If already loaded, return immediately
        if (this.isLoaded) return true;

        // If currently loading, return the existing promise
        if (this.loadingPromise) return this.loadingPromise;

        // Start loading
        this.loadingPromise = (async () => {
            try {
                console.log('FaceModelService: Starting parallel model loading...');
                await Promise.all([
                    faceapi.nets.ssdMobilenetv1.loadFromUri('/models'),
                    faceapi.nets.faceLandmark68Net.loadFromUri('/models'),
                    faceapi.nets.faceRecognitionNet.loadFromUri('/models'),
                ]);
                this.isLoaded = true;
                this.loadingPromise = null;
                console.log('FaceModelService: Models loaded successfully');
                return true;
            } catch (error) {
                console.error('FaceModelService: Failed to load models:', error);
                this.loadingPromise = null;
                throw error;
            }
        })();

        return this.loadingPromise;
    }
}

export default new FaceModelService();
