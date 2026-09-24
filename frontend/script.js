/**
 * Road System Control — Main Application Orchestrator & Bootstrap
 *
 * Coordinates lifecycle startup across modular components:
 * - Core infrastructure (State, Utils, API, Auth)
 * - Domain modules (Dashboard, Issues, Traffic, Emergencies, Violations,
 *   Analytics, Risk, Map, Notifications, Work Orders, Admin)
 * - Background health checks and periodic telemetry polling loops
 */

document.addEventListener('DOMContentLoaded', () => {
    'use strict';

    // 1. Initialize DOM event listeners across all domain modules
    if (window.Auth && typeof window.Auth.init === 'function') {
        window.Auth.init();
    }
    if (window.DashboardModule && typeof window.DashboardModule.init === 'function') {
        window.DashboardModule.init();
    }
    if (window.IssuesModule && typeof window.IssuesModule.init === 'function') {
        window.IssuesModule.init();
    }
    if (window.TrafficModule && typeof window.TrafficModule.init === 'function') {
        window.TrafficModule.init();
    }
    if (window.EmergencyAlerts && typeof window.EmergencyAlerts.init === 'function') {
        window.EmergencyAlerts.init();
    }
    if (window.ViolationsModule && typeof window.ViolationsModule.init === 'function') {
        window.ViolationsModule.init();
    }
    if (window.AnalyticsModule && typeof window.AnalyticsModule.init === 'function') {
        window.AnalyticsModule.init();
    }
    if (window.RiskModule && typeof window.RiskModule.init === 'function') {
        window.RiskModule.init();
    }
    if (window.MapModule && typeof window.MapModule.init === 'function') {
        window.MapModule.init();
    }
    if (window.NotificationsModule && typeof window.NotificationsModule.init === 'function') {
        window.NotificationsModule.init();
    }
    if (window.WorkOrdersModule && typeof window.WorkOrdersModule.init === 'function') {
        window.WorkOrdersModule.init();
    }
    if (window.AdminModule && typeof window.AdminModule.init === 'function') {
        window.AdminModule.init();
    }

    // 2. Restore authenticated operator session from storage
    if (window.restoreSession) {
        window.restoreSession();
    }

    // 3. Initial system health check and eager data preloads
    if (window.checkBackendHealth) window.checkBackendHealth();
    if (window.loadIssues) window.loadIssues(true);
    if (window.loadTraffic) window.loadTraffic(true);
    if (window.loadAlerts) window.loadAlerts(true);
    if (window.loadViolations) window.loadViolations(true);
    if (window.loadAnalytics) window.loadAnalytics(true);
    if (window.loadRisk) window.loadRisk(true);
    if (window.loadNotificationsSummary) window.loadNotificationsSummary();
    if (window.loadWorkOrdersSummary) window.loadWorkOrdersSummary();

    // 4. Periodic health check every 15 seconds to monitor FastAPI connection
    setInterval(() => {
        if (window.checkBackendHealth) window.checkBackendHealth();
    }, 15000);

    // 5. Periodic telemetry polling every 30 seconds for active view sections
    setInterval(() => {
        const activeSection = window.AppState ? window.AppState.getCurrentSection() : window.currentActiveSection;

        // Traffic telemetry polling
        if (window.TrafficModule && !window.TrafficModule.isFetching() &&
            (activeSection === 'dashboard' || activeSection === 'traffic-monitoring')) {
            window.TrafficModule.loadTraffic(false);
        }

        // Emergency alerts polling
        const emg = window.EmergencyAlerts;
        const isFetchingAlerts = emg ? emg.isFetching() : false;
        if (!isFetchingAlerts && (activeSection === 'dashboard' || activeSection === 'emergency-alerts')) {
            if (window.loadAlerts) window.loadAlerts(false);
        }

        // Traffic violations polling
        if (window.ViolationsModule && !window.ViolationsModule.isFetching() &&
            (activeSection === 'dashboard' || activeSection === 'traffic-violations')) {
            window.ViolationsModule.loadViolations(false);
        }

        // Analytics intelligence polling
        if (window.AnalyticsModule && !window.AnalyticsModule.isFetching() && activeSection === 'analytics') {
            window.AnalyticsModule.loadAnalytics(false);
        }

        // Risk intelligence polling
        if (window.RiskModule && !window.RiskModule.isFetching() &&
            (activeSection === 'risk' || activeSection === 'dashboard')) {
            window.RiskModule.loadRisk(false);
        }

        // GIS map overview polling
        if (window.MapModule && !window.MapModule.isFetching() && activeSection === 'map') {
            window.MapModule.loadMapData(false);
        }

        // Notifications summary & feed polling
        if (window.NotificationsModule && !window.NotificationsModule.isFetching()) {
            window.NotificationsModule.loadNotificationsSummary();
            if (activeSection === 'notifications') {
                window.NotificationsModule.loadNotifications(false);
            }
        }

        // Work orders summary & list polling
        if (window.WorkOrdersModule && !window.WorkOrdersModule.isFetching()) {
            window.WorkOrdersModule.loadWorkOrdersSummary();
            if (activeSection === 'work-orders') {
                window.WorkOrdersModule.loadWorkOrders(false);
            }
        }
    }, 30000);
});
