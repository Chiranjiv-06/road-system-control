/**
 * Road System Control - Road Infrastructure Issues Module
 * Incident reporting, field defect registry, validation, photographic session preview, and details modal.
 */
(function(window) {
    'use strict';

    let issuesState = [];
    const sessionImageMap = new Map();
    let currentImageSessionDataUrl = null;

    function updateDashboardMetrics(issues) {
        const metricTotal = document.getElementById('metricTotal');
        const metricCritical = document.getElementById('metricCritical');
        const metricActive = document.getElementById('metricActive');
        const metricResolved = document.getElementById('metricResolved');

        const total = issues.length;
        const critical = issues.filter(i => i.severity === 'Critical').length;
        const active = issues.filter(i => i.status !== 'Resolved').length;
        const resolved = issues.filter(i => i.status === 'Resolved').length;

        if (metricTotal) metricTotal.textContent = total;
        if (metricCritical) metricCritical.textContent = critical;
        if (metricActive) metricActive.textContent = active;
        if (metricResolved) metricResolved.textContent = resolved;
    }

    function renderIssuesTable(issues) {
        const recentIssuesTableBody = document.getElementById('recentIssuesTableBody');
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

        const escape = window.escapeHtml || ((s) => s);
        const formatTime = window.formatTimeAgo || ((d) => d);
        const getSeverity = window.getSeverityBadge || ((s) => s);
        const getStatus = window.getStatusBadge || ((s) => s);

        issues.forEach(issue => {
            const row = document.createElement('tr');
            row.className = 'clickable-row';

            let indicatorClass = '';
            if (issue.severity === 'Critical') indicatorClass = 'danger';
            else if (issue.severity === 'Low') indicatorClass = 'info';

            const areaDisplay = issue.area ? `<span class="text-xs text-muted">(${escape(issue.area)})</span>` : '';
            const hasPhotoSession = sessionImageMap.has(issue.id);

            row.innerHTML = `
                <td>
                    <div class="issue-name-cell">
                        <span class="issue-id-tag">${escape(issue.id)}</span>
                        <span class="issue-type-indicator ${indicatorClass}"></span>
                        <strong>${escape(issue.issueType)}</strong>
                        ${hasPhotoSession ? '<span title="Photo attached in this session" style="font-size:0.75rem;">📷</span>' : ''}
                    </div>
                </td>
                <td>${escape(issue.location)} ${areaDisplay}</td>
                <td>${getSeverity(issue.severity)}</td>
                <td>${getStatus(issue.status)}</td>
                <td class="text-muted" title="${new Date(issue.reportedAt).toLocaleString()}">
                    ${formatTime(issue.reportedAt)}
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

    async function loadIssues(showLoadingSpinner = true) {
        const recentIssuesTableBody = document.getElementById('recentIssuesTableBody');
        const apiBase = window.API_BASE_URL || 'http://127.0.0.1:8000/api';
        const checkHealth = window.checkBackendHealth || (async () => true);
        const toast = window.showToast || console.log;

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
            const isOnline = await checkHealth();
            if (!isOnline) {
                throw new Error("Backend connection offline");
            }

            const response = await fetch(`${apiBase}/issues`);
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
            toast("Unable to reach backend server. Please check FastAPI.", "error");
        }
    }

    function openIssueDetails(issue) {
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
        const getSeverity = window.getSeverityBadge || ((s) => s);
        const getStatus = window.getStatusBadge || ((s) => s);
        const formatTime = window.formatTimeAgo || ((d) => d);

        if (!issueDetailsModal) return;

        if (modalIssueId) modalIssueId.textContent = issue.id;
        if (modalIssueType) modalIssueType.textContent = issue.issueType;
        if (modalLocation) modalLocation.textContent = issue.location;
        if (modalArea) modalArea.textContent = issue.area || 'Not specified';
        if (modalSeverityContainer) modalSeverityContainer.innerHTML = getSeverity(issue.severity);
        if (modalStatusContainer) modalStatusContainer.innerHTML = getStatus(issue.status);
        if (modalReportedAt) {
            const d = new Date(issue.reportedAt);
            modalReportedAt.textContent = `${d.toLocaleDateString()} at ${d.toLocaleTimeString()} (${formatTime(issue.reportedAt)})`;
        }
        if (modalDescription) modalDescription.textContent = issue.description;

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
        const issueDetailsModal = document.getElementById('issueDetailsModal');
        if (!issueDetailsModal) return;
        issueDetailsModal.style.display = 'none';
        document.body.style.overflow = '';
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

    function resetImagePreview() {
        const issueImageInput = document.getElementById('issueImage');
        const imagePreviewImg = document.getElementById('imagePreviewImg');
        const imagePreviewName = document.getElementById('imagePreviewName');
        const imagePreviewCard = document.getElementById('imagePreviewCard');

        currentImageSessionDataUrl = null;
        if (issueImageInput) issueImageInput.value = '';
        if (imagePreviewImg) imagePreviewImg.src = '';
        if (imagePreviewName) imagePreviewName.textContent = '';
        if (imagePreviewCard) imagePreviewCard.style.display = 'none';
    }

    function resetForm() {
        const reportIssueForm = document.getElementById('reportIssueForm');
        const issueDateTimeInput = document.getElementById('issueDateTime');
        const issueTypeInput = document.getElementById('issueType');
        const issueDescriptionInput = document.getElementById('issueDescription');
        const issueLocationInput = document.getElementById('issueLocation');
        const issueSeverityInput = document.getElementById('issueSeverity');
        const issueImageInput = document.getElementById('issueImage');
        const getTimeStr = window.getLocalDateTimeString || (() => new Date().toISOString().slice(0, 16));

        if (reportIssueForm) reportIssueForm.reset();
        if (issueDateTimeInput) issueDateTimeInput.value = getTimeStr();
        resetImagePreview();

        clearFieldError(issueTypeInput, 'issueTypeError');
        clearFieldError(issueDescriptionInput, 'issueDescriptionError');
        clearFieldError(issueLocationInput, 'issueLocationError');
        clearFieldError(issueSeverityInput, 'issueSeverityError');
        clearFieldError(issueDateTimeInput, 'issueDateTimeError');
        clearFieldError(issueImageInput, 'issueImageError');
    }

    function initIssueListeners() {
        const closeModalBtn = document.getElementById('closeModalBtn');
        const closeModalFooterBtn = document.getElementById('closeModalFooterBtn');
        const issueDetailsModal = document.getElementById('issueDetailsModal');
        const issueDateTimeInput = document.getElementById('issueDateTime');
        const issueTypeInput = document.getElementById('issueType');
        const issueDescriptionInput = document.getElementById('issueDescription');
        const issueLocationInput = document.getElementById('issueLocation');
        const issueAreaInput = document.getElementById('issueArea');
        const issueSeverityInput = document.getElementById('issueSeverity');
        const issueImageInput = document.getElementById('issueImage');
        const imagePreviewImg = document.getElementById('imagePreviewImg');
        const imagePreviewName = document.getElementById('imagePreviewName');
        const imagePreviewCard = document.getElementById('imagePreviewCard');
        const removeImageBtn = document.getElementById('removeImageBtn');
        const clearFormBtn = document.getElementById('clearFormBtn');
        const reportIssueForm = document.getElementById('reportIssueForm');
        const submitIssueBtn = document.getElementById('submitIssueBtn');
        const refreshIssuesBtn = document.getElementById('refreshIssuesBtn');

        const apiBase = window.API_BASE_URL || 'http://127.0.0.1:8000/api';
        const getHeaders = window.getAuthHeaders || (() => ({}));
        const toast = window.showToast || console.log;
        const getTimeStr = window.getLocalDateTimeString || (() => new Date().toISOString().slice(0, 16));
        const switchSec = window.switchSection || ((s) => {});

        if (issueDateTimeInput) {
            issueDateTimeInput.value = getTimeStr();
        }

        if (closeModalBtn) closeModalBtn.addEventListener('click', closeIssueDetails);
        if (closeModalFooterBtn) closeModalFooterBtn.addEventListener('click', closeIssueDetails);
        if (issueDetailsModal) {
            issueDetailsModal.addEventListener('click', (e) => {
                if (e.target === issueDetailsModal) closeIssueDetails();
            });
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

        if (removeImageBtn) {
            removeImageBtn.addEventListener('click', (e) => {
                e.preventDefault();
                resetImagePreview();
                clearFieldError(issueImageInput, 'issueImageError');
            });
        }

        if (clearFormBtn) {
            clearFormBtn.addEventListener('click', (e) => {
                e.preventDefault();
                resetForm();
                toast('Form cleared.', 'default');
            });
        }

        if (refreshIssuesBtn) {
            refreshIssuesBtn.addEventListener('click', () => {
                toast("Syncing issues...", "default");
                loadIssues(true);
            });
        }

        if (reportIssueForm) {
            reportIssueForm.addEventListener('submit', async (e) => {
                e.preventDefault();

                let isValid = true;

                const issueType = issueTypeInput ? issueTypeInput.value : '';
                if (!issueType) {
                    setFieldError(issueTypeInput, 'issueTypeError', 'Please select an issue type.');
                    isValid = false;
                } else {
                    clearFieldError(issueTypeInput, 'issueTypeError');
                }

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

                const location = issueLocationInput ? issueLocationInput.value.trim() : '';
                if (!location) {
                    setFieldError(issueLocationInput, 'issueLocationError', 'Please enter the road or landmark location.');
                    isValid = false;
                } else {
                    clearFieldError(issueLocationInput, 'issueLocationError');
                }

                const severity = issueSeverityInput ? issueSeverityInput.value : '';
                if (!severity) {
                    setFieldError(issueSeverityInput, 'issueSeverityError', 'Please select the severity level.');
                    isValid = false;
                } else {
                    clearFieldError(issueSeverityInput, 'issueSeverityError');
                }

                const dateTimeVal = issueDateTimeInput ? issueDateTimeInput.value : '';
                if (!dateTimeVal) {
                    setFieldError(issueDateTimeInput, 'issueDateTimeError', 'Please select the date and time.');
                    isValid = false;
                } else {
                    clearFieldError(issueDateTimeInput, 'issueDateTimeError');
                }

                if (!isValid) {
                    toast('Please correct the highlighted fields.', 'error');
                    return;
                }

                const areaVal = issueAreaInput && issueAreaInput.value.trim() ? issueAreaInput.value.trim() : null;
                const payload = {
                    issueType: issueType,
                    description: description,
                    location: location,
                    area: areaVal,
                    severity: severity,
                    reportedAt: new Date(dateTimeVal).toISOString()
                };

                if (submitIssueBtn) {
                    submitIssueBtn.disabled = true;
                    submitIssueBtn.innerHTML = `<span class="spinner-inline"></span> Submitting to Database...`;
                }

                try {
                    const response = await fetch(`${apiBase}/issues`, {
                        method: 'POST',
                        headers: getHeaders(),
                        body: JSON.stringify(payload)
                    });

                    if (response.status === 201) {
                        const createdIssue = await response.json();

                        if (currentImageSessionDataUrl) {
                            sessionImageMap.set(createdIssue.id, currentImageSessionDataUrl);
                        }

                        issuesState.unshift(createdIssue);
                        updateDashboardMetrics(issuesState);
                        renderIssuesTable(issuesState);

                        resetForm();
                        toast(`Issue ${createdIssue.id} saved to PostgreSQL successfully!`, 'success');
                        switchSec('dashboard');
                    } else if (response.status === 422) {
                        const errorDetail = await response.json();
                        console.error("Validation error from backend:", errorDetail);
                        toast('Some issue details are invalid. Please check inputs.', 'error');
                    } else {
                        throw new Error(`Server returned status: ${response.status}`);
                    }
                } catch (error) {
                    console.error("Failed to submit issue to FastAPI:", error);
                    toast('Unable to save issue. Please check that FastAPI backend is running.', 'error');
                } finally {
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
    }

    const IssuesModule = {
        loadIssues,
        updateDashboardMetrics,
        renderIssuesTable,
        openIssueDetails,
        closeIssueDetails,
        resetForm,
        getState: () => issuesState,
        init: initIssueListeners
    };

    window.IssuesModule = IssuesModule;
    window.loadIssues = loadIssues;
    window.updateDashboardMetrics = updateDashboardMetrics;
    window.openIssueDetails = openIssueDetails;
    window.closeIssueDetails = closeIssueDetails;
})(window);
