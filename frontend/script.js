/**
 * Road System Control — Phase 5 Integrated Frontend Logic
 * Vanilla JavaScript: FastAPI REST API integration, PostgreSQL data flow,
 * real-time health indicator, client validation, and detail modal.
 *
 * NOTE: As of Phase 5, PostgreSQL/FastAPI is the authoritative SOURCE OF TRUTH.
 * Issue persistence via localStorage has been completely removed.
 */

// ==========================================================================
// 1. BACKEND API CONFIGURATION
// ==========================================================================
const API_BASE_URL = "http://127.0.0.1:8000/api";

// In-memory cache for session image previews (client-side preview only; backend file upload in future phase)
const sessionImageMap = new Map();

// In-memory application state for road issues loaded from the API
let issuesState = [];

// ==========================================================================
// 2. MAIN DOM INITIALIZATION
// ==========================================================================
document.addEventListener('DOMContentLoaded', () => {
    // --- Navigation & Core Elements ---
    const sidebar = document.getElementById('sidebar');
    const mobileMenuBtn = document.getElementById('mobileMenuBtn');
    const sidebarCloseBtn = document.getElementById('sidebarCloseBtn');
    const sidebarBackdrop = document.getElementById('sidebarBackdrop');
    const navItems = document.querySelectorAll('.nav-item');
    const viewSections = document.querySelectorAll('.view-section');
    const activeSectionTitle = document.getElementById('activeSectionTitle');
    const toast = document.getElementById('toastNotification');
    const quickActionBtns = document.querySelectorAll('.quick-action-btn');

    // --- Backend Health Elements ---
    const systemStatusIndicator = document.getElementById('systemStatusIndicator');
    const systemStatusText = document.getElementById('systemStatusText');

    // --- Metrics & Table Elements ---
    const metricTotal = document.getElementById('metricTotal');
    const metricCritical = document.getElementById('metricCritical');
    const metricActive = document.getElementById('metricActive');
    const metricResolved = document.getElementById('metricResolved');
    const recentIssuesTableBody = document.getElementById('recentIssuesTableBody');
    const refreshIssuesBtn = document.getElementById('refreshIssuesBtn');

    // --- Report Issue Form Elements ---
    const reportIssueForm = document.getElementById('reportIssueForm');
    const issueTypeInput = document.getElementById('issueType');
    const issueDescriptionInput = document.getElementById('issueDescription');
    const issueLocationInput = document.getElementById('issueLocation');
    const issueAreaInput = document.getElementById('issueArea');
    const issueSeverityInput = document.getElementById('issueSeverity');
    const issueDateTimeInput = document.getElementById('issueDateTime');
    const issueImageInput = document.getElementById('issueImage');
    const imagePreviewCard = document.getElementById('imagePreviewCard');
    const imagePreviewImg = document.getElementById('imagePreviewImg');
    const imagePreviewName = document.getElementById('imagePreviewName');
    const removeImageBtn = document.getElementById('removeImageBtn');
    const clearFormBtn = document.getElementById('clearFormBtn');
    const submitIssueBtn = document.getElementById('submitIssueBtn');

    // --- Issue Details Modal Elements ---
    const issueDetailsModal = document.getElementById('issueDetailsModal');
    const modalIssueId = document.getElementById('modalIssueId');
    const modalIssueType = document.getElementById('modalIssueType');
    const modalLocation = document.getElementById('modalLocation');
    const modalArea = document.getElementById('modalArea');
    const modalSeverityContainer = document.getElementById('modalSeverityContainer');
    const modalStatusContainer = document.getElementById('modalStatusContainer');
    const modalReportedAt = document.getElementById('modalReportedAt');
    const modalDescription = document.getElementById('modalDescription');
    const modalPhotoSection = document.getElementById('modalPhotoSection');
    const modalPhotoImg = document.getElementById('modalPhotoImg');
    const closeModalBtn = document.getElementById('closeModalBtn');
    const closeModalFooterBtn = document.getElementById('closeModalFooterBtn');

    // In-memory holder for selected image in current form session
    let currentImageSessionDataUrl = null;

    // Section Titles Mapping
    const titlesMap = {
        'dashboard': 'Dashboard Overview',
        'report-issue': 'Report Road Issue',
        'traffic-monitoring': 'Traffic Monitoring',
        'emergency-alerts': 'Emergency Alerts',
        'map': 'Interactive Road Map',
        'admin': 'Administration & Roles'
    };

    // ==========================================================================
    // 3. UTILITY FUNCTIONS
    // ==========================================================================

    /**
     * Get current date-time string formatted for <input type="datetime-local">
     */
    function getLocalDateTimeString(dateObj = new Date()) {
        const offset = dateObj.getTimezoneOffset() * 60000;
        return (new Date(dateObj.getTime() - offset)).toISOString().slice(0, 16);
    }

    /**
     * Format timestamp into friendly relative time string (e.g. "10 min ago")
     */
    function formatTimeAgo(dateString) {
        if (!dateString) return 'Just now';
        const date = new Date(dateString);
        const now = new Date();
        const diffInSeconds = Math.floor((now - date) / 1000);

        if (isNaN(diffInSeconds) || diffInSeconds < 30) {
            return 'Just now';
        }
        if (diffInSeconds < 60) {
            return `${diffInSeconds}s ago`;
        }
        const diffInMinutes = Math.floor(diffInSeconds / 60);
        if (diffInMinutes < 60) {
            return `${diffInMinutes} min ago`;
        }
        const diffInHours = Math.floor(diffInMinutes / 60);
        if (diffInHours < 24) {
            return `${diffInHours} hr ago`;
        }
        const diffInDays = Math.floor(diffInHours / 24);
        if (diffInDays < 7) {
            return `${diffInDays} d ago`;
        }
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }

    /**
     * Helper to render appropriate severity badge HTML
     */
    function getSeverityBadge(severity) {
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
                return `<span class="badge badge-neutral">${escapeHtml(severity)}</span>`;
        }
    }

    /**
     * Helper to render appropriate status badge HTML
     */
    function getStatusBadge(status) {
        switch (status) {
            case 'Reported':
                return '<span class="badge badge-info">Reported</span>';
            case 'Under Review':
                return '<span class="badge badge-warning-soft">Under Review</span>';
            case 'In Progress':
                return '<span class="badge badge-purple">In Progress</span>';
            case 'Resolved':
                return '<span class="badge badge-success">Resolved</span>';
            default:
                return `<span class="badge badge-neutral">${escapeHtml(status)}</span>`;
        }
    }

    /**
     * Escape HTML helper to prevent XSS
     */
    function escapeHtml(str) {
        if (!str) return '';
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    /**
     * Display toast notifications
     * @param {string} message 
     * @param {string} type 'default' | 'success' | 'error'
     */
    let toastTimeout = null;
    function showToast(message, type = 'default') {
        if (!toast) return;
        toast.textContent = message;
        toast.className = 'toast-notification show';
        
        if (type === 'success') {
            toast.classList.add('toast-success');
        } else if (type === 'error') {
            toast.classList.add('toast-error');
        }

        clearTimeout(toastTimeout);
        toastTimeout = setTimeout(() => {
            toast.classList.remove('show');
        }, 3400);
    }

    /**
     * Switch visible dashboard section
     */
    function switchSection(sectionKey) {
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

        if (activeSectionTitle && titlesMap[sectionKey]) {
            activeSectionTitle.textContent = titlesMap[sectionKey];
        }

        window.scrollTo({ top: 0, behavior: 'smooth' });
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

    // ==========================================================================
    // 4. FASTAPI HEALTH CHECK
    // ==========================================================================
    async function checkBackendHealth() {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 3500);

            const response = await fetch(`${API_BASE_URL}/health`, {
                method: 'GET',
                signal: controller.signal
            });
            clearTimeout(timeoutId);

            if (response.ok) {
                const data = await response.json();
                if (data.status === 'ok') {
                    if (systemStatusIndicator) {
                        systemStatusIndicator.classList.remove('offline');
                        systemStatusIndicator.title = "Connected to FastAPI & PostgreSQL (Online)";
                    }
                    if (systemStatusText) {
                        systemStatusText.textContent = "System Operational";
                    }
                    return true;
                }
            }
            throw new Error(`Server returned status: ${response.status}`);
        } catch (error) {
            if (systemStatusIndicator) {
                systemStatusIndicator.classList.add('offline');
                systemStatusIndicator.title = "Cannot connect to FastAPI server at " + API_BASE_URL;
            }
            if (systemStatusText) {
                systemStatusText.textContent = "Backend Offline";
            }
            return false;
        }
    }

    // ==========================================================================
    // 5. FETCH & RENDER ISSUES FROM FASTAPI / POSTGRESQL
    // ==========================================================================

    /**
     * Recalculate and update dashboard metrics cards from API data
     */
    function updateDashboardMetrics(issues) {
        const total = issues.length;
        const critical = issues.filter(i => i.severity === 'Critical').length;
        const active = issues.filter(i => i.status !== 'Resolved').length;
        const resolved = issues.filter(i => i.status === 'Resolved').length;

        if (metricTotal) metricTotal.textContent = total;
        if (metricCritical) metricCritical.textContent = critical;
        if (metricActive) metricActive.textContent = active;
        if (metricResolved) metricResolved.textContent = resolved;
    }

    /**
     * Render issues into Recent Issues table
     */
    function renderIssuesTable(issues) {
        if (!recentIssuesTableBody) return;
        recentIssuesTableBody.innerHTML = '';

        if (issues.length === 0) {
            const emptyRow = document.createElement('tr');
            emptyRow.innerHTML = `
                <td colspan="6" class="text-center py-4 text-muted">
                    No road issues recorded in the database yet. Click <strong>Report Road Issue</strong> to submit the first incident.
                </td>
            `;
            recentIssuesTableBody.appendChild(emptyRow);
            return;
        }

        issues.forEach(issue => {
            const row = document.createElement('tr');
            row.className = 'clickable-row';

            // Dot indicator based on severity
            let indicatorClass = '';
            if (issue.severity === 'Critical') indicatorClass = 'danger';
            else if (issue.severity === 'Low') indicatorClass = 'info';

            // Location display with area tag if available
            const areaDisplay = issue.area ? `<span class="text-xs text-muted">(${escapeHtml(issue.area)})</span>` : '';

            // Check if photo preview was attached in session
            const hasPhotoSession = sessionImageMap.has(issue.id);

            row.innerHTML = `
                <td>
                    <div class="issue-name-cell">
                        <span class="issue-id-tag">${escapeHtml(issue.id)}</span>
                        <span class="issue-type-indicator ${indicatorClass}"></span>
                        <strong>${escapeHtml(issue.issueType)}</strong>
                        ${hasPhotoSession ? '<span title="Photo attached in this session" style="font-size:0.75rem;">📷</span>' : ''}
                    </div>
                </td>
                <td>${escapeHtml(issue.location)} ${areaDisplay}</td>
                <td>${getSeverityBadge(issue.severity)}</td>
                <td>${getStatusBadge(issue.status)}</td>
                <td class="text-muted" title="${new Date(issue.reportedAt).toLocaleString()}">
                    ${formatTimeAgo(issue.reportedAt)}
                </td>
                <td class="text-right">
                    <button type="button" class="btn btn-outline btn-sm view-issue-btn" data-id="${issue.id}">
                        View
                    </button>
                </td>
            `;

            row.addEventListener('click', () => {
                openIssueDetails(issue);
            });

            recentIssuesTableBody.appendChild(row);
        });
    }

    /**
     * Load issues via GET /api/issues from FastAPI backend
     */
    async function loadIssues(showLoadingSpinner = true) {
        if (showLoadingSpinner && recentIssuesTableBody) {
            recentIssuesTableBody.innerHTML = `
                <tr>
                    <td colspan="6" class="table-loading-cell">
                        <span class="spinner-inline"></span> Loading road issues from database...
                    </td>
                </tr>
            `;
        }

        try {
            const isOnline = await checkBackendHealth();
            if (!isOnline) {
                throw new Error("Backend connection offline");
            }

            const response = await fetch(`${API_BASE_URL}/issues`);
            if (!response.ok) {
                throw new Error(`Server returned error: ${response.status}`);
            }

            const data = await response.json();
            issuesState = Array.isArray(data) ? data : [];

            updateDashboardMetrics(issuesState);
            renderIssuesTable(issuesState);
        } catch (error) {
            console.error("Failed to load issues from FastAPI:", error);
            if (recentIssuesTableBody) {
                recentIssuesTableBody.innerHTML = `
                    <tr>
                        <td colspan="6" class="table-loading-cell text-danger">
                            ⚠️ Unable to connect to Road System Control server.<br>
                            <span class="text-xs text-muted">Please check that FastAPI is running on <code>http://127.0.0.1:8000</code>.</span>
                        </td>
                    </tr>
                `;
            }
            showToast("Unable to reach backend server. Please check FastAPI.", "error");
        }
    }

    // ==========================================================================
    // 6. ISSUE DETAILS MODAL
    // ==========================================================================
    function openIssueDetails(issue) {
        if (!issueDetailsModal) return;

        if (modalIssueId) modalIssueId.textContent = issue.id;
        if (modalIssueType) modalIssueType.textContent = issue.issueType;
        if (modalLocation) modalLocation.textContent = issue.location;
        if (modalArea) modalArea.textContent = issue.area || 'Not specified';
        if (modalSeverityContainer) modalSeverityContainer.innerHTML = getSeverityBadge(issue.severity);
        if (modalStatusContainer) modalStatusContainer.innerHTML = getStatusBadge(issue.status);
        if (modalReportedAt) {
            const d = new Date(issue.reportedAt);
            modalReportedAt.textContent = `${d.toLocaleDateString()} at ${d.toLocaleTimeString()} (${formatTimeAgo(issue.reportedAt)})`;
        }
        if (modalDescription) modalDescription.textContent = issue.description;

        // Display photo if cached in current session preview, otherwise hide cleanly
        const sessionImage = sessionImageMap.get(issue.id);
        if (sessionImage && modalPhotoSection && modalPhotoImg) {
            modalPhotoImg.src = sessionImage;
            modalPhotoSection.style.display = 'block';
        } else if (modalPhotoSection) {
            modalPhotoSection.style.display = 'none';
        }

        issueDetailsModal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    }

    function closeIssueDetails() {
        if (!issueDetailsModal) return;
        issueDetailsModal.style.display = 'none';
        document.body.style.overflow = '';
    }

    if (closeModalBtn) closeModalBtn.addEventListener('click', closeIssueDetails);
    if (closeModalFooterBtn) closeModalFooterBtn.addEventListener('click', closeIssueDetails);
    if (issueDetailsModal) {
        issueDetailsModal.addEventListener('click', (e) => {
            if (e.target === issueDetailsModal) closeIssueDetails();
        });
    }
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && issueDetailsModal && issueDetailsModal.style.display === 'flex') {
            closeIssueDetails();
        }
    });

    // ==========================================================================
    // 7. REPORT ISSUE FORM HANDLING & POST /api/issues
    // ==========================================================================

    if (issueDateTimeInput) {
        issueDateTimeInput.value = getLocalDateTimeString();
    }

    function clearFieldError(inputEl, errorElId) {
        if (inputEl) inputEl.classList.remove('is-invalid');
        const errorEl = document.getElementById(errorElId);
        if (errorEl) {
            errorEl.textContent = '';
            errorEl.classList.remove('visible');
        }
    }

    function setFieldError(inputEl, errorElId, message) {
        if (inputEl) inputEl.classList.add('is-invalid');
        const errorEl = document.getElementById(errorElId);
        if (errorEl) {
            errorEl.textContent = message;
            errorEl.classList.add('visible');
        }
    }

    if (issueTypeInput) {
        issueTypeInput.addEventListener('change', () => clearFieldError(issueTypeInput, 'issueTypeError'));
    }
    if (issueDescriptionInput) {
        issueDescriptionInput.addEventListener('input', () => clearFieldError(issueDescriptionInput, 'issueDescriptionError'));
    }
    if (issueLocationInput) {
        issueLocationInput.addEventListener('input', () => clearFieldError(issueLocationInput, 'issueLocationError'));
    }
    if (issueSeverityInput) {
        issueSeverityInput.addEventListener('change', () => clearFieldError(issueSeverityInput, 'issueSeverityError'));
    }
    if (issueDateTimeInput) {
        issueDateTimeInput.addEventListener('input', () => clearFieldError(issueDateTimeInput, 'issueDateTimeError'));
    }

    // Image file selection handler (session preview only)
    if (issueImageInput) {
        issueImageInput.addEventListener('change', (e) => {
            clearFieldError(issueImageInput, 'issueImageError');
            const file = e.target.files && e.target.files[0];

            if (!file) {
                resetImagePreview();
                return;
            }

            if (!file.type.startsWith('image/')) {
                setFieldError(issueImageInput, 'issueImageError', 'Selected file must be an image (PNG, JPG, WEBP).');
                issueImageInput.value = '';
                resetImagePreview();
                return;
            }

            const reader = new FileReader();
            reader.onload = (event) => {
                currentImageSessionDataUrl = event.target.result;
                if (imagePreviewImg) imagePreviewImg.src = currentImageSessionDataUrl;
                if (imagePreviewName) imagePreviewName.textContent = file.name;
                if (imagePreviewCard) imagePreviewCard.style.display = 'flex';
            };
            reader.readAsDataURL(file);
        });
    }

    function resetImagePreview() {
        currentImageSessionDataUrl = null;
        if (issueImageInput) issueImageInput.value = '';
        if (imagePreviewImg) imagePreviewImg.src = '';
        if (imagePreviewName) imagePreviewName.textContent = '';
        if (imagePreviewCard) imagePreviewCard.style.display = 'none';
    }

    if (removeImageBtn) {
        removeImageBtn.addEventListener('click', (e) => {
            e.preventDefault();
            resetImagePreview();
            clearFieldError(issueImageInput, 'issueImageError');
        });
    }

    function resetForm() {
        if (reportIssueForm) reportIssueForm.reset();
        if (issueDateTimeInput) issueDateTimeInput.value = getLocalDateTimeString();
        resetImagePreview();

        clearFieldError(issueTypeInput, 'issueTypeError');
        clearFieldError(issueDescriptionInput, 'issueDescriptionError');
        clearFieldError(issueLocationInput, 'issueLocationError');
        clearFieldError(issueSeverityInput, 'issueSeverityError');
        clearFieldError(issueDateTimeInput, 'issueDateTimeError');
        clearFieldError(issueImageInput, 'issueImageError');
    }

    if (clearFormBtn) {
        clearFormBtn.addEventListener('click', (e) => {
            e.preventDefault();
            resetForm();
            showToast('Form cleared.', 'default');
        });
    }

    /**
     * Submit Form: Send POST /api/issues to FastAPI
     */
    if (reportIssueForm) {
        reportIssueForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            let isValid = true;

            // 1. Validate Issue Type
            const issueType = issueTypeInput ? issueTypeInput.value : '';
            if (!issueType) {
                setFieldError(issueTypeInput, 'issueTypeError', 'Please select an issue type.');
                isValid = false;
            } else {
                clearFieldError(issueTypeInput, 'issueTypeError');
            }

            // 2. Validate Description
            const description = issueDescriptionInput ? issueDescriptionInput.value.trim() : '';
            if (!description) {
                setFieldError(issueDescriptionInput, 'issueDescriptionError', 'Please enter a description of the issue.');
                isValid = false;
            } else if (description.length < 5) {
                setFieldError(issueDescriptionInput, 'issueDescriptionError', 'Description must be at least 5 characters.');
                isValid = false;
            } else {
                clearFieldError(issueDescriptionInput, 'issueDescriptionError');
            }

            // 3. Validate Location
            const location = issueLocationInput ? issueLocationInput.value.trim() : '';
            if (!location) {
                setFieldError(issueLocationInput, 'issueLocationError', 'Please enter the road or landmark location.');
                isValid = false;
            } else {
                clearFieldError(issueLocationInput, 'issueLocationError');
            }

            // 4. Validate Severity
            const severity = issueSeverityInput ? issueSeverityInput.value : '';
            if (!severity) {
                setFieldError(issueSeverityInput, 'issueSeverityError', 'Please select the severity level.');
                isValid = false;
            } else {
                clearFieldError(issueSeverityInput, 'issueSeverityError');
            }

            // 5. Validate Date/Time
            const dateTimeVal = issueDateTimeInput ? issueDateTimeInput.value : '';
            if (!dateTimeVal) {
                setFieldError(issueDateTimeInput, 'issueDateTimeError', 'Please select the date and time.');
                isValid = false;
            } else {
                clearFieldError(issueDateTimeInput, 'issueDateTimeError');
            }

            if (!isValid) {
                showToast('Please correct the highlighted fields.', 'error');
                return;
            }

            // Build request payload with ONLY fields accepted by backend
            const areaVal = issueAreaInput && issueAreaInput.value.trim() ? issueAreaInput.value.trim() : null;
            const payload = {
                issueType: issueType,
                description: description,
                location: location,
                area: areaVal,
                severity: severity,
                reportedAt: new Date(dateTimeVal).toISOString()
            };

            // Loading state on submit button (prevents double submission)
            if (submitIssueBtn) {
                submitIssueBtn.disabled = true;
                submitIssueBtn.innerHTML = `<span class="spinner-inline"></span> Submitting to Database...`;
            }

            try {
                const response = await fetch(`${API_BASE_URL}/issues`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(payload)
                });

                if (response.status === 201) {
                    const createdIssue = await response.json();

                    // If photo was attached, cache in session for detail view
                    if (currentImageSessionDataUrl) {
                        sessionImageMap.set(createdIssue.id, currentImageSessionDataUrl);
                    }

                    // Prepend to in-memory state
                    issuesState.unshift(createdIssue);
                    updateDashboardMetrics(issuesState);
                    renderIssuesTable(issuesState);

                    // Reset form & navigate to dashboard
                    resetForm();
                    showToast(`Issue ${createdIssue.id} saved to PostgreSQL successfully!`, 'success');
                    switchSection('dashboard');
                } else if (response.status === 422) {
                    const errorDetail = await response.json();
                    console.error("Validation error from backend:", errorDetail);
                    showToast('Some issue details are invalid. Please check inputs.', 'error');
                } else {
                    throw new Error(`Server returned status: ${response.status}`);
                }
            } catch (error) {
                console.error("Failed to submit issue to FastAPI:", error);
                showToast('Unable to save issue. Please check that FastAPI backend is running.', 'error');
            } finally {
                // Restore button state
                if (submitIssueBtn) {
                    submitIssueBtn.disabled = false;
                    submitIssueBtn.innerHTML = `
                        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg>
                        Submit Road Issue
                    `;
                }
            }
        });
    }

    // ==========================================================================
    // 8. SIDEBAR, SYNC & QUICK ACTION EVENTS
    // ==========================================================================
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

    // Refresh / Sync Button
    if (refreshIssuesBtn) {
        refreshIssuesBtn.addEventListener('click', () => {
            showToast('Syncing with PostgreSQL database...', 'default');
            loadIssues(true);
        });
    }

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
                    showToast('Action triggered');
            }
        });
    });

    // ==========================================================================
    // 9. INITIALIZATION
    // ==========================================================================
    // Initial health check and load issues from PostgreSQL
    checkBackendHealth();
    loadIssues(true);

    // Periodic health check every 15 seconds to dynamically track backend connection
    setInterval(checkBackendHealth, 15000);
});
