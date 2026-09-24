/**
 * Road System Control - System Administration Module
 * Operator account management, provisioning, RBAC enforcement, and status controls.
 */
(function(window) {
    'use strict';

    function checkAdminSectionAccess() {
        const adminAuthorizedView = document.getElementById('adminAuthorizedView');
        const adminAccessDeniedBox = document.getElementById('adminAccessDeniedBox');
        const auth = window.Auth ? window.Auth.getState() : window.authState;

        if (!adminAuthorizedView || !adminAccessDeniedBox) return;

        if (auth && auth.token && auth.user && auth.user.role === 'ADMIN') {
            adminAuthorizedView.style.display = 'block';
            adminAccessDeniedBox.style.display = 'none';
            loadAdminOperators();
        } else {
            adminAuthorizedView.style.display = 'none';
            adminAccessDeniedBox.style.display = 'block';
        }
    }

    async function loadAdminOperators() {
        const adminUsersTableBody = document.getElementById('adminUsersTableBody');
        const adminUsersCountBadge = document.getElementById('adminUsersCountBadge');
        const adminUsersLastUpdated = document.getElementById('adminUsersLastUpdated');
        const auth = window.Auth ? window.Auth.getState() : window.authState;
        const apiBase = window.API_BASE_URL || 'http://127.0.0.1:8000/api';
        const getHeaders = window.getAuthHeaders || (() => ({}));
        const escape = window.escapeHtml || ((s) => s);
        const getBadge = window.getRoleBadge || ((r) => r);

        if (!adminUsersTableBody) return;
        if (!auth || !auth.token || !auth.user || auth.user.role !== 'ADMIN') return;

        try {
            const res = await fetch(`${apiBase}/auth/users`, {
                headers: getHeaders()
            });

            if (res.status === 200) {
                const users = await res.json();

                if (adminUsersCountBadge) {
                    adminUsersCountBadge.textContent = `${users.length} Operators Registered`;
                }
                if (adminUsersLastUpdated) {
                    adminUsersLastUpdated.textContent = `Updated: ${new Date().toLocaleTimeString()}`;
                }

                if (users.length === 0) {
                    adminUsersTableBody.innerHTML = `
                        <tr>
                            <td colspan="7" class="table-loading-cell text-muted">No operator accounts found.</td>
                        </tr>
                    `;
                    return;
                }

                adminUsersTableBody.innerHTML = users.map(u => `
                    <tr>
                        <td class="font-mono text-muted text-xs">#${u.id}</td>
                        <td class="font-semibold text-slate-200">@${escape(u.username)}</td>
                        <td>${escape(u.full_name)}</td>
                        <td class="text-muted text-xs">${escape(u.email)}</td>
                        <td>${getBadge(u.role)}</td>
                        <td>
                            <span class="user-status-pill ${u.is_active ? 'user-status-active' : 'user-status-disabled'}">
                                ${u.is_active ? 'Active' : 'Disabled'}
                            </span>
                        </td>
                        <td class="text-right">
                            ${u.id !== auth.user.id ? `
                                <button class="btn btn-outline btn-sm toggle-user-status-btn" data-user-id="${u.id}" data-current-active="${u.is_active}">
                                    ${u.is_active ? 'Disable' : 'Enable'}
                                </button>
                            ` : '<span class="text-muted text-xs">Self</span>'}
                        </td>
                    </tr>
                `).join('');

                // Attach status toggle event listeners
                document.querySelectorAll('.toggle-user-status-btn').forEach(btn => {
                    btn.addEventListener('click', async () => {
                        const uid = btn.dataset.userId;
                        const currentlyActive = btn.dataset.currentActive === 'true';
                        await toggleOperatorStatus(uid, !currentlyActive);
                    });
                });
            } else if (res.status === 401 || res.status === 403) {
                adminUsersTableBody.innerHTML = `
                    <tr>
                        <td colspan="7" class="table-loading-cell text-danger">
                            Access Denied: You do not have ADMIN permissions to view operator accounts.
                        </td>
                    </tr>
                `;
            }
        } catch (err) {
            console.error("Failed to load operator accounts:", err);
            adminUsersTableBody.innerHTML = `
                <tr>
                    <td colspan="7" class="table-loading-cell text-danger">
                        Failed to load operator accounts from PostgreSQL.
                    </td>
                </tr>
            `;
        }
    }

    async function toggleOperatorStatus(userId, newActiveState) {
        const apiBase = window.API_BASE_URL || 'http://127.0.0.1:8000/api';
        const getHeaders = window.getAuthHeaders || (() => ({}));
        const toast = window.showToast || console.log;

        try {
            const res = await fetch(`${apiBase}/auth/users/${userId}/status`, {
                method: 'PATCH',
                headers: getHeaders(),
                body: JSON.stringify({ is_active: newActiveState })
            });

            if (res.status === 200) {
                toast(`Operator #${userId} status updated to ${newActiveState ? 'Active' : 'Disabled'}.`, 'success');
                loadAdminOperators();
            } else {
                toast('Failed to update operator status.', 'error');
            }
        } catch (e) {
            toast('Network error updating operator status.', 'error');
        }
    }

    function openCreateOperatorModal() {
        const createOperatorModal = document.getElementById('createOperatorModal');
        const createOperatorErrorBanner = document.getElementById('createOperatorErrorBanner');
        const newOpUsernameInput = document.getElementById('newOpUsernameInput');

        if (!createOperatorModal) return;
        if (createOperatorErrorBanner) createOperatorErrorBanner.style.display = 'none';
        createOperatorModal.style.display = 'flex';
        if (newOpUsernameInput) newOpUsernameInput.focus();
    }

    function closeCreateOperatorModal() {
        const createOperatorModal = document.getElementById('createOperatorModal');
        const createOperatorForm = document.getElementById('createOperatorForm');
        const createOperatorErrorBanner = document.getElementById('createOperatorErrorBanner');

        if (!createOperatorModal) return;
        createOperatorModal.style.display = 'none';
        if (createOperatorForm) createOperatorForm.reset();
        if (createOperatorErrorBanner) createOperatorErrorBanner.style.display = 'none';
    }

    function initAdminListeners() {
        const openCreateOperatorModalBtn = document.getElementById('openCreateOperatorModalBtn');
        const closeCreateOperatorModalBtn = document.getElementById('closeCreateOperatorModalBtn');
        const cancelCreateOpBtn = document.getElementById('cancelCreateOpBtn');
        const createOperatorModal = document.getElementById('createOperatorModal');
        const refreshOperatorsBtn = document.getElementById('refreshOperatorsBtn');
        const createOperatorForm = document.getElementById('createOperatorForm');
        const submitCreateOpBtn = document.getElementById('submitCreateOpBtn');
        const createOperatorErrorBanner = document.getElementById('createOperatorErrorBanner');
        const newOpUsernameInput = document.getElementById('newOpUsernameInput');
        const newOpFullNameInput = document.getElementById('newOpFullNameInput');
        const newOpEmailInput = document.getElementById('newOpEmailInput');
        const newOpRoleInput = document.getElementById('newOpRoleInput');
        const newOpPasswordInput = document.getElementById('newOpPasswordInput');
        const toast = window.showToast || console.log;
        const apiBase = window.API_BASE_URL || 'http://127.0.0.1:8000/api';
        const getHeaders = window.getAuthHeaders || (() => ({}));

        if (openCreateOperatorModalBtn) openCreateOperatorModalBtn.addEventListener('click', openCreateOperatorModal);
        if (closeCreateOperatorModalBtn) closeCreateOperatorModalBtn.addEventListener('click', closeCreateOperatorModal);
        if (cancelCreateOpBtn) cancelCreateOpBtn.addEventListener('click', closeCreateOperatorModal);

        if (createOperatorModal) {
            createOperatorModal.addEventListener('click', (e) => {
                if (e.target === createOperatorModal) closeCreateOperatorModal();
            });
        }

        if (refreshOperatorsBtn) {
            refreshOperatorsBtn.addEventListener('click', () => {
                toast("Syncing operator accounts...", "default");
                loadAdminOperators();
            });
        }

        if (createOperatorForm) {
            createOperatorForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const username = newOpUsernameInput ? newOpUsernameInput.value.trim() : '';
                const full_name = newOpFullNameInput ? newOpFullNameInput.value.trim() : '';
                const email = newOpEmailInput ? newOpEmailInput.value.trim() : '';
                const role = newOpRoleInput ? newOpRoleInput.value : '';
                const password = newOpPasswordInput ? newOpPasswordInput.value : '';

                if (!username || !full_name || !email || !role || !password) {
                    if (createOperatorErrorBanner) {
                        createOperatorErrorBanner.textContent = "Please fill in all operator fields.";
                        createOperatorErrorBanner.style.display = 'block';
                    }
                    return;
                }

                if (password.length < 8) {
                    if (createOperatorErrorBanner) {
                        createOperatorErrorBanner.textContent = "Password must be at least 8 characters long.";
                        createOperatorErrorBanner.style.display = 'block';
                    }
                    return;
                }

                if (submitCreateOpBtn) {
                    submitCreateOpBtn.disabled = true;
                    submitCreateOpBtn.innerHTML = '<span class="spinner-inline"></span> Provisioning...';
                }
                if (createOperatorErrorBanner) createOperatorErrorBanner.style.display = 'none';

                try {
                    const res = await fetch(`${apiBase}/auth/users`, {
                        method: 'POST',
                        headers: getHeaders(),
                        body: JSON.stringify({ username, full_name, email, role, password })
                    });

                    if (res.status === 201) {
                        const newUser = await res.json();
                        closeCreateOperatorModal();
                        toast(`Operator @${newUser.username} (${newUser.role}) created successfully!`, 'success');
                        loadAdminOperators();
                    } else if (res.status === 400 || res.status === 422) {
                        const err = await res.json();
                        if (createOperatorErrorBanner) {
                            createOperatorErrorBanner.textContent = err.detail || "Validation error: Username or email may already be in use.";
                            createOperatorErrorBanner.style.display = 'block';
                        }
                    } else if (res.status === 401 || res.status === 403) {
                        if (createOperatorErrorBanner) {
                            createOperatorErrorBanner.textContent = "Access denied. Only ADMIN accounts can provision operators.";
                            createOperatorErrorBanner.style.display = 'block';
                        }
                    } else {
                        throw new Error(`Server returned: ${res.status}`);
                    }
                } catch (err) {
                    console.error("Failed to create operator:", err);
                    if (createOperatorErrorBanner) {
                        createOperatorErrorBanner.textContent = "Unable to create operator account. Check server connection.";
                        createOperatorErrorBanner.style.display = 'block';
                    }
                } finally {
                    if (submitCreateOpBtn) {
                        submitCreateOpBtn.disabled = false;
                        submitCreateOpBtn.innerHTML = `
                            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="8.5" cy="7" r="4"></circle><line x1="20" y1="8" x2="20" y2="14"></line><line x1="23" y1="11" x2="17" y2="11"></line></svg>
                            Create Operator
                        `;
                    }
                }
            });
        }
    }

    const AdminModule = {
        checkAdminSectionAccess,
        loadAdminOperators,
        toggleOperatorStatus,
        openCreateOperatorModal,
        closeCreateOperatorModal,
        init: initAdminListeners
    };

    window.AdminModule = AdminModule;
    window.checkAdminSectionAccess = checkAdminSectionAccess;
    window.loadAdminOperators = loadAdminOperators;
})(window);
