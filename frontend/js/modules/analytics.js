/**
 * Road System Control - Traffic Analytics & Predictive Intelligence Module
 * Aggregated analytics across traffic telemetry, issues, emergencies, violations, and correlation trends.
 */
(function(window) {
    'use strict';

    let isAnalyticsFetching = false;
    let analyticsFilterState = {
        area: '',
        start_date: '',
        end_date: ''
    };

    function renderAnalyticsOverview(overview) {
        if (!overview) return;
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

        const analyticsTrafficAvgSpeed = document.getElementById('analyticsTrafficAvgSpeed');
        const analyticsTrafficAvgVehicles = document.getElementById('analyticsTrafficAvgVehicles');
        const analyticsCongestionStackedBar = document.getElementById('analyticsCongestionStackedBar');
        const analyticsCongestionLegend = document.getElementById('analyticsCongestionLegend');
        const analyticsTopVolumeRoadsList = document.getElementById('analyticsTopVolumeRoadsList');
        const escape = window.escapeHtml || ((s) => s);

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
                <div class="stacked-legend-item"><span class="stacked-legend-dot" style="background-color: var(--primary-base);"></span> Moderate (${mod})</div>
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
                                <span class="bar-metric-label">${escape(r.road_name)}</span>
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
        const analyticsIssuesTotal = document.getElementById('analyticsIssuesTotal');
        const analyticsIssuesUnresolved = document.getElementById('analyticsIssuesUnresolved');
        const analyticsIssueSeverityBars = document.getElementById('analyticsIssueSeverityBars');
        const analyticsIssuesTopAreasList = document.getElementById('analyticsIssuesTopAreasList');
        const escape = window.escapeHtml || ((s) => s);

        if (analyticsIssuesTotal) analyticsIssuesTotal.textContent = issues.total_issues ?? 0;
        if (analyticsIssuesUnresolved) analyticsIssuesUnresolved.textContent = issues.unresolved_issue_count ?? 0;

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
                                <span class="bar-metric-label">${escape(a.area)}</span>
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
        const analyticsEmergenciesActive = document.getElementById('analyticsEmergenciesActive');
        const analyticsEmergenciesTotal = document.getElementById('analyticsEmergenciesTotal');
        const analyticsEmergencyTypeBars = document.getElementById('analyticsEmergencyTypeBars');
        const analyticsRecentEmergenciesList = document.getElementById('analyticsRecentEmergenciesList');
        const escape = window.escapeHtml || ((s) => s);
        const formatTime = window.formatTimeAgo || ((d) => d);
        const getAlertBadge = window.getAlertSeverityBadge || ((s) => s);

        if (analyticsEmergenciesActive) analyticsEmergenciesActive.textContent = emergencies.active_alerts ?? 0;
        if (analyticsEmergenciesTotal) analyticsEmergenciesTotal.textContent = emergencies.total_alerts ?? 0;

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
                                <span class="bar-metric-label">${escape(k)}</span>
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

        if (analyticsRecentEmergenciesList) {
            const recent = emergencies.recent_emergency_activity || [];
            if (recent.length === 0) {
                analyticsRecentEmergenciesList.innerHTML = `<div class="text-muted text-xs">No recent emergency broadcasts.</div>`;
            } else {
                analyticsRecentEmergenciesList.innerHTML = recent.map(r => `
                    <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.35rem 0; border-bottom: 1px solid var(--border-subtle); font-size: 0.8rem;">
                        <div>
                            <strong>${escape(r.alert_type)}</strong>: ${escape(r.title)}
                            <div class="text-xs text-muted">${escape(r.area)} • ${formatTime(r.issued_at)}</div>
                        </div>
                        <div>
                            ${getAlertBadge(r.severity)}
                        </div>
                    </div>
                `).join('');
            }
        }
    }

    function renderAnalyticsViolations(violations) {
        if (!violations) return;
        const analyticsViolationsTotalFines = document.getElementById('analyticsViolationsTotalFines');
        const analyticsViolationsAvgFine = document.getElementById('analyticsViolationsAvgFine');
        const analyticsViolationTypeBars = document.getElementById('analyticsViolationTypeBars');
        const analyticsViolationsTopAreasList = document.getElementById('analyticsViolationsTopAreasList');
        const escape = window.escapeHtml || ((s) => s);

        if (analyticsViolationsTotalFines) analyticsViolationsTotalFines.textContent = `₹${(violations.total_fines ?? 0).toLocaleString('en-IN')}`;
        if (analyticsViolationsAvgFine) analyticsViolationsAvgFine.textContent = `₹${(violations.average_fine ?? 0).toLocaleString('en-IN')}`;

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
                                <span class="bar-metric-label">${escape(k)}</span>
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
                                <span class="bar-metric-label">${escape(a.area)}</span>
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
        const analyticsTrendsCount = document.getElementById('analyticsTrendsCount');
        const analyticsTrendsTableBody = document.getElementById('analyticsTrendsTableBody');
        const escape = window.escapeHtml || ((s) => s);

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
                    <td><strong>${escape(d)}</strong></td>
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

        const analyticsLastUpdated = document.getElementById('analyticsLastUpdated');
        const apiBase = window.API_BASE_URL || 'http://127.0.0.1:8000/api';
        const toast = window.showToast || console.log;

        const params = new URLSearchParams();
        if (analyticsFilterState.area) params.append('area', analyticsFilterState.area);
        if (analyticsFilterState.start_date) params.append('start_date', analyticsFilterState.start_date);
        if (analyticsFilterState.end_date) params.append('end_date', analyticsFilterState.end_date);
        const qs = params.toString() ? `?${params.toString()}` : '';

        try {
            const [overviewRes, trafficRes, issuesRes, emergenciesRes, violationsRes, trendsRes] = await Promise.all([
                fetch(`${apiBase}/analytics/overview${qs}`),
                fetch(`${apiBase}/analytics/traffic${qs}`),
                fetch(`${apiBase}/analytics/issues${qs}`),
                fetch(`${apiBase}/analytics/emergencies${qs}`),
                fetch(`${apiBase}/analytics/violations${qs}`),
                fetch(`${apiBase}/analytics/trends${qs}`)
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
            toast("Failed to fetch analytics intelligence from backend.", "error");
        } finally {
            isAnalyticsFetching = false;
        }
    }

    function initAnalyticsListeners() {
        const applyAnalyticsFilterBtn = document.getElementById('applyAnalyticsFilterBtn');
        const resetAnalyticsFilterBtn = document.getElementById('resetAnalyticsFilterBtn');
        const analyticsAreaFilter = document.getElementById('analyticsAreaFilter');
        const analyticsStartDate = document.getElementById('analyticsStartDate');
        const analyticsEndDate = document.getElementById('analyticsEndDate');
        const refreshAnalyticsBtn = document.getElementById('refreshAnalyticsBtn');
        const toast = window.showToast || console.log;

        if (applyAnalyticsFilterBtn) {
            applyAnalyticsFilterBtn.addEventListener('click', () => {
                analyticsFilterState.area = analyticsAreaFilter ? analyticsAreaFilter.value : '';
                analyticsFilterState.start_date = analyticsStartDate ? analyticsStartDate.value : '';
                analyticsFilterState.end_date = analyticsEndDate ? analyticsEndDate.value : '';
                toast('Applying analytics filters...', 'default');
                loadAnalytics(false);
            });
        }

        if (resetAnalyticsFilterBtn) {
            resetAnalyticsFilterBtn.addEventListener('click', () => {
                if (analyticsAreaFilter) analyticsAreaFilter.value = '';
                if (analyticsStartDate) analyticsStartDate.value = '';
                if (analyticsEndDate) analyticsEndDate.value = '';
                analyticsFilterState = { area: '', start_date: '', end_date: '' };
                toast('Analytics filters reset.', 'default');
                loadAnalytics(false);
            });
        }

        if (refreshAnalyticsBtn) {
            refreshAnalyticsBtn.addEventListener('click', () => {
                toast("Syncing analytics telemetry...", "default");
                loadAnalytics(true);
            });
        }
    }

    const AnalyticsModule = {
        loadAnalytics,
        renderAnalyticsOverview,
        renderAnalyticsTraffic,
        renderAnalyticsIssues,
        renderAnalyticsEmergencies,
        renderAnalyticsViolations,
        renderAnalyticsTrends,
        getFilterState: () => analyticsFilterState,
        isFetching: () => isAnalyticsFetching,
        init: initAnalyticsListeners
    };

    window.AnalyticsModule = AnalyticsModule;
    window.loadAnalytics = loadAnalytics;
})(window);
