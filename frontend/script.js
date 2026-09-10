/**
 * Road System Control — Phase 1 & 2 Frontend Logic
 * Vanilla JavaScript: Navigation, localStorage issue management, form validation, and detail modal
 */

// ==========================================================================
// TEMPORARY PHASE 2 STORAGE
// Temporary Phase 2 storage. This will be replaced by FastAPI/PostgreSQL in a later phase.
// ==========================================================================
const STORAGE_KEY = 'roadIssues';

// In-memory cache for session image previews (prevents localStorage quota overflow)
const sessionImageMap = new Map();

/**
 * Seed initial mock issues if localStorage is empty
 */
const initialSeedIssues = [
    {
        id: "ISS-1001",
        issueType: "Traffic Signal Failure",
        description: "Traffic signals stuck on red at Sitabuldi intersection causing bottleneck congestion across all 4 corridors.",
        location: "Sitabuldi",
        severity: "Critical",
        reportedAt: new Date(Date.now() - 25 * 60 * 1000).toISOString(),
        status: "Under Review",
        hasImage: false
    },
    {
        id: "ISS-1002",
        issueType: "Pothole",
        description: "Large deep pothole on the right lane near metro pillar 42. Poses high risk to two-wheelers.",
        location: "Wardha Road",
        severity: "High",
        reportedAt: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
        status: "Reported",
        hasImage: false
    },
    {
        id: "ISS-1003",
        issueType: "Waterlogging",
        description: "Monsoon runoff accumulated across two lanes due to clogged storm drains near subway entrance.",
        location: "Manish Nagar",
        severity: "Medium",
        reportedAt: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
        status: "Resolved",
        hasImage: false
    },
    {
        id: "ISS-1004",
        issueType: "Road Obstruction",
        description: "Large fallen tree branches partially obstructing vehicular traffic on outer lane.",
        location: "Hingna Road",
        severity: "High",
        reportedAt: new Date(Date.now() - 120 * 60 * 1000).toISOString(),
        status: "In Progress",
        hasImage: false
    }
];

/**
 * Fetch issues from localStorage
 * @returns {Array} List of issue objects
 */
function getStoredIssues() {
    try {
        const data = localStorage.getItem(STORAGE_KEY);
        if (!data) {
            // Seed initial data on first launch
            localStorage.setItem(STORAGE_KEY, JSON.stringify(initialSeedIssues));
            return [...initialSeedIssues];
        }
        return JSON.parse(data);
    } catch (e) {
        console.warn('Could not read from localStorage, using in-memory mock data:', e);
        return [...initialSeedIssues];
    }
}

/**
 * Save issues to localStorage
 * @param {Array} issues 
 */
function saveIssuesToStorage(issues) {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(issues));
    } catch (e) {
        console.error('Failed to save issues to localStorage:', e);
    }
}

// ==========================================================================
// MAIN DOM LOGIC
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

    // --- Metrics & Table Elements ---
    const metricTotal = document.getElementById('metricTotal');
    const metricCritical = document.getElementById('metricCritical');
    const metricActive = document.getElementById('metricActive');
    const metricResolved = document.getElementById('metricResolved');
    const recentIssuesTableBody = document.getElementById('recentIssuesTableBody');

    // --- Report Issue Form Elements ---
    const reportIssueForm = document.getElementById('reportIssueForm');
    const issueTypeInput = document.getElementById('issueType');
    const issueDescriptionInput = document.getElementById('issueDescription');
    const issueLocationInput = document.getElementById('issueLocation');
    const issueSeverityInput = document.getElementById('issueSeverity');
    const issueDateTimeInput = document.getElementById('issueDateTime');
    const issueImageInput = document.getElementById('issueImage');
    const imagePreviewCard = document.getElementById('imagePreviewCard');
    const imagePreviewImg = document.getElementById('imagePreviewImg');
    const imagePreviewName = document.getElementById('imagePreviewName');
    const removeImageBtn = document.getElementById('removeImageBtn');
    const clearFormBtn = document.getElementById('clearFormBtn');

    // --- Issue Details Modal Elements ---
    const issueDetailsModal = document.getElementById('issueDetailsModal');
    const modalIssueId = document.getElementById('modalIssueId');
    const modalIssueType = document.getElementById('modalIssueType');
    const modalLocation = document.getElementById('modalLocation');
    const modalSeverityContainer = document.getElementById('modalSeverityContainer');
    const modalStatusContainer = document.getElementById('modalStatusContainer');
    const modalReportedAt = document.getElementById('modalReportedAt');
    const modalDescription = document.getElementById('modalDescription');
    const modalPhotoSection = document.getElementById('modalPhotoSection');
    const modalPhotoImg = document.getElementById('modalPhotoImg');
    const closeModalBtn = document.getElementById('closeModalBtn');
    const closeModalFooterBtn = document.getElementById('closeModalFooterBtn');

    // In-memory holder for selected image data URL in the current form
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

    /**
     * Get current date-time string formatted for <input type="datetime-local">
     */
    function getLocalDateTimeString(dateObj = new Date()) {
        const offset = dateObj.getTimezoneOffset() * 60000;
        return (new Date(dateObj.getTime() - offset)).toISOString().slice(0, 16);
    }

    /**
     * Format timestamp to friendly relative time string (e.g. "10 min ago")
     */
    function formatTimeAgo(dateString) {
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
     * Escape HTML helper to prevent XSS in table & modal
     */
    function escapeHtml(str) {
        if (!str) return '';
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    /**
     * Display a toast notification
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
        }, 3200);
    }

    /**
     * Switch the visible section
     * @param {string} sectionKey 
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

        // Window scroll to top of content
        window.scrollTo({ top: 0, behavior: 'smooth' });

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

    // ==========================================================================
    // RECENT ISSUES TABLE & DASHBOARD METRICS
    // ==========================================================================
    function renderDashboard() {
        const issues = getStoredIssues();

        // 1. Calculate Metrics
        const totalCount = issues.length;
        const criticalCount = issues.filter(i => i.severity === 'Critical').length;
        const activeCount = issues.filter(i => i.status !== 'Resolved').length;
        const resolvedCount = issues.filter(i => i.status === 'Resolved').length;

        if (metricTotal) metricTotal.textContent = totalCount;
        if (metricCritical) metricCritical.textContent = criticalCount;
        if (metricActive) metricActive.textContent = activeCount;
        if (metricResolved) metricResolved.textContent = resolvedCount;

        // 2. Render Recent Issues Table
        if (!recentIssuesTableBody) return;
        recentIssuesTableBody.innerHTML = '';

        if (issues.length === 0) {
            const emptyRow = document.createElement('tr');
            emptyRow.innerHTML = `
                <td colspan="6" class="text-center py-4 text-muted">
                    No road issues recorded. Submit an issue using the button above to populate this feed.
                </td>
            `;
            recentIssuesTableBody.appendChild(emptyRow);
            return;
        }

        // Sort: newest first
        const sortedIssues = [...issues].sort((a, b) => new Date(b.reportedAt) - new Date(a.reportedAt));

        sortedIssues.forEach(issue => {
            const row = document.createElement('tr');
            row.className = 'clickable-row';

            // Severity dot indicator
            let indicatorClass = '';
            if (issue.severity === 'Critical') indicatorClass = 'danger';
            else if (issue.severity === 'Low') indicatorClass = 'info';

            row.innerHTML = `
                <td>
                    <div class="issue-name-cell">
                        <span class="issue-type-indicator ${indicatorClass}"></span>
                        <strong>${escapeHtml(issue.issueType)}</strong>
                        ${issue.hasImage ? '<span title="Photo evidence attached" style="font-size:0.75rem;">📷</span>' : ''}
                    </div>
                </td>
                <td>${escapeHtml(issue.location)}</td>
                <td>${getSeverityBadge(issue.severity)}</td>
                <td>${getStatusBadge(issue.status)}</td>
                <td class="text-muted" title="${new Date(issue.reportedAt).toLocaleString()}">${formatTimeAgo(issue.reportedAt)}</td>
                <td class="text-right">
                    <button type="button" class="btn btn-outline btn-sm view-issue-btn" data-id="${issue.id}">
                        View
                    </button>
                </td>
            `;

            // Row click triggers detail viewer
            row.addEventListener('click', (e) => {
                openIssueDetails(issue);
            });

            recentIssuesTableBody.appendChild(row);
        });
    }

    // ==========================================================================
    // ISSUE DETAILS MODAL
    // ==========================================================================
    function openIssueDetails(issue) {
        if (!issueDetailsModal) return;

        if (modalIssueId) modalIssueId.textContent = issue.id;
        if (modalIssueType) modalIssueType.textContent = issue.issueType;
        if (modalLocation) modalLocation.textContent = issue.location;
        if (modalSeverityContainer) modalSeverityContainer.innerHTML = getSeverityBadge(issue.severity);
        if (modalStatusContainer) modalStatusContainer.innerHTML = getStatusBadge(issue.status);
        if (modalReportedAt) {
            const d = new Date(issue.reportedAt);
            modalReportedAt.textContent = `${d.toLocaleDateString()} at ${d.toLocaleTimeString()} (${formatTimeAgo(issue.reportedAt)})`;
        }
        if (modalDescription) modalDescription.textContent = issue.description;

        // Check if image preview exists in session
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
            if (e.target === issueDetailsModal) {
                closeIssueDetails();
            }
        });
    }

    // Escape key closes modal
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && issueDetailsModal && issueDetailsModal.style.display === 'flex') {
            closeIssueDetails();
        }
    });

    // ==========================================================================
    // REPORT ISSUE FORM HANDLING & VALIDATION
    // ==========================================================================

    // Initialize datetime-local field with current timestamp
    if (issueDateTimeInput) {
        issueDateTimeInput.value = getLocalDateTimeString();
    }

    /**
     * Clear validation errors on inputs
     */
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

    // Attach input listeners to clear errors on change
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

    /**
     * Image Selection & Preview (Frontend session only)
     */
    if (issueImageInput) {
        issueImageInput.addEventListener('change', (e) => {
            clearFieldError(issueImageInput, 'issueImageError');
            const file = e.target.files && e.target.files[0];

            if (!file) {
                resetImagePreview();
                return;
            }

            // Verify file is an image
            if (!file.type.startsWith('image/')) {
                setFieldError(issueImageInput, 'issueImageError', 'Selected file must be an image (PNG, JPG, WEBP).');
                issueImageInput.value = '';
                resetImagePreview();
                return;
            }

            // Read image into session preview
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

    /**
     * Clear Form Action
     */
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
     * Submit Road Issue Form Handler
     */
    if (reportIssueForm) {
        reportIssueForm.addEventListener('submit', (e) => {
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

            // Create New Issue Object
            const newIssueId = `ISS-${Math.floor(1000 + Math.random() * 9000)}`;
            const newIssue = {
                id: newIssueId,
                issueType: issueType,
                description: description,
                location: location,
                severity: severity,
                reportedAt: new Date(dateTimeVal).toISOString(),
                status: 'Reported',
                hasImage: Boolean(currentImageSessionDataUrl)
            };

            // Cache session photo in memory (if selected)
            if (currentImageSessionDataUrl) {
                sessionImageMap.set(newIssueId, currentImageSessionDataUrl);
            }

            // Persist to localStorage (Temporary Phase 2 storage)
            const currentIssues = getStoredIssues();
            currentIssues.unshift(newIssue); // Put newest issue first
            saveIssuesToStorage(currentIssues);

            // Reset Form
            resetForm();

            // Refresh Dashboard Display
            renderDashboard();

            // Success feedback and navigate to dashboard
            showToast(`Issue ${newIssueId} submitted successfully!`, 'success');
            switchSection('dashboard');
        });
    }

    // ==========================================================================
    // SIDEBAR & QUICK ACTION EVENTS
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

    // Initial render of dashboard table and metrics from localStorage
    renderDashboard();
});
