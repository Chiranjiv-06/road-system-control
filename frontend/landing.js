/**
 * Road System Control — Professional Municipal Operations Landing Script
 * frontend/landing.js
 *
 * Provides:
 * 1. Interface Preview tab switching (Dashboard Overview, Emergency, Traffic, Risk, Map, Work Orders)
 * 2. Operator Sign-In modal handling with demo role auto-fill and /api/auth/login authentication
 * 3. Session state detection (reflecting active authentication in button labels)
 * 4. Keyboard accessibility & smooth anchor interactions
 */

(function () {
    'use strict';

    // API Base URL - matches dashboard configuration
    const API_BASE_URL = 'http://127.0.0.1:8000/api';

    // Demo credentials matching backend database seeding and auth.js
    const DEMO_CREDENTIALS = {
        'ADMIN': { u: 'admin', p: 'AdminPassword@123', label: 'Administrator' },
        'TRAFFIC_OPERATOR': { u: 'traffic_op', p: 'TrafficPassword@123', label: 'Traffic Operator' },
        'EMERGENCY_OPERATOR': { u: 'emergency_op', p: 'EmergencyPassword@123', label: 'Emergency Operator' },
        'ROAD_INSPECTOR': { u: 'road_insp', p: 'InspectorPassword@123', label: 'Road Inspector' }
    };

    // Tab titles for Section 5 (Interface Preview)
    const TAB_TITLES = {
        'overview': 'Dashboard Overview — Unified Operations Status',
        'emergency': 'Emergency Alerts — Priority Incident Response',
        'traffic': 'Traffic Monitoring — Arterial Corridors Telemetry',
        'risk': 'Risk Intelligence — Deterministic Risk Scoring Model',
        'map': 'Operations Map — Municipal GIS Geographic Context',
        'workorders': 'Work Orders — Field Remediation Lifecycle Queue'
    };

    /* ==========================================================================
       1. INTERFACE PREVIEW TAB SWITCHER (Section 5)
       ========================================================================== */
    function initInterfaceTabs() {
        const tabButtons = document.querySelectorAll('.preview-tab-btn');
        const tabPanels = document.querySelectorAll('.preview-panel-view');
        const tabTitleEl = document.getElementById('previewTabTitle');

        if (!tabButtons.length || !tabPanels.length) return;

        tabButtons.forEach(btn => {
            btn.addEventListener('click', function () {
                const targetTab = this.getAttribute('data-tab');
                if (!targetTab) return;

                // Update active button state
                tabButtons.forEach(b => {
                    b.classList.remove('active');
                    b.setAttribute('aria-selected', 'false');
                });
                this.classList.add('active');
                this.setAttribute('aria-selected', 'true');

                // Switch visible panel
                tabPanels.forEach(panel => {
                    panel.classList.remove('active');
                });

                const targetPanel = document.getElementById('tab-' + targetTab);
                if (targetPanel) {
                    targetPanel.classList.add('active');
                }

                // Update panel title
                if (tabTitleEl && TAB_TITLES[targetTab]) {
                    tabTitleEl.textContent = TAB_TITLES[targetTab];
                }
            });
        });
    }

    /* ==========================================================================
       2. OPERATOR SIGN-IN MODAL & DEMO CREDENTIALS
       ========================================================================== */
    function initLoginModal() {
        const modal = document.getElementById('operatorLoginModal');
        const openBtn = document.getElementById('navLoginBtn');
        const closeBtn = document.getElementById('modalCloseBtn');
        const cancelBtn = document.getElementById('modalCancelBtn');
        const form = document.getElementById('operatorLoginForm');
        const usernameInput = document.getElementById('loginUsername');
        const passwordInput = document.getElementById('loginPassword');
        const submitBtn = document.getElementById('modalSubmitBtn');
        const errorBanner = document.getElementById('loginErrorBanner');
        const demoRoleBtns = document.querySelectorAll('.demo-role-btn');

        if (!modal) return;

        function openModal() {
            modal.style.display = 'flex';
            if (errorBanner) {
                errorBanner.style.display = 'none';
                errorBanner.textContent = '';
            }
            if (usernameInput) {
                usernameInput.focus();
            }
        }

        function closeModal() {
            modal.style.display = 'none';
            if (errorBanner) {
                errorBanner.style.display = 'none';
                errorBanner.textContent = '';
            }
        }

        if (openBtn) {
            openBtn.addEventListener('click', openModal);
        }

        if (closeBtn) {
            closeBtn.addEventListener('click', closeModal);
        }

        if (cancelBtn) {
            cancelBtn.addEventListener('click', closeModal);
        }

        // Close on backdrop click
        modal.addEventListener('click', function (e) {
            if (e.target === modal) {
                closeModal();
            }
        });

        // Close on Escape key
        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape' && modal.style.display === 'flex') {
                closeModal();
            }
        });

        // Handle Demo Role Buttons Auto-fill
        demoRoleBtns.forEach(btn => {
            btn.addEventListener('click', function () {
                const roleKey = this.getAttribute('data-role');
                if (roleKey && DEMO_CREDENTIALS[roleKey]) {
                    demoRoleBtns.forEach(b => b.classList.remove('active'));
                    this.classList.add('active');

                    if (usernameInput) usernameInput.value = DEMO_CREDENTIALS[roleKey].u;
                    if (passwordInput) passwordInput.value = DEMO_CREDENTIALS[roleKey].p;

                    if (errorBanner) {
                        errorBanner.style.display = 'none';
                    }
                }
            });
        });

        // Handle Login Submission
        if (form) {
            form.addEventListener('submit', async function (e) {
                e.preventDefault();

                const username = usernameInput ? usernameInput.value.trim() : '';
                const password = passwordInput ? passwordInput.value : '';

                if (!username || !password) {
                    if (errorBanner) {
                        errorBanner.textContent = 'Please enter both username and password.';
                        errorBanner.style.display = 'block';
                    }
                    return;
                }

                if (submitBtn) {
                    submitBtn.disabled = true;
                    submitBtn.textContent = 'Authenticating...';
                }
                if (errorBanner) {
                    errorBanner.style.display = 'none';
                }

                try {
                    // Attempt auth with FastAPI backend
                    let response;
                    try {
                        response = await fetch(`${API_BASE_URL}/auth/login`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ username, password })
                        });
                    } catch (netErr) {
                        // Fallback to relative URL if served under same host
                        response = await fetch('/api/auth/login', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ username, password })
                        });
                    }

                    if (response && response.ok) {
                        const data = await response.json();
                        // Persist session token matching dashboard auth system
                        sessionStorage.setItem('rsc_auth_token', data.access_token);
                        if (data.user) {
                            sessionStorage.setItem('rsc_user', JSON.stringify(data.user));
                        }

                        // Redirect to the main dashboard control center
                        window.location.href = 'index.html';
                    } else if (response && response.status === 401) {
                        if (errorBanner) {
                            errorBanner.textContent = 'Invalid credentials. Please verify username and password.';
                            errorBanner.style.display = 'block';
                        }
                    } else {
                        if (errorBanner) {
                            errorBanner.textContent = `Authentication service error (${response ? response.status : 'offline'}). Ensure backend server is running.`;
                            errorBanner.style.display = 'block';
                        }
                    }
                } catch (err) {
                    console.error('Sign in error:', err);
                    if (errorBanner) {
                        errorBanner.textContent = 'Unable to connect to backend server at http://127.0.0.1:8000. Ensure FastAPI server is running.';
                        errorBanner.style.display = 'block';
                    }
                } finally {
                    if (submitBtn) {
                        submitBtn.disabled = false;
                        submitBtn.textContent = 'Sign In & Launch →';
                    }
                }
            });
        }
    }

    /* ==========================================================================
       3. SESSION STATE CHECK
       ========================================================================== */
    function checkActiveSession() {
        try {
            const token = sessionStorage.getItem('rsc_auth_token');
            if (token) {
                // Update CTA buttons to indicate active session
                const enterBtns = [
                    document.getElementById('navEnterCta'),
                    document.getElementById('heroEnterBtn'),
                    document.getElementById('footerEnterCta')
                ];

                enterBtns.forEach(btn => {
                    if (btn) {
                        btn.innerHTML = 'Go to Dashboard &rarr;';
                    }
                });

                const navLoginBtn = document.getElementById('navLoginBtn');
                if (navLoginBtn) {
                    navLoginBtn.innerHTML = 'Switch Operator';
                }
            }
        } catch (e) {
            // sessionStorage might be restricted in some iframe contexts
        }
    }

    /* ==========================================================================
       4. INITIALIZATION
       ========================================================================== */
    document.addEventListener('DOMContentLoaded', function () {
        initInterfaceTabs();
        initLoginModal();
        checkActiveSession();
    });

})();
