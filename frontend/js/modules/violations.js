/**
 * Road System Control - Traffic Violations & Automated Enforcement Module
 * Logs and tracks rule violations, fine levies, penalty audits, and status lifecycle.
 */
(function(window) {
    'use strict';

    let violationsState = [];
    let isViolationsFetching = false;

    function getViolationSeverityBadge(severity) {
        const escape = window.escapeHtml || ((s) => s);
        switch (severity) {
            case 'Critical': return '<span class="badge badge-danger">Critical</span>';
            case 'High': return '<span class="badge badge-warning">High</span>';
            case 'Medium': return '<span class="badge badge-purple">Medium</span>';
            case 'Low': return '<span class="badge badge-neutral">Low</span>';
            default: return `<span class="badge badge-neutral">${escape(severity || 'Normal')}</span>`;
        }
    }

    function getViolationStatusBadge(status) {
        const escape = window.escapeHtml || ((s) => s);
        switch (status) {
            case 'Detected': return '<span class="badge badge-danger-soft">Detected</span>';
            case 'Under Review': return '<span class="badge badge-warning-soft">Under Review</span>';
            case 'Confirmed': return '<span class="badge badge-purple">Confirmed</span>';
            case 'Resolved': return '<span class="badge badge-success">Resolved</span>';
            default: return `<span class="badge badge-neutral">${escape(status || 'Detected')}</span>`;
        }
    }

    function renderViolationsSummary(summary) {
        if (!summary) return;
        const total = summary.total_violations || 0;
        const detected = summary.detected_count || 0;
        const review = summary.under_review_count || 0;
        const confirmed = summary.confirmed_count || 0;
        const fines = summary.total_fine_amount || 0;

        const violationTotalCount = document.getElementById('violationTotalCount');
        const violationDetectedCount = document.getElementById('violationDetectedCount');
        const violationReviewConfirmedCount = document.getElementById('violationReviewConfirmedCount');
        const violationTotalFines = document.getElementById('violationTotalFines');
        const metricViolations = document.getElementById('metricViolations');
        const metricViolationsSubtext = document.getElementById('metricViolationsSubtext');
        const sidebarViolationsCount = document.getElementById('sidebarViolationsCount');

        if (violationTotalCount) violationTotalCount.textContent = total;
        if (violationDetectedCount) violationDetectedCount.textContent = detected;
        if (violationReviewConfirmedCount) violationReviewConfirmedCount.textContent = `${review + confirmed}`;
        if (violationTotalFines) violationTotalFines.textContent = `₹${fines.toLocaleString('en-IN')}`;

        if (metricViolations) {
            metricViolations.textContent = total;
        }
        if (metricViolationsSubtext) {
            metricViolationsSubtext.textContent = `${detected} new, ${review + confirmed} in review`;
        }

        if (sidebarViolationsCount) {
            const activeCount = detected + review;
            sidebarViolationsCount.textContent = activeCount;
            sidebarViolationsCount.style.display = activeCount > 0 ? 'inline-block' : 'none';
        }
    }

    function renderViolationsTable(violations) {
        const trafficViolationsTableBody = document.getElementById('trafficViolationsTableBody');
        if (!trafficViolationsTableBody) return;
        trafficViolationsTableBody.innerHTML = '';

        if (!violations || violations.length === 0) {
            const emptyRow = document.createElement('tr');
            emptyRow.innerHTML = `
                <td colspan="8" class="text-center py-4 text-muted">
                    No traffic violations found in database. Click <strong>Log Rule Violation</strong> or run <code>python seed_traffic_violations.py</code>.
                </td>
            `;
            trafficViolationsTableBody.appendChild(emptyRow);
            return;
        }

        const escape = window.escapeHtml || ((s) => s);
        const formatTime = window.formatTimeAgo || ((d) => d);

        violations.forEach(v => {
            const row = document.createElement('tr');
            const vioId = v.id || 'VIO-XXXX';
            const vType = v.violation_type || 'Violation';
            const vehicle = v.vehicle_number || '-';
            const location = v.location || '-';
            const area = v.area || '';
            const severity = v.severity || 'Medium';
            const fine = typeof v.fine_amount === 'number' ? v.fine_amount : 0;
            const status = v.status || 'Detected';
            const detectedAt = v.detected_at || '';

            let actionsHtml = '';
            if (status === 'Detected') {
                actionsHtml = `
                    <div style="display: flex; gap: 4px; justify-content: flex-end;">
                        <button class="btn btn-xs btn-outline patch-vio-status-btn" data-id="${escape(vioId)}" data-status="Under Review" title="Mark Under Review">
                            Review
                        </button>
                        <button class="btn btn-xs btn-outline patch-vio-status-btn" data-id="${escape(vioId)}" data-status="Confirmed" title="Confirm Violation">
                            Confirm
                        </button>
                    </div>
                `;
            } else if (status === 'Under Review') {
                actionsHtml = `
                    <div style="display: flex; gap: 4px; justify-content: flex-end;">
                        <button class="btn btn-xs btn-outline patch-vio-status-btn" data-id="${escape(vioId)}" data-status="Confirmed" title="Confirm Violation">
                            Confirm
                        </button>
                        <button class="btn btn-xs btn-outline patch-vio-status-btn" data-id="${escape(vioId)}" data-status="Resolved" title="Dismiss / Resolve">
                            Resolve
                        </button>
                    </div>
                `;
            } else if (status === 'Confirmed') {
                actionsHtml = `
                    <div style="display: flex; gap: 4px; justify-content: flex-end;">
                        <button class="btn btn-xs btn-outline patch-vio-status-btn" data-id="${escape(vioId)}" data-status="Resolved" title="Mark Fine Paid / Resolved">
                            Mark Paid
                        </button>
                    </div>
                `;
            } else {
                actionsHtml = `<span class="text-xs text-muted font-medium">Settled</span>`;
            }

            row.innerHTML = `
                <td>
                    <div class="issue-name-cell">
                        <span class="issue-id-tag">${escape(vioId)}</span>
                        <strong>${escape(vType)}</strong>
                    </div>
                </td>
                <td>
                    <strong class="text-primary font-mono">${escape(vehicle)}</strong>
                </td>
                <td>
                    <div>${escape(location)}</div>
                    <span class="text-xs text-muted">${escape(area)}</span>
                </td>
                <td>${getViolationSeverityBadge(severity)}</td>
                <td>
                    <strong class="text-success">₹${fine.toLocaleString('en-IN')}</strong>
                </td>
                <td>${getViolationStatusBadge(status)}</td>
                <td class="text-muted" title="${detectedAt ? new Date(detectedAt).toLocaleString() : ''}">
                    ${formatTime(detectedAt)}
                </td>
                <td class="text-right">
                    ${actionsHtml}
                </td>
            `;
            trafficViolationsTableBody.appendChild(row);
        });

        trafficViolationsTableBody.querySelectorAll('.patch-vio-status-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const vioId = btn.dataset.id;
                const newStatus = btn.dataset.status;
                if (vioId && newStatus) {
                    await updateViolationStatus(vioId, newStatus);
                }
            });
        });
    }

    async function loadViolations(isInitial = false) {
        if (isViolationsFetching) return;
        isViolationsFetching = true;

        const trafficViolationsTableBody = document.getElementById('trafficViolationsTableBody');
        const violationLastUpdated = document.getElementById('violationLastUpdated');
        const apiBase = window.API_BASE_URL || 'http://127.0.0.1:8000/api';

        if (isInitial && trafficViolationsTableBody) {
            trafficViolationsTableBody.innerHTML = `
                <tr>
                    <td colspan="8" class="table-loading-cell">
                        <span class="spinner-inline"></span> Fetching violation telemetry from PostgreSQL...
                    </td>
                </tr>
            `;
        }

        try {
            const [violationsRes, summaryRes] = await Promise.all([
                fetch(`${apiBase}/traffic-violations`),
                fetch(`${apiBase}/traffic-violations/summary`)
            ]);

            if (!violationsRes.ok || !summaryRes.ok) {
                throw new Error("Unable to fetch violations from API");
            }

            const violationsData = await violationsRes.json();
            const summaryData = await summaryRes.json();

            violationsState = Array.isArray(violationsData) ? violationsData : [];
            renderViolationsSummary(summaryData);
            renderViolationsTable(violationsState);

            if (violationLastUpdated) {
                const now = new Date();
                violationLastUpdated.textContent = `Updated: ${now.toLocaleTimeString()}`;
            }
        } catch (error) {
            console.error("Failed to load traffic violations from FastAPI:", error);
            if (trafficViolationsTableBody) {
                trafficViolationsTableBody.innerHTML = `
                    <tr>
                        <td colspan="8" class="text-center py-4 text-danger font-medium">
                            Failed to fetch violations from FastAPI backend. Verify server is running on port 8000.
                        </td>
                    </tr>
                `;
            }
        } finally {
            isViolationsFetching = false;
        }
    }

    async function updateViolationStatus(violationId, newStatus) {
        const apiBase = window.API_BASE_URL || 'http://127.0.0.1:8000/api';
        const getHeaders = window.getAuthHeaders || (() => ({}));
        const toast = window.showToast || console.log;
        const openLogin = window.openLoginModal || (() => {});

        try {
            const res = await fetch(`${apiBase}/traffic-violations/${encodeURIComponent(violationId)}/status`, {
                method: 'PATCH',
                headers: getHeaders(),
                body: JSON.stringify({ status: newStatus })
            });

            if (res.status === 401) {
                toast("Authentication required: Please sign in as an Operator.", "error");
                openLogin('TRAFFIC_OPERATOR');
                return;
            } else if (res.status === 403) {
                toast("Access forbidden: Requires TRAFFIC_OPERATOR or ADMIN role.", "error");
                return;
            } else if (!res.ok) {
                throw new Error(`Failed to update violation status: ${res.status}`);
            }

            const updated = await res.json();
            toast(`Violation ${violationId} marked as ${newStatus}.`, 'success');

            const index = violationsState.findIndex(v => v.id === violationId);
            if (index !== -1) {
                violationsState[index] = updated;
            }

            const summaryRes = await fetch(`${apiBase}/traffic-violations/summary`);
            if (summaryRes.ok) {
                const summaryData = await summaryRes.json();
                renderViolationsSummary(summaryData);
            }
            renderViolationsTable(violationsState);
        } catch (err) {
            console.error("Failed to patch violation status:", err);
            toast("Failed to update violation status. Check server connection.", "error");
        }
    }

    function openCreateViolationModal() {
        const createViolationModal = document.getElementById('createViolationModal');
        if (!createViolationModal) return;
        createViolationModal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    }

    function closeCreateViolationModal() {
        const createViolationModal = document.getElementById('createViolationModal');
        const createViolationForm = document.getElementById('createViolationForm');
        if (!createViolationModal) return;
        createViolationModal.style.display = 'none';
        document.body.style.overflow = '';
        if (createViolationForm) createViolationForm.reset();
    }

    function initViolationListeners() {
        const openCreateViolationModalBtn = document.getElementById('openCreateViolationModalBtn');
        const closeCreateViolationModalBtn = document.getElementById('closeCreateViolationModalBtn');
        const cancelCreateViolationBtn = document.getElementById('cancelCreateViolationBtn');
        const createViolationModal = document.getElementById('createViolationModal');
        const createViolationForm = document.getElementById('createViolationForm');
        const submitViolationBtn = document.getElementById('submitViolationBtn');
        const refreshViolationsBtn = document.getElementById('refreshViolationsBtn');

        const violationTypeInput = document.getElementById('violationTypeInput');
        const violationVehicleNumberInput = document.getElementById('violationVehicleNumberInput');
        const violationLocationInput = document.getElementById('violationLocationInput');
        const violationAreaInput = document.getElementById('violationAreaInput');
        const violationSeverityInput = document.getElementById('violationSeverityInput');
        const violationFineAmountInput = document.getElementById('violationFineAmountInput');
        const violationStatusInput = document.getElementById('violationStatusInput');
        const violationDescriptionInput = document.getElementById('violationDescriptionInput');

        const apiBase = window.API_BASE_URL || 'http://127.0.0.1:8000/api';
        const getHeaders = window.getAuthHeaders || (() => ({}));
        const toast = window.showToast || console.log;
        const openLogin = window.openLoginModal || (() => {});

        if (openCreateViolationModalBtn) openCreateViolationModalBtn.addEventListener('click', openCreateViolationModal);
        if (closeCreateViolationModalBtn) closeCreateViolationModalBtn.addEventListener('click', closeCreateViolationModal);
        if (cancelCreateViolationBtn) cancelCreateViolationBtn.addEventListener('click', closeCreateViolationModal);
        if (createViolationModal) {
            createViolationModal.addEventListener('click', (e) => {
                if (e.target === createViolationModal) closeCreateViolationModal();
            });
        }

        if (refreshViolationsBtn) {
            refreshViolationsBtn.addEventListener('click', () => {
                toast("Syncing traffic violations...", "default");
                loadViolations(true);
            });
        }

        if (createViolationForm) {
            createViolationForm.addEventListener('submit', async (e) => {
                e.preventDefault();

                const vType = violationTypeInput ? violationTypeInput.value : '';
                const vehicle = violationVehicleNumberInput ? violationVehicleNumberInput.value.trim() : '';
                const location = violationLocationInput ? violationLocationInput.value.trim() : '';
                const area = violationAreaInput ? violationAreaInput.value.trim() : '';
                const severity = violationSeverityInput ? violationSeverityInput.value : 'Medium';
                const fine = violationFineAmountInput ? parseFloat(violationFineAmountInput.value) : 0;
                const status = violationStatusInput ? violationStatusInput.value : 'Detected';
                const description = violationDescriptionInput ? violationDescriptionInput.value.trim() : '';

                if (!vType || !vehicle || !location || !area || !description) {
                    toast("Please fill in all required violation fields.", "error");
                    return;
                }

                if (isNaN(fine) || fine < 0) {
                    toast("Fine amount cannot be negative.", "error");
                    return;
                }

                const payload = {
                    violation_type: vType,
                    vehicle_number: vehicle,
                    location: location,
                    area: area,
                    severity: severity,
                    fine_amount: fine,
                    status: status,
                    description: description,
                    detected_at: new Date().toISOString()
                };

                if (submitViolationBtn) {
                    submitViolationBtn.disabled = true;
                    submitViolationBtn.innerHTML = `<span class="spinner-inline"></span> Logging Violation...`;
                }

                try {
                    const response = await fetch(`${apiBase}/traffic-violations`, {
                        method: 'POST',
                        headers: getHeaders(),
                        body: JSON.stringify(payload)
                    });

                    if (response.status === 201) {
                        const createdVio = await response.json();
                        violationsState.unshift(createdVio);
                        closeCreateViolationModal();
                        toast(`Traffic Violation ${createdVio.id} recorded successfully!`, 'success');
                        loadViolations(false);
                    } else if (response.status === 401) {
                        toast("Authentication required: Please sign in as an Operator.", "error");
                        openLogin('TRAFFIC_OPERATOR');
                    } else if (response.status === 403) {
                        toast("Access forbidden: Requires TRAFFIC_OPERATOR or ADMIN role.", "error");
                    } else if (response.status === 422) {
                        const err = await response.json();
                        console.error("Validation error logging violation:", err);
                        toast("Some violation fields are invalid. Please check inputs.", "error");
                    } else {
                        throw new Error(`Server returned status: ${response.status}`);
                    }
                } catch (err) {
                    console.error("Failed to record violation:", err);
                    toast("Unable to save violation record. Verify FastAPI backend.", "error");
                } finally {
                    if (submitViolationBtn) {
                        submitViolationBtn.disabled = false;
                        submitViolationBtn.innerHTML = `
                            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                            Record Violation
                        `;
                    }
                }
            });
        }
    }

    const ViolationsModule = {
        loadViolations,
        updateViolationStatus,
        renderViolationsSummary,
        renderViolationsTable,
        openCreateViolationModal,
        closeCreateViolationModal,
        getViolationSeverityBadge,
        getViolationStatusBadge,
        getState: () => violationsState,
        isFetching: () => isViolationsFetching,
        init: initViolationListeners
    };

    window.ViolationsModule = ViolationsModule;
    window.loadViolations = loadViolations;
    window.updateViolationStatus = updateViolationStatus;
    window.getViolationSeverityBadge = getViolationSeverityBadge;
    window.getViolationStatusBadge = getViolationStatusBadge;
})(window);
