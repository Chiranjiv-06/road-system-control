/**
 * Road System Control - Field Work Orders & Incident Dispatch Module
 * Operational lifecycle transitions (PENDING -> DISPATCHED -> IN_PROGRESS -> COMPLETED),
 * SLA tracking, crew dispatch, resolution auditing, and closed-loop resolution synchronization.
 */
(function(window) {
    'use strict';

    let workOrdersState = [];
    let isWorkOrdersFetching = false;

    function handleSessionExpired() {
        const toast = window.showToast || console.log;
        const openLogin = window.openLoginModal || (() => {});
        toast('Operator authentication required. Please sign in.', 'error');
        openLogin();
    }

    function getWorkOrderStatusBadge(status) {
        const escape = window.escapeHtml || ((s) => s);
        switch (status) {
            case 'PENDING':
                return '<span class="badge badge-pending">PENDING</span>';
            case 'DISPATCHED':
                return '<span class="badge badge-dispatched">DISPATCHED</span>';
            case 'IN_PROGRESS':
                return '<span class="badge badge-inprogress">IN PROGRESS</span>';
            case 'COMPLETED':
                return '<span class="badge badge-completed">COMPLETED</span>';
            case 'CANCELLED':
                return '<span class="badge badge-cancelled">CANCELLED</span>';
            default:
                return `<span class="badge badge-neutral">${escape(status || 'UNKNOWN')}</span>`;
        }
    }

    function getWorkOrderPriorityBadge(priority) {
        const escape = window.escapeHtml || ((s) => s);
        switch (priority) {
            case 'Critical':
                return '<span class="badge badge-danger">Critical</span>';
            case 'High':
                return '<span class="badge badge-warning">High</span>';
            case 'Medium':
                return '<span class="badge badge-info">Medium</span>';
            case 'Low':
                return '<span class="badge badge-neutral">Low</span>';
            default:
                return `<span class="badge badge-neutral">${escape(priority || 'Normal')}</span>`;
        }
    }

    function getWorkOrderSlaBadge(wo) {
        const slaStatus = wo.sla_status || 'ON_TRACK';
        if (wo.status === 'COMPLETED') {
            return '<span class="sla-pill sla-ontrack"><span class="sla-dot"></span> Resolved</span>';
        }
        if (wo.status === 'CANCELLED') {
            return '<span class="sla-pill" style="background:#f1f5f9;color:#64748b;border:1px solid #cbd5e1;"><span class="sla-dot" style="background:#94a3b8;"></span> Cancelled</span>';
        }
        if (slaStatus === 'BREACHED') {
            return '<span class="sla-pill sla-breached"><span class="sla-dot"></span> BREACHED</span>';
        }
        if (slaStatus === 'EXPIRING_SOON') {
            return '<span class="sla-pill sla-expiring"><span class="sla-dot"></span> Expiring Soon</span>';
        }
        return '<span class="sla-pill sla-ontrack"><span class="sla-dot"></span> On Track</span>';
    }

    function formatWoTimestamp(dateStr) {
        if (!dateStr) return '-';
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return String(dateStr);
        return `${d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}, ${d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}`;
    }

    function calculateRemainingTime(deadlineStr) {
        if (!deadlineStr) return '-';
        const deadline = new Date(deadlineStr);
        const now = new Date();
        const diffMs = deadline.getTime() - now.getTime();

        if (isNaN(diffMs)) return '-';
        if (diffMs <= 0) {
            const overdueMins = Math.abs(Math.floor(diffMs / (1000 * 60)));
            const overdueHours = Math.floor(overdueMins / 60);
            const remMins = overdueMins % 60;
            return overdueHours > 0 ? `${overdueHours}h ${remMins}m Overdue` : `${overdueMins}m Overdue`;
        }

        const totalMins = Math.floor(diffMs / (1000 * 60));
        const hours = Math.floor(totalMins / 60);
        const mins = totalMins % 60;
        if (hours > 24) {
            const days = Math.floor(hours / 24);
            const remH = hours % 24;
            return `${days}d ${remH}h remaining`;
        }
        return `${hours}h ${mins}m remaining`;
    }

    function formatSlaDeadline(dateStr, slaStatus, isTerminal) {
        if (!dateStr) return '-';
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return String(dateStr);

        const formattedDate = `${d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}, ${d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}`;

        if (isTerminal) {
            return `<div>${formattedDate}</div><span class="text-muted text-xs">Lifecycle Closed</span>`;
        }

        const remainingText = calculateRemainingTime(dateStr);
        if (slaStatus === 'BREACHED' || remainingText.includes('Overdue')) {
            return `<div>${formattedDate}</div><span class="text-danger text-xs font-medium">${remainingText}</span>`;
        }
        if (slaStatus === 'EXPIRING_SOON') {
            return `<div>${formattedDate}</div><span class="text-warning text-xs font-medium">${remainingText}</span>`;
        }
        return `<div>${formattedDate}</div><span class="text-muted text-xs">${remainingText}</span>`;
    }

    function getCompatibleSourceDomain(orderType) {
        switch (orderType) {
            case 'ROAD_REPAIR':
            case 'FIELD_INSPECTION':
                return 'issues';
            case 'EMERGENCY_RESPONSE':
                return 'emergency_alerts';
            case 'TRAFFIC_DIVERSION':
                return 'traffic';
            default:
                return 'issues';
        }
    }

    async function loadWorkOrders(showSpinner = false) {
        if (isWorkOrdersFetching) return;
        isWorkOrdersFetching = true;

        const workOrdersTableBody = document.getElementById('workOrdersTableBody');
        const woStatusFilter = document.getElementById('woStatusFilter');
        const woPriorityFilter = document.getElementById('woPriorityFilter');
        const woTypeFilter = document.getElementById('woTypeFilter');
        const woSlaFilter = document.getElementById('woSlaFilter');
        const woAreaSearch = document.getElementById('woAreaSearch');
        const apiBase = window.API_BASE_URL || 'http://127.0.0.1:8000/api';
        const getHeaders = window.getAuthHeaders || (() => ({}));

        if (showSpinner && workOrdersTableBody) {
            workOrdersTableBody.innerHTML = `
                <tr>
                    <td colspan="12" class="table-loading-cell">
                        <span class="spinner-inline"></span> Loading work orders from PostgreSQL...
                    </td>
                </tr>
            `;
        }

        try {
            const params = new URLSearchParams();
            if (woStatusFilter && woStatusFilter.value) params.append('status', woStatusFilter.value);
            if (woPriorityFilter && woPriorityFilter.value) params.append('priority', woPriorityFilter.value);
            if (woTypeFilter && woTypeFilter.value) params.append('order_type', woTypeFilter.value);
            if (woSlaFilter && woSlaFilter.value) params.append('sla_status', woSlaFilter.value);
            if (woAreaSearch && woAreaSearch.value.trim()) params.append('area', woAreaSearch.value.trim());

            const qs = params.toString() ? `?${params.toString()}` : '';
            const res = await fetch(`${apiBase}/work-orders${qs}`, {
                headers: getHeaders()
            });

            if (res.status === 200) {
                const data = await res.json();
                workOrdersState = data.items || [];
                renderWorkOrdersTable(workOrdersState);
            } else if (res.status === 401) {
                handleSessionExpired();
            } else {
                if (workOrdersTableBody) {
                    workOrdersTableBody.innerHTML = `
                        <tr>
                            <td colspan="12" class="table-loading-cell text-danger">
                                Failed to load work orders from backend (Status: ${res.status}).
                            </td>
                        </tr>
                    `;
                }
            }
        } catch (err) {
            console.error("Error fetching work orders:", err);
            if (workOrdersTableBody) {
                workOrdersTableBody.innerHTML = `
                    <tr>
                        <td colspan="12" class="table-loading-cell text-danger">
                            Network error connecting to work orders service.
                        </td>
                    </tr>
                `;
            }
        } finally {
            isWorkOrdersFetching = false;
        }
    }

    async function loadWorkOrdersSummary() {
        const woKpiTotal = document.getElementById('woKpiTotal');
        const woKpiActive = document.getElementById('woKpiActive');
        const woKpiBreached = document.getElementById('woKpiBreached');
        const woKpiCompleted = document.getElementById('woKpiCompleted');
        const woKpiCostSubtext = document.getElementById('woKpiCostSubtext');
        const sidebarWorkOrdersBadge = document.getElementById('sidebarWorkOrdersBadge');
        const apiBase = window.API_BASE_URL || 'http://127.0.0.1:8000/api';
        const getHeaders = window.getAuthHeaders || (() => ({}));
        const headers = getHeaders();

        if (!headers['Authorization']) {
            return;
        }

        try {
            const res = await fetch(`${apiBase}/work-orders/summary`, {
                headers
            });
            if (res.status === 200) {
                const s = await res.json();
                const total = s.total_orders ?? s.total_work_orders ?? 0;
                const active = (s.pending_count || 0) + (s.dispatched_count || 0) + (s.in_progress_count || 0);
                const breached = s.sla_breached_count ?? 0;
                const completed = s.completed_count ?? s.completed_work_orders ?? 0;
                const totalCost = s.total_cost ?? s.total_expenditure ?? 0;

                if (woKpiTotal) woKpiTotal.textContent = total;
                if (woKpiActive) woKpiActive.textContent = active;
                if (woKpiBreached) woKpiBreached.textContent = breached;
                if (woKpiCompleted) woKpiCompleted.textContent = completed;
                if (woKpiCostSubtext) {
                    const costFormatted = Number(totalCost).toLocaleString('en-IN');
                    woKpiCostSubtext.textContent = `₹${costFormatted} total expenditure`;
                }
                if (sidebarWorkOrdersBadge) {
                    if (active > 0) {
                        sidebarWorkOrdersBadge.textContent = active > 99 ? '99+' : active;
                        sidebarWorkOrdersBadge.style.display = 'inline-block';
                    } else {
                        sidebarWorkOrdersBadge.style.display = 'none';
                    }
                }
            }
        } catch (e) {
            console.warn("Could not fetch work orders summary:", e);
        }
    }

    function renderWorkOrdersTable(items) {
        const workOrdersTableBody = document.getElementById('workOrdersTableBody');
        const woCountBadge = document.getElementById('woCountBadge');
        const escape = window.escapeHtml || ((s) => s);

        if (!workOrdersTableBody) return;
        if (woCountBadge) {
            woCountBadge.textContent = `${items.length} Order${items.length === 1 ? '' : 's'}`;
        }

        if (items.length === 0) {
            workOrdersTableBody.innerHTML = `
                <tr>
                    <td colspan="12" style="text-align: center; padding: 2.5rem; color: var(--text-secondary);">
                        <div style="font-size: 2rem; margin-bottom: 0.5rem;">📋</div>
                        <strong>No Work Orders Found</strong>
                        <p style="margin: 0.25rem 0 0 0; font-size: 0.82rem;">Adjust filter parameters or create a new dispatch order.</p>
                    </td>
                </tr>
            `;
            return;
        }

        workOrdersTableBody.innerHTML = items.map(wo => {
            const isTerminal = wo.status === 'COMPLETED' || wo.status === 'CANCELLED';
            const readableType = (wo.order_type || '').replace(/_/g, ' ');
            return `
                <tr class="table-row-clickable" data-wo-id="${escape(wo.id)}">
                    <td><strong>${escape(wo.id)}</strong></td>
                    <td><span style="font-weight: 600; font-size: 0.78rem;">${escape(readableType)}</span></td>
                    <td>
                        <div style="font-weight: 600; color: var(--text-primary);">${escape(wo.title)}</div>
                        <div class="text-muted text-xs" style="max-width: 220px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${escape(wo.description)}">
                            ${escape(wo.description)}
                        </div>
                    </td>
                    <td>
                        ${wo.source_id ? `
                            <span class="wo-source-chip" title="Linked to ${escape(wo.source_domain)}">
                                <span style="font-size: 0.7rem;">🔗</span> ${escape(wo.source_id)}
                            </span>
                        ` : '<span class="text-muted text-xs">Direct</span>'}
                    </td>
                    <td>
                        <div style="font-weight: 500;">${escape(wo.area)}</div>
                        <div class="text-muted text-xs">${escape(wo.location)}</div>
                    </td>
                    <td>
                        <div class="wo-crew-label">
                            <span>👷</span> ${escape(wo.assigned_crew)}
                        </div>
                    </td>
                    <td>${getWorkOrderPriorityBadge(wo.priority)}</td>
                    <td>${formatSlaDeadline(wo.sla_deadline, wo.sla_status, isTerminal)}</td>
                    <td>${getWorkOrderSlaBadge(wo)}</td>
                    <td>${getWorkOrderStatusBadge(wo.status)}</td>
                    <td><span class="text-muted text-xs">${formatWoTimestamp(wo.created_at)}</span></td>
                    <td class="text-right" style="white-space: nowrap;">
                        <div style="display: inline-flex; gap: 0.35rem; justify-content: flex-end; align-items: center;">
                            <button type="button" class="btn btn-outline btn-sm btn-wo-action wo-btn-view" data-id="${escape(wo.id)}" title="Inspect work order details">
                                Details
                            </button>
                            ${!isTerminal ? `
                                <button type="button" class="btn btn-primary btn-sm btn-wo-action wo-btn-update" data-id="${escape(wo.id)}" title="Transition lifecycle state">
                                    Update
                                </button>
                            ` : `
                                <span class="text-muted text-xs" style="padding-right: 0.3rem;">Closed</span>
                            `}
                        </div>
                    </td>
                </tr>
            `;
        }).join('');

        workOrdersTableBody.querySelectorAll('tr').forEach(row => {
            row.addEventListener('click', (e) => {
                if (e.target.closest('.wo-btn-update') || e.target.closest('.wo-btn-view')) return;
                const woId = row.dataset.woId;
                if (woId) openWorkOrderDetailsModal(woId);
            });
        });

        workOrdersTableBody.querySelectorAll('.wo-btn-view').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                openWorkOrderDetailsModal(btn.dataset.id);
            });
        });

        workOrdersTableBody.querySelectorAll('.wo-btn-update').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                openUpdateWorkOrderModal(btn.dataset.id);
            });
        });
    }

    async function openWorkOrderDetailsModal(woId) {
        const workOrderDetailsModal = document.getElementById('workOrderDetailsModal');
        const woDetailErrorBanner = document.getElementById('woDetailErrorBanner');
        const woDetailTitle = document.getElementById('woDetailTitle');
        const woDetailDescription = document.getElementById('woDetailDescription');
        const woDetailStatusBadge = document.getElementById('woDetailStatusBadge');
        const woDetailUpdateStatusBtn = document.getElementById('woDetailUpdateStatusBtn');
        const apiBase = window.API_BASE_URL || 'http://127.0.0.1:8000/api';
        const getHeaders = window.getAuthHeaders || (() => ({}));
        const toast = window.showToast || console.log;

        if (!workOrderDetailsModal) return;
        if (woDetailErrorBanner) {
            woDetailErrorBanner.textContent = '';
            woDetailErrorBanner.style.display = 'none';
        }

        workOrderDetailsModal.style.display = 'flex';

        try {
            const res = await fetch(`${apiBase}/work-orders/${encodeURIComponent(woId.trim())}`, {
                headers: getHeaders()
            });

            if (res.status === 200) {
                const wo = await res.json();
                populateWorkOrderDetails(wo);
            } else if (res.status === 403) {
                const err = await res.json().catch(() => ({}));
                const msg = err.detail || `Access Forbidden: Your operator role is not authorized to view work order ${woId}.`;
                if (woDetailErrorBanner) {
                    woDetailErrorBanner.textContent = msg;
                    woDetailErrorBanner.style.display = 'block';
                }
                if (woDetailTitle) woDetailTitle.textContent = 'Access Restricted';
                if (woDetailDescription) woDetailDescription.textContent = msg;
                if (woDetailStatusBadge) woDetailStatusBadge.textContent = 'RESTRICTED';
                if (woDetailUpdateStatusBtn) woDetailUpdateStatusBtn.style.display = 'none';
            } else if (res.status === 404) {
                toast(`Work order '${woId}' not found.`, 'error');
                closeWorkOrderDetailsModal();
            } else if (res.status === 401) {
                handleSessionExpired();
                closeWorkOrderDetailsModal();
            } else {
                const err = await res.json().catch(() => ({}));
                toast(err.detail || `Error loading work order (${res.status})`, 'error');
                closeWorkOrderDetailsModal();
            }
        } catch (err) {
            console.error("Failed to load work order details:", err);
            toast('Network error loading work order details.', 'error');
            closeWorkOrderDetailsModal();
        }
    }

    function populateWorkOrderDetails(wo) {
        const woDetailIdBadge = document.getElementById('woDetailIdBadge');
        const woDetailStatusBadge = document.getElementById('woDetailStatusBadge');
        const woDetailTitle = document.getElementById('woDetailTitle');
        const woDetailDescription = document.getElementById('woDetailDescription');
        const woDetailOrderType = document.getElementById('woDetailOrderType');
        const woDetailAssignedRole = document.getElementById('woDetailAssignedRole');
        const woDetailCrew = document.getElementById('woDetailCrew');
        const woDetailPriority = document.getElementById('woDetailPriority');
        const woDetailSource = document.getElementById('woDetailSource');
        const woDetailArea = document.getElementById('woDetailArea');
        const woDetailLocation = document.getElementById('woDetailLocation');
        const woDetailTargetSla = document.getElementById('woDetailTargetSla');
        const woDetailSlaDeadline = document.getElementById('woDetailSlaDeadline');
        const woDetailSlaStatus = document.getElementById('woDetailSlaStatus');
        const woDetailSlaCountdown = document.getElementById('woDetailSlaCountdown');
        const woDetailCoords = document.getElementById('woDetailCoords');
        const woDetailCoordSource = document.getElementById('woDetailCoordSource');
        const woDetailCreatedBy = document.getElementById('woDetailCreatedBy');
        const woDetailCreatedAt = document.getElementById('woDetailCreatedAt');
        const woDetailDispatchedAt = document.getElementById('woDetailDispatchedAt');
        const woDetailCompletedAt = document.getElementById('woDetailCompletedAt');
        const woDetailCompletedBy = document.getElementById('woDetailCompletedBy');
        const woDetailActualCost = document.getElementById('woDetailActualCost');
        const woDetailResolutionBox = document.getElementById('woDetailResolutionBox');
        const woDetailResolutionNotes = document.getElementById('woDetailResolutionNotes');
        const woDetailUpdateStatusBtn = document.getElementById('woDetailUpdateStatusBtn');
        const escape = window.escapeHtml || ((s) => s);

        if (woDetailIdBadge) woDetailIdBadge.textContent = wo.id;
        if (woDetailStatusBadge) {
            woDetailStatusBadge.textContent = wo.status;
            woDetailStatusBadge.className = `badge ${wo.status === 'COMPLETED' ? 'badge-completed' : (wo.status === 'CANCELLED' ? 'badge-cancelled' : (wo.status === 'IN_PROGRESS' ? 'badge-inprogress' : (wo.status === 'DISPATCHED' ? 'badge-dispatched' : 'badge-pending')))}`;
        }
        if (woDetailTitle) woDetailTitle.textContent = wo.title;
        if (woDetailDescription) woDetailDescription.textContent = wo.description || 'No operational description provided.';

        const readableType = (wo.order_type || '').replace(/_/g, ' ');
        if (woDetailOrderType) woDetailOrderType.textContent = readableType;
        if (woDetailAssignedRole) woDetailAssignedRole.textContent = wo.assigned_role || 'ADMIN';
        if (woDetailCrew) woDetailCrew.textContent = wo.assigned_crew || 'Unassigned';
        if (woDetailPriority) woDetailPriority.innerHTML = getWorkOrderPriorityBadge(wo.priority);

        if (woDetailSource) {
            if (wo.source_id) {
                woDetailSource.innerHTML = `
                    <span class="wo-source-chip" style="cursor: pointer;" title="Navigate to source ${escape(wo.source_domain)}">
                        🔗 ${escape(wo.source_id)} (${escape(wo.source_domain)})
                    </span>
                `;
                const chip = woDetailSource.querySelector('.wo-source-chip');
                if (chip) {
                    chip.onclick = () => {
                        closeWorkOrderDetailsModal();
                        if (window.navigateToSource) window.navigateToSource(wo.source_domain, wo.source_id);
                    };
                }
            } else {
                woDetailSource.innerHTML = '<span class="text-muted text-xs">Direct Operational Dispatch</span>';
            }
        }

        if (woDetailArea) woDetailArea.textContent = wo.area || '-';
        if (woDetailLocation) woDetailLocation.textContent = wo.location || '-';

        const isTerminal = wo.status === 'COMPLETED' || wo.status === 'CANCELLED';
        if (woDetailTargetSla) woDetailTargetSla.textContent = `${wo.target_sla_hours || 24} Hours`;
        if (woDetailSlaDeadline) woDetailSlaDeadline.textContent = formatWoTimestamp(wo.sla_deadline);
        if (woDetailSlaStatus) woDetailSlaStatus.innerHTML = getWorkOrderSlaBadge(wo);

        if (woDetailSlaCountdown) {
            if (isTerminal) {
                woDetailSlaCountdown.innerHTML = '<span class="text-success">Work Order Closed</span>';
            } else if (wo.sla_status === 'BREACHED') {
                const rem = calculateRemainingTime(wo.sla_deadline);
                woDetailSlaCountdown.innerHTML = `<span class="text-danger font-bold">⚠️ Breached (${rem})</span>`;
            } else if (wo.sla_status === 'EXPIRING_SOON') {
                const rem = calculateRemainingTime(wo.sla_deadline);
                woDetailSlaCountdown.innerHTML = `<span class="text-warning font-bold">⏳ Expiring Soon (${rem})</span>`;
            } else {
                const rem = calculateRemainingTime(wo.sla_deadline);
                woDetailSlaCountdown.innerHTML = `<span class="text-primary font-bold">⏱️ On Track (${rem})</span>`;
            }
        }

        if (woDetailCoords) {
            if (wo.latitude != null && wo.longitude != null) {
                woDetailCoords.textContent = `${Number(wo.latitude).toFixed(4)}° N, ${Number(wo.longitude).toFixed(4)}° E`;
            } else {
                woDetailCoords.textContent = 'Derived from Sector Centroid Anchor';
            }
        }
        if (woDetailCoordSource) {
            woDetailCoordSource.textContent = (wo.latitude != null && wo.longitude != null)
                ? 'Explicit Field Coordinates'
                : 'Municipal Spatial Registry (Phase 12)';
        }

        if (woDetailCreatedBy) woDetailCreatedBy.textContent = wo.created_by || 'System Operator';
        if (woDetailCreatedAt) woDetailCreatedAt.textContent = formatWoTimestamp(wo.created_at);
        if (woDetailDispatchedAt) woDetailDispatchedAt.textContent = wo.dispatched_at ? formatWoTimestamp(wo.dispatched_at) : 'Not dispatched yet';
        if (woDetailCompletedAt) woDetailCompletedAt.textContent = wo.completed_at ? formatWoTimestamp(wo.completed_at) : (isTerminal ? 'Cancelled' : 'Pending completion');
        if (woDetailCompletedBy) woDetailCompletedBy.textContent = wo.completed_by || '-';
        if (woDetailActualCost) {
            woDetailActualCost.textContent = wo.actual_cost != null ? `₹${Number(wo.actual_cost).toLocaleString('en-IN')}` : '₹0 (Pending completion)';
        }

        if (woDetailResolutionBox && woDetailResolutionNotes) {
            if (wo.resolution_notes) {
                woDetailResolutionNotes.textContent = wo.resolution_notes;
                woDetailResolutionBox.style.display = 'block';
            } else {
                woDetailResolutionBox.style.display = 'none';
            }
        }

        if (woDetailUpdateStatusBtn) {
            if (isTerminal) {
                woDetailUpdateStatusBtn.style.display = 'none';
            } else {
                woDetailUpdateStatusBtn.style.display = 'inline-flex';
                woDetailUpdateStatusBtn.onclick = () => {
                    closeWorkOrderDetailsModal();
                    openUpdateWorkOrderModal(wo.id);
                };
            }
        }
    }

    function closeWorkOrderDetailsModal() {
        const workOrderDetailsModal = document.getElementById('workOrderDetailsModal');
        const woDetailErrorBanner = document.getElementById('woDetailErrorBanner');
        if (!workOrderDetailsModal) return;
        workOrderDetailsModal.style.display = 'none';
        if (woDetailErrorBanner) {
            woDetailErrorBanner.textContent = '';
            woDetailErrorBanner.style.display = 'none';
        }
    }

    function openCreateWorkOrderModal(prefill = {}) {
        const createWorkOrderModal = document.getElementById('createWorkOrderModal');
        const createWoErrorBanner = document.getElementById('createWoErrorBanner');
        const createWorkOrderForm = document.getElementById('createWorkOrderForm');
        const woOrderTypeInput = document.getElementById('woOrderTypeInput');
        const woSourceDomainHidden = document.getElementById('woSourceDomainHidden');
        const woSourceIdInput = document.getElementById('woSourceIdInput');
        const woTitleInput = document.getElementById('woTitleInput');
        const woAreaInput = document.getElementById('woAreaInput');
        const woLocationInput = document.getElementById('woLocationInput');
        const woPriorityInput = document.getElementById('woPriorityInput');
        const woLatitudeInput = document.getElementById('woLatitudeInput');
        const woLongitudeInput = document.getElementById('woLongitudeInput');

        const auth = window.Auth ? window.Auth.getState() : window.authState;
        const toast = window.showToast || console.log;
        const openLogin = window.openLoginModal || (() => {});

        if (!createWorkOrderModal) return;
        if (createWoErrorBanner) {
            createWoErrorBanner.textContent = '';
            createWoErrorBanner.style.display = 'none';
        }
        if (createWorkOrderForm) createWorkOrderForm.reset();

        if (!auth || !auth.token || !auth.user) {
            toast('Operator authentication required to dispatch work orders.', 'warning');
            openLogin();
            return;
        }

        const userRole = auth.user.role;

        const roleOrderTypes = {
            'ROAD_INSPECTOR': [
                { value: 'ROAD_REPAIR', label: 'Road Repair (Issues)' },
                { value: 'FIELD_INSPECTION', label: 'Field Inspection (Issues)' }
            ],
            'EMERGENCY_OPERATOR': [
                { value: 'EMERGENCY_RESPONSE', label: 'Emergency Response (Alerts)' }
            ],
            'TRAFFIC_OPERATOR': [
                { value: 'TRAFFIC_DIVERSION', label: 'Traffic Diversion (Traffic)' }
            ],
            'ADMIN': [
                { value: 'ROAD_REPAIR', label: 'Road Repair (Issues)' },
                { value: 'FIELD_INSPECTION', label: 'Field Inspection (Issues)' },
                { value: 'EMERGENCY_RESPONSE', label: 'Emergency Response (Alerts)' },
                { value: 'TRAFFIC_DIVERSION', label: 'Traffic Diversion (Traffic)' }
            ]
        };

        const allowedOptions = roleOrderTypes[userRole] || [];

        if (allowedOptions.length === 0) {
            toast(`Role '${userRole}' is not authorized to dispatch work orders.`, 'error');
            return;
        }

        if (woOrderTypeInput) {
            woOrderTypeInput.innerHTML = allowedOptions.map(opt =>
                `<option value="${opt.value}">${opt.label}</option>`
            ).join('');

            if (prefill.orderType && allowedOptions.some(o => o.value === prefill.orderType)) {
                woOrderTypeInput.value = prefill.orderType;
            } else {
                woOrderTypeInput.value = allowedOptions[0].value;
            }
        }

        if (woSourceDomainHidden && woOrderTypeInput) {
            woSourceDomainHidden.value = getCompatibleSourceDomain(woOrderTypeInput.value);
        }

        if (prefill.sourceId && woSourceIdInput) {
            woSourceIdInput.value = prefill.sourceId;
        }
        if (prefill.title && woTitleInput) {
            woTitleInput.value = prefill.title;
        }
        if (prefill.area && woAreaInput) {
            woAreaInput.value = prefill.area;
        }
        if (prefill.location && woLocationInput) {
            woLocationInput.value = prefill.location;
        }
        if (prefill.priority && woPriorityInput) {
            woPriorityInput.value = prefill.priority;
        }
        if (prefill.latitude && woLatitudeInput) {
            woLatitudeInput.value = prefill.latitude;
        }
        if (prefill.longitude && woLongitudeInput) {
            woLongitudeInput.value = prefill.longitude;
        }

        createWorkOrderModal.style.display = 'flex';
    }

    function closeCreateWorkOrderModal() {
        const createWorkOrderModal = document.getElementById('createWorkOrderModal');
        const createWoErrorBanner = document.getElementById('createWoErrorBanner');
        if (createWorkOrderModal) createWorkOrderModal.style.display = 'none';
        if (createWoErrorBanner) {
            createWoErrorBanner.textContent = '';
            createWoErrorBanner.style.display = 'none';
        }
    }

    async function handleCreateWorkOrderSubmit(e) {
        e.preventDefault();
        const submitCreateWoBtn = document.getElementById('submitCreateWoBtn');
        const createWoErrorBanner = document.getElementById('createWoErrorBanner');
        const woTitleInput = document.getElementById('woTitleInput');
        const woOrderTypeInput = document.getElementById('woOrderTypeInput');
        const woSourceDomainHidden = document.getElementById('woSourceDomainHidden');
        const woSourceIdInput = document.getElementById('woSourceIdInput');
        const woAreaInput = document.getElementById('woAreaInput');
        const woLocationInput = document.getElementById('woLocationInput');
        const woPriorityInput = document.getElementById('woPriorityInput');
        const woAssignedCrewInput = document.getElementById('woAssignedCrewInput');
        const woTargetSlaInput = document.getElementById('woTargetSlaInput');
        const woDescriptionInput = document.getElementById('woDescriptionInput');
        const woLatitudeInput = document.getElementById('woLatitudeInput');
        const woLongitudeInput = document.getElementById('woLongitudeInput');
        const apiBase = window.API_BASE_URL || 'http://127.0.0.1:8000/api';
        const getHeaders = window.getAuthHeaders || (() => ({}));
        const toast = window.showToast || console.log;

        if (!submitCreateWoBtn) return;

        const payload = {
            title: woTitleInput ? woTitleInput.value.trim() : '',
            order_type: woOrderTypeInput ? woOrderTypeInput.value : 'ROAD_REPAIR',
            source_domain: woSourceDomainHidden ? woSourceDomainHidden.value : 'issues',
            source_id: woSourceIdInput && woSourceIdInput.value.trim() ? woSourceIdInput.value.trim() : null,
            area: woAreaInput ? woAreaInput.value.trim() : '',
            location: woLocationInput ? woLocationInput.value.trim() : '',
            priority: woPriorityInput ? woPriorityInput.value : 'High',
            assigned_crew: woAssignedCrewInput ? woAssignedCrewInput.value.trim() : '',
            target_sla_hours: woTargetSlaInput ? parseInt(woTargetSlaInput.value, 10) : 24,
            description: woDescriptionInput ? woDescriptionInput.value.trim() : '',
            latitude: woLatitudeInput && woLatitudeInput.value ? parseFloat(woLatitudeInput.value) : null,
            longitude: woLongitudeInput && woLongitudeInput.value ? parseFloat(woLongitudeInput.value) : null
        };

        if (!payload.title || !payload.area || !payload.location || !payload.assigned_crew || !payload.description) {
            toast('Please fill in all mandatory fields.', 'error');
            return;
        }

        submitCreateWoBtn.disabled = true;
        if (createWoErrorBanner) createWoErrorBanner.style.display = 'none';

        try {
            const res = await fetch(`${apiBase}/work-orders`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...getHeaders()
                },
                body: JSON.stringify(payload)
            });

            if (res.status === 201) {
                const created = await res.json();
                toast(`Work Order ${created.id} dispatched successfully!`, 'success');
                closeCreateWorkOrderModal();
                loadWorkOrders(true);
                loadWorkOrdersSummary();
                if (window.loadMapData) window.loadMapData(false);
                if (window.loadNotifications) window.loadNotifications(false);
                if (window.loadNotificationsSummary) window.loadNotificationsSummary();
            } else if (res.status === 400 || res.status === 409 || res.status === 422) {
                const err = await res.json();
                const msg = err.detail || 'Dispatch failed: Duplicate active order or invalid pairing.';
                if (createWoErrorBanner) {
                    createWoErrorBanner.textContent = typeof msg === 'object' ? JSON.stringify(msg) : msg;
                    createWoErrorBanner.style.display = 'block';
                }
                toast(typeof msg === 'string' ? msg : 'Creation validation error', 'error');
            } else if (res.status === 403) {
                const err = await res.json();
                const msg = err.detail || 'Forbidden: Insufficient role permissions for this order type.';
                if (createWoErrorBanner) {
                    createWoErrorBanner.textContent = msg;
                    createWoErrorBanner.style.display = 'block';
                }
                toast(msg, 'error');
            } else if (res.status === 401) {
                handleSessionExpired();
            } else {
                const err = await res.json().catch(() => ({}));
                toast(err.detail || `Server error: ${res.status}`, 'error');
            }
        } catch (err) {
            toast('Network error dispatching work order.', 'error');
        } finally {
            submitCreateWoBtn.disabled = false;
        }
    }

    function openUpdateWorkOrderModal(woId) {
        const updateWorkOrderModal = document.getElementById('updateWorkOrderModal');
        const apiBase = window.API_BASE_URL || 'http://127.0.0.1:8000/api';
        const getHeaders = window.getAuthHeaders || (() => ({}));
        const toast = window.showToast || console.log;

        if (!updateWorkOrderModal) return;
        const wo = workOrdersState.find(w => w.id === woId);
        if (!wo) {
            fetch(`${apiBase}/work-orders/${encodeURIComponent(woId.trim())}`, {
                headers: getHeaders()
            }).then(r => r.json()).then(remoteWo => {
                if (remoteWo && remoteWo.id) {
                    populateUpdateWorkOrderForm(remoteWo);
                }
            }).catch(() => {
                toast(`Work order ${woId} not found.`, 'error');
            });
            return;
        }

        populateUpdateWorkOrderForm(wo);
    }

    function populateUpdateWorkOrderForm(wo) {
        const updateWorkOrderModal = document.getElementById('updateWorkOrderModal');
        const updateWoIdHidden = document.getElementById('updateWoIdHidden');
        const updateWoBadgeId = document.getElementById('updateWoBadgeId');
        const updateWoTitleDisplay = document.getElementById('updateWoTitleDisplay');
        const updateWoLocationDisplay = document.getElementById('updateWoLocationDisplay');
        const updateWoActualCostInput = document.getElementById('updateWoActualCostInput');
        const updateWoNotesInput = document.getElementById('updateWoNotesInput');
        const updateWoErrorBanner = document.getElementById('updateWoErrorBanner');
        const updateWoStatusSelect = document.getElementById('updateWoStatusSelect');
        const submitUpdateWoBtn = document.getElementById('submitUpdateWoBtn');
        const updateWoNotesLabel = document.getElementById('updateWoNotesLabel');
        const updateWoCostGroup = document.getElementById('updateWoCostGroup');

        if (!updateWorkOrderModal) return;

        if (updateWoIdHidden) updateWoIdHidden.value = wo.id;
        if (updateWoBadgeId) updateWoBadgeId.textContent = wo.id;
        if (updateWoTitleDisplay) updateWoTitleDisplay.textContent = wo.title;
        if (updateWoLocationDisplay) updateWoLocationDisplay.textContent = `${wo.area} — ${wo.location} | Crew: ${wo.assigned_crew} (${wo.status})`;
        if (updateWoActualCostInput) updateWoActualCostInput.value = wo.actual_cost != null ? wo.actual_cost : '';
        if (updateWoNotesInput) updateWoNotesInput.value = wo.resolution_notes || '';
        if (updateWoErrorBanner) {
            updateWoErrorBanner.textContent = '';
            updateWoErrorBanner.style.display = 'none';
        }

        if (updateWoStatusSelect) {
            updateWoStatusSelect.innerHTML = '';
            if (wo.status === 'PENDING') {
                updateWoStatusSelect.innerHTML = `
                    <option value="DISPATCHED" selected>DISPATCHED (Mobilize Crew to Site)</option>
                    <option value="IN_PROGRESS">IN_PROGRESS (Crew on Site)</option>
                    <option value="CANCELLED">CANCELLED (Abort Order)</option>
                `;
            } else if (wo.status === 'DISPATCHED') {
                updateWoStatusSelect.innerHTML = `
                    <option value="IN_PROGRESS" selected>IN_PROGRESS (Active Remediation on Site)</option>
                    <option value="CANCELLED">CANCELLED (Abort Order)</option>
                `;
            } else if (wo.status === 'IN_PROGRESS') {
                updateWoStatusSelect.innerHTML = `
                    <option value="COMPLETED" selected>COMPLETED (Remediation Done & Verified)</option>
                    <option value="CANCELLED">CANCELLED (Abort Order)</option>
                `;
            } else {
                updateWoStatusSelect.innerHTML = `<option value="${wo.status}">${wo.status} (Terminal State)</option>`;
                updateWoStatusSelect.disabled = true;
                if (submitUpdateWoBtn) submitUpdateWoBtn.disabled = true;
            }

            if (wo.status !== 'COMPLETED' && wo.status !== 'CANCELLED') {
                updateWoStatusSelect.disabled = false;
                if (submitUpdateWoBtn) submitUpdateWoBtn.disabled = false;
            }
        }

        const toggleFields = () => {
            const val = updateWoStatusSelect ? updateWoStatusSelect.value : '';
            if (val === 'COMPLETED') {
                if (updateWoNotesLabel) updateWoNotesLabel.innerHTML = 'Resolution Notes <span class="required-star">*</span>';
                if (updateWoNotesInput) updateWoNotesInput.required = true;
                if (updateWoCostGroup) updateWoCostGroup.style.display = 'block';
            } else {
                if (updateWoNotesLabel) updateWoNotesLabel.textContent = 'Operational / Transition Notes';
                if (updateWoNotesInput) updateWoNotesInput.required = false;
                if (updateWoCostGroup) updateWoCostGroup.style.display = 'block';
            }
        };

        if (updateWoStatusSelect) {
            updateWoStatusSelect.onchange = toggleFields;
        }
        toggleFields();

        updateWorkOrderModal.style.display = 'flex';
    }

    function closeUpdateWorkOrderModal() {
        const updateWorkOrderModal = document.getElementById('updateWorkOrderModal');
        const updateWoErrorBanner = document.getElementById('updateWoErrorBanner');
        if (updateWorkOrderModal) updateWorkOrderModal.style.display = 'none';
        if (updateWoErrorBanner) {
            updateWoErrorBanner.textContent = '';
            updateWoErrorBanner.style.display = 'none';
        }
    }

    async function handleUpdateWorkOrderSubmit(e) {
        e.preventDefault();
        const submitUpdateWoBtn = document.getElementById('submitUpdateWoBtn');
        const updateWoIdHidden = document.getElementById('updateWoIdHidden');
        const updateWoStatusSelect = document.getElementById('updateWoStatusSelect');
        const updateWoNotesInput = document.getElementById('updateWoNotesInput');
        const updateWoActualCostInput = document.getElementById('updateWoActualCostInput');
        const updateWoErrorBanner = document.getElementById('updateWoErrorBanner');
        const workOrderDetailsModal = document.getElementById('workOrderDetailsModal');
        const apiBase = window.API_BASE_URL || 'http://127.0.0.1:8000/api';
        const getHeaders = window.getAuthHeaders || (() => ({}));
        const toast = window.showToast || console.log;

        if (!submitUpdateWoBtn) return;

        const woId = updateWoIdHidden ? updateWoIdHidden.value : '';
        const status = updateWoStatusSelect ? updateWoStatusSelect.value : '';
        const notes = updateWoNotesInput ? updateWoNotesInput.value.trim() : '';
        const costVal = updateWoActualCostInput && updateWoActualCostInput.value ? parseFloat(updateWoActualCostInput.value) : null;

        if (status === 'COMPLETED' && (!notes || notes.length < 5)) {
            toast('Resolution notes (min 5 chars) are required to complete a work order.', 'error');
            if (updateWoErrorBanner) {
                updateWoErrorBanner.textContent = 'Resolution notes (min 5 characters) are required when marking an order as COMPLETED.';
                updateWoErrorBanner.style.display = 'block';
            }
            return;
        }

        const payload = {
            status: status,
            resolution_notes: notes || null,
            actual_cost: costVal
        };

        submitUpdateWoBtn.disabled = true;
        if (updateWoErrorBanner) updateWoErrorBanner.style.display = 'none';

        try {
            const res = await fetch(`${apiBase}/work-orders/${woId}/status`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    ...getHeaders()
                },
                body: JSON.stringify(payload)
            });

            if (res.status === 200) {
                const msg = status === 'COMPLETED'
                    ? `Work Order ${woId} COMPLETED! Linked source entity automatically resolved.`
                    : `Work Order ${woId} transitioned to ${status}.`;
                toast(msg, 'success');
                closeUpdateWorkOrderModal();

                if (workOrderDetailsModal && workOrderDetailsModal.style.display !== 'none') {
                    openWorkOrderDetailsModal(woId);
                }

                loadWorkOrders(false);
                loadWorkOrdersSummary();

                if (window.loadMapData) window.loadMapData(false);
                if (window.loadNotifications) window.loadNotifications(false);
                if (window.loadNotificationsSummary) window.loadNotificationsSummary();

                if (status === 'COMPLETED') {
                    if (window.loadIssues) window.loadIssues(false);
                    if (window.loadAlerts) window.loadAlerts(false);
                }
            } else if (res.status === 400 || res.status === 409 || res.status === 422) {
                const err = await res.json();
                const msg = err.detail || 'Invalid transition or completion validation failed.';
                if (updateWoErrorBanner) {
                    updateWoErrorBanner.textContent = typeof msg === 'object' ? JSON.stringify(msg) : msg;
                    updateWoErrorBanner.style.display = 'block';
                }
                toast(typeof msg === 'string' ? msg : 'Validation error updating status', 'error');
            } else if (res.status === 403) {
                const err = await res.json();
                const msg = err.detail || 'Forbidden: Insufficient role permissions for this operation.';
                if (updateWoErrorBanner) {
                    updateWoErrorBanner.textContent = msg;
                    updateWoErrorBanner.style.display = 'block';
                }
                toast(msg, 'error');
            } else if (res.status === 401) {
                handleSessionExpired();
            } else {
                const err = await res.json().catch(() => ({}));
                toast(err.detail || `Server error: ${res.status}`, 'error');
            }
        } catch (err) {
            toast('Network error updating work order.', 'error');
        } finally {
            submitUpdateWoBtn.disabled = false;
        }
    }

    function initWorkOrderListeners() {
        const woOrderTypeInput = document.getElementById('woOrderTypeInput');
        const woSourceDomainHidden = document.getElementById('woSourceDomainHidden');
        const refreshWorkOrdersBtn = document.getElementById('refreshWorkOrdersBtn');
        const openCreateWorkOrderModalBtn = document.getElementById('openCreateWorkOrderModalBtn');
        const closeCreateWorkOrderModalBtn = document.getElementById('closeCreateWoModalBtn');
        const cancelCreateWorkOrderBtn = document.getElementById('cancelCreateWoBtn');
        const createWorkOrderModal = document.getElementById('createWorkOrderModal');
        const createWorkOrderForm = document.getElementById('createWorkOrderForm');
        const closeUpdateWoModalBtn = document.getElementById('closeUpdateWoModalBtn');
        const cancelUpdateWoBtn = document.getElementById('cancelUpdateWoBtn');
        const updateWorkOrderModal = document.getElementById('updateWorkOrderModal');
        const updateWorkOrderForm = document.getElementById('updateWorkOrderForm');
        const closeWoDetailsModalBtn = document.getElementById('closeWoDetailsModalBtn');
        const closeWoDetailsModalFooterBtn = document.getElementById('closeWoDetailsModalFooterBtn');
        const workOrderDetailsModal = document.getElementById('workOrderDetailsModal');
        const woStatusFilter = document.getElementById('woStatusFilter');
        const woPriorityFilter = document.getElementById('woPriorityFilter');
        const woTypeFilter = document.getElementById('woTypeFilter');
        const woSlaFilter = document.getElementById('woSlaFilter');
        const woAreaSearch = document.getElementById('woAreaSearch');
        const resetWoFiltersBtn = document.getElementById('resetWoFiltersBtn');
        const toast = window.showToast || console.log;

        if (woOrderTypeInput && woSourceDomainHidden) {
            woOrderTypeInput.addEventListener('change', () => {
                woSourceDomainHidden.value = getCompatibleSourceDomain(woOrderTypeInput.value);
            });
        }

        if (refreshWorkOrdersBtn) {
            refreshWorkOrdersBtn.addEventListener('click', () => {
                toast('Syncing work orders from PostgreSQL...', 'default');
                loadWorkOrders(true);
                loadWorkOrdersSummary();
            });
        }

        if (openCreateWorkOrderModalBtn) {
            openCreateWorkOrderModalBtn.addEventListener('click', () => openCreateWorkOrderModal());
        }
        if (closeCreateWorkOrderModalBtn) closeCreateWorkOrderModalBtn.addEventListener('click', closeCreateWorkOrderModal);
        if (cancelCreateWorkOrderBtn) cancelCreateWorkOrderBtn.addEventListener('click', closeCreateWorkOrderModal);
        if (createWorkOrderModal) {
            createWorkOrderModal.addEventListener('click', (e) => {
                if (e.target === createWorkOrderModal) closeCreateWorkOrderModal();
            });
        }
        if (createWorkOrderForm) createWorkOrderForm.addEventListener('submit', handleCreateWorkOrderSubmit);

        if (closeUpdateWoModalBtn) closeUpdateWoModalBtn.addEventListener('click', closeUpdateWorkOrderModal);
        if (cancelUpdateWoBtn) cancelUpdateWoBtn.addEventListener('click', closeUpdateWorkOrderModal);
        if (updateWorkOrderModal) {
            updateWorkOrderModal.addEventListener('click', (e) => {
                if (e.target === updateWorkOrderModal) closeUpdateWorkOrderModal();
            });
        }
        if (updateWorkOrderForm) updateWorkOrderForm.addEventListener('submit', handleUpdateWorkOrderSubmit);

        if (closeWoDetailsModalBtn) closeWoDetailsModalBtn.addEventListener('click', closeWorkOrderDetailsModal);
        if (closeWoDetailsModalFooterBtn) closeWoDetailsModalFooterBtn.addEventListener('click', closeWorkOrderDetailsModal);
        if (workOrderDetailsModal) {
            workOrderDetailsModal.addEventListener('click', (e) => {
                if (e.target === workOrderDetailsModal) closeWorkOrderDetailsModal();
            });
        }

        if (woStatusFilter) woStatusFilter.addEventListener('change', () => loadWorkOrders(false));
        if (woPriorityFilter) woPriorityFilter.addEventListener('change', () => loadWorkOrders(false));
        if (woTypeFilter) woTypeFilter.addEventListener('change', () => loadWorkOrders(false));
        if (woSlaFilter) woSlaFilter.addEventListener('change', () => loadWorkOrders(false));
        if (woAreaSearch) {
            let searchDebounce = null;
            woAreaSearch.addEventListener('input', () => {
                clearTimeout(searchDebounce);
                searchDebounce = setTimeout(() => loadWorkOrders(false), 300);
            });
        }
        if (resetWoFiltersBtn) {
            resetWoFiltersBtn.addEventListener('click', () => {
                if (woStatusFilter) woStatusFilter.value = '';
                if (woPriorityFilter) woPriorityFilter.value = '';
                if (woTypeFilter) woTypeFilter.value = '';
                if (woSlaFilter) woSlaFilter.value = '';
                if (woAreaSearch) woAreaSearch.value = '';
                toast('Work order filters reset.', 'default');
                loadWorkOrders(false);
            });
        }
    }

    const WorkOrdersModule = {
        loadWorkOrders,
        loadWorkOrdersSummary,
        renderWorkOrdersTable,
        openWorkOrderDetailsModal,
        closeWorkOrderDetailsModal,
        openCreateWorkOrderModal,
        closeCreateWorkOrderModal,
        openUpdateWorkOrderModal,
        closeUpdateWorkOrderModal,
        getWorkOrderStatusBadge,
        getWorkOrderPriorityBadge,
        getWorkOrderSlaBadge,
        getState: () => workOrdersState,
        isFetching: () => isWorkOrdersFetching,
        init: initWorkOrderListeners
    };

    window.WorkOrdersModule = WorkOrdersModule;
    window.loadWorkOrders = loadWorkOrders;
    window.loadWorkOrdersSummary = loadWorkOrdersSummary;
    window.openWorkOrderDetailsModal = openWorkOrderDetailsModal;
    window.openCreateWorkOrderModal = openCreateWorkOrderModal;
    window.openUpdateWorkOrderModal = openUpdateWorkOrderModal;
    window.getWorkOrderStatusBadge = getWorkOrderStatusBadge;
    window.getWorkOrderPriorityBadge = getWorkOrderPriorityBadge;
    window.getWorkOrderSlaBadge = getWorkOrderSlaBadge;
})(window);
