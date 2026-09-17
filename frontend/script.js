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

    // --- Phase 10 AI Risk & Incident Intelligence Elements ---
    const refreshRiskBtn = document.getElementById('refreshRiskBtn');
    const riskRefreshStatus = document.getElementById('riskRefreshStatus');
    const riskCityScoreCircle = document.getElementById('riskCityScoreCircle');
    const riskCityScore = document.getElementById('riskCityScore');
    const riskCityLevelBadge = document.getElementById('riskCityLevelBadge');
    const riskRecommendedActionText = document.getElementById('riskRecommendedActionText');
    const riskTacticalActionBox = document.getElementById('riskTacticalActionBox');
    const riskTotalAreas = document.getElementById('riskTotalAreas');
    const riskCriticalAreas = document.getElementById('riskCriticalAreas');
    const riskHighAreas = document.getElementById('riskHighAreas');
    const riskActiveEmergencies = document.getElementById('riskActiveEmergencies');
    const riskUnresolvedIssues = document.getElementById('riskUnresolvedIssues');
    const riskTotalRoads = document.getElementById('riskTotalRoads');
    const riskLastUpdated = document.getElementById('riskLastUpdated');
    const riskAreasCountBadge = document.getElementById('riskAreasCountBadge');
    const riskAreasTableBody = document.getElementById('riskAreasTableBody');
    const riskRoadsCountBadge = document.getElementById('riskRoadsCountBadge');
    const riskRoadsTableBody = document.getElementById('riskRoadsTableBody');
    const sidebarRiskBadge = document.getElementById('sidebarRiskBadge');

    // --- Phase 11 Authentication & Operator Management Elements ---
    const headerGuestState = document.getElementById('headerGuestState');
    const headerAuthenticatedState = document.getElementById('headerAuthenticatedState');
    const headerUserAvatar = document.getElementById('headerUserAvatar');
    const headerUserName = document.getElementById('headerUserName');
    const headerUserRoleBadge = document.getElementById('headerUserRoleBadge');
    const openLoginModalBtn = document.getElementById('openLoginModalBtn');
    const headerLogoutBtn = document.getElementById('headerLogoutBtn');

    const loginModal = document.getElementById('loginModal');
    const closeLoginModalBtn = document.getElementById('closeLoginModalBtn');
    const cancelLoginModalBtn = document.getElementById('cancelLoginModalBtn');
    const loginForm = document.getElementById('loginForm');
    const loginUsernameInput = document.getElementById('loginUsernameInput');
    const loginPasswordInput = document.getElementById('loginPasswordInput');
    const loginSubmitBtn = document.getElementById('loginSubmitBtn');
    const loginErrorBanner = document.getElementById('loginErrorBanner');
    const demoRoleBtns = document.querySelectorAll('.demo-role-btn');

    const adminAccessDeniedBox = document.getElementById('adminAccessDeniedBox');
    const adminAuthorizedView = document.getElementById('adminAuthorizedView');
    const adminSignInPromptBtn = document.getElementById('adminSignInPromptBtn');
    const openCreateOperatorModalBtn = document.getElementById('openCreateOperatorModalBtn');
    const refreshOperatorsBtn = document.getElementById('refreshOperatorsBtn');
    const adminUsersCountBadge = document.getElementById('adminUsersCountBadge');
    const adminUsersLastUpdated = document.getElementById('adminUsersLastUpdated');
    const adminUsersTableBody = document.getElementById('adminUsersTableBody');

    const createOperatorModal = document.getElementById('createOperatorModal');
    const closeCreateOperatorModalBtn = document.getElementById('closeCreateOperatorModalBtn');
    const cancelCreateOpBtn = document.getElementById('cancelCreateOpBtn');
    const createOperatorForm = document.getElementById('createOperatorForm');
    const createOperatorErrorBanner = document.getElementById('createOperatorErrorBanner');
    const newOpUsernameInput = document.getElementById('newOpUsernameInput');
    const newOpFullNameInput = document.getElementById('newOpFullNameInput');
    const newOpEmailInput = document.getElementById('newOpEmailInput');
    const newOpRoleInput = document.getElementById('newOpRoleInput');
    const newOpPasswordInput = document.getElementById('newOpPasswordInput');
    const submitCreateOpBtn = document.getElementById('submitCreateOpBtn');

    // --- Phase 12 Live Operations Map Elements ---
    const refreshMapBtn = document.getElementById('refreshMapBtn');
    const mapLastUpdated = document.getElementById('mapLastUpdated');
    const mapKpiTotal = document.getElementById('mapKpiTotal');
    const mapKpiEmergencies = document.getElementById('mapKpiEmergencies');
    const mapKpiTraffic = document.getElementById('mapKpiTraffic');
    const mapKpiIssues = document.getElementById('mapKpiIssues');
    const mapKpiViolations = document.getElementById('mapKpiViolations');
    const mapKpiRisk = document.getElementById('mapKpiRisk');
    const mapAreaFilter = document.getElementById('mapAreaFilter');
    const mapSeverityFilter = document.getElementById('mapSeverityFilter');
    const resetMapFiltersBtn = document.getElementById('resetMapFiltersBtn');
    const legendToggleBtn = document.getElementById('legendToggleBtn');
    const legendBody = document.getElementById('legendBody');
    const mapLoadingOverlay = document.getElementById('mapLoadingOverlay');
    const mapErrorOverlay = document.getElementById('mapErrorOverlay');
    const retryMapBtn = document.getElementById('retryMapBtn');
    const mapErrorMessage = document.getElementById('mapErrorMessage');

    const mapTacticalDrawer = document.getElementById('mapTacticalDrawer');
    const closeMapDrawerBtn = document.getElementById('closeMapDrawerBtn');
    const mapDrawerEmptyState = document.getElementById('mapDrawerEmptyState');
    const mapDrawerSelectedState = document.getElementById('mapDrawerSelectedState');
    const drawerDomainBadge = document.getElementById('drawerDomainBadge');
    const drawerSeverityBadge = document.getElementById('drawerSeverityBadge');
    const drawerStatusBadge = document.getElementById('drawerStatusBadge');
    const drawerFeatureTitle = document.getElementById('drawerFeatureTitle');
    const drawerFeatureId = document.getElementById('drawerFeatureId');
    const drawerArea = document.getElementById('drawerArea');
    const drawerLocation = document.getElementById('drawerLocation');
    const drawerCoords = document.getElementById('drawerCoords');
    const drawerSource = document.getElementById('drawerSource');
    const drawerMetricTitle = document.getElementById('drawerMetricTitle');
    const drawerMetricVal = document.getElementById('drawerMetricVal');
    const drawerTacticalText = document.getElementById('drawerTacticalText');
    const drawerCenterBtn = document.getElementById('drawerCenterBtn');

    // --- Phase 13 Notifications & Operational Escalation Elements ---
    const sidebarNotifBadge = document.getElementById('sidebarNotifBadge');
    const headerNotifBtn = document.getElementById('headerNotifBtn');
    const headerNotifBadge = document.getElementById('headerNotifBadge');
    const metricNotifUnread = document.getElementById('metricNotifUnread');
    const metricNotifCritical = document.getElementById('metricNotifCritical');
    const metricNotifAck = document.getElementById('metricNotifAck');
    const metricNotifTotal = document.getElementById('metricNotifTotal');
    const notifStatusPills = document.querySelectorAll('.notif-status-pill');
    const notifSeverityFilter = document.getElementById('notifSeverityFilter');
    const notifDomainFilter = document.getElementById('notifDomainFilter');
    const resetNotifFiltersBtn = document.getElementById('resetNotifFiltersBtn');
    const syncNotificationsBtn = document.getElementById('syncNotificationsBtn');
    const markAllReadBtn = document.getElementById('markAllReadBtn');
    const refreshNotificationsBtn = document.getElementById('refreshNotificationsBtn');
    const notificationsFeedContainer = document.getElementById('notificationsFeedContainer');
    const acknowledgeModal = document.getElementById('acknowledgeModal');
    const closeAckModalBtn = document.getElementById('closeAckModalBtn');
    const cancelAckModalBtn = document.getElementById('cancelAckModalBtn');
    const acknowledgeForm = document.getElementById('acknowledgeForm');
    const ackNotifIdInput = document.getElementById('ackNotifIdInput');
    const ackRemarksInput = document.getElementById('ackRemarksInput');
    const ackModalNotifId = document.getElementById('ackModalNotifId');
    const ackModalAlertTitle = document.getElementById('ackModalAlertTitle');
    const ackModalAlertMessage = document.getElementById('ackModalAlertMessage');

    // --- Phase 14 Field Work Orders Elements ---
    const sidebarWorkOrdersBadge = document.getElementById('sidebarWorkOrdersBadge');
    const refreshWorkOrdersBtn = document.getElementById('refreshWorkOrdersBtn');
    const openCreateWorkOrderModalBtn = document.getElementById('openCreateWorkOrderModalBtn');
    const woKpiTotal = document.getElementById('woKpiTotal');
    const woKpiActive = document.getElementById('woKpiActive');
    const woKpiBreached = document.getElementById('woKpiBreached');
    const woKpiCompleted = document.getElementById('woKpiCompleted');
    const woKpiCostSubtext = document.getElementById('woKpiCostSubtext');
    const woStatusFilter = document.getElementById('woStatusFilter');
    const woPriorityFilter = document.getElementById('woPriorityFilter');
    const woTypeFilter = document.getElementById('woTypeFilter');
    const woAreaSearch = document.getElementById('woAreaSearch');
    const resetWoFiltersBtn = document.getElementById('resetWoFiltersBtn');
    const woCountBadge = document.getElementById('woCountBadge');
    const workOrdersTableBody = document.getElementById('workOrdersTableBody');

    // Create Modal Elements
    const createWorkOrderModal = document.getElementById('createWorkOrderModal');
    const closeCreateWorkOrderModalBtn = document.getElementById('closeCreateWoModalBtn');
    const cancelCreateWorkOrderBtn = document.getElementById('cancelCreateWoBtn');
    const createWorkOrderForm = document.getElementById('createWorkOrderForm');
    const submitCreateWoBtn = document.getElementById('submitCreateWoBtn');
    const createWoErrorBanner = document.getElementById('createWoErrorBanner');
    const woTitleInput = document.getElementById('woTitleInput');
    const woOrderTypeInput = document.getElementById('woOrderTypeInput');
    const woSourceIdInput = document.getElementById('woSourceIdInput');
    const woAreaInput = document.getElementById('woAreaInput');
    const woLocationInput = document.getElementById('woLocationInput');
    const woPriorityInput = document.getElementById('woPriorityInput');
    const woAssignedCrewInput = document.getElementById('woAssignedCrewInput');
    const woTargetSlaInput = document.getElementById('woTargetSlaInput');
    const woLatitudeInput = document.getElementById('woLatitudeInput');
    const woLongitudeInput = document.getElementById('woLongitudeInput');
    const woDescriptionInput = document.getElementById('woDescriptionInput');
    const woSourceDomainHidden = document.getElementById('woSourceDomainHidden');

    // Update Status Modal Elements
    const updateWorkOrderModal = document.getElementById('updateWorkOrderModal');
    const closeUpdateWoModalBtn = document.getElementById('closeUpdateWoModalBtn');
    const cancelUpdateWoBtn = document.getElementById('cancelUpdateWoBtn');
    const updateWorkOrderForm = document.getElementById('updateWorkOrderForm');
    const submitUpdateWoBtn = document.getElementById('submitUpdateWoBtn');
    const updateWoErrorBanner = document.getElementById('updateWoErrorBanner');
    const updateWoBadgeId = document.getElementById('updateWoBadgeId');
    const updateWoTitleDisplay = document.getElementById('updateWoTitleDisplay');
    const updateWoLocationDisplay = document.getElementById('updateWoLocationDisplay');
    const updateWoStatusSelect = document.getElementById('updateWoStatusSelect');
    const updateWoActualCostInput = document.getElementById('updateWoActualCostInput');
    const updateWoNotesInput = document.getElementById('updateWoNotesInput');
    const updateWoNotesLabel = document.getElementById('updateWoNotesLabel');
    const updateWoCostGroup = document.getElementById('updateWoCostGroup');
    const updateWoIdHidden = document.getElementById('updateWoIdHidden');

    // Phase 16: Work Order Operational UI Elements
    const woSlaFilter = document.getElementById('woSlaFilter');
    const workOrderDetailsModal = document.getElementById('workOrderDetailsModal');
    const closeWoDetailsModalBtn = document.getElementById('closeWoDetailsModalBtn');
    const closeWoDetailsModalFooterBtn = document.getElementById('closeWoDetailsModalFooterBtn');
    const woDetailIdBadge = document.getElementById('woDetailIdBadge');
    const woDetailStatusBadge = document.getElementById('woDetailStatusBadge');
    const woDetailErrorBanner = document.getElementById('woDetailErrorBanner');
    const woDetailTitle = document.getElementById('woDetailTitle');
    const woDetailDescription = document.getElementById('woDetailDescription');
    const woDetailSlaBanner = document.getElementById('woDetailSlaBanner');
    const woDetailSlaStatus = document.getElementById('woDetailSlaStatus');
    const woDetailSlaCountdown = document.getElementById('woDetailSlaCountdown');
    const woDetailOrderType = document.getElementById('woDetailOrderType');
    const woDetailAssignedRole = document.getElementById('woDetailAssignedRole');
    const woDetailCrew = document.getElementById('woDetailCrew');
    const woDetailPriority = document.getElementById('woDetailPriority');
    const woDetailSource = document.getElementById('woDetailSource');
    const woDetailArea = document.getElementById('woDetailArea');
    const woDetailLocation = document.getElementById('woDetailLocation');
    const woDetailTargetSla = document.getElementById('woDetailTargetSla');
    const woDetailSlaDeadline = document.getElementById('woDetailSlaDeadline');
    const woDetailCoordSource = document.getElementById('woDetailCoordSource');
    const woDetailCoords = document.getElementById('woDetailCoords');
    const woDetailCreatedBy = document.getElementById('woDetailCreatedBy');
    const woDetailCreatedAt = document.getElementById('woDetailCreatedAt');
    const woDetailDispatchedAt = document.getElementById('woDetailDispatchedAt');
    const woDetailCompletedAt = document.getElementById('woDetailCompletedAt');
    const woDetailCompletedBy = document.getElementById('woDetailCompletedBy');
    const woDetailActualCost = document.getElementById('woDetailActualCost');
    const woDetailResolutionBox = document.getElementById('woDetailResolutionBox');
    const woDetailResolutionNotes = document.getElementById('woDetailResolutionNotes');
    const woDetailUpdateStatusBtn = document.getElementById('woDetailUpdateStatusBtn');
    const drawerInspectWoBtn = document.getElementById('drawerInspectWoBtn');

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
        'risk': 'AI Risk & Incident Intelligence Center',
        'map': 'Live Operations Map',
        'notifications': 'Notifications & Operational Escalation',
        'work-orders': 'Field Work Orders & Incident Dispatch',
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
        if (sectionKey === 'risk') {
            loadRisk(false);
        }
        if (sectionKey === 'admin') {
            checkAdminSectionAccess();
        }
        if (sectionKey === 'map') {
            initOperationsMap();
            loadMapData(false);
            setTimeout(() => {
                if (operationsMap) operationsMap.invalidateSize();
            }, 250);
        }
        if (sectionKey === 'notifications') {
            loadNotifications(false);
            loadNotificationsSummary();
        }
        if (sectionKey === 'work-orders') {
            loadWorkOrders(false);
            loadWorkOrdersSummary();
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
                headers: getAuthHeaders(),
                body: JSON.stringify({ status: newStatus })
            });

            if (res.status === 401) {
                showToast("Authentication required: Please sign in as an Operator.", "error");
                openLoginModal('EMERGENCY_OPERATOR');
                return;
            } else if (res.status === 403) {
                showToast("Access forbidden: Requires EMERGENCY_OPERATOR or ADMIN role.", "error");
                return;
            } else if (!res.ok) {
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
                    headers: getAuthHeaders(),
                    body: JSON.stringify(payload)
                });

                if (response.status === 201) {
                    const createdAlert = await response.json();
                    alertsState.unshift(createdAlert);
                    closeCreateAlertModal();
                    showToast(`Emergency Alert ${createdAlert.id} broadcast successfully!`, 'success');

                    // Refresh summary and render
                    loadAlerts(false);
                } else if (response.status === 401) {
                    showToast("Authentication required: Please sign in as an Operator.", "error");
                    openLoginModal('EMERGENCY_OPERATOR');
                } else if (response.status === 403) {
                    showToast("Access forbidden: Requires EMERGENCY_OPERATOR or ADMIN role.", "error");
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
                headers: getAuthHeaders(),
                body: JSON.stringify({ status: newStatus })
            });

            if (res.status === 401) {
                showToast("Authentication required: Please sign in as an Operator.", "error");
                openLoginModal('TRAFFIC_OPERATOR');
                return;
            } else if (res.status === 403) {
                showToast("Access forbidden: Requires TRAFFIC_OPERATOR or ADMIN role.", "error");
                return;
            } else if (!res.ok) {
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
                    headers: getAuthHeaders(),
                    body: JSON.stringify(payload)
                });

                if (response.status === 201) {
                    const createdVio = await response.json();
                    violationsState.unshift(createdVio);
                    closeCreateViolationModal();
                    showToast(`Traffic Violation ${createdVio.id} recorded successfully!`, 'success');
                    loadViolations(false);
                } else if (response.status === 401) {
                    showToast("Authentication required: Please sign in as an Operator.", "error");
                    openLoginModal('TRAFFIC_OPERATOR');
                } else if (response.status === 403) {
                    showToast("Access forbidden: Requires TRAFFIC_OPERATOR or ADMIN role.", "error");
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
    // 5E. AI RISK & INCIDENT INTELLIGENCE (PHASE 10 FASTAPI + POSTGRESQL)
    // ==========================================================================
    let isRiskFetching = false;

    function getRiskLevelBadge(level) {
        switch (level) {
            case 'Critical':
                return '<span class="badge badge-risk-critical">Critical Risk</span>';
            case 'High':
                return '<span class="badge badge-risk-high">High Risk</span>';
            case 'Medium':
                return '<span class="badge badge-risk-medium">Medium Risk</span>';
            case 'Low':
                return '<span class="badge badge-risk-low">Low Risk</span>';
            default:
                return `<span class="badge badge-neutral">${escapeHtml(level)}</span>`;
        }
    }

    function renderRiskOverview(overview) {
        if (!overview) return;
        const score = overview.city_risk_score ?? 0;
        const level = overview.city_risk_level ?? 'Low';
        const levelLower = level.toLowerCase();

        if (riskCityScore) riskCityScore.textContent = score;
        if (riskCityLevelBadge) {
            riskCityLevelBadge.textContent = `${level} Risk`;
            riskCityLevelBadge.className = `badge badge-risk-${levelLower}`;
        }

        if (riskCityScoreCircle) {
            riskCityScoreCircle.className = `risk-gauge-circle risk-${levelLower}`;
        }

        if (riskTotalAreas) riskTotalAreas.textContent = overview.total_areas_assessed ?? 0;
        if (riskCriticalAreas) riskCriticalAreas.textContent = overview.critical_risk_areas ?? 0;
        if (riskHighAreas) riskHighAreas.textContent = overview.high_risk_areas ?? 0;
        if (riskActiveEmergencies) riskActiveEmergencies.textContent = overview.active_emergencies_count ?? 0;
        if (riskUnresolvedIssues) riskUnresolvedIssues.textContent = overview.unresolved_issues_count ?? 0;
        if (riskTotalRoads) riskTotalRoads.textContent = overview.total_roads_assessed ?? 0;

        if (riskRecommendedActionText) {
            riskRecommendedActionText.textContent = overview.recommended_action || 'All telemetry nominal.';
        }

        if (riskTacticalActionBox) {
            riskTacticalActionBox.className = `risk-tactical-action action-${levelLower}`;
        }

        if (sidebarRiskBadge) {
            sidebarRiskBadge.textContent = `${score}`;
            sidebarRiskBadge.className = `badge badge-risk-${levelLower} ml-auto`;
        }
    }

    function renderRiskAreas(areas) {
        if (!riskAreasTableBody) return;
        if (riskAreasCountBadge) {
            riskAreasCountBadge.textContent = `${areas ? areas.length : 0} Sectors Evaluated`;
        }

        if (!areas || areas.length === 0) {
            riskAreasTableBody.innerHTML = `
                <tr>
                    <td colspan="9" class="table-loading-cell">No sectors evaluated. Verify PostgreSQL tables.</td>
                </tr>
            `;
            return;
        }

        riskAreasTableBody.innerHTML = areas.map(a => {
            const score = a.risk_score ?? 0;
            const lvl = a.risk_level ?? 'Low';
            const lvlLower = lvl.toLowerCase();
            const breakdown = a.score_breakdown || {};

            return `
                <tr>
                    <td><strong>${escapeHtml(a.area)}</strong></td>
                    <td style="min-width: 130px;">
                        <div style="display: flex; align-items: center; gap: 0.5rem;">
                            <strong style="font-size: 0.95rem;">${score}</strong>
                            <div class="bar-metric-track" style="flex: 1; height: 6px;">
                                <div class="bar-metric-fill fill-${lvlLower === 'critical' ? 'red' : (lvlLower === 'high' ? 'orange' : (lvlLower === 'medium' ? 'amber' : 'green'))}" style="width: ${Math.min(100, Math.max(8, score))}%;"></div>
                            </div>
                        </div>
                        <div class="text-muted text-xs" style="margin-top: 2px;">
                            E:${breakdown.emergency_score || 0} T:${breakdown.traffic_score || 0} H:${breakdown.issue_score || 0} V:${breakdown.violation_score || 0}
                        </div>
                    </td>
                    <td>${getRiskLevelBadge(lvl)}</td>
                    <td>
                        <div style="font-size: 0.82rem; font-weight: 600; color: var(--text-primary);">${escapeHtml(a.primary_factor)}</div>
                    </td>
                    <td>${a.active_emergencies > 0 ? `<span class="badge badge-danger">${a.active_emergencies} Active</span>` : '<span class="text-muted">0</span>'}</td>
                    <td>${a.unresolved_issues > 0 ? `<span class="badge badge-warning-soft">${a.unresolved_issues} Open</span>` : '<span class="text-muted">0</span>'}</td>
                    <td>${a.average_speed ? `<strong>${a.average_speed} km/h</strong>` : '<span class="text-muted">-</span>'}</td>
                    <td>${a.recent_violations > 0 ? `<span class="badge badge-purple">${a.recent_violations}</span>` : '<span class="text-muted">0</span>'}</td>
                    <td>
                        <div style="font-size: 0.78rem; line-height: 1.35; color: var(--text-secondary); background: #f8fafc; border-left: 3px solid var(--border-color); padding: 0.35rem 0.6rem; border-radius: 2px;">
                            ${escapeHtml(a.recommended_action)}
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
    }

    function renderRiskRoads(roads) {
        if (!riskRoadsTableBody) return;
        if (riskRoadsCountBadge) {
            riskRoadsCountBadge.textContent = `${roads ? roads.length : 0} Monitored Corridors`;
        }

        if (!roads || roads.length === 0) {
            riskRoadsTableBody.innerHTML = `
                <tr>
                    <td colspan="8" class="table-loading-cell">No monitored road corridors found.</td>
                </tr>
            `;
            return;
        }

        riskRoadsTableBody.innerHTML = roads.map(r => {
            const score = r.risk_score ?? 0;
            const lvl = r.risk_level ?? 'Low';
            const lvlLower = lvl.toLowerCase();

            return `
                <tr>
                    <td><strong>${escapeHtml(r.road_name)}</strong></td>
                    <td>${escapeHtml(r.area || 'Metro Sector')}</td>
                    <td style="min-width: 120px;">
                        <div style="display: flex; align-items: center; gap: 0.5rem;">
                            <strong>${score}</strong>
                            <div class="bar-metric-track" style="flex: 1; height: 6px;">
                                <div class="bar-metric-fill fill-${lvlLower === 'critical' ? 'red' : (lvlLower === 'high' ? 'orange' : (lvlLower === 'medium' ? 'amber' : 'green'))}" style="width: ${Math.min(100, Math.max(8, score))}%;"></div>
                            </div>
                        </div>
                    </td>
                    <td>${getRiskLevelBadge(lvl)}</td>
                    <td>
                        <strong>${r.average_speed} km/h</strong>
                        <div class="text-muted text-xs">${r.vehicle_count} vehicles</div>
                    </td>
                    <td>${getCongestionBadge(r.congestion_level)}</td>
                    <td>${getTrafficStatusBadge(r.traffic_status)}</td>
                    <td>
                        <div style="font-size: 0.78rem; line-height: 1.35; color: var(--text-secondary);">
                            ${escapeHtml(r.recommended_action)}
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
    }

    async function loadRisk(isInitial = false) {
        if (isRiskFetching) return;
        isRiskFetching = true;

        try {
            const [overviewRes, areasRes, roadsRes] = await Promise.all([
                fetch(`${API_BASE_URL}/risk/overview`),
                fetch(`${API_BASE_URL}/risk/areas`),
                fetch(`${API_BASE_URL}/risk/roads`)
            ]);

            if (!overviewRes.ok || !areasRes.ok || !roadsRes.ok) {
                throw new Error("One or more risk intelligence endpoints returned non-OK status");
            }

            const [overview, areasData, roadsData] = await Promise.all([
                overviewRes.json(),
                areasRes.json(),
                roadsRes.json()
            ]);

            renderRiskOverview(overview);
            renderRiskAreas(areasData.areas || []);
            renderRiskRoads(roadsData.roads || []);

            if (riskLastUpdated) {
                const now = new Date();
                riskLastUpdated.textContent = `Evaluated: ${now.toLocaleTimeString()}`;
            }
        } catch (error) {
            console.error("Failed to load risk intelligence from FastAPI:", error);
            if (riskAreasTableBody) {
                riskAreasTableBody.innerHTML = `
                    <tr>
                        <td colspan="9" class="table-loading-cell text-danger">
                            Failed to connect to AI Risk Intelligence engine. Verify FastAPI backend is running.
                        </td>
                    </tr>
                `;
            }
            if (riskRoadsTableBody) {
                riskRoadsTableBody.innerHTML = `
                    <tr>
                        <td colspan="8" class="table-loading-cell text-danger">
                            Failed to connect to AI Risk Intelligence engine. Verify FastAPI backend is running.
                        </td>
                    </tr>
                `;
            }
        } finally {
            isRiskFetching = false;
        }
    }

    // Refresh / Sync Button (Risk - Phase 10)
    if (refreshRiskBtn) {
        refreshRiskBtn.addEventListener('click', () => {
            showToast('Syncing risk intelligence from PostgreSQL...', 'default');
            loadRisk(false);
        });
    }

    // ==========================================================================
    // 5F. AUTHENTICATION & OPERATOR MANAGEMENT (PHASE 11 FASTAPI + POSTGRESQL)
    // ==========================================================================
    let authState = {
        token: null,
        user: null
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
                return `<span class="role-badge badge-role-guest">${escapeHtml(role || 'GUEST')}</span>`;
        }
    }

    function updateAuthUI() {
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

        if (currentActiveSection === 'admin') {
            checkAdminSectionAccess();
        }
        loadNotificationsSummary();
        if (currentActiveSection === 'notifications') {
            loadNotifications(false);
        }
    }

    function checkAdminSectionAccess() {
        if (!adminAuthorizedView || !adminAccessDeniedBox) return;

        if (authState.token && authState.user && authState.user.role === 'ADMIN') {
            adminAuthorizedView.style.display = 'block';
            adminAccessDeniedBox.style.display = 'none';
            loadAdminOperators();
        } else {
            adminAuthorizedView.style.display = 'none';
            adminAccessDeniedBox.style.display = 'block';
        }
    }

    function openLoginModal(prefilledRole = null) {
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
        if (!loginModal) return;
        loginModal.style.display = 'none';
        if (loginForm) loginForm.reset();
        if (loginErrorBanner) {
            loginErrorBanner.style.display = 'none';
            loginErrorBanner.textContent = '';
        }
    }

    async function handleLogin(username, password) {
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
            const response = await fetch(`${API_BASE_URL}/auth/login`, {
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
                showToast(`Welcome back, ${data.user.full_name} (${data.user.role})!`, 'success');
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
        try {
            if (authState.token) {
                await fetch(`${API_BASE_URL}/auth/logout`, {
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
        showToast("Signed out of operator session.", "default");
    }

    async function restoreSession() {
        const savedToken = sessionStorage.getItem('rsc_auth_token');
        if (!savedToken) return;

        try {
            const res = await fetch(`${API_BASE_URL}/auth/me`, {
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

    async function loadAdminOperators() {
        if (!adminUsersTableBody) return;
        if (!authState.token || !authState.user || authState.user.role !== 'ADMIN') return;

        try {
            const res = await fetch(`${API_BASE_URL}/auth/users`, {
                headers: getAuthHeaders()
            });

            if (res.status === 200) {
                const data = await res.json();
                const users = data.users || [];

                if (adminUsersCountBadge) {
                    adminUsersCountBadge.textContent = `${users.length} Operators Registered`;
                }
                if (adminUsersLastUpdated) {
                    adminUsersLastUpdated.textContent = `Updated: ${new Date().toLocaleTimeString()}`;
                }

                if (users.length === 0) {
                    adminUsersTableBody.innerHTML = `
                        <tr>
                            <td colspan="7" class="table-loading-cell">No operator accounts found.</td>
                        </tr>
                    `;
                    return;
                }

                adminUsersTableBody.innerHTML = users.map(u => `
                    <tr>
                        <td><strong>#${u.id}</strong></td>
                        <td><strong>${escapeHtml(u.username)}</strong></td>
                        <td>${escapeHtml(u.full_name)}</td>
                        <td>${escapeHtml(u.email)}</td>
                        <td>${getRoleBadge(u.role)}</td>
                        <td>
                            <span class="user-status-pill ${u.is_active ? 'user-status-active' : 'user-status-disabled'}">
                                ${u.is_active ? 'Active' : 'Disabled'}
                            </span>
                        </td>
                        <td class="text-right">
                            ${u.id !== authState.user.id ? `
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
        try {
            const res = await fetch(`${API_BASE_URL}/auth/users/${userId}/status`, {
                method: 'PATCH',
                headers: getAuthHeaders(),
                body: JSON.stringify({ is_active: newActiveState })
            });

            if (res.status === 200) {
                showToast(`Operator #${userId} status updated to ${newActiveState ? 'Active' : 'Disabled'}.`, 'success');
                loadAdminOperators();
            } else {
                showToast('Failed to update operator status.', 'error');
            }
        } catch (e) {
            showToast('Network error updating operator status.', 'error');
        }
    }

    function openCreateOperatorModal() {
        if (!createOperatorModal) return;
        if (createOperatorErrorBanner) createOperatorErrorBanner.style.display = 'none';
        createOperatorModal.style.display = 'flex';
        if (newOpUsernameInput) newOpUsernameInput.focus();
    }

    function closeCreateOperatorModal() {
        if (!createOperatorModal) return;
        createOperatorModal.style.display = 'none';
        if (createOperatorForm) createOperatorForm.reset();
        if (createOperatorErrorBanner) createOperatorErrorBanner.style.display = 'none';
    }

    // Modal Triggers & Controls (Phase 11)
    if (openLoginModalBtn) openLoginModalBtn.addEventListener('click', () => openLoginModal());
    if (closeLoginModalBtn) closeLoginModalBtn.addEventListener('click', closeLoginModal);
    if (cancelLoginModalBtn) cancelLoginModalBtn.addEventListener('click', closeLoginModal);

    if (loginModal) {
        loginModal.addEventListener('click', (e) => {
            if (e.target === loginModal) closeLoginModal();
        });
    }

    const demoCredentials = {
        'ADMIN': { u: 'admin', p: 'AdminPassword@123' },
        'TRAFFIC_OPERATOR': { u: 'traffic_op', p: 'TrafficPassword@123' },
        'EMERGENCY_OPERATOR': { u: 'emergency_op', p: 'EmergencyPassword@123' },
        'ROAD_INSPECTOR': { u: 'road_insp', p: 'InspectorPassword@123' }
    };

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
            showToast("Syncing operator accounts...", "default");
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
                const res = await fetch(`${API_BASE_URL}/auth/users`, {
                    method: 'POST',
                    headers: getAuthHeaders(),
                    body: JSON.stringify({ username, full_name, email, role, password })
                });

                if (res.status === 201) {
                    const newUser = await res.json();
                    closeCreateOperatorModal();
                    showToast(`Operator @${newUser.username} (${newUser.role}) created successfully!`, 'success');
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

    // Modal Escape Key Listener
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            if (loginModal && loginModal.style.display === 'flex') closeLoginModal();
            if (createOperatorModal && createOperatorModal.style.display === 'flex') closeCreateOperatorModal();
        }
    });

    // ==========================================================================
    // 5G. LIVE OPERATIONS MAP (PHASE 12 GIS COMMAND CENTER)
    // ==========================================================================
    let operationsMap = null;
    let isMapFetching = false;
    let activeMapDomain = 'all';
    let mapLayers = {
        emergency: null,
        traffic: null,
        issue: null,
        violation: null,
        risk: null
    };
    let selectedMapFeature = null;
    let mapFeaturesCache = [];

    function initOperationsMap() {
        if (operationsMap) return;
        const container = document.getElementById('operationsMapContainer');
        if (!container) return;

        if (typeof L === 'undefined') {
            console.error("Leaflet library not loaded.");
            if (mapErrorOverlay) {
                mapErrorOverlay.style.display = 'flex';
                if (mapErrorMessage) mapErrorMessage.textContent = "Leaflet GIS library failed to load. Check vendor/leaflet assets.";
            }
            return;
        }

        // Initialize Leaflet map centered at Nagpur command center
        operationsMap = L.map('operationsMapContainer', {
            zoomControl: true,
            attributionControl: true
        }).setView([21.1458, 79.0882], 12);

        // Standard OpenStreetMap / CartoDB tile layer with high-contrast command theme
        L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
            subdomains: 'abcd',
            maxZoom: 19
        }).addTo(operationsMap);

        // Initialize separate layer groups for layer filtering
        mapLayers.emergency = L.layerGroup().addTo(operationsMap);
        mapLayers.traffic = L.layerGroup().addTo(operationsMap);
        mapLayers.issue = L.layerGroup().addTo(operationsMap);
        mapLayers.violation = L.layerGroup().addTo(operationsMap);
        mapLayers.risk = L.layerGroup().addTo(operationsMap);
        mapLayers.workOrder = L.layerGroup().addTo(operationsMap);

        // Legend collapse/expand toggle
        if (legendToggleBtn && legendBody) {
            legendToggleBtn.addEventListener('click', () => {
                if (legendBody.style.display === 'none') {
                    legendBody.style.display = 'flex';
                    legendToggleBtn.innerHTML = '&minus;';
                } else {
                    legendBody.style.display = 'none';
                    legendToggleBtn.innerHTML = '+';
                }
            });
        }
    }

    function createCustomMarkerIcon(domain, severity) {
        let pinClass = 'marker-issue';
        let iconHtml = '⚠️';

        switch (domain) {
            case 'emergency':
                pinClass = 'marker-emergency';
                iconHtml = '🚨';
                break;
            case 'traffic':
                pinClass = 'marker-traffic';
                iconHtml = '🚗';
                break;
            case 'issue':
                pinClass = 'marker-issue';
                iconHtml = '⚠️';
                break;
            case 'violation':
                pinClass = 'marker-violation';
                iconHtml = '📹';
                break;
            case 'risk':
                pinClass = 'marker-risk';
                iconHtml = '🛡️';
                break;
            case 'work_order':
                pinClass = 'marker-workorder';
                iconHtml = '👷';
                break;
        }

        const isPulse = (domain === 'emergency' && severity === 'Critical');

        const html = `
            <div class="custom-marker-pin ${pinClass}">
                ${isPulse ? '<div class="marker-pulse"></div>' : ''}
                <span>${iconHtml}</span>
            </div>
        `;

        return L.divIcon({
            className: 'custom-leaflet-marker',
            html: html,
            iconSize: [32, 32],
            iconAnchor: [16, 16],
            popupAnchor: [0, -18]
        });
    }

    function buildPopupHtml(feature) {
        const domainUpper = (feature.domain || 'INCIDENT').toUpperCase();
        const headerClass = `header-${feature.domain}`;
        const sev = feature.severity || feature.risk_level || 'Normal';
        const metric = feature.metric_label || '';
        const sourceLabel = feature.coordinate_source === 'exact_gps'
            ? 'Live GPS'
            : (feature.coordinate_source === 'area_centroid' ? 'Area Centroid' : 'Configured Reference');
        const isWo = feature.domain === 'work_order';

        return `
            <div class="map-popup-card">
                <div class="map-popup-header ${headerClass}">
                    <span>${escapeHtml(domainUpper)}</span>
                    <span>${escapeHtml(sev)}</span>
                </div>
                <div class="map-popup-body">
                    <div class="map-popup-title">${escapeHtml(feature.title)}</div>
                    <div class="text-xs text-muted"><strong>Location:</strong> ${escapeHtml(feature.location)}</div>
                    ${metric ? `<div class="map-popup-metric">${escapeHtml(metric)}</div>` : ''}
                    <div class="map-popup-footer">
                        <span>📍 ${sourceLabel}</span>
                        <span>${escapeHtml(feature.id)}</span>
                    </div>
                    ${isWo ? `
                        <div style="margin-top: 0.5rem; text-align: right;">
                            <button type="button" class="btn btn-primary btn-xs map-popup-wo-btn" data-wo-id="${escapeHtml(feature.id)}">
                                Inspect Work Order &rarr;
                            </button>
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
    }

    function selectMapFeature(feature) {
        selectedMapFeature = feature;
        if (!mapDrawerSelectedState || !mapDrawerEmptyState) return;

        const meta = feature.metadata || {};

        mapDrawerEmptyState.style.display = 'none';
        mapDrawerSelectedState.style.display = 'flex';

        if (drawerDomainBadge) {
            drawerDomainBadge.textContent = (feature.domain || '').toUpperCase();
            drawerDomainBadge.className = `badge ${feature.domain === 'emergency' ? 'badge-danger' : (feature.domain === 'traffic' ? 'badge-info' : (feature.domain === 'violation' ? 'badge-purple' : (feature.domain === 'work_order' ? 'badge-warning' : 'badge-warning')))}`;
        }

        const sev = feature.severity || feature.risk_level || 'Normal';
        if (drawerSeverityBadge) {
            drawerSeverityBadge.textContent = sev;
            drawerSeverityBadge.className = `badge ${sev === 'Critical' ? 'badge-danger' : (sev === 'High' ? 'badge-warning' : 'badge-neutral')}`;
        }

        if (drawerStatusBadge) {
            drawerStatusBadge.textContent = feature.status || 'Active';
        }

        if (drawerFeatureTitle) drawerFeatureTitle.textContent = feature.title;
        if (drawerFeatureId) drawerFeatureId.textContent = `#${feature.id}`;
        if (drawerArea) drawerArea.textContent = feature.area || 'Metro Sector';
        if (drawerLocation) drawerLocation.textContent = feature.location || '-';

        if (drawerCoords) {
            drawerCoords.textContent = (feature.latitude && feature.longitude)
                ? `${Number(feature.latitude).toFixed(4)}° N, ${Number(feature.longitude).toFixed(4)}° E`
                : 'No geographic coordinates';
        }

        if (drawerSource) {
            const src = feature.coordinate_source || 'unmapped';
            drawerSource.textContent = src === 'exact_gps' ? 'Live Sensor GPS' : (src === 'area_centroid' ? 'Area Centroid Anchor' : 'Municipal Corridor Anchor');
        }

        if (drawerMetricTitle && drawerMetricVal) {
            if (feature.domain === 'traffic') {
                drawerMetricTitle.textContent = 'Traffic Velocity & Volume';
                drawerMetricVal.textContent = feature.metric_label || 'Telemetry Active';
            } else if (feature.domain === 'violation') {
                drawerMetricTitle.textContent = 'Radar Violation Fine';
                drawerMetricVal.textContent = feature.metric_label || 'Fine Recorded';
            } else if (feature.domain === 'risk') {
                drawerMetricTitle.textContent = 'AI Risk Intelligence Score';
                drawerMetricVal.textContent = feature.metric_label || 'Evaluated';
            } else if (feature.domain === 'work_order') {
                drawerMetricTitle.textContent = 'Crew & Target SLA';
                drawerMetricVal.textContent = `${meta.assigned_crew || 'Crew'} (${feature.metric_label || 'Active'})`;
            } else {
                drawerMetricTitle.textContent = 'Operational Metric';
                drawerMetricVal.textContent = feature.metric_label || 'Incident Active';
            }
        }

        if (drawerTacticalText) {
            if (meta.recommended_action) {
                drawerTacticalText.textContent = meta.recommended_action;
            } else if (feature.domain === 'emergency') {
                drawerTacticalText.textContent = `Immediate emergency dispatch advised for ${feature.title} at ${feature.location}. Maintain clear access lanes.`;
            } else if (feature.domain === 'traffic') {
                drawerTacticalText.textContent = (meta.congestion_level === 'Severe' || meta.congestion_level === 'Heavy')
                    ? 'Deploy traffic marshals to clear bottleneck and adjust adaptive signal timings.'
                    : 'Traffic moving within acceptable threshold. Continue sensor polling.';
            } else if (feature.domain === 'violation') {
                drawerTacticalText.textContent = `Automated radar logged ${meta.violation_type || 'infringement'}. Proceed with notice adjudication.`;
            } else if (feature.domain === 'work_order') {
                drawerTacticalText.textContent = `Field crew "${meta.assigned_crew || 'Crew'}" deployed for ${meta.order_type || 'task'}. Priority: ${feature.severity}. Target SLA: ${meta.target_sla_hours || 24} hours.`;
            } else {
                drawerTacticalText.textContent = 'Verify road hazard severity during municipal field maintenance shift.';
            }
        }

        if (drawerInspectWoBtn) {
            if (feature.domain === 'work_order') {
                drawerInspectWoBtn.style.display = 'inline-flex';
                drawerInspectWoBtn.onclick = () => openWorkOrderDetailsModal(feature.id);
            } else {
                drawerInspectWoBtn.style.display = 'none';
                drawerInspectWoBtn.onclick = null;
            }
        }
    }

    function clearMapLayers() {
        Object.values(mapLayers).forEach(layerGroup => {
            if (layerGroup) layerGroup.clearLayers();
        });
    }

    function renderMapData(data) {
        if (!operationsMap) return;
        clearMapLayers();

        mapFeaturesCache = [];
        const summary = data.summary || {};

        // Update KPI counters
        if (mapKpiTotal) mapKpiTotal.textContent = summary.mapped_count ?? 0;
        if (mapKpiEmergencies) mapKpiEmergencies.textContent = summary.emergencies_count ?? 0;
        if (mapKpiTraffic) mapKpiTraffic.textContent = summary.traffic_count ?? 0;
        if (mapKpiIssues) mapKpiIssues.textContent = summary.issues_count ?? 0;
        if (mapKpiViolations) mapKpiViolations.textContent = summary.violations_count ?? 0;
        if (mapKpiRisk) mapKpiRisk.textContent = summary.risk_areas_count ?? 0;

        const bounds = [];

        // Helper to add feature marker
        const addFeatureMarker = (feature, layerGroup) => {
            if (feature.latitude === null || feature.latitude === undefined ||
                feature.longitude === null || feature.longitude === undefined) {
                return;
            }

            const lat = Number(feature.latitude);
            const lon = Number(feature.longitude);
            if (isNaN(lat) || isNaN(lon)) return;

            mapFeaturesCache.push(feature);
            bounds.push([lat, lon]);

            const marker = L.marker([lat, lon], {
                icon: createCustomMarkerIcon(feature.domain, feature.severity)
            });

            marker.bindPopup(buildPopupHtml(feature));
            marker.on('click', () => {
                selectMapFeature(feature);
                if (feature.domain === 'work_order') {
                    openWorkOrderDetailsModal(feature.id);
                }
            });
            marker.addTo(layerGroup);
        };

        // 1. Render Risk Sector Circles
        if (data.risk && (activeMapDomain === 'all' || activeMapDomain === 'risk')) {
            data.risk.forEach(riskArea => {
                if (riskArea.latitude !== null && riskArea.longitude !== null) {
                    const lat = Number(riskArea.latitude);
                    const lon = Number(riskArea.longitude);
                    if (!isNaN(lat) && !isNaN(lon)) {
                        bounds.push([lat, lon]);
                        mapFeaturesCache.push(riskArea);

                        const isCritical = riskArea.risk_level === 'Critical';
                        const isHigh = riskArea.risk_level === 'High';
                        const color = isCritical ? '#dc2626' : (isHigh ? '#ea580c' : (riskArea.risk_level === 'Medium' ? '#d97706' : '#10b981'));

                        // Soft sector bubble
                        const circle = L.circle([lat, lon], {
                            radius: isCritical ? 950 : 750,
                            color: color,
                            fillColor: color,
                            fillOpacity: 0.14,
                            weight: 2,
                            dashArray: '4, 6'
                        });

                        circle.bindPopup(buildPopupHtml(riskArea));
                        circle.on('click', () => selectMapFeature(riskArea));
                        circle.addTo(mapLayers.risk);

                        // Center pin
                        const centerMarker = L.marker([lat, lon], {
                            icon: createCustomMarkerIcon('risk', riskArea.risk_level)
                        });
                        centerMarker.bindPopup(buildPopupHtml(riskArea));
                        centerMarker.on('click', () => selectMapFeature(riskArea));
                        centerMarker.addTo(mapLayers.risk);
                    }
                }
            });
        }

        // 2. Render Emergencies
        if (data.emergencies && (activeMapDomain === 'all' || activeMapDomain === 'emergency')) {
            data.emergencies.forEach(f => addFeatureMarker(f, mapLayers.emergency));
        }

        // 3. Render Traffic Corridors
        if (data.traffic && (activeMapDomain === 'all' || activeMapDomain === 'traffic')) {
            data.traffic.forEach(f => addFeatureMarker(f, mapLayers.traffic));
        }

        // 4. Render Road Issues
        if (data.issues && (activeMapDomain === 'all' || activeMapDomain === 'issue')) {
            data.issues.forEach(f => addFeatureMarker(f, mapLayers.issue));
        }

        // 5. Render Traffic Violations
        if (data.violations && (activeMapDomain === 'all' || activeMapDomain === 'violation')) {
            data.violations.forEach(f => addFeatureMarker(f, mapLayers.violation));
        }

        // 6. Render Active Field Work Orders (Phase 14 & 16)
        if (data.work_orders && (activeMapDomain === 'all' || activeMapDomain === 'work_order')) {
            data.work_orders.forEach(f => addFeatureMarker(f, mapLayers.workOrder));
        }

        if (mapLastUpdated) {
            mapLastUpdated.textContent = `Updated: ${new Date().toLocaleTimeString()}`;
        }
    }

    async function loadMapData(showLoadingSpinner = false) {
        if (isMapFetching) return;
        isMapFetching = true;

        if (showLoadingSpinner && mapLoadingOverlay) {
            mapLoadingOverlay.style.display = 'flex';
        }
        if (mapErrorOverlay) mapErrorOverlay.style.display = 'none';

        const params = new URLSearchParams();
        if (activeMapDomain && activeMapDomain !== 'all' && activeMapDomain !== 'work_order') {
            params.append('data_type', activeMapDomain);
        }
        if (mapAreaFilter && mapAreaFilter.value) {
            params.append('area', mapAreaFilter.value);
        }
        if (mapSeverityFilter && mapSeverityFilter.value) {
            params.append('risk_level', mapSeverityFilter.value);
        }

        const qs = params.toString() ? `?${params.toString()}` : '';

        try {
            let data = { summary: {}, issues: [], traffic: [], emergencies: [], violations: [], risk: [], work_orders: [] };

            if (activeMapDomain !== 'work_order') {
                const res = await fetch(`${API_BASE_URL}/map/overview${qs}`, {
                    headers: getAuthHeaders()
                });

                if (!res.ok) {
                    throw new Error(`Map overview returned HTTP ${res.status}`);
                }

                data = await res.json();
            }

            // Fetch active work orders layer (Phase 16)
            try {
                const woParams = new URLSearchParams();
                if (mapAreaFilter && mapAreaFilter.value) {
                    woParams.append('area', mapAreaFilter.value);
                }
                const woQs = woParams.toString() ? `?${woParams.toString()}` : '';
                const woRes = await fetch(`${API_BASE_URL}/map/work-orders${woQs}`, {
                    headers: getAuthHeaders()
                });
                if (woRes.ok) {
                    const woJson = await woRes.json();
                    data.work_orders = Array.isArray(woJson) ? woJson : (woJson.features || []);
                }
            } catch (woErr) {
                console.warn("Could not fetch active work orders for map:", woErr);
            }

            renderMapData(data);
        } catch (err) {
            console.error("Failed to load map overview:", err);
            if (mapErrorOverlay) {
                mapErrorOverlay.style.display = 'flex';
                if (mapErrorMessage) mapErrorMessage.textContent = "Failed to load spatial operations data from FastAPI backend.";
            }
        } finally {
            if (mapLoadingOverlay) mapLoadingOverlay.style.display = 'none';
            isMapFetching = false;
        }
    }

    // Map Event Listeners
    if (refreshMapBtn) {
        refreshMapBtn.addEventListener('click', () => {
            showToast("Syncing spatial operations data from PostgreSQL...", "default");
            loadMapData(true);
        });
    }

    if (retryMapBtn) {
        retryMapBtn.addEventListener('click', () => {
            loadMapData(true);
        });
    }

    // Domain Pill Filters
    const domainPillBtns = document.querySelectorAll('.domain-pill-btn');
    domainPillBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            domainPillBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            activeMapDomain = btn.dataset.domain || 'all';
            loadMapData(false);
        });
    });

    if (mapAreaFilter) {
        mapAreaFilter.addEventListener('change', () => {
            loadMapData(false);
        });
    }

    if (mapSeverityFilter) {
        mapSeverityFilter.addEventListener('change', () => {
            loadMapData(false);
        });
    }

    if (resetMapFiltersBtn) {
        resetMapFiltersBtn.addEventListener('click', () => {
            activeMapDomain = 'all';
            domainPillBtns.forEach(b => {
                if (b.dataset.domain === 'all') b.classList.add('active');
                else b.classList.remove('active');
            });
            if (mapAreaFilter) mapAreaFilter.value = '';
            if (mapSeverityFilter) mapSeverityFilter.value = '';
            showToast("Map filters reset.", "default");
            loadMapData(false);
        });
    }

    if (closeMapDrawerBtn) {
        closeMapDrawerBtn.addEventListener('click', () => {
            if (mapDrawerSelectedState) mapDrawerSelectedState.style.display = 'none';
            if (mapDrawerEmptyState) mapDrawerEmptyState.style.display = 'block';
            selectedMapFeature = null;
        });
    }

    if (drawerCenterBtn) {
        drawerCenterBtn.addEventListener('click', () => {
            if (selectedMapFeature && selectedMapFeature.latitude && selectedMapFeature.longitude && operationsMap) {
                operationsMap.setView([selectedMapFeature.latitude, selectedMapFeature.longitude], 15, { animate: true });
            }
        });
    }

    // ==========================================================================
    // 5H. NOTIFICATIONS & OPERATIONAL ESCALATION (PHASE 13)
    // ==========================================================================
    let notificationsState = [];
    let isNotifFetching = false;
    let activeNotifStatusFilter = 'ALL';

    function getNotifSeverityBadge(severity) {
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

    function getNotifStatusBadge(status) {
        switch (status) {
            case 'UNREAD':
                return '<span class="badge badge-danger">UNREAD</span>';
            case 'READ':
                return '<span class="badge badge-neutral">READ</span>';
            case 'ACKNOWLEDGED':
                return '<span class="badge badge-success">ACKNOWLEDGED</span>';
            default:
                return `<span class="badge badge-neutral">${escapeHtml(status)}</span>`;
        }
    }

    function getDomainIconAndLabel(domain) {
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
                return { icon: '🔔', label: escapeHtml(domain) };
        }
    }

    async function loadNotifications(showSpinner = false) {
        if (isNotifFetching) return;
        isNotifFetching = true;

        if (showSpinner && notificationsFeedContainer) {
            notificationsFeedContainer.innerHTML = `
                <div class="panel-card" style="text-align: center; padding: 2.5rem;">
                    <span class="spinner-inline"></span>
                    <p class="text-muted" style="margin-top: 0.5rem;">Loading operational notifications from PostgreSQL...</p>
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

            const url = `${API_BASE_URL}/notifications${params.toString() ? '?' + params.toString() : ''}`;
            const res = await fetch(url, { headers: getAuthHeaders() });

            if (res.status === 200) {
                const data = await res.json();
                notificationsState = data.items || [];
                renderNotifications(notificationsState);
            } else {
                notificationsFeedContainer.innerHTML = `
                    <div class="panel-card empty-state-panel">
                        <div class="empty-state-icon">⚠️</div>
                        <h3>Failed to Load Notifications</h3>
                        <p class="text-muted">Server returned status ${res.status}. Check role authorization.</p>
                    </div>
                `;
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
        try {
            const res = await fetch(`${API_BASE_URL}/notifications/summary`, {
                headers: getAuthHeaders()
            });

            if (res.status === 200) {
                const s = await res.json();

                // Update Header and Sidebar Badges
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

                // Update KPI Cards
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

        notificationsFeedContainer.innerHTML = items.map(n => {
            const isUnread = n.status === 'UNREAD';
            const isAck = n.status === 'ACKNOWLEDGED';
            const domInfo = getDomainIconAndLabel(n.source_domain);
            const sevLower = (n.severity || 'medium').toLowerCase();
            const createdDate = n.created_at ? new Date(n.created_at).toLocaleString() : 'Recent';

            return `
                <div class="notification-card severity-${sevLower} ${isUnread ? 'is-unread' : ''} ${isAck ? 'is-acknowledged' : ''}" data-notif-id="${escapeHtml(n.id)}">
                    <div class="notif-card-header">
                        <div class="notif-title-area">
                            ${isUnread ? '<span class="notif-unread-dot" title="Unread Escalation"></span>' : ''}
                            <span style="font-size: 1.1rem;">${domInfo.icon}</span>
                            <h4 class="notif-title">${escapeHtml(n.title)}</h4>
                            ${getNotifSeverityBadge(n.severity)}
                            ${getNotifStatusBadge(n.status)}
                        </div>
                        <span class="notif-timestamp">${escapeHtml(createdDate)}</span>
                    </div>

                    <p class="notif-message">${escapeHtml(n.message)}</p>

                    <div class="notif-meta-bar">
                        <div class="notif-tags-group">
                            <span class="notif-chip chip-domain">${domInfo.icon} ${escapeHtml(domInfo.label)}</span>
                            ${n.source_id ? `<span class="notif-chip chip-source">[${escapeHtml(n.source_id)}]</span>` : ''}
                            ${n.area ? `<span class="notif-chip chip-area">📍 ${escapeHtml(n.area)}</span>` : ''}
                            <span class="notif-chip">Target: ${escapeHtml(n.recipient_role)}</span>
                            ${n.acknowledged_by ? `<span class="notif-chip" style="background-color: #ecfdf5; color: #047857; border-color: #a7f3d0;">✓ Ack by ${escapeHtml(n.acknowledged_by)}</span>` : ''}
                        </div>

                        <div class="notif-actions-group">
                            ${isUnread ? `
                                <button type="button" class="btn btn-outline btn-sm btn-notif-action notif-btn-read" data-id="${escapeHtml(n.id)}">
                                    ✓ Mark Read
                                </button>
                            ` : ''}
                            ${!isAck ? `
                                <button type="button" class="btn btn-primary btn-sm btn-notif-action notif-btn-ack" data-id="${escapeHtml(n.id)}" data-title="${escapeHtml(n.title)}" data-msg="${escapeHtml(n.message)}">
                                    Acknowledge
                                </button>
                            ` : ''}
                            ${isAck && n.source_id ? `
                                <button type="button" class="btn btn-primary btn-sm btn-notif-action notif-btn-dispatch" data-domain="${escapeHtml(n.source_domain)}" data-source-id="${escapeHtml(n.source_id)}" data-title="${escapeHtml(n.title)}" data-area="${escapeHtml(n.area || '')}">
                                    Dispatch Work Order &rarr;
                                </button>
                            ` : ''}
                            ${n.source_id ? `
                                <button type="button" class="btn btn-outline btn-sm btn-notif-action notif-btn-goto" data-domain="${escapeHtml(n.source_domain)}" data-source-id="${escapeHtml(n.source_id)}">
                                    Go to Record &rarr;
                                </button>
                            ` : ''}
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        // Attach Card Button Listeners
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

                openCreateWorkOrderModal({
                    orderType: oType,
                    sourceDomain: dom,
                    sourceId: btn.dataset.sourceId,
                    title: `Dispatch: ${btn.dataset.title}`,
                    area: btn.dataset.area || ''
                });
            });
        });

        notificationsFeedContainer.querySelectorAll('.notif-btn-goto').forEach(btn => {
            btn.addEventListener('click', () => navigateToSource(btn.dataset.domain, btn.dataset.sourceId));
        });
    }

    async function markNotificationAsRead(notifId) {
        try {
            const res = await fetch(`${API_BASE_URL}/notifications/${notifId}/read`, {
                method: 'PATCH',
                headers: getAuthHeaders()
            });

            if (res.status === 200) {
                showToast(`Notification ${notifId} marked as read.`, 'success');
                const item = notificationsState.find(n => n.id === notifId);
                if (item) item.status = 'READ';
                renderNotifications(notificationsState);
                loadNotificationsSummary();
            } else {
                const err = await res.json();
                showToast(err.detail || 'Could not mark notification as read.', 'error');
            }
        } catch (e) {
            showToast('Network error marking notification read.', 'error');
        }
    }

    function openAcknowledgeModal(notifId, title, message) {
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
        if (!acknowledgeModal) return;
        acknowledgeModal.style.display = 'none';
        if (acknowledgeForm) acknowledgeForm.reset();
    }

    async function handleAcknowledgeSubmit(notifId, remarks) {
        try {
            const res = await fetch(`${API_BASE_URL}/notifications/${notifId}/acknowledge`, {
                method: 'PATCH',
                headers: {
                    ...getAuthHeaders(),
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ remarks: remarks || null })
            });

            if (res.status === 200) {
                showToast(`Notification ${notifId} acknowledged successfully.`, 'success');
                closeAcknowledgeModal();
                loadNotifications(false);
                loadNotificationsSummary();
            } else {
                const err = await res.json();
                showToast(err.detail || 'Failed to acknowledge notification.', 'error');
            }
        } catch (e) {
            showToast('Network error acknowledging notification.', 'error');
        }
    }

    async function syncOperationalAlerts() {
        if (syncNotificationsBtn) syncNotificationsBtn.disabled = true;
        try {
            const res = await fetch(`${API_BASE_URL}/notifications/sync`, {
                method: 'POST',
                headers: getAuthHeaders()
            });

            if (res.status === 200) {
                const data = await res.json();
                showToast(`Sync complete: ${data.new_notifications} new alerts identified.`, 'success');
                loadNotifications(false);
                loadNotificationsSummary();
            } else {
                showToast('Notification sync failed.', 'error');
            }
        } catch (e) {
            showToast('Network error syncing alerts.', 'error');
        } finally {
            if (syncNotificationsBtn) syncNotificationsBtn.disabled = false;
        }
    }

    async function markAllVisibleAsRead() {
        const unreadItems = notificationsState.filter(n => n.status === 'UNREAD');
        if (unreadItems.length === 0) {
            showToast('No unread notifications to mark as read.', 'default');
            return;
        }

        let updatedCount = 0;
        for (const item of unreadItems) {
            try {
                const res = await fetch(`${API_BASE_URL}/notifications/${item.id}/read`, {
                    method: 'PATCH',
                    headers: getAuthHeaders()
                });
                if (res.status === 200) updatedCount++;
            } catch (e) {}
        }

        showToast(`Marked ${updatedCount} notifications as read.`, 'success');
        loadNotifications(false);
        loadNotificationsSummary();
    }

    function navigateToSource(domain, sourceId) {
        showToast(`Navigating to ${sourceId} (${domain})...`, 'default');
        switch (domain) {
            case 'emergency_alerts':
                switchSection('emergency-alerts');
                break;
            case 'traffic':
                switchSection('traffic-monitoring');
                break;
            case 'traffic_violations':
                switchSection('traffic-violations');
                break;
            case 'issues':
                switchSection('dashboard');
                break;
            case 'risk':
                switchSection('risk');
                break;
            case 'work_order':
            case 'work_orders':
                switchSection('work-orders');
                if (sourceId) {
                    openWorkOrderDetailsModal(sourceId);
                }
                break;
            default:
                if (sourceId && sourceId.startsWith('WO-')) {
                    switchSection('work-orders');
                    openWorkOrderDetailsModal(sourceId);
                } else {
                    switchSection('dashboard');
                }
        }
    }

    // Modal Triggers & Controls (Phase 13)
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

    // Filter Toolbar Event Listeners (Phase 13)
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
            showToast('Notification filters reset.', 'default');
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
        headerNotifBtn.addEventListener('click', () => switchSection('notifications'));
    }

    // ==========================================================================
    // 5I. FIELD WORK ORDERS & INCIDENT DISPATCH (PHASE 14)
    // ==========================================================================
    let workOrdersState = [];
    let isWorkOrdersFetching = false;

    function getWorkOrderStatusBadge(status) {
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
                return `<span class="badge badge-neutral">${escapeHtml(status || 'UNKNOWN')}</span>`;
        }
    }

    function getWorkOrderPriorityBadge(priority) {
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
                return `<span class="badge badge-neutral">${escapeHtml(priority || 'Normal')}</span>`;
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
            if (woAreaSearch && woAreaSearch.value.trim()) params.append('area', woAreaSearch.value.trim());

            const qs = params.toString() ? `?${params.toString()}` : '';
            const res = await fetch(`${API_BASE_URL}/work-orders${qs}`, {
                headers: getAuthHeaders()
            });

            if (res.status === 200) {
                const data = await res.json();
                workOrdersState = data.items || [];

                // Client-side SLA state filter based on authoritative backend calculated sla_status
                let filteredItems = workOrdersState;
                if (woSlaFilter && woSlaFilter.value) {
                    filteredItems = filteredItems.filter(item => item.sla_status === woSlaFilter.value);
                }

                renderWorkOrdersTable(filteredItems);
            } else if (res.status === 401) {
                handleSessionExpired();
            } else {
                console.error("Failed to load work orders:", res.status);
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
        try {
            const res = await fetch(`${API_BASE_URL}/work-orders/summary`, {
                headers: getAuthHeaders()
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
                <tr class="table-row-clickable" data-wo-id="${escapeHtml(wo.id)}">
                    <td><strong>${escapeHtml(wo.id)}</strong></td>
                    <td><span style="font-weight: 600; font-size: 0.78rem;">${escapeHtml(readableType)}</span></td>
                    <td>
                        <div style="font-weight: 600; color: var(--text-primary);">${escapeHtml(wo.title)}</div>
                        <div class="text-muted text-xs" style="max-width: 220px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${escapeHtml(wo.description)}">
                            ${escapeHtml(wo.description)}
                        </div>
                    </td>
                    <td>
                        ${wo.source_id ? `
                            <span class="wo-source-chip" title="Linked to ${escapeHtml(wo.source_domain)}">
                                <span style="font-size: 0.7rem;">🔗</span> ${escapeHtml(wo.source_id)}
                            </span>
                        ` : '<span class="text-muted text-xs">Direct</span>'}
                    </td>
                    <td>
                        <div style="font-weight: 500;">${escapeHtml(wo.area)}</div>
                        <div class="text-muted text-xs">${escapeHtml(wo.location)}</div>
                    </td>
                    <td>
                        <div class="wo-crew-label">
                            <span>👷</span> ${escapeHtml(wo.assigned_crew)}
                        </div>
                    </td>
                    <td>${getWorkOrderPriorityBadge(wo.priority)}</td>
                    <td>${formatSlaDeadline(wo.sla_deadline, wo.sla_status, isTerminal)}</td>
                    <td>${getWorkOrderSlaBadge(wo)}</td>
                    <td>${getWorkOrderStatusBadge(wo.status)}</td>
                    <td><span class="text-muted text-xs">${formatWoTimestamp(wo.created_at)}</span></td>
                    <td class="text-right" style="white-space: nowrap;">
                        <div style="display: inline-flex; gap: 0.35rem; justify-content: flex-end; align-items: center;">
                            <button type="button" class="btn btn-outline btn-sm btn-wo-action wo-btn-view" data-id="${escapeHtml(wo.id)}" title="Inspect work order details">
                                Details
                            </button>
                            ${!isTerminal ? `
                                <button type="button" class="btn btn-primary btn-sm btn-wo-action wo-btn-update" data-id="${escapeHtml(wo.id)}" title="Transition lifecycle state">
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

        // Wire up Row and Button Click Listeners
        workOrdersTableBody.querySelectorAll('tr').forEach(row => {
            row.addEventListener('click', (e) => {
                // If clicked an action button, do not trigger row selection
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

    // ==========================================================================
    // WORK ORDER DETAILS MODAL (Phase 16 Operational Inspector)
    // ==========================================================================
    async function openWorkOrderDetailsModal(woId) {
        if (!workOrderDetailsModal) return;
        if (woDetailErrorBanner) {
            woDetailErrorBanner.textContent = '';
            woDetailErrorBanner.style.display = 'none';
        }

        // Show placeholder loading state
        if (woDetailIdBadge) woDetailIdBadge.textContent = woId;
        if (woDetailTitle) woDetailTitle.textContent = `Loading Work Order ${woId}...`;
        if (woDetailDescription) woDetailDescription.textContent = 'Connecting to backend work-orders service...';
        if (woDetailUpdateStatusBtn) woDetailUpdateStatusBtn.style.display = 'none';
        workOrderDetailsModal.style.display = 'flex';

        try {
            const res = await fetch(`${API_BASE_URL}/work-orders/${encodeURIComponent(woId.trim())}`, {
                headers: getAuthHeaders()
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
                showToast(`Work order '${woId}' not found.`, 'error');
                closeWorkOrderDetailsModal();
            } else if (res.status === 401) {
                handleSessionExpired();
                closeWorkOrderDetailsModal();
            } else {
                const err = await res.json().catch(() => ({}));
                showToast(err.detail || `Error loading work order (${res.status})`, 'error');
                closeWorkOrderDetailsModal();
            }
        } catch (err) {
            console.error("Failed to load work order details:", err);
            showToast('Network error loading work order details.', 'error');
            closeWorkOrderDetailsModal();
        }
    }

    function populateWorkOrderDetails(wo) {
        if (woDetailIdBadge) woDetailIdBadge.textContent = wo.id;
        if (woDetailStatusBadge) {
            woDetailStatusBadge.textContent = wo.status;
            woDetailStatusBadge.className = `badge ${wo.status === 'COMPLETED' ? 'badge-completed' : (wo.status === 'CANCELLED' ? 'badge-cancelled' : (wo.status === 'IN_PROGRESS' ? 'badge-inprogress' : (wo.status === 'DISPATCHED' ? 'badge-dispatched' : 'badge-pending')))}`;
        }
        if (woDetailTitle) woDetailTitle.textContent = wo.title;
        if (woDetailDescription) woDetailDescription.textContent = wo.description || 'No operational description provided.';

        // Order Type & Assigned Crew
        const readableType = (wo.order_type || '').replace(/_/g, ' ');
        if (woDetailOrderType) woDetailOrderType.textContent = readableType;
        if (woDetailAssignedRole) woDetailAssignedRole.textContent = wo.assigned_role || 'ADMIN';
        if (woDetailCrew) woDetailCrew.textContent = wo.assigned_crew || 'Unassigned';
        if (woDetailPriority) woDetailPriority.innerHTML = getWorkOrderPriorityBadge(wo.priority);

        // Source Entity
        if (woDetailSource) {
            if (wo.source_id) {
                woDetailSource.innerHTML = `
                    <span class="wo-source-chip" style="cursor: pointer;" title="Navigate to source ${escapeHtml(wo.source_domain)}">
                        🔗 ${escapeHtml(wo.source_id)} (${escapeHtml(wo.source_domain)})
                    </span>
                `;
                const chip = woDetailSource.querySelector('.wo-source-chip');
                if (chip) {
                    chip.onclick = () => {
                        closeWorkOrderDetailsModal();
                        navigateToSource(wo.source_domain, wo.source_id);
                    };
                }
            } else {
                woDetailSource.innerHTML = '<span class="text-muted text-xs">Direct Operational Dispatch</span>';
            }
        }

        // Location & Municipal Area
        if (woDetailArea) woDetailArea.textContent = wo.area || '-';
        if (woDetailLocation) woDetailLocation.textContent = wo.location || '-';

        // SLA Information
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

        // Coordinates & Provenance
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

        // Audit Trail Timestamps
        if (woDetailCreatedBy) woDetailCreatedBy.textContent = wo.created_by || 'System Operator';
        if (woDetailCreatedAt) woDetailCreatedAt.textContent = formatWoTimestamp(wo.created_at);
        if (woDetailDispatchedAt) woDetailDispatchedAt.textContent = wo.dispatched_at ? formatWoTimestamp(wo.dispatched_at) : 'Not dispatched yet';
        if (woDetailCompletedAt) woDetailCompletedAt.textContent = wo.completed_at ? formatWoTimestamp(wo.completed_at) : (isTerminal ? 'Cancelled' : 'Pending completion');
        if (woDetailCompletedBy) woDetailCompletedBy.textContent = wo.completed_by || '-';
        if (woDetailActualCost) {
            woDetailActualCost.textContent = wo.actual_cost != null ? `₹${Number(wo.actual_cost).toLocaleString('en-IN')}` : '₹0 (Pending completion)';
        }

        // Resolution Notes
        if (woDetailResolutionBox && woDetailResolutionNotes) {
            if (wo.resolution_notes) {
                woDetailResolutionNotes.textContent = wo.resolution_notes;
                woDetailResolutionBox.style.display = 'block';
            } else {
                woDetailResolutionBox.style.display = 'none';
            }
        }

        // Update Status Action Button in Modal Footer
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
        if (!workOrderDetailsModal) return;
        workOrderDetailsModal.style.display = 'none';
        if (woDetailErrorBanner) {
            woDetailErrorBanner.textContent = '';
            woDetailErrorBanner.style.display = 'none';
        }
    }

    // ==========================================================================
    // WORK ORDER CREATION (Phase 16 Role-Enforced Creation Modal)
    // ==========================================================================
    function openCreateWorkOrderModal(prefill = {}) {
        if (!createWorkOrderModal) return;
        if (createWoErrorBanner) {
            createWoErrorBanner.textContent = '';
            createWoErrorBanner.style.display = 'none';
        }
        if (createWorkOrderForm) createWorkOrderForm.reset();

        // Check authentication & RBAC
        if (!authState.token || !authState.user) {
            showToast('Operator authentication required to dispatch work orders.', 'warning');
            openLoginModal();
            return;
        }

        const userRole = authState.user.role;

        // Role-based allowed order types and descriptions
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
            showToast(`Role '${userRole}' is not authorized to dispatch work orders.`, 'error');
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
        if (createWorkOrderModal) createWorkOrderModal.style.display = 'none';
        if (createWoErrorBanner) {
            createWoErrorBanner.textContent = '';
            createWoErrorBanner.style.display = 'none';
        }
    }

    async function handleCreateWorkOrderSubmit(e) {
        e.preventDefault();
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
            showToast('Please fill in all mandatory fields.', 'error');
            return;
        }

        submitCreateWoBtn.disabled = true;
        if (createWoErrorBanner) createWoErrorBanner.style.display = 'none';

        try {
            const res = await fetch(`${API_BASE_URL}/work-orders`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...getAuthHeaders()
                },
                body: JSON.stringify(payload)
            });

            if (res.status === 201) {
                const created = await res.json();
                showToast(`Work Order ${created.id} dispatched successfully!`, 'success');
                closeCreateWorkOrderModal();
                loadWorkOrders(true);
                loadWorkOrdersSummary();
                loadMapData(false);
                loadNotifications(false);
                loadNotificationsSummary();
            } else if (res.status === 400 || res.status === 409 || res.status === 422) {
                const err = await res.json();
                const msg = err.detail || 'Dispatch failed: Duplicate active order or invalid pairing.';
                if (createWoErrorBanner) {
                    createWoErrorBanner.textContent = typeof msg === 'object' ? JSON.stringify(msg) : msg;
                    createWoErrorBanner.style.display = 'block';
                }
                showToast(typeof msg === 'string' ? msg : 'Creation validation error', 'error');
            } else if (res.status === 403) {
                const err = await res.json();
                const msg = err.detail || 'Forbidden: Insufficient role permissions for this order type.';
                if (createWoErrorBanner) {
                    createWoErrorBanner.textContent = msg;
                    createWoErrorBanner.style.display = 'block';
                }
                showToast(msg, 'error');
            } else if (res.status === 401) {
                handleSessionExpired();
            } else {
                const err = await res.json().catch(() => ({}));
                showToast(err.detail || `Server error: ${res.status}`, 'error');
            }
        } catch (err) {
            showToast('Network error dispatching work order.', 'error');
        } finally {
            submitCreateWoBtn.disabled = false;
        }
    }

    // ==========================================================================
    // WORK ORDER STATUS LIFECYCLE UPDATE (Phase 16)
    // ==========================================================================
    function openUpdateWorkOrderModal(woId) {
        if (!updateWorkOrderModal) return;
        const wo = workOrdersState.find(w => w.id === woId);
        if (!wo) {
            // If not found in state cache, fetch from backend
            fetch(`${API_BASE_URL}/work-orders/${encodeURIComponent(woId.trim())}`, {
                headers: getAuthHeaders()
            }).then(r => r.json()).then(remoteWo => {
                if (remoteWo && remoteWo.id) {
                    populateUpdateWorkOrderForm(remoteWo);
                }
            }).catch(() => {
                showToast(`Work order ${woId} not found.`, 'error');
            });
            return;
        }

        populateUpdateWorkOrderForm(wo);
    }

    function populateUpdateWorkOrderForm(wo) {
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

        // Populate valid target transitions according to strict lifecycle rules
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

        // Toggle notes & cost visibility/requirements based on status
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
        if (updateWorkOrderModal) updateWorkOrderModal.style.display = 'none';
        if (updateWoErrorBanner) {
            updateWoErrorBanner.textContent = '';
            updateWoErrorBanner.style.display = 'none';
        }
    }

    async function handleUpdateWorkOrderSubmit(e) {
        e.preventDefault();
        if (!submitUpdateWoBtn) return;

        const woId = updateWoIdHidden ? updateWoIdHidden.value : '';
        const status = updateWoStatusSelect ? updateWoStatusSelect.value : '';
        const notes = updateWoNotesInput ? updateWoNotesInput.value.trim() : '';
        const costVal = updateWoActualCostInput && updateWoActualCostInput.value ? parseFloat(updateWoActualCostInput.value) : null;

        if (status === 'COMPLETED' && (!notes || notes.length < 5)) {
            showToast('Resolution notes (min 5 chars) are required to complete a work order.', 'error');
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
            const res = await fetch(`${API_BASE_URL}/work-orders/${woId}/status`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    ...getAuthHeaders()
                },
                body: JSON.stringify(payload)
            });

            if (res.status === 200) {
                const updated = await res.json();
                const msg = status === 'COMPLETED'
                    ? `Work Order ${woId} COMPLETED! Linked source entity automatically resolved.`
                    : `Work Order ${woId} transitioned to ${status}.`;
                showToast(msg, 'success');
                closeUpdateWorkOrderModal();

                // 1. Refresh the selected work order details if open
                if (workOrderDetailsModal && workOrderDetailsModal.style.display !== 'none') {
                    openWorkOrderDetailsModal(woId);
                }

                // 2. Refresh the work-order list
                loadWorkOrders(false);

                // 3. Refresh summary/KPI values
                loadWorkOrdersSummary();

                // 4. Refresh relevant map data
                loadMapData(false);

                // 5. Refresh notifications if applicable
                loadNotifications(false);
                loadNotificationsSummary();

                // Closed-loop operational entity refresh
                if (status === 'COMPLETED') {
                    loadIssues(false);
                    loadAlerts(false);
                }
            } else if (res.status === 400 || res.status === 409 || res.status === 422) {
                const err = await res.json();
                const msg = err.detail || 'Invalid transition or completion validation failed.';
                if (updateWoErrorBanner) {
                    updateWoErrorBanner.textContent = typeof msg === 'object' ? JSON.stringify(msg) : msg;
                    updateWoErrorBanner.style.display = 'block';
                }
                showToast(typeof msg === 'string' ? msg : 'Validation error updating status', 'error');
            } else if (res.status === 403) {
                const err = await res.json();
                const msg = err.detail || 'Forbidden: Insufficient role permissions for this operation.';
                if (updateWoErrorBanner) {
                    updateWoErrorBanner.textContent = msg;
                    updateWoErrorBanner.style.display = 'block';
                }
                showToast(msg, 'error');
            } else if (res.status === 401) {
                handleSessionExpired();
            } else {
                const err = await res.json().catch(() => ({}));
                showToast(err.detail || `Server error: ${res.status}`, 'error');
            }
        } catch (err) {
            showToast('Network error updating work order.', 'error');
        } finally {
            submitUpdateWoBtn.disabled = false;
        }
    }

    // Work Orders Filter and Modal Listeners (Phase 16)
    if (woOrderTypeInput && woSourceDomainHidden) {
        woOrderTypeInput.addEventListener('change', () => {
            woSourceDomainHidden.value = getCompatibleSourceDomain(woOrderTypeInput.value);
        });
    }

    if (refreshWorkOrdersBtn) {
        refreshWorkOrdersBtn.addEventListener('click', () => {
            showToast('Syncing work orders from PostgreSQL...', 'default');
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

    // Details Modal Event Listeners
    if (closeWoDetailsModalBtn) closeWoDetailsModalBtn.addEventListener('click', closeWorkOrderDetailsModal);
    if (closeWoDetailsModalFooterBtn) closeWoDetailsModalFooterBtn.addEventListener('click', closeWorkOrderDetailsModal);
    if (workOrderDetailsModal) {
        workOrderDetailsModal.addEventListener('click', (e) => {
            if (e.target === workOrderDetailsModal) closeWorkOrderDetailsModal();
        });
    }

    // Work Order Filters Event Listeners
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
            showToast('Work order filters reset.', 'default');
            loadWorkOrders(false);
        });
    }

    // Delegate map popup work order inspection button click
    document.addEventListener('click', (e) => {
        const btn = e.target.closest('.map-popup-wo-btn');
        if (btn && btn.dataset.woId) {
            openWorkOrderDetailsModal(btn.dataset.woId);
        }
    });

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
                    headers: getAuthHeaders(),
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
                case 'nav-risk':
                    switchSection('risk');
                    break;
                case 'nav-work-orders':
                    switchSection('work-orders');
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
    // Initial health check and load issues, traffic, alerts, violations, analytics, risk & work orders from PostgreSQL
    restoreSession();
    checkBackendHealth();
    loadIssues(true);
    loadTraffic(true);
    loadAlerts(true);
    loadViolations(true);
    loadAnalytics(true);
    loadRisk(true);
    loadNotificationsSummary();
    loadWorkOrdersSummary();

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
        if (!isRiskFetching && (currentActiveSection === 'risk' || currentActiveSection === 'dashboard')) {
            loadRisk(false);
        }
        if (!isMapFetching && currentActiveSection === 'map') {
            loadMapData(false);
        }
        if (!isNotifFetching) {
            loadNotificationsSummary();
            if (currentActiveSection === 'notifications') {
                loadNotifications(false);
            }
        }
        if (!isWorkOrdersFetching) {
            loadWorkOrdersSummary();
            if (currentActiveSection === 'work-orders') {
                loadWorkOrders(false);
            }
        }
    }, 30000);
});
