/**
 * Road System Control - Core Utilities
 * Shared helper functions: sanitization, time formatting, toast notifications, and badge renderers.
 */
(function(window) {
    'use strict';

    let toastTimeout = null;

    /**
     * Escape HTML helper to prevent XSS
     */
    function escapeHtml(str) {
        if (!str) return '';
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    /**
     * Get current date-time string formatted for <input type="datetime-local">
     */
    function getLocalDateTimeString(dateObj = new Date()) {
        const offset = dateObj.getTimezoneOffset() * 60000;
        return (new Date(dateObj.getTime() - offset)).toISOString().slice(0, 16);
    }

    /**
     * Format timestamp into friendly relative time string (e.g. "10 min ago")
     */
    function formatTimeAgo(dateString) {
        if (!dateString) return 'Just now';
        const date = new Date(dateString);
        const now = new Date();
        const diffInSeconds = Math.floor((now - date) / 1000);

        if (isNaN(diffInSeconds) || diffInSeconds < 30) {
            return 'Just now';
        }
        if (diffInSeconds < 60) {
            return `${diffInSeconds}s ago`;
        }
        const diffInMinutes = Math.floor(diffInSeconds / 60);
        if (diffInMinutes < 60) {
            return `${diffInMinutes} min ago`;
        }
        const diffInHours = Math.floor(diffInMinutes / 60);
        if (diffInHours < 24) {
            return `${diffInHours} hr ago`;
        }
        const diffInDays = Math.floor(diffInHours / 24);
        if (diffInDays < 7) {
            return `${diffInDays} d ago`;
        }
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }

    /**
     * Display toast notifications
     * @param {string} message 
     * @param {string} type 'default' | 'success' | 'error' | 'info'
     */
    function showToast(message, type = 'default') {
        const toast = document.getElementById('toastNotification');
        if (!toast) return;
        toast.textContent = message;
        toast.className = 'toast-notification show';
        
        if (type === 'success') {
            toast.classList.add('toast-success');
        } else if (type === 'error') {
            toast.classList.add('toast-error');
        }

        clearTimeout(toastTimeout);
        toastTimeout = setTimeout(() => {
            toast.classList.remove('show');
        }, 3400);
    }

    /**
     * Helper to render appropriate issue severity badge HTML
     */
    function getSeverityBadge(severity) {
        switch (severity) {
            case 'Critical':
                return '<span class="badge badge-danger">Critical</span>';
            case 'High':
                return '<span class="badge badge-warning">High</span>';
            case 'Medium':
                return '<span class="badge badge-neutral">Medium</span>';
            case 'Low':
                return '<span class="badge badge-info">Low</span>';
            default:
                return `<span class="badge badge-neutral">${escapeHtml(severity)}</span>`;
        }
    }

    /**
     * Helper to render appropriate issue status badge HTML
     */
    function getStatusBadge(status) {
        switch (status) {
            case 'Reported':
                return '<span class="badge badge-info">Reported</span>';
            case 'Under Review':
                return '<span class="badge badge-warning-soft">Under Review</span>';
            case 'In Progress':
                return '<span class="badge badge-purple">In Progress</span>';
            case 'Resolved':
                return '<span class="badge badge-success">Resolved</span>';
            default:
                return `<span class="badge badge-neutral">${escapeHtml(status)}</span>`;
        }
    }

    /**
     * Helper to render congestion level badge HTML
     */
    function getCongestionBadge(level) {
        switch (level) {
            case 'Severe':
                return '<span class="traffic-pill pill-severe">Severe</span>';
            case 'Heavy':
                return '<span class="traffic-pill pill-heavy">Heavy</span>';
            case 'Moderate':
                return '<span class="traffic-pill pill-moderate">Moderate</span>';
            case 'Low':
                return '<span class="traffic-pill pill-low">Low</span>';
            default:
                return `<span class="traffic-pill pill-low">${escapeHtml(level)}</span>`;
        }
    }

    /**
     * Helper to render traffic status badge HTML
     */
    function getTrafficStatusBadge(status) {
        switch (status) {
            case 'Clear':
                return '<span class="badge badge-success">Clear</span>';
            case 'Moving':
                return '<span class="badge badge-info">Moving</span>';
            case 'Congested':
                return '<span class="badge badge-warning">Congested</span>';
            case 'Blocked':
                return '<span class="badge badge-danger">Blocked</span>';
            default:
                return `<span class="badge badge-neutral">${escapeHtml(status)}</span>`;
        }
    }

    /**
     * Helper to render emergency alert severity badge HTML (delegates to module if available)
     */
    function getAlertSeverityBadge(severity) {
        if (window.EmergencyAlerts && typeof window.EmergencyAlerts.getAlertSeverityBadge === 'function') {
            return window.EmergencyAlerts.getAlertSeverityBadge(severity);
        }
        switch (severity) {
            case 'Critical':
                return '<span class="badge badge-danger">Critical</span>';
            case 'High':
                return '<span class="badge badge-warning">High</span>';
            case 'Medium':
                return '<span class="badge badge-neutral">Medium</span>';
            case 'Low':
                return '<span class="badge badge-info">Low</span>';
            default:
                return `<span class="badge badge-neutral">${escapeHtml(severity)}</span>`;
        }
    }

    /**
     * Helper to render emergency alert status badge HTML (delegates to module if available)
     */
    function getAlertStatusBadge(status) {
        if (window.EmergencyAlerts && typeof window.EmergencyAlerts.getAlertStatusBadge === 'function') {
            return window.EmergencyAlerts.getAlertStatusBadge(status);
        }
        switch (status) {
            case 'Active':
                return '<span class="badge badge-danger">Active</span>';
            case 'Investigating':
                return '<span class="badge badge-warning-soft">Investigating</span>';
            case 'Resolved':
                return '<span class="badge badge-success">Resolved</span>';
            default:
                return `<span class="badge badge-neutral">${escapeHtml(status)}</span>`;
        }
    }

    const Utils = {
        escapeHtml,
        getLocalDateTimeString,
        formatTimeAgo,
        showToast,
        getSeverityBadge,
        getStatusBadge,
        getCongestionBadge,
        getTrafficStatusBadge,
        getAlertSeverityBadge,
        getAlertStatusBadge
    };

    window.Utils = Utils;
    window.escapeHtml = escapeHtml;
    window.getLocalDateTimeString = getLocalDateTimeString;
    window.formatTimeAgo = formatTimeAgo;
    window.showToast = showToast;
    window.getSeverityBadge = getSeverityBadge;
    window.getStatusBadge = getStatusBadge;
    window.getCongestionBadge = getCongestionBadge;
    window.getTrafficStatusBadge = getTrafficStatusBadge;
    window.getAlertSeverityBadge = getAlertSeverityBadge;
    window.getAlertStatusBadge = getAlertStatusBadge;
})(window);
