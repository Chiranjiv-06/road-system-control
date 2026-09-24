/**
 * Road System Control - Traffic Monitoring Module
 * Live traffic congestion telemetry, corridor speeds, vehicle counts, and summary metrics.
 */
(function(window) {
    'use strict';

    let trafficState = [];
    let isTrafficFetching = false;

    function renderTrafficSummary(summary) {
        if (!summary) return;
        const totalRecs = summary.total_records ?? summary.totalRecords ?? 0;
        const totalVehs = summary.total_vehicles ?? summary.totalVehicles ?? 0;
        const avgSpd = summary.average_speed ?? summary.averageSpeed ?? 0;
        const heavy = summary.heavy_count ?? summary.heavyCount ?? 0;
        const severe = summary.severe_count ?? summary.severeCount ?? 0;

        const trafficTotalRecords = document.getElementById('trafficTotalRecords');
        const trafficTotalVehicles = document.getElementById('trafficTotalVehicles');
        const trafficAvgSpeed = document.getElementById('trafficAvgSpeed');
        const trafficCongestedCount = document.getElementById('trafficCongestedCount');

        if (trafficTotalRecords) trafficTotalRecords.textContent = totalRecs;
        if (trafficTotalVehicles) trafficTotalVehicles.textContent = totalVehs.toLocaleString();
        if (trafficAvgSpeed) trafficAvgSpeed.textContent = `${avgSpd} km/h`;
        if (trafficCongestedCount) trafficCongestedCount.textContent = (heavy + severe);
    }

    function renderTrafficTable(records) {
        const trafficTableBody = document.getElementById('trafficTableBody');
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

        const escape = window.escapeHtml || ((s) => s);
        const formatTime = window.formatTimeAgo || ((d) => d);
        const getCongestion = window.getCongestionBadge || ((l) => l);
        const getStatus = window.getTrafficStatusBadge || ((s) => s);

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
                        <span class="traffic-road-title">${escape(roadName)}</span>
                        <span class="traffic-road-id">${escape(record.id)}</span>
                    </div>
                </td>
                <td>${escape(record.area)}</td>
                <td><strong>${vehicleCount.toLocaleString()}</strong></td>
                <td>${avgSpeed} km/h</td>
                <td>${getCongestion(congestion)}</td>
                <td>${getStatus(status)}</td>
                <td class="text-muted" title="${recordedAt ? new Date(recordedAt).toLocaleString() : ''}">
                    ${formatTime(recordedAt)}
                </td>
            `;
            trafficTableBody.appendChild(row);
        });
    }

    function renderDashboardTraffic(records) {
        const dashboardTrafficList = document.getElementById('dashboardTrafficList');
        const dashboardTrafficMeta = document.getElementById('dashboardTrafficMeta');
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

        const escape = window.escapeHtml || ((s) => s);
        const getCongestion = window.getCongestionBadge || ((l) => l);
        const getStatus = window.getTrafficStatusBadge || ((s) => s);

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
                    <div class="traffic-road-name">${escape(roadName)}</div>
                    <div class="traffic-meta">Avg Speed: <strong>${avgSpeed} km/h</strong> • Vehicles: <strong>${vehicleCount.toLocaleString()}</strong></div>
                </div>
                <div class="traffic-condition">
                    ${getCongestion(congestion)}
                    ${getStatus(status)}
                </div>
            `;
            dashboardTrafficList.appendChild(item);
        });

        if (dashboardTrafficMeta) {
            dashboardTrafficMeta.textContent = `${records.length} Active Corridors`;
        }
    }

    function renderTrafficError() {
        const trafficTableBody = document.getElementById('trafficTableBody');
        const dashboardTrafficList = document.getElementById('dashboardTrafficList');
        const trafficTotalRecords = document.getElementById('trafficTotalRecords');
        const trafficTotalVehicles = document.getElementById('trafficTotalVehicles');
        const trafficAvgSpeed = document.getElementById('trafficAvgSpeed');
        const trafficCongestedCount = document.getElementById('trafficCongestedCount');

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

    async function loadTraffic(showLoadingSpinner = true) {
        if (isTrafficFetching) return;
        isTrafficFetching = true;

        const trafficTableBody = document.getElementById('trafficTableBody');
        const dashboardTrafficList = document.getElementById('dashboardTrafficList');
        const trafficLastUpdated = document.getElementById('trafficLastUpdated');
        const apiBase = window.API_BASE_URL || 'http://127.0.0.1:8000/api';
        const checkHealth = window.checkBackendHealth || (async () => true);

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
            const isOnline = await checkHealth();
            if (!isOnline) {
                throw new Error("Backend connection offline");
            }

            const [recordsRes, summaryRes] = await Promise.all([
                fetch(`${apiBase}/traffic`),
                fetch(`${apiBase}/traffic/summary`)
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

    function initTrafficListeners() {
        const refreshTrafficBtn = document.getElementById('refreshTrafficBtn');
        const toast = window.showToast || console.log;

        if (refreshTrafficBtn) {
            refreshTrafficBtn.addEventListener('click', () => {
                toast("Syncing traffic telemetry...", "default");
                loadTraffic(true);
            });
        }
    }

    const TrafficModule = {
        loadTraffic,
        renderTrafficSummary,
        renderTrafficTable,
        renderDashboardTraffic,
        renderTrafficError,
        getState: () => trafficState,
        isFetching: () => isTrafficFetching,
        init: initTrafficListeners
    };

    window.TrafficModule = TrafficModule;
    window.loadTraffic = loadTraffic;
    window.renderDashboardTraffic = renderDashboardTraffic;
    window.renderTrafficSummary = renderTrafficSummary;
    window.renderTrafficTable = renderTrafficTable;
})(window);
