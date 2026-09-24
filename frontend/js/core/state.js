/**
 * Road System Control - Core Application State
 * Centralized state management for application section navigation and runtime metadata.
 */
(function(window) {
    'use strict';

    const titlesMap = {
        'dashboard': 'System Operations Dashboard',
        'report-issue': 'Report Infrastructure Issue',
        'view-issues': 'Road Infrastructure Registry',
        'traffic-monitoring': 'Live Traffic Congestion Telemetry',
        'emergency-alerts': 'Emergency Alert & Hazard Command',
        'traffic-violations': 'Traffic Violations & Automated Enforcement',
        'analytics': 'Traffic Analytics & Predictive Intelligence',
        'risk': 'AI Risk & Accident Probability Intelligence',
        'map': 'Live GIS Command Center & Operations Map',
        'notifications': 'Real-Time Operational Notifications Feed',
        'work-orders': 'Field Work Orders & Incident Dispatch',
        'admin': 'Administration & Operator Roles'
    };

    const AppState = {
        currentActiveSection: 'dashboard',
        isAppInitialized: false,

        getCurrentSection() {
            return this.currentActiveSection;
        },

        setCurrentSection(sectionKey) {
            this.currentActiveSection = sectionKey;
        },

        getSectionTitle(sectionKey) {
            return titlesMap[sectionKey] || 'Road System Control';
        },

        getAllTitles() {
            return { ...titlesMap };
        }
    };

    window.AppState = AppState;
    // Backwards-compatibility getter for script.js
    Object.defineProperty(window, 'currentActiveSection', {
        get: () => AppState.currentActiveSection,
        set: (val) => { AppState.currentActiveSection = val; },
        configurable: true
    });
})(window);
