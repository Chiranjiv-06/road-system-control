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

// In-memory application state for traffic records loaded from the API (Phase 6)
let trafficState = [];

// In-memory application state for emergency alerts loaded from the API (Phase 7)
let alertsState = [];

let currentActiveSection = 'dashboard';
let isTrafficFetching = false;
let isAlertsFetching = false;

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
    const sidebarAlertCount = document.getElementById('sidebarAlertCount');

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

    // --- Dashboard Emergency Alert Banner Elements (Phase 7) ---
    const dashboardEmergencyBanner = document.getElementById('dashboardEmergencyBanner');
    const dashboardAlertIconWrapper = document.getElementById('dashboardAlertIconWrapper');
    const dashboardAlertTitle = document.getElementById('dashboardAlertTitle');
    const dashboardAlertBadge = document.getElementById('dashboardAlertBadge');
    const dashboardAlertDesc = document.getElementById('dashboardAlertDesc');

    // --- Phase 6 Traffic Monitoring Elements ---
    const trafficTotalRecords = document.getElementById('trafficTotalRecords');
    const trafficTotalVehicles = document.getElementById('trafficTotalVehicles');
    const trafficAvgSpeed = document.getElementById('trafficAvgSpeed');
    const trafficCongestedCount = document.getElementById('trafficCongestedCount');
    const trafficTableBody = document.getElementById('trafficTableBody');
    const trafficLastUpdated = document.getElementById('trafficLastUpdated');
    const refreshTrafficBtn = document.getElementById('refreshTrafficBtn');
    const dashboardTrafficList = document.getElementById('dashboardTrafficList');
    const dashboardTrafficMeta = document.getElementById('dashboardTrafficMeta');

    // --- Phase 7 Emergency Alerts Center Elements ---
    const alertTotalCount = document.getElementById('alertTotalCount');
    const alertActiveCount = document.getElementById('alertActiveCount');
    const alertCriticalCount = document.getElementById('alertCriticalCount');
    const alertResolvedCount = document.getElementById('alertResolvedCount');
    const emergencyAlertsTableBody = document.getElementById('emergencyAlertsTableBody');
    const alertLastUpdated = document.getElementById('alertLastUpdated');
    const refreshAlertsBtn = document.getElementById('refreshAlertsBtn');

    // Create Emergency Alert Modal Elements
    const openCreateAlertModalBtn = document.getElementById('openCreateAlertModalBtn');
    const createAlertModal = document.getElementById('createAlertModal');
    const closeCreateAlertModalBtn = document.getElementById('closeCreateAlertModalBtn');
    const cancelCreateAlertBtn = document.getElementById('cancelCreateAlertBtn');
    const createAlertForm = document.getElementById('createAlertForm');
    const submitAlertBtn = document.getElementById('submitAlertBtn');
    const alertTypeInput = document.getElementById('alertTypeInput');
    const alertSeverityInput = document.getElementById('alertSeverityInput');
    const alertTitleInput = document.getElementById('alertTitleInput');
    const alertDescriptionInput = document.getElementById('alertDescriptionInput');
    const alertLocationInput = document.getElementById('alertLocationInput');
    const alertAreaInput = document.getElementById('alertAreaInput');
    const alertStatusInput = document.getElementById('alertStatusInput');

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

    // --- Phase 8 Traffic Violations Elements ---
    const sidebarViolationsCount = document.getElementById('sidebarViolationsCount');
    const metricViolations = document.getElementById('metricViolations');
    const metricViolationsSubtext = document.getElementById('metricViolationsSubtext');
    const violationTotalCount = document.getElementById('violationTotalCount');
    const violationDetectedCount = document.getElementById('violationDetectedCount');
    const violationReviewConfirmedCount = document.getElementById('violationReviewConfirmedCount');
    const violationTotalFines = document.getElementById('violationTotalFines');
    const trafficViolationsTableBody = document.getElementById('trafficViolationsTableBody');
    const violationLastUpdated = document.getElementById('violationLastUpdated');
    const refreshViolationsBtn = document.getElementById('refreshViolationsBtn');

    // Create Traffic Violation Modal Elements
    const openCreateViolationModalBtn = document.getElementById('openCreateViolationModalBtn');
    const createViolationModal = document.getElementById('createViolationModal');
    const closeCreateViolationModalBtn = document.getElementById('closeCreateViolationModalBtn');
    const cancelCreateViolationBtn = document.getElementById('cancelCreateViolationBtn');
    const createViolationForm = document.getElementById('createViolationForm');
    const submitViolationBtn = document.getElementById('submitViolationBtn');
    const violationTypeInput = document.getElementById('violationTypeInput');
    const violationVehicleNumberInput = document.getElementById('violationVehicleNumberInput');
    const violationLocationInput = document.getElementById('violationLocationInput');
    const violationAreaInput = document.getElementById('violationAreaInput');
    const violationSeverityInput = document.getElementById('violationSeverityInput');
    const violationFineAmountInput = document.getElementById('violationFineAmountInput');
    const violationStatusInput = document.getElementById('violationStatusInput');
    const violationDescriptionInput = document.getElementById('violationDescriptionInput');

    // --- Phase 9 Analytics & Intelligence Elements ---
    const refreshAnalyticsBtn = document.getElementById('refreshAnalyticsBtn');
    const analyticsAreaFilter = document.getElementById('analyticsAreaFilter');
    const analyticsStartDate = document.getElementById('analyticsStartDate');
    const analyticsEndDate = document.getElementById('analyticsEndDate');
    const applyAnalyticsFilterBtn = document.getElementById('applyAnalyticsFilterBtn');
    const resetAnalyticsFilterBtn = document.getElementById('resetAnalyticsFilterBtn');
    const analyticsLastUpdated = document.getElementById('analyticsLastUpdated');

    const analyticsKpiIssues = document.getElementById('analyticsKpiIssues');
    const analyticsKpiIssuesSubtext = document.getElementById('analyticsKpiIssuesSubtext');
    const analyticsKpiTraffic = document.getElementById('analyticsKpiTraffic');
    const analyticsKpiTrafficSubtext = document.getElementById('analyticsKpiTrafficSubtext');
    const analyticsKpiAlerts = document.getElementById('analyticsKpiAlerts');
    const analyticsKpiAlertsSubtext = document.getElementById('analyticsKpiAlertsSubtext');
    const analyticsKpiViolations = document.getElementById('analyticsKpiViolations');
    const analyticsKpiViolationsSubtext = document.getElementById('analyticsKpiViolationsSubtext');
    const analyticsKpiActiveEmergencies = document.getElementById('analyticsKpiActiveEmergencies');
    const analyticsKpiTotalFines = document.getElementById('analyticsKpiTotalFines');

    const analyticsTrafficAvgSpeed = document.getElementById('analyticsTrafficAvgSpeed');
    const analyticsTrafficAvgVehicles = document.getElementById('analyticsTrafficAvgVehicles');
    const analyticsCongestionStackedBar = document.getElementById('analyticsCongestionStackedBar');
    const analyticsCongestionLegend = document.getElementById('analyticsCongestionLegend');
    const analyticsTopVolumeRoadsList = document.getElementById('analyticsTopVolumeRoadsList');

    const analyticsIssuesTotal = document.getElementById('analyticsIssuesTotal');
    const analyticsIssuesUnresolved = document.getElementById('analyticsIssuesUnresolved');
    const analyticsIssueSeverityBars = document.getElementById('analyticsIssueSeverityBars');
    const analyticsIssuesTopAreasList = document.getElementById('analyticsIssuesTopAreasList');

    const analyticsEmergenciesActive = document.getElementById('analyticsEmergenciesActive');
    const analyticsEmergenciesTotal = document.getElementById('analyticsEmergenciesTotal');
    const analyticsEmergencyTypeBars = document.getElementById('analyticsEmergencyTypeBars');
    const analyticsRecentEmergenciesList = document.getElementById('analyticsRecentEmergenciesList');

    const analyticsViolationsTotalFines = document.getElementById('analyticsViolationsTotalFines');
    const analyticsViolationsAvgFine = document.getElementById('analyticsViolationsAvgFine');
    const analyticsViolationTypeBars = document.getElementById('analyticsViolationTypeBars');
    const analyticsViolationsTopAreasList = document.getElementById('analyticsViolationsTopAreasList');

    const analyticsTrendsCount = document.getElementById('analyticsTrendsCount');
    const analyticsTrendsTableBody = document.getElementById('analyticsTrendsTableBody');

    // In-memory holder for selected image in current form session
    let currentImageSessionDataUrl = null;

    // Section Titles Mapping
    const titlesMap = {
        'dashboard': 'Dashboard Overview',
        'report-issue': 'Report Road Issue',
        'traffic-monitoring': 'Traffic Monitoring',
        'emergency-alerts': 'Emergency Alerts',
        'traffic-violations': 'Traffic Violation & Rule Enforcement Center',
        'analytics': 'Traffic Analytics & Intelligence Center',
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
     * Helper to render congestion level badge HTML
     */
    function getCongestionBadge(level) {
        switch (level) {
            case 'Severe':
                return '<span class="traffic-pill pill-severe">Severe</span>';
            case 'Heavy':
                return '<span class="traffic-pill pill-heavy">Heavy</span>';
            case 'Moderate':
                return '<span class="traffic-pill pill-moderate">Moderate</span>';
            case 'Low':
                return '<span class="traffic-pill pill-low">Low</span>';
            default:
                return `<span class="traffic-pill pill-low">${escapeHtml(level)}</span>`;
        }
    }

    /**
     * Helper to render traffic status badge HTML
     */
    function getTrafficStatusBadge(status) {
        switch (status) {
            case 'Clear':
                return '<span class="badge badge-success">Clear</span>';
            case 'Moving':
                return '<span class="badge badge-info">Moving</span>';
            case 'Congested':
                return '<span class="badge badge-warning">Congested</span>';
            case 'Blocked':
                return '<span class="badge badge-danger">Blocked</span>';
            default:
                return `<span class="badge badge-neutral">${escapeHtml(status)}</span>`;
        }
    }

    /**
     * Helper to render emergency alert severity badge HTML (Phase 7)
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
                return `<span class="badge badge-neutral">${escapeHtml(severity)}</span>`;
        }
    }

    /**
     * Helper to render emergency alert status badge HTML (Phase 7)
     */
    function getAlertStatusBadge(status) {
        switch (status) {
            case 'Active':
                return '<span class="badge badge-danger">Active</span>';
            case 'Investigating':
                return '<span class="badge badge-warning-soft">Investigating</span>';
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
        currentActiveSection = sectionKey;

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

        // When navigating to traffic monitoring, emergency alerts, or dashboard, ensure data is loaded
        if (sectionKey === 'traffic-monitoring' || sectionKey === 'dashboard') {
            if (trafficState.length === 0 && !isTrafficFetching) {
                loadTraffic(true);
            }
        }
        if (sectionKey === 'emergency-alerts' || sectionKey === 'dashboard') {
            if (alertsState.length === 0 && !isAlertsFetching) {
                loadAlerts(true);
            }
        }
        if (sectionKey === 'traffic-violations' || sectionKey === 'dashboard') {
            if (violationsState.length === 0 && !isViolationsFetching) {
                loadViolations(true);
            }
        }
        if (sectionKey === 'analytics') {
            loadAnalytics(false);
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
    // 5B. FETCH & RENDER TRAFFIC FROM FASTAPI / POSTGRESQL (PHASE 6)
    // ==========================================================================

    /**
     * Populate traffic telemetry summary metric cards
     */
    function renderTrafficSummary(summary) {
        if (!summary) return;
        const totalRecs = summary.total_records ?? summary.totalRecords ?? 0;
        const totalVehs = summary.total_vehicles ?? summary.totalVehicles ?? 0;
        const avgSpd = summary.average_speed ?? summary.averageSpeed ?? 0;
        const heavy = summary.heavy_count ?? summary.heavyCount ?? 0;
        const severe = summary.severe_count ?? summary.severeCount ?? 0;

        if (trafficTotalRecords) trafficTotalRecords.textContent = totalRecs;
        if (trafficTotalVehicles) trafficTotalVehicles.textContent = totalVehs.toLocaleString();
        if (trafficAvgSpeed) trafficAvgSpeed.textContent = `${avgSpd} km/h`;
        if (trafficCongestedCount) trafficCongestedCount.textContent = (heavy + severe);
    }

    /**
     * Render traffic records into the Traffic Monitoring table
     */
    function renderTrafficTable(records) {
        if (!trafficTableBody) return;
        trafficTableBody.innerHTML = '';

        if (!records || records.length === 0) {
            const emptyRow = document.createElement('tr');
            emptyRow.innerHTML = `
                <td colspan="7" class="text-center py-4 text-muted">
                    No traffic telemetry records found in PostgreSQL. Run <code>python seed_traffic.py</code> to load demo corridor data.
                </td>
            `;
            trafficTableBody.appendChild(emptyRow);
            return;
        }

        records.forEach(record => {
            const row = document.createElement('tr');
            const roadName = record.road_name || record.roadName || 'Unknown Road';
            const vehicleCount = record.vehicle_count ?? record.vehicleCount ?? 0;
            const avgSpeed = record.average_speed ?? record.averageSpeed ?? 0;
            const congestion = record.congestion_level || record.congestionLevel || 'Low';
            const status = record.status || 'Moving';
            const recordedAt = record.recorded_at || record.recordedAt;

            row.innerHTML = `
                <td>
                    <div class="traffic-road-cell">
                        <span class="traffic-road-title">${escapeHtml(roadName)}</span>
                        <span class="traffic-road-id">${escapeHtml(record.id)}</span>
                    </div>
                </td>
                <td>${escapeHtml(record.area)}</td>
                <td><strong>${vehicleCount.toLocaleString()}</strong></td>
                <td>${avgSpeed} km/h</td>
                <td>${getCongestionBadge(congestion)}</td>
                <td>${getTrafficStatusBadge(status)}</td>
                <td class="text-muted" title="${recordedAt ? new Date(recordedAt).toLocaleString() : ''}">
                    ${formatTimeAgo(recordedAt)}
                </td>
            `;
            trafficTableBody.appendChild(row);
        });
    }

    /**
     * Render live corridor items on main Dashboard Overview panel
     */
    function renderDashboardTraffic(records) {
        if (!dashboardTrafficList) return;
        dashboardTrafficList.innerHTML = '';

        if (!records || records.length === 0) {
            dashboardTrafficList.innerHTML = `
                <div class="traffic-item text-center py-3 text-muted">
                    No active traffic corridors found in database.
                </div>
            `;
            if (dashboardTrafficMeta) dashboardTrafficMeta.textContent = '0 Corridors';
            return;
        }

        // Show up to 5 corridors on dashboard panel
        const displayRecords = records.slice(0, 5);
        displayRecords.forEach(record => {
            const item = document.createElement('div');
            item.className = 'traffic-item';
            const roadName = record.road_name || record.roadName || 'Unknown Corridor';
            const vehicleCount = record.vehicle_count ?? record.vehicleCount ?? 0;
            const avgSpeed = record.average_speed ?? record.averageSpeed ?? 0;
            const congestion = record.congestion_level || record.congestionLevel || 'Low';
            const status = record.status || 'Moving';

            item.innerHTML = `
                <div class="traffic-main">
                    <div class="traffic-road-name">${escapeHtml(roadName)}</div>
                    <div class="traffic-meta">Avg Speed: <strong>${avgSpeed} km/h</strong> • Vehicles: <strong>${vehicleCount.toLocaleString()}</strong></div>
                </div>
                <div class="traffic-condition">
                    ${getCongestionBadge(congestion)}
                    ${getTrafficStatusBadge(status)}
                </div>
            `;
            dashboardTrafficList.appendChild(item);
        });

        if (dashboardTrafficMeta) {
            dashboardTrafficMeta.textContent = `${records.length} Active Corridors`;
        }
    }

    /**
     * Render API error state for traffic telemetry
     */
    function renderTrafficError() {
        if (trafficTableBody) {
            trafficTableBody.innerHTML = `
                <tr>
                    <td colspan="7" class="table-loading-cell text-danger">
                        ⚠️ Unable to connect to Traffic Monitoring API.<br>
                        <span class="text-xs text-muted">Please check that FastAPI is running on <code>http://127.0.0.1:8000</code>.</span>
                    </td>
                </tr>
            `;
        }
        if (dashboardTrafficList) {
            dashboardTrafficList.innerHTML = `
                <div class="traffic-item text-center py-3 text-danger">
                    ⚠️ Unable to load live traffic stream
                </div>
            `;
        }
        if (trafficTotalRecords) trafficTotalRecords.textContent = '--';
        if (trafficTotalVehicles) trafficTotalVehicles.textContent = '--';
        if (trafficAvgSpeed) trafficAvgSpeed.textContent = '--';
        if (trafficCongestedCount) trafficCongestedCount.textContent = '--';
    }

    /**
     * Fetch traffic records and summary concurrently from FastAPI backend
     */
    async function loadTraffic(showLoadingSpinner = true) {
        if (isTrafficFetching) return;
        isTrafficFetching = true;

        if (showLoadingSpinner) {
            if (trafficTableBody) {
                trafficTableBody.innerHTML = `
                    <tr>
                        <td colspan="7" class="table-loading-cell">
                            <span class="spinner-inline"></span> Loading live traffic telemetry from PostgreSQL...
                        </td>
                    </tr>
                `;
            }
            if (dashboardTrafficList) {
                dashboardTrafficList.innerHTML = `
                    <div class="traffic-item text-center py-3 text-muted">
                        <span class="spinner-inline"></span> Loading live traffic corridors...
                    </div>
                `;
            }
        }

        try {
            const isOnline = await checkBackendHealth();
            if (!isOnline) {
                throw new Error("Backend connection offline");
            }

            const [recordsRes, summaryRes] = await Promise.all([
                fetch(`${API_BASE_URL}/traffic`),
                fetch(`${API_BASE_URL}/traffic/summary`)
            ]);

            if (!recordsRes.ok || !summaryRes.ok) {
                throw new Error(`Traffic API error: records status ${recordsRes.status}, summary status ${summaryRes.status}`);
            }

            const recordsData = await recordsRes.json();
            const summaryData = await summaryRes.json();

            trafficState = Array.isArray(recordsData) ? recordsData : [];
            renderTrafficSummary(summaryData);
            renderTrafficTable(trafficState);
            renderDashboardTraffic(trafficState);

            if (trafficLastUpdated) {
                const now = new Date();
                trafficLastUpdated.textContent = `Updated: ${now.toLocaleTimeString()}`;
            }
        } catch (error) {
            console.error("Failed to load traffic telemetry from FastAPI:", error);
            renderTrafficError();
        } finally {
            isTrafficFetching = false;
        }
    }

    // ==========================================================================
    // 5C. FETCH & RENDER EMERGENCY ALERTS FROM FASTAPI / POSTGRESQL (PHASE 7)
    // ==========================================================================

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

        // Update Dashboard Active Alerts metric card
        if (metricActive) metricActive.textContent = active;

        // Update Sidebar Badge
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
                dashboardAlertDesc.innerHTML = `${escapeHtml(activeCrit.description)} — Location: <strong>${escapeHtml(activeCrit.location)} (${escapeHtml(activeCrit.area)})</strong>`;
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
                dashboardAlertDesc.innerHTML = `${escapeHtml(activeAny.description)} — Location: <strong>${escapeHtml(activeAny.location)} (${escapeHtml(activeAny.area)})</strong>`;
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
            const area = alert.area ? `(${escapeHtml(alert.area)})` : '';
            const severity = alert.severity || 'Medium';
            const status = alert.status || 'Active';
            const issuedAt = alert.issued_at || alert.issuedAt;

            // Action Buttons based on status
            let actionsHtml = '';
            if (status === 'Active') {
                actionsHtml = `
                    <div class="alert-action-btns">
                        <button type="button" class="btn btn-outline btn-sm patch-status-btn" data-id="${escapeHtml(alertId)}" data-status="Investigating" title="Mark as investigating">
                            Investigate
                        </button>
                        <button type="button" class="btn btn-danger-outline btn-sm patch-status-btn" data-id="${escapeHtml(alertId)}" data-status="Resolved" title="Mark as resolved">
                            Resolve
                        </button>
                    </div>
                `;
            } else if (status === 'Investigating') {
                actionsHtml = `
                    <div class="alert-action-btns">
                        <button type="button" class="btn btn-outline btn-sm patch-status-btn" data-id="${escapeHtml(alertId)}" data-status="Resolved" title="Mark as resolved">
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
                        <span class="issue-id-tag">${escapeHtml(alertId)}</span>
                        <strong>${escapeHtml(alertType)}</strong>
                    </div>
                </td>
                <td>
                    <div style="max-width: 320px;">
                        <strong class="text-primary">${escapeHtml(title)}</strong>
                        <div class="text-xs text-muted" style="margin-top: 2px;">${escapeHtml(desc)}</div>
                    </div>
                </td>
                <td>
                    <div>${escapeHtml(location)}</div>
                    <span class="text-xs text-muted">${area}</span>
                </td>
                <td>${getAlertSeverityBadge(severity)}</td>
                <td>${getAlertStatusBadge(status)}</td>
                <td class="text-muted" title="${issuedAt ? new Date(issuedAt).toLocaleString() : ''}">
                    ${formatTimeAgo(issuedAt)}
                </td>
                <td class="text-right">
                    ${actionsHtml}
                </td>
            `;

            emergencyAlertsTableBody.appendChild(row);
        });

        // Attach event listeners to status update buttons
        emergencyAlertsTableBody.querySelectorAll('.patch-status-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const alertId = btn.dataset.id;
                const newStatus = btn.dataset.status;
                if (alertId && newStatus) {
                    await updateAlertStatus(alertId, newStatus);
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
            const isOnline = await checkBackendHealth();
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
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: newStatus })
            });

            if (!res.ok) {
                throw new Error(`Failed to update status: ${res.status}`);
            }

            const updated = await res.json();
            showToast(`Alert ${alertId} marked as ${newStatus}.`, 'success');

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
        } catch (err) {
            console.error("Failed to patch alert status:", err);
            showToast("Failed to update alert status. Check server connection.", "error");
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

    if (openCreateAlertModalBtn) openCreateAlertModalBtn.addEventListener('click', openCreateAlertModal);
    if (closeCreateAlertModalBtn) closeCreateAlertModalBtn.addEventListener('click', closeCreateAlertModal);
    if (cancelCreateAlertBtn) cancelCreateAlertBtn.addEventListener('click', closeCreateAlertModal);
    if (createAlertModal) {
        createAlertModal.addEventListener('click', (e) => {
            if (e.target === createAlertModal) closeCreateAlertModal();
        });
    }

    // Submit Create Alert Form
    if (createAlertForm) {
        createAlertForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const alertType = alertTypeInput ? alertTypeInput.value : '';
            const severity = alertSeverityInput ? alertSeverityInput.value : '';
            const title = alertTitleInput ? alertTitleInput.value.trim() : '';
            const description = alertDescriptionInput ? alertDescriptionInput.value.trim() : '';
            const location = alertLocationInput ? alertLocationInput.value.trim() : '';
            const area = alertAreaInput ? alertAreaInput.value.trim() : '';
            const status = alertStatusInput ? alertStatusInput.value : 'Active';

            if (!alertType || !severity || !title || !description || !location || !area) {
                showToast("Please fill in all required fields.", "error");
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
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });

                if (response.status === 201) {
                    const createdAlert = await response.json();
                    alertsState.unshift(createdAlert);
                    closeCreateAlertModal();
                    showToast(`Emergency Alert ${createdAlert.id} broadcast successfully!`, 'success');

                    // Refresh summary and render
                    loadAlerts(false);
                } else if (response.status === 422) {
                    const err = await response.json();
                    console.error("Validation error broadcasting alert:", err);
                    showToast("Some alert fields are invalid. Please check inputs.", "error");
                } else {
                    throw new Error(`Server returned status: ${response.status}`);
                }
            } catch (err) {
                console.error("Failed to broadcast alert:", err);
                showToast("Unable to save emergency alert. Please verify FastAPI backend.", "error");
            } finally {
                if (submitAlertBtn) {
                    submitAlertBtn.disabled = false;
                    submitAlertBtn.innerHTML = `
                        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                        Broadcast Live Alert
                    `;
                }
            }
        });
    }

    // ==========================================================================
    // 5C. TRAFFIC VIOLATION / RULE ENFORCEMENT (PHASE 8 FASTAPI + POSTGRESQL)
    // ==========================================================================

    /**
     * Map violation severity to UI badge
     */
    function getViolationSeverityBadge(severity) {
        switch (severity) {
            case 'Critical': return '<span class="badge badge-danger">Critical</span>';
            case 'High': return '<span class="badge badge-warning">High</span>';
            case 'Medium': return '<span class="badge badge-purple">Medium</span>';
            case 'Low': return '<span class="badge badge-neutral">Low</span>';
            default: return `<span class="badge badge-neutral">${escapeHtml(severity || 'Normal')}</span>`;
        }
    }

    /**
     * Map violation lifecycle status to UI badge
     */
    function getViolationStatusBadge(status) {
        switch (status) {
            case 'Detected': return '<span class="badge badge-danger-soft">Detected</span>';
            case 'Under Review': return '<span class="badge badge-warning-soft">Under Review</span>';
            case 'Confirmed': return '<span class="badge badge-purple">Confirmed</span>';
            case 'Resolved': return '<span class="badge badge-success">Resolved</span>';
            default: return `<span class="badge badge-neutral">${escapeHtml(status || 'Detected')}</span>`;
        }
    }

    /**
     * Update metric cards for traffic violations
     */
    function renderViolationsSummary(summary) {
        if (!summary) return;
        const total = summary.total_violations || 0;
        const detected = summary.detected_count || 0;
        const review = summary.under_review_count || 0;
        const confirmed = summary.confirmed_count || 0;
        const fines = summary.total_fine_amount || 0;

        if (violationTotalCount) violationTotalCount.textContent = total;
        if (violationDetectedCount) violationDetectedCount.textContent = detected;
        if (violationReviewConfirmedCount) violationReviewConfirmedCount.textContent = `${review + confirmed}`;
        if (violationTotalFines) violationTotalFines.textContent = `₹${fines.toLocaleString('en-IN')}`;

        // Dashboard overview metric card
        if (metricViolations) {
            metricViolations.textContent = total;
        }
        if (metricViolationsSubtext) {
            metricViolationsSubtext.textContent = `${detected} new, ${review + confirmed} in review`;
        }

        // Sidebar badge
        if (sidebarViolationsCount) {
            const activeCount = detected + review;
            sidebarViolationsCount.textContent = activeCount;
            sidebarViolationsCount.style.display = activeCount > 0 ? 'inline-block' : 'none';
        }
    }

    /**
     * Render traffic violations table
     */
    function renderViolationsTable(violations) {
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
                        <button class="btn btn-xs btn-outline patch-vio-status-btn" data-id="${escapeHtml(vioId)}" data-status="Under Review" title="Mark Under Review">
                            Review
                        </button>
                        <button class="btn btn-xs btn-outline patch-vio-status-btn" data-id="${escapeHtml(vioId)}" data-status="Confirmed" title="Confirm Violation">
                            Confirm
                        </button>
                    </div>
                `;
            } else if (status === 'Under Review') {
                actionsHtml = `
                    <div style="display: flex; gap: 4px; justify-content: flex-end;">
                        <button class="btn btn-xs btn-outline patch-vio-status-btn" data-id="${escapeHtml(vioId)}" data-status="Confirmed" title="Confirm Violation">
                            Confirm
                        </button>
                        <button class="btn btn-xs btn-outline patch-vio-status-btn" data-id="${escapeHtml(vioId)}" data-status="Resolved" title="Dismiss / Resolve">
                            Resolve
                        </button>
                    </div>
                `;
            } else if (status === 'Confirmed') {
                actionsHtml = `
                    <div style="display: flex; gap: 4px; justify-content: flex-end;">
                        <button class="btn btn-xs btn-outline patch-vio-status-btn" data-id="${escapeHtml(vioId)}" data-status="Resolved" title="Mark Fine Paid / Resolved">
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
                        <span class="issue-id-tag">${escapeHtml(vioId)}</span>
                        <strong>${escapeHtml(vType)}</strong>
                    </div>
                </td>
                <td>
                    <strong class="text-primary font-mono">${escapeHtml(vehicle)}</strong>
                </td>
                <td>
                    <div>${escapeHtml(location)}</div>
                    <span class="text-xs text-muted">${escapeHtml(area)}</span>
                </td>
                <td>${getViolationSeverityBadge(severity)}</td>
                <td>
                    <strong class="text-success">₹${fine.toLocaleString('en-IN')}</strong>
                </td>
                <td>${getViolationStatusBadge(status)}</td>
                <td class="text-muted" title="${detectedAt ? new Date(detectedAt).toLocaleString() : ''}">
                    ${formatTimeAgo(detectedAt)}
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

    /**
     * Fetch traffic violations and summary from FastAPI backend
     */
    async function loadViolations(isInitial = false) {
        if (isViolationsFetching) return;
        isViolationsFetching = true;

        if (isInitial && trafficViolationsTableBody) {
            trafficViolationsTableBody.innerHTML = `
                <tr>
                    <td colspan="8" class="table-loading-cell">
                        <span class="spinner-inline"></span> Loading live traffic violations from database...
                    </td>
                </tr>
            `;
        }

        try {
            const [violationsRes, summaryRes] = await Promise.all([
                fetch(`${API_BASE_URL}/traffic-violations`),
                fetch(`${API_BASE_URL}/traffic-violations/summary`)
            ]);

            if (!violationsRes.ok || !summaryRes.ok) {
                throw new Error(`Violations API error: ${violationsRes.status}, ${summaryRes.status}`);
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

    /**
     * Update violation status via PATCH /api/traffic-violations/{id}/status
     */
    async function updateViolationStatus(violationId, newStatus) {
        try {
            const res = await fetch(`${API_BASE_URL}/traffic-violations/${encodeURIComponent(violationId)}/status`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: newStatus })
            });

            if (!res.ok) {
                throw new Error(`Failed to update violation status: ${res.status}`);
            }

            const updated = await res.json();
            showToast(`Violation ${violationId} marked as ${newStatus}.`, 'success');

            const index = violationsState.findIndex(v => v.id === violationId);
            if (index !== -1) {
                violationsState[index] = updated;
            }

            const summaryRes = await fetch(`${API_BASE_URL}/traffic-violations/summary`);
            if (summaryRes.ok) {
                const summaryData = await summaryRes.json();
                renderViolationsSummary(summaryData);
            }
            renderViolationsTable(violationsState);
        } catch (err) {
            console.error("Failed to patch violation status:", err);
            showToast("Failed to update violation status. Check server connection.", "error");
        }
    }

    /**
     * Modal dialog handlers for logging rule violations
     */
    function openCreateViolationModal() {
        if (!createViolationModal) return;
        createViolationModal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    }

    function closeCreateViolationModal() {
        if (!createViolationModal) return;
        createViolationModal.style.display = 'none';
        document.body.style.overflow = '';
        if (createViolationForm) createViolationForm.reset();
    }

    if (openCreateViolationModalBtn) openCreateViolationModalBtn.addEventListener('click', openCreateViolationModal);
    if (closeCreateViolationModalBtn) closeCreateViolationModalBtn.addEventListener('click', closeCreateViolationModal);
    if (cancelCreateViolationBtn) cancelCreateViolationBtn.addEventListener('click', closeCreateViolationModal);
    if (createViolationModal) {
        createViolationModal.addEventListener('click', (e) => {
            if (e.target === createViolationModal) closeCreateViolationModal();
        });
    }

    // Submit Create Violation Form
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
                showToast("Please fill in all required violation fields.", "error");
                return;
            }

            if (isNaN(fine) || fine < 0) {
                showToast("Fine amount cannot be negative.", "error");
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
                const response = await fetch(`${API_BASE_URL}/traffic-violations`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });

                if (response.status === 201) {
                    const createdVio = await response.json();
                    violationsState.unshift(createdVio);
                    closeCreateViolationModal();
                    showToast(`Traffic Violation ${createdVio.id} recorded successfully!`, 'success');
                    loadViolations(false);
                } else if (response.status === 422) {
                    const err = await response.json();
                    console.error("Validation error logging violation:", err);
                    showToast("Some violation fields are invalid. Please check inputs.", "error");
                } else {
                    throw new Error(`Server returned status: ${response.status}`);
                }
            } catch (err) {
                console.error("Failed to record violation:", err);
                showToast("Unable to save violation record. Verify FastAPI backend.", "error");
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

    // ==========================================================================
    // 5D. TRAFFIC ANALYTICS & INTELLIGENCE (PHASE 9 FASTAPI + POSTGRESQL)
    // ==========================================================================
    let isAnalyticsFetching = false;
    let analyticsFilterState = {
        area: '',
        start_date: '',
        end_date: ''
    };

    function renderAnalyticsOverview(overview) {
        if (!overview) return;
        if (analyticsKpiIssues) analyticsKpiIssues.textContent = overview.total_issues ?? 0;
        if (analyticsKpiIssuesSubtext) analyticsKpiIssuesSubtext.textContent = `${overview.unresolved_issues ?? 0} Unresolved`;
        if (analyticsKpiTraffic) analyticsKpiTraffic.textContent = overview.total_traffic_records ?? 0;
        if (analyticsKpiTrafficSubtext) analyticsKpiTrafficSubtext.textContent = `Avg ${overview.average_traffic_speed ?? 0} km/h`;
        if (analyticsKpiAlerts) analyticsKpiAlerts.textContent = overview.total_alerts ?? 0;
        if (analyticsKpiAlertsSubtext) analyticsKpiAlertsSubtext.textContent = `${overview.active_emergencies ?? 0} Active Broadcasts`;
        if (analyticsKpiViolations) analyticsKpiViolations.textContent = overview.total_violations ?? 0;
        if (analyticsKpiViolationsSubtext) analyticsKpiViolationsSubtext.textContent = `${overview.active_violations ?? 0} Under Review`;
        if (analyticsKpiActiveEmergencies) analyticsKpiActiveEmergencies.textContent = overview.active_emergencies ?? 0;
        if (analyticsKpiTotalFines) analyticsKpiTotalFines.textContent = `₹${(overview.total_fines_assessed ?? 0).toLocaleString('en-IN')}`;
    }

    function renderAnalyticsTraffic(traffic) {
        if (!traffic) return;
        if (analyticsTrafficAvgSpeed) analyticsTrafficAvgSpeed.textContent = `${traffic.average_speed ?? 0} km/h`;
        if (analyticsTrafficAvgVehicles) analyticsTrafficAvgVehicles.textContent = `${traffic.average_vehicle_count ?? 0}`;

        // Congestion Stacked Bar
        const dist = traffic.congestion_distribution || {};
        const low = dist['Low'] || 0;
        const mod = dist['Moderate'] || 0;
        const heavy = dist['Heavy'] || 0;
        const severe = dist['Severe'] || 0;
        const total = (low + mod + heavy + severe) || 1;

        const pLow = Math.round((low / total) * 100);
        const pMod = Math.round((mod / total) * 100);
        const pHeavy = Math.round((heavy / total) * 100);
        const pSev = Math.max(0, 100 - pLow - pMod - pHeavy);

        if (analyticsCongestionStackedBar) {
            analyticsCongestionStackedBar.innerHTML = `
                <div class="stacked-bar-seg" style="width: ${pLow}%; background-color: var(--success-base);" title="Low: ${low}"></div>
                <div class="stacked-bar-seg" style="width: ${pMod}%; background-color: var(--primary-base);" title="Moderate: ${mod}"></div>
                <div class="stacked-bar-seg" style="width: ${pHeavy}%; background-color: var(--warning-base);" title="Heavy: ${heavy}"></div>
                <div class="stacked-bar-seg" style="width: ${pSev}%; background-color: var(--danger-base);" title="Severe: ${severe}"></div>
            `;
        }
        if (analyticsCongestionLegend) {
            analyticsCongestionLegend.innerHTML = `
                <div class="stacked-legend-item"><span class="stacked-legend-dot" style="background-color: var(--success-base);"></span> Low (${low})</div>
                <div class="stacked-legend-item"><span class="stacked-legend-dot" style="background-color: var(--primary-base);"></span> Mod (${mod})</div>
                <div class="stacked-legend-item"><span class="stacked-legend-dot" style="background-color: var(--warning-base);"></span> Heavy (${heavy})</div>
                <div class="stacked-legend-item"><span class="stacked-legend-dot" style="background-color: var(--danger-base);"></span> Severe (${severe})</div>
            `;
        }

        // Top Volume Roads
        if (analyticsTopVolumeRoadsList) {
            const roads = traffic.highest_volume_roads || [];
            if (roads.length === 0) {
                analyticsTopVolumeRoadsList.innerHTML = `<div class="text-muted text-xs">No traffic telemetry records recorded.</div>`;
            } else {
                const maxVol = Math.max(...roads.map(r => r.vehicle_count), 1);
                analyticsTopVolumeRoadsList.innerHTML = roads.map(r => {
                    const pct = Math.round((r.vehicle_count / maxVol) * 100);
                    return `
                        <div class="bar-metric-row">
                            <div class="bar-metric-header">
                                <span class="bar-metric-label">${escapeHtml(r.road_name)}</span>
                                <span class="bar-metric-val">${r.vehicle_count} veh (${r.average_speed} km/h)</span>
                            </div>
                            <div class="bar-metric-track">
                                <div class="bar-metric-fill blue" style="width: ${pct}%;"></div>
                            </div>
                        </div>
                    `;
                }).join('');
            }
        }
    }

    function renderAnalyticsIssues(issues) {
        if (!issues) return;
        if (analyticsIssuesTotal) analyticsIssuesTotal.textContent = issues.total_issues ?? 0;
        if (analyticsIssuesUnresolved) analyticsIssuesUnresolved.textContent = issues.unresolved_issue_count ?? 0;

        // Issues by severity
        if (analyticsIssueSeverityBars) {
            const sev = issues.issues_by_severity || {};
            const total = issues.total_issues || 1;
            const severities = [
                { label: 'Critical', count: sev['Critical'] || 0, color: 'red' },
                { label: 'High', count: sev['High'] || 0, color: 'amber' },
                { label: 'Medium', count: sev['Medium'] || 0, color: 'purple' },
                { label: 'Low', count: sev['Low'] || 0, color: 'blue' }
            ];

            analyticsIssueSeverityBars.innerHTML = severities.map(s => {
                const pct = Math.round((s.count / total) * 100);
                return `
                    <div class="bar-metric-row">
                        <div class="bar-metric-header">
                            <span class="bar-metric-label">${s.label}</span>
                            <span class="bar-metric-val">${s.count} (${pct}%)</span>
                        </div>
                        <div class="bar-metric-track">
                            <div class="bar-metric-fill ${s.color}" style="width: ${pct}%;"></div>
                        </div>
                    </div>
                `;
            }).join('');
        }

        // Most affected areas
        if (analyticsIssuesTopAreasList) {
            const areas = issues.most_affected_areas || [];
            if (areas.length === 0) {
                analyticsIssuesTopAreasList.innerHTML = `<div class="text-muted text-xs">No issue reports logged.</div>`;
            } else {
                const maxCount = Math.max(...areas.map(a => a.count), 1);
                analyticsIssuesTopAreasList.innerHTML = areas.map(a => {
                    const pct = Math.round((a.count / maxCount) * 100);
                    return `
                        <div class="bar-metric-row">
                            <div class="bar-metric-header">
                                <span class="bar-metric-label">${escapeHtml(a.area)}</span>
                                <span class="bar-metric-val">${a.count} issues</span>
                            </div>
                            <div class="bar-metric-track">
                                <div class="bar-metric-fill amber" style="width: ${pct}%;"></div>
                            </div>
                        </div>
                    `;
                }).join('');
            }
        }
    }

    function renderAnalyticsEmergencies(emergencies) {
        if (!emergencies) return;
        if (analyticsEmergenciesActive) analyticsEmergenciesActive.textContent = emergencies.active_alerts ?? 0;
        if (analyticsEmergenciesTotal) analyticsEmergenciesTotal.textContent = emergencies.total_alerts ?? 0;

        // Alerts by type
        if (analyticsEmergencyTypeBars) {
            const byType = emergencies.alerts_by_type || {};
            const keys = Object.keys(byType);
            if (keys.length === 0) {
                analyticsEmergencyTypeBars.innerHTML = `<div class="text-muted text-xs">No emergency alerts broadcast.</div>`;
            } else {
                const maxVal = Math.max(...Object.values(byType), 1);
                analyticsEmergencyTypeBars.innerHTML = keys.map(k => {
                    const cnt = byType[k];
                    const pct = Math.round((cnt / maxVal) * 100);
                    return `
                        <div class="bar-metric-row">
                            <div class="bar-metric-header">
                                <span class="bar-metric-label">${escapeHtml(k)}</span>
                                <span class="bar-metric-val">${cnt}</span>
                            </div>
                            <div class="bar-metric-track">
                                <div class="bar-metric-fill red" style="width: ${pct}%;"></div>
                            </div>
                        </div>
                    `;
                }).join('');
            }
        }

        // Recent emergencies
        if (analyticsRecentEmergenciesList) {
            const recent = emergencies.recent_emergency_activity || [];
            if (recent.length === 0) {
                analyticsRecentEmergenciesList.innerHTML = `<div class="text-muted text-xs">No recent emergency broadcasts.</div>`;
            } else {
                analyticsRecentEmergenciesList.innerHTML = recent.map(r => `
                    <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.35rem 0; border-bottom: 1px solid var(--border-subtle); font-size: 0.8rem;">
                        <div>
                            <strong>${escapeHtml(r.alert_type)}</strong>: ${escapeHtml(r.title)}
                            <div class="text-xs text-muted">${escapeHtml(r.area)} • ${formatTimeAgo(r.issued_at)}</div>
                        </div>
                        <div>
                            ${getAlertSeverityBadge(r.severity)}
                        </div>
                    </div>
                `).join('');
            }
        }
    }

    function renderAnalyticsViolations(violations) {
        if (!violations) return;
        if (analyticsViolationsTotalFines) analyticsViolationsTotalFines.textContent = `₹${(violations.total_fines ?? 0).toLocaleString('en-IN')}`;
        if (analyticsViolationsAvgFine) analyticsViolationsAvgFine.textContent = `₹${(violations.average_fine ?? 0).toLocaleString('en-IN')}`;

        // Violations by category
        if (analyticsViolationTypeBars) {
            const types = violations.violations_by_type || {};
            const keys = Object.keys(types);
            if (keys.length === 0) {
                analyticsViolationTypeBars.innerHTML = `<div class="text-muted text-xs">No violations recorded.</div>`;
            } else {
                const maxVal = Math.max(...Object.values(types), 1);
                analyticsViolationTypeBars.innerHTML = keys.map(k => {
                    const cnt = types[k];
                    const pct = Math.round((cnt / maxVal) * 100);
                    return `
                        <div class="bar-metric-row">
                            <div class="bar-metric-header">
                                <span class="bar-metric-label">${escapeHtml(k)}</span>
                                <span class="bar-metric-val">${cnt}</span>
                            </div>
                            <div class="bar-metric-track">
                                <div class="bar-metric-fill purple" style="width: ${pct}%;"></div>
                            </div>
                        </div>
                    `;
                }).join('');
            }
        }

        // Top violation areas
        if (analyticsViolationsTopAreasList) {
            const areas = violations.highest_violation_areas || [];
            if (areas.length === 0) {
                analyticsViolationsTopAreasList.innerHTML = `<div class="text-muted text-xs">No violation areas recorded.</div>`;
            } else {
                const maxVal = Math.max(...areas.map(a => a.count), 1);
                analyticsViolationsTopAreasList.innerHTML = areas.map(a => {
                    const pct = Math.round((a.count / maxVal) * 100);
                    return `
                        <div class="bar-metric-row">
                            <div class="bar-metric-header">
                                <span class="bar-metric-label">${escapeHtml(a.area)}</span>
                                <span class="bar-metric-val">${a.count} infractions</span>
                            </div>
                            <div class="bar-metric-track">
                                <div class="bar-metric-fill purple" style="width: ${pct}%;"></div>
                            </div>
                        </div>
                    `;
                }).join('');
            }
        }
    }

    function renderAnalyticsTrends(trends) {
        if (!trends) return;
        const dates = trends.dates || [];
        if (analyticsTrendsCount) {
            analyticsTrendsCount.textContent = `${dates.length} Observation Dates`;
        }

        if (!analyticsTrendsTableBody) return;
        if (dates.length === 0) {
            analyticsTrendsTableBody.innerHTML = `<tr><td colspan="7" class="text-center py-3 text-muted">No chronological trend data found.</td></tr>`;
            return;
        }

        const issuesMap = Object.fromEntries((trends.issues_trend || []).map(i => [i.date, i.count]));
        const trafficMap = Object.fromEntries((trends.traffic_trend || []).map(t => [t.date, t]));
        const alertsMap = Object.fromEntries((trends.emergencies_trend || []).map(e => [e.date, e.count]));
        const vioMap = Object.fromEntries((trends.violations_trend || []).map(v => [v.date, v]));

        analyticsTrendsTableBody.innerHTML = dates.slice().reverse().map(d => {
            const trf = trafficMap[d] || { count: 0, extra: { avg_speed: 0 } };
            const vio = vioMap[d] || { count: 0, extra: { total_fines: 0 } };
            const issCount = issuesMap[d] || 0;
            const alrCount = alertsMap[d] || 0;

            return `
                <tr>
                    <td><strong>${escapeHtml(d)}</strong></td>
                    <td><span class="badge badge-info">${issCount}</span></td>
                    <td>${trf.count} snapshots</td>
                    <td>${trf.extra?.avg_speed ? `${trf.extra.avg_speed} km/h` : '-'}</td>
                    <td>${alrCount > 0 ? `<span class="badge badge-danger">${alrCount}</span>` : '0'}</td>
                    <td><span class="badge badge-purple">${vio.count}</span></td>
                    <td><strong class="text-success">₹${(vio.extra?.total_fines || 0).toLocaleString('en-IN')}</strong></td>
                </tr>
            `;
        }).join('');
    }

    async function loadAnalytics(isInitial = false) {
        if (isAnalyticsFetching) return;
        isAnalyticsFetching = true;

        const params = new URLSearchParams();
        if (analyticsFilterState.area) params.append('area', analyticsFilterState.area);
        if (analyticsFilterState.start_date) params.append('start_date', analyticsFilterState.start_date);
        if (analyticsFilterState.end_date) params.append('end_date', analyticsFilterState.end_date);
        const qs = params.toString() ? `?${params.toString()}` : '';

        try {
            const [overviewRes, trafficRes, issuesRes, emergenciesRes, violationsRes, trendsRes] = await Promise.all([
                fetch(`${API_BASE_URL}/analytics/overview${qs}`),
                fetch(`${API_BASE_URL}/analytics/traffic${qs}`),
                fetch(`${API_BASE_URL}/analytics/issues${qs}`),
                fetch(`${API_BASE_URL}/analytics/emergencies${qs}`),
                fetch(`${API_BASE_URL}/analytics/violations${qs}`),
                fetch(`${API_BASE_URL}/analytics/trends${qs}`)
            ]);

            if (!overviewRes.ok || !trafficRes.ok || !issuesRes.ok || !emergenciesRes.ok || !violationsRes.ok || !trendsRes.ok) {
                throw new Error("One or more analytics endpoints returned non-OK status");
            }

            const [overview, traffic, issues, emergencies, violations, trends] = await Promise.all([
                overviewRes.json(),
                trafficRes.json(),
                issuesRes.json(),
                emergenciesRes.json(),
                violationsRes.json(),
                trendsRes.json()
            ]);

            renderAnalyticsOverview(overview);
            renderAnalyticsTraffic(traffic);
            renderAnalyticsIssues(issues);
            renderAnalyticsEmergencies(emergencies);
            renderAnalyticsViolations(violations);
            renderAnalyticsTrends(trends);

            if (analyticsLastUpdated) {
                const now = new Date();
                analyticsLastUpdated.textContent = `Updated: ${now.toLocaleTimeString()}`;
            }
        } catch (error) {
            console.error("Failed to load analytics from FastAPI:", error);
            showToast("Failed to fetch analytics intelligence from backend.", "error");
        } finally {
            isAnalyticsFetching = false;
        }
    }

    // Filter Listeners
    if (applyAnalyticsFilterBtn) {
        applyAnalyticsFilterBtn.addEventListener('click', () => {
            analyticsFilterState.area = analyticsAreaFilter ? analyticsAreaFilter.value : '';
            analyticsFilterState.start_date = analyticsStartDate ? analyticsStartDate.value : '';
            analyticsFilterState.end_date = analyticsEndDate ? analyticsEndDate.value : '';
            showToast('Applying analytics filters...', 'default');
            loadAnalytics(false);
        });
    }

    if (resetAnalyticsFilterBtn) {
        resetAnalyticsFilterBtn.addEventListener('click', () => {
            if (analyticsAreaFilter) analyticsAreaFilter.value = '';
            if (analyticsStartDate) analyticsStartDate.value = '';
            if (analyticsEndDate) analyticsEndDate.value = '';
            analyticsFilterState = { area: '', start_date: '', end_date: '' };
            showToast('Analytics filters reset.', 'default');
            loadAnalytics(false);
        });
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

    // Refresh / Sync Button (Issues)
    if (refreshIssuesBtn) {
        refreshIssuesBtn.addEventListener('click', () => {
            showToast('Syncing with PostgreSQL database...', 'default');
            loadIssues(true);
        });
    }

    // Refresh / Sync Button (Traffic - Phase 6)
    if (refreshTrafficBtn) {
        refreshTrafficBtn.addEventListener('click', () => {
            showToast('Syncing traffic telemetry from PostgreSQL...', 'default');
            loadTraffic(true);
        });
    }

    // Refresh / Sync Button (Emergency Alerts - Phase 7)
    if (refreshAlertsBtn) {
        refreshAlertsBtn.addEventListener('click', () => {
            showToast('Syncing emergency alerts from PostgreSQL...', 'default');
            loadAlerts(true);
        });
    }

    // Refresh / Sync Button (Traffic Violations - Phase 8)
    if (refreshViolationsBtn) {
        refreshViolationsBtn.addEventListener('click', () => {
            showToast('Syncing traffic violations from PostgreSQL...', 'default');
            loadViolations(true);
        });
    }

    // Refresh / Sync Button (Analytics - Phase 9)
    if (refreshAnalyticsBtn) {
        refreshAnalyticsBtn.addEventListener('click', () => {
            showToast('Syncing intelligence analytics from PostgreSQL...', 'default');
            loadAnalytics(true);
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
                case 'emergency-details':
                    switchSection('emergency-alerts');
                    break;
                case 'nav-violations':
                    switchSection('traffic-violations');
                    break;
                case 'nav-analytics':
                    switchSection('analytics');
                    break;
                case 'back-to-dashboard':
                    switchSection('dashboard');
                    break;
                default:
                    showToast('Action triggered');
            }
        });
    });

    // ==========================================================================
    // 9. INITIALIZATION
    // ==========================================================================
    // Initial health check and load issues, traffic, alerts, violations & analytics from PostgreSQL
    checkBackendHealth();
    loadIssues(true);
    loadTraffic(true);
    loadAlerts(true);
    loadViolations(true);
    loadAnalytics(true);

    // Periodic health check every 15 seconds to dynamically track backend connection
    setInterval(checkBackendHealth, 15000);

    // Periodic polling every 30 seconds for active tabs (guarded against overlapping requests)
    setInterval(() => {
        if (!isTrafficFetching && (currentActiveSection === 'dashboard' || currentActiveSection === 'traffic-monitoring')) {
            loadTraffic(false);
        }
        if (!isAlertsFetching && (currentActiveSection === 'dashboard' || currentActiveSection === 'emergency-alerts')) {
            loadAlerts(false);
        }
        if (!isViolationsFetching && (currentActiveSection === 'dashboard' || currentActiveSection === 'traffic-violations')) {
            loadViolations(false);
        }
        if (!isAnalyticsFetching && currentActiveSection === 'analytics') {
            loadAnalytics(false);
        }
    }, 30000);
});
