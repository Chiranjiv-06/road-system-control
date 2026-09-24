/**
 * Road System Control - System Operations Dashboard Module
 * View switching orchestration, section header synchronization, responsive mobile drawer, and quick actions.
 */
(function(window) {
    'use strict';

    function switchSection(sectionKey) {
        if (window.AppState) {
            window.AppState.setCurrentSection(sectionKey);
        } else {
            window.currentActiveSection = sectionKey;
        }

        const navItems = document.querySelectorAll('.nav-item');
        const viewSections = document.querySelectorAll('.view-section');
        const activeSectionTitle = document.getElementById('activeSectionTitle');

        navItems.forEach(item => {
            if (item.dataset.section === sectionKey) {
                item.classList.add('active');
            } else {
                item.classList.remove('active');
            }
        });

        viewSections.forEach(section => {
            if (section.id === `section-${sectionKey}`) {
                section.classList.add('active');
            } else {
                section.classList.remove('active');
            }
        });

        if (activeSectionTitle && window.AppState) {
            activeSectionTitle.textContent = window.AppState.getSectionTitle(sectionKey);
        }

        // Lazy loads / section-specific triggers
        if (sectionKey === 'traffic-monitoring' || sectionKey === 'dashboard') {
            if (window.TrafficModule && window.TrafficModule.getState().length === 0 && !window.TrafficModule.isFetching()) {
                window.TrafficModule.loadTraffic(true);
            }
        }
        if (sectionKey === 'emergency-alerts' || sectionKey === 'dashboard') {
            const emg = window.EmergencyAlerts;
            const isFetching = emg ? emg.isFetching() : false;
            const alertCount = emg ? emg.getState().length : 0;
            if (alertCount === 0 && !isFetching && window.loadAlerts) {
                window.loadAlerts(true);
            }
        }
        if (sectionKey === 'traffic-violations' || sectionKey === 'dashboard') {
            if (window.ViolationsModule && window.ViolationsModule.getState().length === 0 && !window.ViolationsModule.isFetching()) {
                window.ViolationsModule.loadViolations(true);
            }
        }
        if (sectionKey === 'analytics') {
            if (window.AnalyticsModule) window.AnalyticsModule.loadAnalytics(false);
        }
        if (sectionKey === 'risk') {
            if (window.RiskModule) window.RiskModule.loadRisk(false);
        }
        if (sectionKey === 'admin') {
            if (window.checkAdminSectionAccess) window.checkAdminSectionAccess();
            else if (window.AdminModule && window.AdminModule.checkAdminSectionAccess) window.AdminModule.checkAdminSectionAccess();
        }
        if (sectionKey === 'map') {
            if (window.MapModule) {
                window.MapModule.initOperationsMap();
                window.MapModule.loadMapData(false);
                setTimeout(() => {
                    const map = window.MapModule.getMap();
                    if (map) map.invalidateSize();
                }, 250);
            }
        }
        if (sectionKey === 'notifications') {
            if (window.NotificationsModule) {
                window.NotificationsModule.loadNotifications(false);
                window.NotificationsModule.loadNotificationsSummary();
            }
        }
        if (sectionKey === 'work-orders') {
            if (window.WorkOrdersModule) {
                window.WorkOrdersModule.loadWorkOrders(false);
                window.WorkOrdersModule.loadWorkOrdersSummary();
            }
        }

        window.scrollTo({ top: 0, behavior: 'smooth' });
        closeMobileSidebar();
    }

    function openMobileSidebar() {
        const sidebar = document.getElementById('sidebar');
        const sidebarBackdrop = document.getElementById('sidebarBackdrop');
        if (sidebar && sidebarBackdrop) {
            sidebar.classList.add('open');
            sidebarBackdrop.classList.add('active');
        }
    }

    function closeMobileSidebar() {
        const sidebar = document.getElementById('sidebar');
        const sidebarBackdrop = document.getElementById('sidebarBackdrop');
        if (sidebar && sidebarBackdrop) {
            sidebar.classList.remove('open');
            sidebarBackdrop.classList.remove('active');
        }
    }

    function initDashboardListeners() {
        const navItems = document.querySelectorAll('.nav-item');
        const mobileMenuBtn = document.getElementById('mobileMenuBtn');
        const sidebarCloseBtn = document.getElementById('sidebarCloseBtn');
        const sidebarBackdrop = document.getElementById('sidebarBackdrop');
        const quickActionBtns = document.querySelectorAll('.btn-quick-action, [data-action]');
        const toast = window.showToast || console.log;

        navItems.forEach(item => {
            item.addEventListener('click', (event) => {
                event.preventDefault();
                const targetSection = item.dataset.section;
                if (targetSection) {
                    switchSection(targetSection);
                }
            });
        });

        if (mobileMenuBtn) mobileMenuBtn.addEventListener('click', openMobileSidebar);
        if (sidebarCloseBtn) sidebarCloseBtn.addEventListener('click', closeMobileSidebar);
        if (sidebarBackdrop) sidebarBackdrop.addEventListener('click', closeMobileSidebar);

        quickActionBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const action = btn.dataset.action;
                switch (action) {
                    case 'nav-report':
                        switchSection('report-issue');
                        break;
                    case 'nav-traffic':
                        switchSection('traffic-monitoring');
                        break;
                    case 'nav-map':
                        switchSection('map');
                        break;
                    case 'nav-emergency':
                    case 'emergency-details':
                        switchSection('emergency-alerts');
                        break;
                    case 'nav-violations':
                        switchSection('traffic-violations');
                        break;
                    case 'nav-analytics':
                        switchSection('analytics');
                        break;
                    case 'nav-risk':
                        switchSection('risk');
                        break;
                    case 'nav-work-orders':
                        switchSection('work-orders');
                        break;
                    case 'back-to-dashboard':
                        switchSection('dashboard');
                        break;
                    default:
                        toast('Action triggered');
                }
            });
        });
    }

    const DashboardModule = {
        switchSection,
        openMobileSidebar,
        closeMobileSidebar,
        init: initDashboardListeners
    };

    window.DashboardModule = DashboardModule;
    window.switchSection = switchSection;
    window.openMobileSidebar = openMobileSidebar;
    window.closeMobileSidebar = closeMobileSidebar;
})(window);
