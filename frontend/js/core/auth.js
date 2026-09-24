/**
 * Road System Control - Core Authentication & Session Management
 * JWT session persistence, RBAC roles, login modal, and authentication state.
 */
(function(window) {
    'use strict';

    let authState = {
        token: (typeof sessionStorage !== 'undefined' && sessionStorage.getItem('rsc_auth_token')) || null,
        user: null
    };

    const demoCredentials = {
        'ADMIN': { u: 'admin', p: 'AdminPassword@123' },
        'TRAFFIC_OPERATOR': { u: 'traffic_op', p: 'TrafficPassword@123' },
        'EMERGENCY_OPERATOR': { u: 'emergency_op', p: 'EmergencyPassword@123' },
        'ROAD_INSPECTOR': { u: 'road_insp', p: 'InspectorPassword@123' }
    };

    function getAuthHeaders(extraHeaders = {}) {
        const headers = { 'Content-Type': 'application/json', ...extraHeaders };
        if (authState.token) {
            headers['Authorization'] = `Bearer ${authState.token}`;
        }
        return headers;
    }

    function getRoleBadge(role) {
        switch (role) {
            case 'ADMIN':
                return '<span class="role-badge badge-role-admin">ADMIN</span>';
            case 'TRAFFIC_OPERATOR':
                return '<span class="role-badge badge-role-traffic">TRAFFIC OP</span>';
            case 'EMERGENCY_OPERATOR':
                return '<span class="role-badge badge-role-emergency">EMERGENCY OP</span>';
            case 'ROAD_INSPECTOR':
                return '<span class="role-badge badge-role-inspector">INSPECTOR</span>';
            default:
                const escape = window.escapeHtml || ((s) => s);
                return `<span class="role-badge badge-role-guest">${escape(role || 'GUEST')}</span>`;
        }
    }

    function updateAuthUI() {
        const headerGuestState = document.getElementById('headerGuestState');
        const headerAuthenticatedState = document.getElementById('headerAuthenticatedState');
        const headerUserName = document.getElementById('headerUserName');
        const headerUserAvatar = document.getElementById('headerUserAvatar');
        const headerUserRoleBadge = document.getElementById('headerUserRoleBadge');

        if (authState.token && authState.user) {
            if (headerGuestState) headerGuestState.style.display = 'none';
            if (headerAuthenticatedState) headerAuthenticatedState.style.display = 'flex';

            if (headerUserName) headerUserName.textContent = authState.user.full_name || authState.user.username;
            if (headerUserAvatar) {
                const names = (authState.user.full_name || authState.user.username).trim().split(' ');
                headerUserAvatar.textContent = names.length > 1 ? (names[0][0] + names[1][0]).toUpperCase() : names[0].slice(0, 2).toUpperCase();
            }

            if (headerUserRoleBadge) {
                headerUserRoleBadge.textContent = authState.user.role;
                headerUserRoleBadge.className = `role-badge badge-role-${authState.user.role.toLowerCase().replace('_', '-')}`;
            }
        } else {
            if (headerGuestState) headerGuestState.style.display = 'flex';
            if (headerAuthenticatedState) headerAuthenticatedState.style.display = 'none';
        }

        const currentSection = window.AppState ? window.AppState.getCurrentSection() : window.currentActiveSection;
        if (currentSection === 'admin') {
            if (window.checkAdminSectionAccess) window.checkAdminSectionAccess();
            else if (window.AdminModule && window.AdminModule.checkAdminSectionAccess) window.AdminModule.checkAdminSectionAccess();
        }

        if (window.loadNotificationsSummary) {
            window.loadNotificationsSummary();
        }
        if (window.loadWorkOrdersSummary && authState.token) {
            window.loadWorkOrdersSummary();
        }
        if (currentSection === 'notifications' && window.loadNotifications) {
            window.loadNotifications(false);
        }
    }

    function openLoginModal(prefilledRole = null) {
        const loginModal = document.getElementById('loginModal');
        const loginErrorBanner = document.getElementById('loginErrorBanner');
        const loginUsernameInput = document.getElementById('loginUsernameInput');
        const demoRoleBtns = document.querySelectorAll('.demo-role-btn');

        if (!loginModal) return;
        if (loginErrorBanner) {
            loginErrorBanner.style.display = 'none';
            loginErrorBanner.textContent = '';
        }
        if (prefilledRole) {
            demoRoleBtns.forEach(btn => {
                if (btn.dataset.demoRole === prefilledRole) {
                    btn.click();
                }
            });
        }
        loginModal.style.display = 'flex';
        if (loginUsernameInput) loginUsernameInput.focus();
    }

    function closeLoginModal() {
        const loginModal = document.getElementById('loginModal');
        const loginForm = document.getElementById('loginForm');
        const loginErrorBanner = document.getElementById('loginErrorBanner');

        if (!loginModal) return;
        loginModal.style.display = 'none';
        if (loginForm) loginForm.reset();
        if (loginErrorBanner) {
            loginErrorBanner.style.display = 'none';
            loginErrorBanner.textContent = '';
        }
    }

    async function handleLogin(username, password) {
        const loginErrorBanner = document.getElementById('loginErrorBanner');
        const loginSubmitBtn = document.getElementById('loginSubmitBtn');
        const toast = window.showToast || console.log;
        const apiBase = window.API_BASE_URL || 'http://127.0.0.1:8000/api';

        if (!username || !password) {
            if (loginErrorBanner) {
                loginErrorBanner.textContent = "Please enter both username/email and password.";
                loginErrorBanner.style.display = 'block';
            }
            return;
        }

        if (loginSubmitBtn) {
            loginSubmitBtn.disabled = true;
            loginSubmitBtn.innerHTML = '<span class="spinner-inline"></span> Authenticating...';
        }
        if (loginErrorBanner) loginErrorBanner.style.display = 'none';

        try {
            const response = await fetch(`${apiBase}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });

            if (response.status === 200) {
                const data = await response.json();
                authState.token = data.access_token;
                authState.user = data.user;
                sessionStorage.setItem('rsc_auth_token', data.access_token);

                closeLoginModal();
                updateAuthUI();
                toast(`Welcome back, ${data.user.full_name} (${data.user.role})!`, 'success');
            } else if (response.status === 401) {
                if (loginErrorBanner) {
                    loginErrorBanner.textContent = "Invalid username or password. Please verify credentials.";
                    loginErrorBanner.style.display = 'block';
                }
            } else if (response.status === 403) {
                if (loginErrorBanner) {
                    loginErrorBanner.textContent = "Your operator account has been deactivated. Contact an administrator.";
                    loginErrorBanner.style.display = 'block';
                }
            } else {
                throw new Error(`Server returned status: ${response.status}`);
            }
        } catch (error) {
            console.error("Login failed:", error);
            if (loginErrorBanner) {
                loginErrorBanner.textContent = "Unable to connect to authentication service. Ensure FastAPI backend is active.";
                loginErrorBanner.style.display = 'block';
            }
        } finally {
            if (loginSubmitBtn) {
                loginSubmitBtn.disabled = false;
                loginSubmitBtn.innerHTML = `
                    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"></path><polyline points="10 17 15 12 10 7"></polyline><line x1="15" y1="12" x2="3" y2="12"></line></svg>
                    Sign In
                `;
            }
        }
    }

    async function handleLogout() {
        const apiBase = window.API_BASE_URL || 'http://127.0.0.1:8000/api';
        const toast = window.showToast || console.log;

        try {
            if (authState.token) {
                await fetch(`${apiBase}/auth/logout`, {
                    method: 'POST',
                    headers: getAuthHeaders()
                });
            }
        } catch (e) {
            // Ignore logout fetch errors
        }

        authState.token = null;
        authState.user = null;
        sessionStorage.removeItem('rsc_auth_token');
        updateAuthUI();
        toast("Signed out of operator session.", "default");
    }

    async function restoreSession() {
        const savedToken = sessionStorage.getItem('rsc_auth_token');
        if (!savedToken) return;
        const apiBase = window.API_BASE_URL || 'http://127.0.0.1:8000/api';

        try {
            const res = await fetch(`${apiBase}/auth/me`, {
                headers: { 'Authorization': `Bearer ${savedToken}` }
            });

            if (res.status === 200) {
                const user = await res.json();
                authState.token = savedToken;
                authState.user = user;
                updateAuthUI();
            } else {
                sessionStorage.removeItem('rsc_auth_token');
            }
        } catch (e) {
            sessionStorage.removeItem('rsc_auth_token');
        }
    }

    function initAuthListeners() {
        const openLoginModalBtn = document.getElementById('openLoginModalBtn');
        const closeLoginModalBtn = document.getElementById('closeLoginModalBtn');
        const cancelLoginModalBtn = document.getElementById('cancelLoginModalBtn');
        const loginModal = document.getElementById('loginModal');
        const loginForm = document.getElementById('loginForm');
        const loginUsernameInput = document.getElementById('loginUsernameInput');
        const loginPasswordInput = document.getElementById('loginPasswordInput');
        const headerLogoutBtn = document.getElementById('headerLogoutBtn');
        const adminSignInPromptBtn = document.getElementById('adminSignInPromptBtn');
        const demoRoleBtns = document.querySelectorAll('.demo-role-btn');

        if (openLoginModalBtn) openLoginModalBtn.addEventListener('click', () => openLoginModal());
        if (closeLoginModalBtn) closeLoginModalBtn.addEventListener('click', closeLoginModal);
        if (cancelLoginModalBtn) cancelLoginModalBtn.addEventListener('click', closeLoginModal);

        if (loginModal) {
            loginModal.addEventListener('click', (e) => {
                if (e.target === loginModal) closeLoginModal();
            });
        }

        demoRoleBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                demoRoleBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                const roleKey = btn.dataset.demoRole;
                const creds = demoCredentials[roleKey];
                if (creds && loginUsernameInput && loginPasswordInput) {
                    loginUsernameInput.value = creds.u;
                    loginPasswordInput.value = creds.p;
                }
            });
        });

        if (loginForm) {
            loginForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const u = loginUsernameInput ? loginUsernameInput.value.trim() : '';
                const p = loginPasswordInput ? loginPasswordInput.value : '';
                await handleLogin(u, p);
            });
        }

        if (headerLogoutBtn) {
            headerLogoutBtn.addEventListener('click', handleLogout);
        }

        if (adminSignInPromptBtn) {
            adminSignInPromptBtn.addEventListener('click', () => openLoginModal('ADMIN'));
        }
    }

    const Auth = {
        getState: () => authState,
        getAuthHeaders,
        getRoleBadge,
        updateAuthUI,
        openLoginModal,
        closeLoginModal,
        handleLogin,
        handleLogout,
        restoreSession,
        init: initAuthListeners
    };

    window.Auth = Auth;
    window.authState = authState;
    window.getAuthHeaders = getAuthHeaders;
    window.getRoleBadge = getRoleBadge;
    window.updateAuthUI = updateAuthUI;
    window.openLoginModal = openLoginModal;
    window.closeLoginModal = closeLoginModal;
    window.handleLogin = handleLogin;
    window.handleLogout = handleLogout;
    window.restoreSession = restoreSession;
})(window);
