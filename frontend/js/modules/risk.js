/**
 * Road System Control - AI Risk & Incident Intelligence Module
 * Composite risk score evaluation, accident probability, hotspot tracking, and tactical actions.
 */
(function(window) {
    'use strict';

    let isRiskFetching = false;

    function getRiskLevelBadge(level) {
        const escape = window.escapeHtml || ((s) => s);
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
                return `<span class="badge badge-neutral">${escape(level)}</span>`;
        }
    }

    function renderRiskOverview(overview) {
        if (!overview) return;
        const score = overview.city_risk_score ?? 0;
        const level = overview.city_risk_level ?? 'Low';
        const levelLower = level.toLowerCase();

        const riskCityScore = document.getElementById('riskCityScore');
        const riskCityLevelBadge = document.getElementById('riskCityLevelBadge');
        const riskCityScoreCircle = document.getElementById('riskCityScoreCircle');
        const riskTotalAreas = document.getElementById('riskTotalAreas');
        const riskCriticalAreas = document.getElementById('riskCriticalAreas');
        const riskHighAreas = document.getElementById('riskHighAreas');
        const riskActiveEmergencies = document.getElementById('riskActiveEmergencies');
        const riskUnresolvedIssues = document.getElementById('riskUnresolvedIssues');
        const riskTotalRoads = document.getElementById('riskTotalRoads');
        const riskRecommendedActionText = document.getElementById('riskRecommendedActionText');
        const riskTacticalActionBox = document.getElementById('riskTacticalActionBox');
        const sidebarRiskBadge = document.getElementById('sidebarRiskBadge');

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
        const riskAreasTableBody = document.getElementById('riskAreasTableBody');
        const riskAreasCountBadge = document.getElementById('riskAreasCountBadge');
        const escape = window.escapeHtml || ((s) => s);

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
                    <td><strong>${escape(a.area)}</strong></td>
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
                        <div style="font-size: 0.82rem; font-weight: 600; color: var(--text-primary);">${escape(a.primary_factor)}</div>
                    </td>
                    <td>${a.active_emergencies > 0 ? `<span class="badge badge-danger">${a.active_emergencies} Active</span>` : '<span class="text-muted">0</span>'}</td>
                    <td>${a.unresolved_issues > 0 ? `<span class="badge badge-warning-soft">${a.unresolved_issues} Open</span>` : '<span class="text-muted">0</span>'}</td>
                    <td>${a.average_speed ? `<strong>${a.average_speed} km/h</strong>` : '<span class="text-muted">-</span>'}</td>
                    <td>${a.recent_violations > 0 ? `<span class="badge badge-purple">${a.recent_violations}</span>` : '<span class="text-muted">0</span>'}</td>
                    <td>
                        <div style="font-size: 0.78rem; line-height: 1.35; color: var(--text-secondary); background: #f8fafc; border-left: 3px solid var(--border-color); padding: 0.35rem 0.6rem; border-radius: 2px;">
                            ${escape(a.recommended_action)}
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
    }

    function renderRiskRoads(roads) {
        const riskRoadsTableBody = document.getElementById('riskRoadsTableBody');
        const riskRoadsCountBadge = document.getElementById('riskRoadsCountBadge');
        const escape = window.escapeHtml || ((s) => s);
        const getCongestion = window.getCongestionBadge || ((c) => c);
        const getTrafficStatus = window.getTrafficStatusBadge || ((s) => s);

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
                    <td><strong>${escape(r.road_name)}</strong></td>
                    <td>${escape(r.area || 'Metro Sector')}</td>
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
                    <td>${getCongestion(r.congestion_level)}</td>
                    <td>${getTrafficStatus(r.traffic_status)}</td>
                    <td>
                        <div style="font-size: 0.78rem; line-height: 1.35; color: var(--text-secondary);">
                            ${escape(r.recommended_action)}
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
    }

    async function loadRisk(isInitial = false) {
        if (isRiskFetching) return;
        isRiskFetching = true;

        const riskAreasTableBody = document.getElementById('riskAreasTableBody');
        const riskRoadsTableBody = document.getElementById('riskRoadsTableBody');
        const riskLastUpdated = document.getElementById('riskLastUpdated');
        const apiBase = window.API_BASE_URL || 'http://127.0.0.1:8000/api';

        try {
            const [overviewRes, areasRes, roadsRes] = await Promise.all([
                fetch(`${apiBase}/risk/overview`),
                fetch(`${apiBase}/risk/areas`),
                fetch(`${apiBase}/risk/roads`)
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

    function initRiskListeners() {
        const refreshRiskBtn = document.getElementById('refreshRiskBtn');
        const toast = window.showToast || console.log;

        if (refreshRiskBtn) {
            refreshRiskBtn.addEventListener('click', () => {
                toast('Syncing risk intelligence from PostgreSQL...', 'default');
                loadRisk(false);
            });
        }
    }

    const RiskModule = {
        loadRisk,
        renderRiskOverview,
        renderRiskAreas,
        renderRiskRoads,
        getRiskLevelBadge,
        isFetching: () => isRiskFetching,
        init: initRiskListeners
    };

    window.RiskModule = RiskModule;
    window.loadRisk = loadRisk;
    window.getRiskLevelBadge = getRiskLevelBadge;
})(window);
