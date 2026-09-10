/**
 * Road System Control — Phase 1 Frontend Logic
 * Vanilla JavaScript: Navigation state, section switching, mobile drawer, and UI feedback
 */

document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Elements ---
    const sidebar = document.getElementById('sidebar');
    const mobileMenuBtn = document.getElementById('mobileMenuBtn');
    const sidebarCloseBtn = document.getElementById('sidebarCloseBtn');
    const sidebarBackdrop = document.getElementById('sidebarBackdrop');
    const navItems = document.querySelectorAll('.nav-item');
    const viewSections = document.querySelectorAll('.view-section');
    const activeSectionTitle = document.getElementById('activeSectionTitle');
    const toast = document.getElementById('toastNotification');
    const quickActionBtns = document.querySelectorAll('.quick-action-btn');

    // Section Titles Mapping
    const titlesMap = {
        'dashboard': 'Dashboard Overview',
        'report-issue': 'Report Road Issue',
        'traffic-monitoring': 'Traffic Monitoring',
        'emergency-alerts': 'Emergency Alerts',
        'map': 'Interactive Road Map',
        'admin': 'Administration & Roles'
    };

    /**
     * Display a simple non-intrusive toast notification
     * @param {string} message 
     */
    let toastTimeout = null;
    function showToast(message) {
        if (!toast) return;
        toast.textContent = message;
        toast.classList.add('show');
        
        clearTimeout(toastTimeout);
        toastTimeout = setTimeout(() => {
            toast.classList.remove('show');
        }, 2800);
    }

    /**
     * Switch the visible section
     * @param {string} sectionKey 
     */
    function switchSection(sectionKey) {
        // Update navigation active class
        navItems.forEach(item => {
            if (item.dataset.section === sectionKey) {
                item.classList.add('active');
            } else {
                item.classList.remove('active');
            }
        });

        // Update displayed section
        viewSections.forEach(section => {
            if (section.id === `section-${sectionKey}`) {
                section.classList.add('active');
            } else {
                section.classList.remove('active');
            }
        });

        // Update top header title
        if (activeSectionTitle && titlesMap[sectionKey]) {
            activeSectionTitle.textContent = titlesMap[sectionKey];
        }

        // Close mobile drawer if open
        closeMobileSidebar();
    }

    /**
     * Mobile Navigation Drawer Controls
     */
    function openMobileSidebar() {
        if (sidebar && sidebarBackdrop) {
            sidebar.classList.add('open');
            sidebarBackdrop.classList.add('active');
        }
    }

    function closeMobileSidebar() {
        if (sidebar && sidebarBackdrop) {
            sidebar.classList.remove('open');
            sidebarBackdrop.classList.remove('active');
        }
    }

    // Sidebar navigation link clicks
    navItems.forEach(item => {
        item.addEventListener('click', (event) => {
            event.preventDefault();
            const targetSection = item.dataset.section;
            if (targetSection) {
                switchSection(targetSection);
            }
        });
    });

    // Mobile menu toggle triggers
    if (mobileMenuBtn) {
        mobileMenuBtn.addEventListener('click', openMobileSidebar);
    }

    if (sidebarCloseBtn) {
        sidebarCloseBtn.addEventListener('click', closeMobileSidebar);
    }

    if (sidebarBackdrop) {
        sidebarBackdrop.addEventListener('click', closeMobileSidebar);
    }

    // Quick action buttons handler
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
                    switchSection('emergency-alerts');
                    break;
                case 'back-to-dashboard':
                    switchSection('dashboard');
                    break;
                case 'emergency-details':
                    showToast('Emergency Incident #EM-4091: Response units ETA 6 mins.');
                    break;
                default:
                    showToast('Action triggered (UI Preview)');
            }
        });
    });
});
