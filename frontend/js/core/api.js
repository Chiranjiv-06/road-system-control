/**
 * Road System Control - Core API Configuration & Client
 * Centralized API endpoints, health checking, and request helpers.
 */
(function(window) {
    'use strict';

    const API_BASE_URL = "http://127.0.0.1:8000/api";

    /**
     * Check backend health and update system status badge
     */
    async function checkBackendHealth() {
        const systemStatusIndicator = document.getElementById('systemStatusIndicator');
        const systemStatusText = document.getElementById('systemStatusText');

        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 3500);

            const response = await fetch(`${API_BASE_URL}/health`, {
                method: 'GET',
                signal: controller.signal
            });
            clearTimeout(timeoutId);

            if (response.ok) {
                const data = await response.json();
                if (data.status === 'ok') {
                    if (systemStatusIndicator) {
                        systemStatusIndicator.classList.remove('offline');
                        systemStatusIndicator.title = "Connected to FastAPI & PostgreSQL (Online)";
                    }
                    if (systemStatusText) {
                        systemStatusText.textContent = "System Operational";
                    }
                    return true;
                }
            }
            throw new Error(`Server returned status: ${response.status}`);
        } catch (error) {
            if (systemStatusIndicator) {
                systemStatusIndicator.classList.add('offline');
                systemStatusIndicator.title = "Cannot connect to FastAPI server at " + API_BASE_URL;
            }
            if (systemStatusText) {
                systemStatusText.textContent = "Backend Offline";
            }
            return false;
        }
    }

    /**
     * Reusable API request helper with auth token forwarding
     */
    async function apiRequest(endpoint, options = {}) {
        const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`;
        const headers = options.headers || {};

        if (window.getAuthHeaders && typeof window.getAuthHeaders === 'function') {
            Object.assign(headers, window.getAuthHeaders(headers));
        }

        const response = await fetch(url, {
            ...options,
            headers
        });

        return response;
    }

    const API = {
        BASE_URL: API_BASE_URL,
        checkBackendHealth,
        request: apiRequest
    };

    window.API_BASE_URL = API_BASE_URL;
    window.checkBackendHealth = checkBackendHealth;
    window.API = API;
})(window);
