/**
 * Road System Control - Notifications & Operational Escalation Module
 * Real-time operational incident feed, role routing, acknowledgment workflows, and automatic alert sync.
 */
(function(window) {
    'use strict';

    let notificationsState = [];
    let isNotifFetching = false;
    let activeNotifStatusFilter = 'ALL';

    function getNotifSeverityBadge(severity) {
        const escape = window.escapeHtml || ((s) => s);
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
                return `<span class="badge badge-neutral">${escape(severity)}</span>`;
        }
    }

    function getNotifStatusBadge(status) {
        const escape = window.escapeHtml || ((s) => s);
        switch (status) {
            case 'UNREAD':
                return '<span class="badge badge-danger">UNREAD</span>';
            case 'READ':
                return '<span class="badge badge-neutral">READ</span>';
            case 'ACKNOWLEDGED':
                return '<span class="badge badge-success">ACKNOWLEDGED</span>';
            default:
                return `<span class="badge badge-neutral">${escape(status)}</span>`;
        }
    }

    function getDomainIconAndLabel(domain) {
        const escape = window.escapeHtml || ((s) => s);
        switch (domain) {
            case 'emergency_alerts':
                return { icon: '🚨', label: 'Emergency Alert' };
            case 'traffic':
                return { icon: '🚗', label: 'Traffic Flow' };
            case 'traffic_violations':
                return { icon: '📸', label: 'Traffic Violation' };
            case 'issues':
                return { icon: '⚠️', label: 'Road Hazard' };
            case 'risk':
                return { icon: '🛡️', label: 'AI Risk Escalation' };
            default:
                return { icon: '🔔', label: escape(domain) };
        }
    }

    async function loadNotifications(showSpinner = false) {
        if (isNotifFetching) return;
        isNotifFetching = true;

        const notificationsFeedContainer = document.getElementById('notificationsFeedContainer');
        const notifSeverityFilter = document.getElementById('notifSeverityFilter');
        const notifDomainFilter = document.getElementById('notifDomainFilter');
        const apiBase = window.API_BASE_URL || 'http://127.0.0.1:8000/api';
        const getHeaders = window.getAuthHeaders || (() => ({}));

        if (showSpinner && notificationsFeedContainer) {
            notificationsFeedContainer.innerHTML = `
                <div class="panel-card empty-state-panel">
                    <span class="spinner-inline"></span>
                    <p class="text-muted" style="margin-top: 0.5rem;">Fetching notifications feed from PostgreSQL...</p>
                </div>
            `;
        }

        try {
            const params = new URLSearchParams();
            if (activeNotifStatusFilter && activeNotifStatusFilter !== 'ALL') {
                params.append('status', activeNotifStatusFilter);
            }
            if (notifSeverityFilter && notifSeverityFilter.value) {
                params.append('severity', notifSeverityFilter.value);
            }
            if (notifDomainFilter && notifDomainFilter.value) {
                params.append('source_domain', notifDomainFilter.value);
            }

            const url = `${apiBase}/notifications${params.toString() ? '?' + params.toString() : ''}`;
            const res = await fetch(url, { headers: getHeaders() });

            if (res.status === 200) {
                const data = await res.json();
                notificationsState = data.items || [];
                renderNotifications(notificationsState);
            } else {
                if (notificationsFeedContainer) {
                    notificationsFeedContainer.innerHTML = `
                        <div class="panel-card empty-state-panel">
                            <div class="empty-state-icon">⚠️</div>
                            <h3>Failed to Load Notifications</h3>
                            <p class="text-muted">Server returned status ${res.status}. Check role authorization.</p>
                        </div>
                    `;
                }
            }
        } catch (err) {
            console.error("Error loading notifications:", err);
            if (notificationsFeedContainer) {
                notificationsFeedContainer.innerHTML = `
                    <div class="panel-card empty-state-panel">
                        <div class="empty-state-icon">⚠️</div>
                        <h3>Connection Error</h3>
                        <p class="text-muted">Unable to reach backend notifications service.</p>
                    </div>
                `;
            }
        } finally {
            isNotifFetching = false;
        }
    }

    async function loadNotificationsSummary() {
        const headerNotifBadge = document.getElementById('headerNotifBadge');
        const sidebarNotifBadge = document.getElementById('sidebarNotifBadge');
        const metricNotifUnread = document.getElementById('metricNotifUnread');
        const metricNotifCritical = document.getElementById('metricNotifCritical');
        const metricNotifAck = document.getElementById('metricNotifAck');
        const metricNotifTotal = document.getElementById('metricNotifTotal');
        const apiBase = window.API_BASE_URL || 'http://127.0.0.1:8000/api';
        const getHeaders = window.getAuthHeaders || (() => ({}));

        try {
            const res = await fetch(`${apiBase}/notifications/summary`, {
                headers: getHeaders()
            });

            if (res.status === 200) {
                const s = await res.json();

                const unreadCount = s.unread_count || 0;
                if (headerNotifBadge) {
                    if (unreadCount > 0) {
                        headerNotifBadge.textContent = unreadCount > 99 ? '99+' : unreadCount;
                        headerNotifBadge.style.display = 'block';
                    } else {
                        headerNotifBadge.style.display = 'none';
                    }
                }
                if (sidebarNotifBadge) {
                    if (unreadCount > 0) {
                        sidebarNotifBadge.textContent = unreadCount > 99 ? '99+' : unreadCount;
                        sidebarNotifBadge.style.display = 'inline-block';
                    } else {
                        sidebarNotifBadge.style.display = 'none';
                    }
                }

                if (metricNotifUnread) metricNotifUnread.textContent = unreadCount;
                if (metricNotifCritical) metricNotifCritical.textContent = (s.critical_count || 0) + (s.high_count || 0);
                if (metricNotifAck) metricNotifAck.textContent = s.acknowledged_count || 0;
                if (metricNotifTotal) metricNotifTotal.textContent = s.total_notifications || 0;
            }
        } catch (err) {
            console.warn("Could not fetch notifications summary:", err);
        }
    }

    function renderNotifications(items) {
        const notificationsFeedContainer = document.getElementById('notificationsFeedContainer');
        if (!notificationsFeedContainer) return;

        if (!items || items.length === 0) {
            notificationsFeedContainer.innerHTML = `
                <div class="panel-card empty-state-panel">
                    <div class="empty-state-icon">🔔</div>
                    <h3>No Notifications Found</h3>
                    <p class="text-muted">No operational alerts match the selected status, severity, or domain filters.</p>
                </div>
            `;
            return;
        }

        const escape = window.escapeHtml || ((s) => s);

        notificationsFeedContainer.innerHTML = items.map(n => {
            const isUnread = n.status === 'UNREAD';
            const isAck = n.status === 'ACKNOWLEDGED';
            const domInfo = getDomainIconAndLabel(n.source_domain);
            const sevLower = (n.severity || 'medium').toLowerCase();
            const createdDate = n.created_at ? new Date(n.created_at).toLocaleString() : 'Recent';

            return `
                <div class="notification-card severity-${sevLower} ${isUnread ? 'is-unread' : ''} ${isAck ? 'is-acknowledged' : ''}" data-notif-id="${escape(n.id)}">
                    <div class="notif-card-header">
                        <div class="notif-title-area">
                            ${isUnread ? '<span class="notif-unread-dot" title="Unread Escalation"></span>' : ''}
                            <span style="font-size: 1.1rem;">${domInfo.icon}</span>
                            <h4 class="notif-title">${escape(n.title)}</h4>
                            ${getNotifSeverityBadge(n.severity)}
                            ${getNotifStatusBadge(n.status)}
                        </div>
                        <span class="notif-timestamp">${escape(createdDate)}</span>
                    </div>

                    <p class="notif-message">${escape(n.message)}</p>

                    <div class="notif-meta-bar">
                        <div class="notif-tags-group">
                            <span class="notif-chip chip-domain">${domInfo.icon} ${escape(domInfo.label)}</span>
                            ${n.source_id ? `<span class="notif-chip chip-source">[${escape(n.source_id)}]</span>` : ''}
                            ${n.area ? `<span class="notif-chip chip-area">📍 ${escape(n.area)}</span>` : ''}
                            <span class="notif-chip">Target: ${escape(n.recipient_role)}</span>
                            ${n.acknowledged_by ? `<span class="notif-chip" style="background-color: #ecfdf5; color: #047857; border-color: #a7f3d0;">✓ Ack by ${escape(n.acknowledged_by)}</span>` : ''}
                        </div>

                        <div class="notif-actions-group">
                            ${isUnread ? `
                                <button type="button" class="btn btn-outline btn-sm btn-notif-action notif-btn-read" data-id="${escape(n.id)}">
                                    ✓ Mark Read
                                </button>
                            ` : ''}
                            ${!isAck ? `
                                <button type="button" class="btn btn-primary btn-sm btn-notif-action notif-btn-ack" data-id="${escape(n.id)}" data-title="${escape(n.title)}" data-msg="${escape(n.message)}">
                                    Acknowledge
                                </button>
                            ` : ''}
                            ${isAck && n.source_id ? `
                                <button type="button" class="btn btn-primary btn-sm btn-notif-action notif-btn-dispatch" data-domain="${escape(n.source_domain)}" data-source-id="${escape(n.source_id)}" data-title="${escape(n.title)}" data-area="${escape(n.area || '')}">
                                    Dispatch Work Order &rarr;
                                </button>
                            ` : ''}
                            ${n.source_id ? `
                                <button type="button" class="btn btn-outline btn-sm btn-notif-action notif-btn-goto" data-domain="${escape(n.source_domain)}" data-source-id="${escape(n.source_id)}">
                                    Go to Record &rarr;
                                </button>
                            ` : ''}
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        notificationsFeedContainer.querySelectorAll('.notif-btn-read').forEach(btn => {
            btn.addEventListener('click', () => markNotificationAsRead(btn.dataset.id));
        });

        notificationsFeedContainer.querySelectorAll('.notif-btn-ack').forEach(btn => {
            btn.addEventListener('click', () => openAcknowledgeModal(btn.dataset.id, btn.dataset.title, btn.dataset.msg));
        });

        notificationsFeedContainer.querySelectorAll('.notif-btn-dispatch').forEach(btn => {
            btn.addEventListener('click', () => {
                const dom = btn.dataset.domain;
                let oType = 'ROAD_REPAIR';
                if (dom === 'emergency_alerts') oType = 'EMERGENCY_RESPONSE';
                else if (dom === 'traffic') oType = 'TRAFFIC_DIVERSION';
                else if (dom === 'issues') oType = 'ROAD_REPAIR';

                if (window.openCreateWorkOrderModal) {
                    window.openCreateWorkOrderModal({
                        orderType: oType,
                        sourceDomain: dom,
                        sourceId: btn.dataset.sourceId,
                        title: `Dispatch: ${btn.dataset.title}`,
                        area: btn.dataset.area || ''
                    });
                }
            });
        });

        notificationsFeedContainer.querySelectorAll('.notif-btn-goto').forEach(btn => {
            btn.addEventListener('click', () => navigateToSource(btn.dataset.domain, btn.dataset.sourceId));
        });
    }

    async function markNotificationAsRead(notifId) {
        const apiBase = window.API_BASE_URL || 'http://127.0.0.1:8000/api';
        const getHeaders = window.getAuthHeaders || (() => ({}));
        const toast = window.showToast || console.log;

        try {
            const res = await fetch(`${apiBase}/notifications/${notifId}/read`, {
                method: 'PATCH',
                headers: getHeaders()
            });

            if (res.status === 200) {
                toast(`Notification ${notifId} marked as read.`, 'success');
                const item = notificationsState.find(n => n.id === notifId);
                if (item) item.status = 'READ';
                renderNotifications(notificationsState);
                loadNotificationsSummary();
            } else {
                const err = await res.json();
                toast(err.detail || 'Could not mark notification as read.', 'error');
            }
        } catch (e) {
            toast('Network error marking notification read.', 'error');
        }
    }

    function openAcknowledgeModal(notifId, title, message) {
        const acknowledgeModal = document.getElementById('acknowledgeModal');
        const ackNotifIdInput = document.getElementById('ackNotifIdInput');
        const ackModalNotifId = document.getElementById('ackModalNotifId');
        const ackModalAlertTitle = document.getElementById('ackModalAlertTitle');
        const ackModalAlertMessage = document.getElementById('ackModalAlertMessage');
        const ackRemarksInput = document.getElementById('ackRemarksInput');

        if (!acknowledgeModal) return;
        if (ackNotifIdInput) ackNotifIdInput.value = notifId;
        if (ackModalNotifId) ackModalNotifId.textContent = notifId;
        if (ackModalAlertTitle) ackModalAlertTitle.textContent = title || 'Operational Escalation';
        if (ackModalAlertMessage) ackModalAlertMessage.textContent = message || '';
        if (ackRemarksInput) ackRemarksInput.value = '';
        acknowledgeModal.style.display = 'flex';
        if (ackRemarksInput) ackRemarksInput.focus();
    }

    function closeAcknowledgeModal() {
        const acknowledgeModal = document.getElementById('acknowledgeModal');
        const acknowledgeForm = document.getElementById('acknowledgeForm');
        if (!acknowledgeModal) return;
        acknowledgeModal.style.display = 'none';
        if (acknowledgeForm) acknowledgeForm.reset();
    }

    async function handleAcknowledgeSubmit(notifId, remarks) {
        const apiBase = window.API_BASE_URL || 'http://127.0.0.1:8000/api';
        const getHeaders = window.getAuthHeaders || (() => ({}));
        const toast = window.showToast || console.log;

        try {
            const res = await fetch(`${apiBase}/notifications/${notifId}/acknowledge`, {
                method: 'PATCH',
                headers: {
                    ...getHeaders(),
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ remarks: remarks || null })
            });

            if (res.status === 200) {
                toast(`Notification ${notifId} acknowledged successfully.`, 'success');
                closeAcknowledgeModal();
                loadNotifications(false);
                loadNotificationsSummary();
            } else {
                const err = await res.json();
                toast(err.detail || 'Failed to acknowledge notification.', 'error');
            }
        } catch (e) {
            toast('Network error acknowledging notification.', 'error');
        }
    }

    async function syncOperationalAlerts() {
        const syncNotificationsBtn = document.getElementById('syncNotificationsBtn');
        const apiBase = window.API_BASE_URL || 'http://127.0.0.1:8000/api';
        const getHeaders = window.getAuthHeaders || (() => ({}));
        const toast = window.showToast || console.log;

        if (syncNotificationsBtn) syncNotificationsBtn.disabled = true;
        try {
            const res = await fetch(`${apiBase}/notifications/sync`, {
                method: 'POST',
                headers: getHeaders()
            });

            if (res.status === 200) {
                const data = await res.json();
                toast(`Sync complete: ${data.new_notifications} new alerts identified.`, 'success');
                loadNotifications(false);
                loadNotificationsSummary();
            } else {
                toast('Notification sync failed.', 'error');
            }
        } catch (e) {
            toast('Network error syncing alerts.', 'error');
        } finally {
            if (syncNotificationsBtn) syncNotificationsBtn.disabled = false;
        }
    }

    async function markAllVisibleAsRead() {
        const apiBase = window.API_BASE_URL || 'http://127.0.0.1:8000/api';
        const getHeaders = window.getAuthHeaders || (() => ({}));
        const toast = window.showToast || console.log;

        const unreadItems = notificationsState.filter(n => n.status === 'UNREAD');
        if (unreadItems.length === 0) {
            toast('No unread notifications to mark as read.', 'default');
            return;
        }

        let updatedCount = 0;
        for (const item of unreadItems) {
            try {
                const res = await fetch(`${apiBase}/notifications/${item.id}/read`, {
                    method: 'PATCH',
                    headers: getHeaders()
                });
                if (res.status === 200) updatedCount++;
            } catch (e) {}
        }

        toast(`Marked ${updatedCount} notifications as read.`, 'success');
        loadNotifications(false);
        loadNotificationsSummary();
    }

    function navigateToSource(domain, sourceId) {
        const toast = window.showToast || console.log;
        const switchSec = window.switchSection || ((s) => {});
        const openWo = window.openWorkOrderDetailsModal || (() => {});

        toast(`Navigating to ${sourceId} (${domain})...`, 'default');
        switch (domain) {
            case 'emergency_alerts':
                switchSec('emergency-alerts');
                break;
            case 'traffic':
                switchSec('traffic-monitoring');
                break;
            case 'traffic_violations':
                switchSec('traffic-violations');
                break;
            case 'issues':
                switchSec('dashboard');
                break;
            case 'risk':
                switchSec('risk');
                break;
            case 'work_order':
            case 'work_orders':
                switchSec('work-orders');
                if (sourceId) {
                    openWo(sourceId);
                }
                break;
            default:
                if (sourceId && sourceId.startsWith('WO-')) {
                    switchSec('work-orders');
                    openWo(sourceId);
                } else {
                    switchSec('dashboard');
                }
        }
    }

    function initNotificationListeners() {
        const closeAckModalBtn = document.getElementById('closeAckModalBtn');
        const cancelAckModalBtn = document.getElementById('cancelAckModalBtn');
        const acknowledgeModal = document.getElementById('acknowledgeModal');
        const acknowledgeForm = document.getElementById('acknowledgeForm');
        const ackNotifIdInput = document.getElementById('ackNotifIdInput');
        const ackRemarksInput = document.getElementById('ackRemarksInput');
        const notifStatusPills = document.querySelectorAll('.notif-status-pill');
        const notifSeverityFilter = document.getElementById('notifSeverityFilter');
        const notifDomainFilter = document.getElementById('notifDomainFilter');
        const resetNotifFiltersBtn = document.getElementById('resetNotifFiltersBtn');
        const syncNotificationsBtn = document.getElementById('syncNotificationsBtn');
        const markAllReadBtn = document.getElementById('markAllReadBtn');
        const refreshNotificationsBtn = document.getElementById('refreshNotificationsBtn');
        const headerNotifBtn = document.getElementById('headerNotifBtn');
        const toast = window.showToast || console.log;
        const switchSec = window.switchSection || ((s) => {});

        if (closeAckModalBtn) closeAckModalBtn.addEventListener('click', closeAcknowledgeModal);
        if (cancelAckModalBtn) cancelAckModalBtn.addEventListener('click', closeAcknowledgeModal);
        if (acknowledgeModal) {
            acknowledgeModal.addEventListener('click', (e) => {
                if (e.target === acknowledgeModal) closeAcknowledgeModal();
            });
        }

        if (acknowledgeForm) {
            acknowledgeForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const notifId = ackNotifIdInput ? ackNotifIdInput.value.trim() : '';
                const remarks = ackRemarksInput ? ackRemarksInput.value.trim() : '';
                if (notifId) {
                    await handleAcknowledgeSubmit(notifId, remarks);
                }
            });
        }

        notifStatusPills.forEach(pill => {
            pill.addEventListener('click', () => {
                notifStatusPills.forEach(p => p.classList.remove('active'));
                pill.classList.add('active');
                activeNotifStatusFilter = pill.dataset.status || 'ALL';
                loadNotifications(false);
            });
        });

        if (notifSeverityFilter) {
            notifSeverityFilter.addEventListener('change', () => loadNotifications(false));
        }

        if (notifDomainFilter) {
            notifDomainFilter.addEventListener('change', () => loadNotifications(false));
        }

        if (resetNotifFiltersBtn) {
            resetNotifFiltersBtn.addEventListener('click', () => {
                activeNotifStatusFilter = 'ALL';
                notifStatusPills.forEach(p => {
                    if (p.dataset.status === 'ALL') p.classList.add('active');
                    else p.classList.remove('active');
                });
                if (notifSeverityFilter) notifSeverityFilter.value = '';
                if (notifDomainFilter) notifDomainFilter.value = '';
                toast('Notification filters reset.', 'default');
                loadNotifications(false);
            });
        }

        if (syncNotificationsBtn) {
            syncNotificationsBtn.addEventListener('click', syncOperationalAlerts);
        }

        if (markAllReadBtn) {
            markAllReadBtn.addEventListener('click', markAllVisibleAsRead);
        }

        if (refreshNotificationsBtn) {
            refreshNotificationsBtn.addEventListener('click', () => loadNotifications(true));
        }

        if (headerNotifBtn) {
            headerNotifBtn.addEventListener('click', () => switchSec('notifications'));
        }
    }

    const NotificationsModule = {
        loadNotifications,
        loadNotificationsSummary,
        renderNotifications,
        markNotificationAsRead,
        openAcknowledgeModal,
        closeAcknowledgeModal,
        handleAcknowledgeSubmit,
        syncOperationalAlerts,
        markAllVisibleAsRead,
        navigateToSource,
        getNotifSeverityBadge,
        getNotifStatusBadge,
        getDomainIconAndLabel,
        getState: () => notificationsState,
        isFetching: () => isNotifFetching,
        init: initNotificationListeners
    };

    window.NotificationsModule = NotificationsModule;
    window.loadNotifications = loadNotifications;
    window.loadNotificationsSummary = loadNotificationsSummary;
    window.getNotifSeverityBadge = getNotifSeverityBadge;
    window.getNotifStatusBadge = getNotifStatusBadge;
    window.getDomainIconAndLabel = getDomainIconAndLabel;
    window.navigateToSource = navigateToSource;
})(window);
