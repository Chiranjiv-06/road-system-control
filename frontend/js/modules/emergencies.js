/**
 * Road System Control — Emergency Alerts Module
 * frontend/js/modules/emergencies.js
 *
 * Dedicated module for Phase 7 Emergency Incident Management:
 * - Live PostgreSQL broadcasts fetching & aggregate summary metrics
 * - Dashboard Emergency Alert card / banner rendering
 * - Emergency alerts table rendering with quick lifecycle actions (Investigate / Resolve)
 * - Broadcast Emergency Alert modal management & submission
 */

(function (window, document) {
    'use strict';

    const API_BASE_URL = window.API_BASE_URL || "http://127.0.0.1:8000/api";

    // Module State
    let alertsState = [];
    let isAlertsFetching = false;

    // DOM Elements Cache
    let dashboardEmergencyBanner = null;
    let dashboardAlertIconWrapper = null;
    let dashboardAlertTitle = null;
    let dashboardAlertBadge = null;
    let dashboardAlertDesc = null;

    let alertTotalCount = null;
    let alertActiveCount = null;
    let alertCriticalCount = null;
    let alertResolvedCount = null;
    let emergencyAlertsTableBody = null;
    let alertLastUpdated = null;
    let refreshAlertsBtn = null;

    let metricActive = null;
    let sidebarAlertCount = null;

    let openCreateAlertModalBtn = null;
    let createAlertModal = null;
    let closeCreateAlertModalBtn = null;
    let cancelCreateAlertBtn = null;
    let createAlertForm = null;
    let submitAlertBtn = null;
    let alertTypeInput = null;
    let alertSeverityInput = null;
    let alertTitleInput = null;
    let alertDescriptionInput = null;
    let alertLocationInput = null;
    let alertAreaInput = null;
    let alertStatusInput = null;

    /**
     * Shared Utility Fallbacks
     */
    function safeEscapeHtml(str) {
        if (typeof window.escapeHtml === 'function') return window.escapeHtml(str);
        if (!str) return '';
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    function safeFormatTimeAgo(dateString) {
        if (typeof window.formatTimeAgo === 'function') return window.formatTimeAgo(dateString);
        if (!dateString) return 'Unknown';
        const now = new Date();
        const date = new Date(dateString);
        const seconds = Math.floor((now - date) / 1000);
        if (seconds < 60) return 'Just now';
        const minutes = Math.floor(seconds / 60);
        if (minutes < 60) return `${minutes}m ago`;
        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `${hours}h ago`;
        const days = Math.floor(hours / 24);
        return `${days}d ago`;
    }

    function safeShowToast(message, type = 'default') {
        if (typeof window.showToast === 'function') {
            window.showToast(message, type);
        } else {
            console.log(`[Toast ${type}]: ${message}`);
        }
    }

    function safeGetAuthHeaders(extraHeaders = {}) {
        if (typeof window.getAuthHeaders === 'function') {
            return window.getAuthHeaders(extraHeaders);
        }
        const token = localStorage.getItem('rsc_auth_token');
        const headers = { 'Content-Type': 'application/json', ...extraHeaders };
        if (token) headers['Authorization'] = `Bearer ${token}`;
        return headers;
    }

    function safeOpenLoginModal(role) {
        if (typeof window.openLoginModal === 'function') {
            window.openLoginModal(role);
        }
    }

    async function safeCheckBackendHealth() {
        if (typeof window.checkBackendHealth === 'function') {
            return await window.checkBackendHealth();
        }
        try {
            const res = await fetch(`${API_BASE_URL.replace('/api', '')}/api/health`);
            return res.ok;
        } catch {
            return false;
        }
    }

    function safeLoadNotificationsSummary() {
        if (typeof window.loadNotificationsSummary === 'function') {
            window.loadNotificationsSummary();
        }
    }

    /**
     * Badge HTML helpers
     */
    function getAlertSeverityBadge(severity) {
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
                return `<span class="badge badge-neutral">${safeEscapeHtml(severity)}</span>`;
        }
    }

    function getAlertStatusBadge(status) {
        switch (status) {
            case 'Active':
                return '<span class="badge badge-danger">Active</span>';
            case 'Investigating':
                return '<span class="badge badge-warning-soft">Investigating</span>';
            case 'Resolved':
                return '<span class="badge badge-success">Resolved</span>';
            default:
                return `<span class="badge badge-neutral">${safeEscapeHtml(status)}</span>`;
        }
    }

    /**
     * Populate emergency alerts summary metric cards and header badges
     */
    function renderAlertsSummary(summary) {
        if (!summary) return;
        const total = summary.total_alerts ?? summary.totalAlerts ?? 0;
        const active = summary.active_alerts ?? summary.activeAlerts ?? 0;
        const critical = summary.critical_alerts ?? summary.criticalAlerts ?? 0;
        const resolved = summary.resolved_alerts ?? summary.resolvedAlerts ?? 0;

        if (alertTotalCount) alertTotalCount.textContent = total;
        if (alertActiveCount) alertActiveCount.textContent = active;
        if (alertCriticalCount) alertCriticalCount.textContent = critical;
        if (alertResolvedCount) alertResolvedCount.textContent = resolved;

        if (metricActive) metricActive.textContent = active;

        if (sidebarAlertCount) {
            sidebarAlertCount.textContent = active;
            sidebarAlertCount.style.display = active > 0 ? 'inline-block' : 'none';
        }
    }

    /**
     * Dynamically update the top Emergency Banner on the Dashboard
     */
    function renderEmergencyBanner(alerts) {
        if (!dashboardEmergencyBanner) return;

        const activeCrit = alerts.find(a => a.status === 'Active' && a.severity === 'Critical');
        const activeAny = alerts.find(a => a.status === 'Active');

        if (activeCrit) {
            dashboardEmergencyBanner.className = 'emergency-alert-card';
            if (dashboardAlertBadge) {
                dashboardAlertBadge.className = 'badge badge-danger';
                dashboardAlertBadge.textContent = 'Live Critical Emergency';
            }
            if (dashboardAlertTitle) {
                dashboardAlertTitle.textContent = `${activeCrit.alert_type}: ${activeCrit.title}`;
            }
            if (dashboardAlertDesc) {
                dashboardAlertDesc.innerHTML = `${safeEscapeHtml(activeCrit.description)} — Location: <strong>${safeEscapeHtml(activeCrit.location)} (${safeEscapeHtml(activeCrit.area)})</strong>`;
            }
        } else if (activeAny) {
            dashboardEmergencyBanner.className = 'emergency-alert-card';
            if (dashboardAlertBadge) {
                dashboardAlertBadge.className = 'badge badge-warning';
                dashboardAlertBadge.textContent = 'Active Incident';
            }
            if (dashboardAlertTitle) {
                dashboardAlertTitle.textContent = `${activeAny.alert_type}: ${activeAny.title}`;
            }
            if (dashboardAlertDesc) {
                dashboardAlertDesc.innerHTML = `${safeEscapeHtml(activeAny.description)} — Location: <strong>${safeEscapeHtml(activeAny.location)} (${safeEscapeHtml(activeAny.area)})</strong>`;
            }
        } else {
            dashboardEmergencyBanner.className = 'emergency-alert-card clear-mode';
            if (dashboardAlertBadge) {
                dashboardAlertBadge.className = 'badge badge-success';
                dashboardAlertBadge.textContent = 'All Corridors Clear';
            }
            if (dashboardAlertTitle) {
                dashboardAlertTitle.textContent = 'All Corridors Clear';
            }
            if (dashboardAlertDesc) {
                dashboardAlertDesc.textContent = 'No active emergency incidents or critical road hazards reported across the network.';
            }
        }
    }

    /**
     * Render emergency alerts into the Emergency Alerts Center table
     */
    function renderEmergencyAlertsTable(alerts) {
        if (!emergencyAlertsTableBody) return;
        emergencyAlertsTableBody.innerHTML = '';

        if (!alerts || alerts.length === 0) {
            const emptyRow = document.createElement('tr');
            emptyRow.innerHTML = `
                <td colspan="7" class="text-center py-4 text-muted">
                    No emergency alert broadcasts found in database. Click <strong>Create Emergency Alert</strong> or run <code>python seed_emergency_alerts.py</code>.
                </td>
            `;
            emergencyAlertsTableBody.appendChild(emptyRow);
            return;
        }

        alerts.forEach(alert => {
            const row = document.createElement('tr');
            const alertId = alert.id;
            const alertType = alert.alert_type || alert.alertType || 'Emergency';
            const title = alert.title || 'Untitled Incident';
            const desc = alert.description || '';
            const location = alert.location || '';
            const area = alert.area ? `(${safeEscapeHtml(alert.area)})` : '';
            const severity = alert.severity || 'Medium';
            const status = alert.status || 'Active';
            const issuedAt = alert.issued_at || alert.issuedAt;

            let actionsHtml = '';
            if (status === 'Active') {
                actionsHtml = `
                    <div class="alert-action-btns">
                        <button type="button" class="btn btn-outline btn-sm patch-status-btn" data-id="${safeEscapeHtml(alertId)}" data-status="Investigating" title="Mark as investigating">
                            Investigate
                        </button>
                        <button type="button" class="btn btn-danger-outline btn-sm patch-status-btn" data-id="${safeEscapeHtml(alertId)}" data-status="Resolved" title="Mark as resolved">
                            Resolve
                        </button>
                    </div>
                `;
            } else if (status === 'Investigating') {
                actionsHtml = `
                    <div class="alert-action-btns">
                        <button type="button" class="btn btn-outline btn-sm patch-status-btn" data-id="${safeEscapeHtml(alertId)}" data-status="Resolved" title="Mark as resolved">
                            Resolve
                        </button>
                    </div>
                `;
            } else {
                actionsHtml = `<span class="text-xs text-muted font-medium">Cleared</span>`;
            }

            row.innerHTML = `
                <td>
                    <div class="issue-name-cell">
                        <span class="issue-id-tag">${safeEscapeHtml(alertId)}</span>
                        <strong>${safeEscapeHtml(alertType)}</strong>
                    </div>
                </td>
                <td>
                    <div style="max-width: 320px;">
                        <strong class="text-primary">${safeEscapeHtml(title)}</strong>
                        <div class="text-xs text-muted" style="margin-top: 2px;">${safeEscapeHtml(desc)}</div>
                    </div>
                </td>
                <td>
                    <div>${safeEscapeHtml(location)}</div>
                    <span class="text-xs text-muted">${area}</span>
                </td>
                <td>${getAlertSeverityBadge(severity)}</td>
                <td>${getAlertStatusBadge(status)}</td>
                <td class="text-muted" title="${issuedAt ? new Date(issuedAt).toLocaleString() : ''}">
                    ${safeFormatTimeAgo(issuedAt)}
                </td>
                <td class="text-right">
                    ${actionsHtml}
                </td>
            `;

            emergencyAlertsTableBody.appendChild(row);
        });

        // Attach event listeners to status update buttons with immediate loading feedback
        emergencyAlertsTableBody.querySelectorAll('.patch-status-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const alertId = btn.dataset.id;
                const newStatus = btn.dataset.status;
                if (alertId && newStatus) {
                    btn.disabled = true;
                    const originalHtml = btn.innerHTML;
                    btn.innerHTML = `<span class="spinner-inline"></span> ${newStatus === 'Resolved' ? 'Resolving...' : 'Updating...'}`;
                    try {
                        await updateAlertStatus(alertId, newStatus);
                    } finally {
                        btn.disabled = false;
                        btn.innerHTML = originalHtml;
                    }
                }
            });
        });
    }

    /**
     * Render error state for emergency alerts
     */
    function renderAlertsError() {
        if (emergencyAlertsTableBody) {
            emergencyAlertsTableBody.innerHTML = `
                <tr>
                    <td colspan="7" class="table-loading-cell text-danger">
                        ⚠️ Unable to connect to Emergency Alerts API.<br>
                        <span class="text-xs text-muted">Please check that FastAPI is running on <code>http://127.0.0.1:8000</code>.</span>
                    </td>
                </tr>
            `;
        }
        if (alertTotalCount) alertTotalCount.textContent = '--';
        if (alertActiveCount) alertActiveCount.textContent = '--';
        if (alertCriticalCount) alertCriticalCount.textContent = '--';
        if (alertResolvedCount) alertResolvedCount.textContent = '--';
    }

    /**
     * Fetch emergency alerts and summary concurrently from FastAPI backend
     */
    async function loadAlerts(showLoadingSpinner = true) {
        if (isAlertsFetching) return;
        isAlertsFetching = true;

        if (showLoadingSpinner) {
            if (emergencyAlertsTableBody) {
                emergencyAlertsTableBody.innerHTML = `
                    <tr>
                        <td colspan="7" class="table-loading-cell">
                            <span class="spinner-inline"></span> Loading live emergency broadcasts from PostgreSQL...
                        </td>
                    </tr>
                `;
            }
        }

        try {
            const isOnline = await safeCheckBackendHealth();
            if (!isOnline) {
                throw new Error("Backend connection offline");
            }

            const [alertsRes, summaryRes] = await Promise.all([
                fetch(`${API_BASE_URL}/emergency-alerts`),
                fetch(`${API_BASE_URL}/emergency-alerts/summary`)
            ]);

            if (!alertsRes.ok || !summaryRes.ok) {
                throw new Error(`Alerts API error: alerts status ${alertsRes.status}, summary status ${summaryRes.status}`);
            }

            const alertsData = await alertsRes.json();
            const summaryData = await summaryRes.json();

            alertsState = Array.isArray(alertsData) ? alertsData : [];
            renderAlertsSummary(summaryData);
            renderEmergencyBanner(alertsState);
            renderEmergencyAlertsTable(alertsState);

            if (alertLastUpdated) {
                const now = new Date();
                alertLastUpdated.textContent = `Updated: ${now.toLocaleTimeString()}`;
            }
        } catch (error) {
            console.error("Failed to load emergency alerts from FastAPI:", error);
            renderAlertsError();
        } finally {
            isAlertsFetching = false;
        }
    }

    /**
     * Update an alert's status via PATCH /api/emergency-alerts/{id}/status
     */
    async function updateAlertStatus(alertId, newStatus) {
        try {
            const res = await fetch(`${API_BASE_URL}/emergency-alerts/${encodeURIComponent(alertId)}/status`, {
                method: 'PATCH',
                headers: safeGetAuthHeaders(),
                body: JSON.stringify({ status: newStatus })
            });

            if (res.status === 401) {
                safeShowToast("Authentication required: Please sign in as an Operator.", "error");
                safeOpenLoginModal('EMERGENCY_OPERATOR');
                return;
            } else if (res.status === 403) {
                safeShowToast("Access forbidden: Requires EMERGENCY_OPERATOR or ADMIN role.", "error");
                return;
            } else if (!res.ok) {
                throw new Error(`Failed to update status: ${res.status}`);
            }

            const updated = await res.json();
            if (newStatus === 'Resolved') {
                safeShowToast(`Emergency Alert ${alertId} resolved successfully.`, 'success');
            } else if (newStatus === 'Investigating') {
                safeShowToast(`Emergency Alert ${alertId} status updated to Investigating.`, 'success');
            } else {
                safeShowToast(`Emergency Alert ${alertId} status updated to ${newStatus}.`, 'success');
            }

            // Update in-memory state
            const index = alertsState.findIndex(a => a.id === alertId);
            if (index !== -1) {
                alertsState[index] = updated;
            }

            // Re-fetch summary and re-render
            const summaryRes = await fetch(`${API_BASE_URL}/emergency-alerts/summary`);
            if (summaryRes.ok) {
                const summaryData = await summaryRes.json();
                renderAlertsSummary(summaryData);
            }
            renderEmergencyBanner(alertsState);
            renderEmergencyAlertsTable(alertsState);

            // Sync notification counter if available
            safeLoadNotificationsSummary();
        } catch (err) {
            console.error("Failed to patch alert status:", err);
            safeShowToast("Failed to update alert status. Check server connection.", "error");
        }
    }

    /**
     * Modal Dialog Functions for Creating Emergency Alert
     */
    function openCreateAlertModal() {
        if (!createAlertModal) return;
        createAlertModal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    }

    function closeCreateAlertModal() {
        if (!createAlertModal) return;
        createAlertModal.style.display = 'none';
        document.body.style.overflow = '';
        if (createAlertForm) createAlertForm.reset();
    }

    async function handleCreateAlertSubmit(e) {
        e.preventDefault();

        const alertType = alertTypeInput ? alertTypeInput.value : '';
        const severity = alertSeverityInput ? alertSeverityInput.value : '';
        const title = alertTitleInput ? alertTitleInput.value.trim() : '';
        const description = alertDescriptionInput ? alertDescriptionInput.value.trim() : '';
        const location = alertLocationInput ? alertLocationInput.value.trim() : '';
        const area = alertAreaInput ? alertAreaInput.value.trim() : '';
        const status = alertStatusInput ? alertStatusInput.value : 'Active';

        if (!alertType || !severity || !title || !description || !location || !area) {
            safeShowToast("Please fill in all required fields.", "error");
            return;
        }

        const payload = {
            alert_type: alertType,
            title: title,
            description: description,
            location: location,
            area: area,
            severity: severity,
            status: status,
            issued_at: new Date().toISOString()
        };

        if (submitAlertBtn) {
            submitAlertBtn.disabled = true;
            submitAlertBtn.innerHTML = `<span class="spinner-inline"></span> Broadcasting Alert...`;
        }

        try {
            const response = await fetch(`${API_BASE_URL}/emergency-alerts`, {
                method: 'POST',
                headers: safeGetAuthHeaders(),
                body: JSON.stringify(payload)
            });

            if (response.status === 201) {
                const createdAlert = await response.json();
                alertsState.unshift(createdAlert);
                closeCreateAlertModal();
                const titleSnippet = createdAlert.title ? ` ("${createdAlert.title}")` : '';
                safeShowToast(`Emergency Alert ${createdAlert.id}${titleSnippet} broadcast successfully!`, 'success');

                // Refresh summary and render
                loadAlerts(false);

                // Sync notification counter if available
                safeLoadNotificationsSummary();
            } else if (response.status === 401) {
                safeShowToast("Authentication required: Please sign in as an Operator.", "error");
                safeOpenLoginModal('EMERGENCY_OPERATOR');
            } else if (response.status === 403) {
                safeShowToast("Access forbidden: Requires EMERGENCY_OPERATOR or ADMIN role.", "error");
            } else if (response.status === 422) {
                const err = await response.json();
                console.error("Validation error broadcasting alert:", err);
                safeShowToast("Some alert fields are invalid. Please check inputs.", "error");
            } else {
                throw new Error(`Server returned status: ${response.status}`);
            }
        } catch (err) {
            console.error("Failed to broadcast alert:", err);
            safeShowToast("Unable to save emergency alert. Please verify FastAPI backend.", "error");
        } finally {
            if (submitAlertBtn) {
                submitAlertBtn.disabled = false;
                submitAlertBtn.innerHTML = `
                    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                    Broadcast Live Alert
                `;
            }
        }
    }

    /**
     * DOM Cache & Event Binding
     */
    function initEmergencyAlerts() {
        dashboardEmergencyBanner = document.getElementById('dashboardEmergencyBanner');
        dashboardAlertIconWrapper = document.getElementById('dashboardAlertIconWrapper');
        dashboardAlertTitle = document.getElementById('dashboardAlertTitle');
        dashboardAlertBadge = document.getElementById('dashboardAlertBadge');
        dashboardAlertDesc = document.getElementById('dashboardAlertDesc');

        alertTotalCount = document.getElementById('alertTotalCount');
        alertActiveCount = document.getElementById('alertActiveCount');
        alertCriticalCount = document.getElementById('alertCriticalCount');
        alertResolvedCount = document.getElementById('alertResolvedCount');
        emergencyAlertsTableBody = document.getElementById('emergencyAlertsTableBody');
        alertLastUpdated = document.getElementById('alertLastUpdated');
        refreshAlertsBtn = document.getElementById('refreshAlertsBtn');

        metricActive = document.getElementById('metricActive');
        sidebarAlertCount = document.getElementById('sidebarAlertCount');

        openCreateAlertModalBtn = document.getElementById('openCreateAlertModalBtn');
        createAlertModal = document.getElementById('createAlertModal');
        closeCreateAlertModalBtn = document.getElementById('closeCreateAlertModalBtn');
        cancelCreateAlertBtn = document.getElementById('cancelCreateAlertBtn');
        createAlertForm = document.getElementById('createAlertForm');
        submitAlertBtn = document.getElementById('submitAlertBtn');
        alertTypeInput = document.getElementById('alertTypeInput');
        alertSeverityInput = document.getElementById('alertSeverityInput');
        alertTitleInput = document.getElementById('alertTitleInput');
        alertDescriptionInput = document.getElementById('alertDescriptionInput');
        alertLocationInput = document.getElementById('alertLocationInput');
        alertAreaInput = document.getElementById('alertAreaInput');
        alertStatusInput = document.getElementById('alertStatusInput');

        if (openCreateAlertModalBtn) openCreateAlertModalBtn.addEventListener('click', openCreateAlertModal);
        if (closeCreateAlertModalBtn) closeCreateAlertModalBtn.addEventListener('click', closeCreateAlertModal);
        if (cancelCreateAlertBtn) cancelCreateAlertBtn.addEventListener('click', closeCreateAlertModal);
        if (createAlertModal) {
            createAlertModal.addEventListener('click', (e) => {
                if (e.target === createAlertModal) closeCreateAlertModal();
            });
        }
        if (refreshAlertsBtn) {
            refreshAlertsBtn.addEventListener('click', () => {
                safeShowToast('Syncing emergency alerts from PostgreSQL...', 'default');
                loadAlerts(true);
            });
        }
        if (createAlertForm) {
            createAlertForm.addEventListener('submit', handleCreateAlertSubmit);
        }
    }

    // Expose EmergencyAlerts module interface on window
    const EmergencyAlerts = {
        init: initEmergencyAlerts,
        loadAlerts: loadAlerts,
        updateAlertStatus: updateAlertStatus,
        openCreateModal: openCreateAlertModal,
        closeCreateModal: closeCreateAlertModal,
        renderAlertsSummary: renderAlertsSummary,
        renderEmergencyBanner: renderEmergencyBanner,
        renderEmergencyAlertsTable: renderEmergencyAlertsTable,
        getAlertSeverityBadge: getAlertSeverityBadge,
        getAlertStatusBadge: getAlertStatusBadge,
        getState: () => alertsState,
        isFetching: () => isAlertsFetching
    };

    window.EmergencyAlerts = EmergencyAlerts;
    window.loadAlerts = loadAlerts;
    window.getAlertSeverityBadge = getAlertSeverityBadge;
    window.getAlertStatusBadge = getAlertStatusBadge;

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initEmergencyAlerts);
    } else {
        initEmergencyAlerts();
    }
})(window, document);
