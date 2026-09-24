/**
 * Road System Control - Live Operations Map Module
 * GIS command center, spatial feature layers, Leaflet map canvas, telemetry drawers, and domain filtering.
 */
(function(window) {
    'use strict';

    let operationsMap = null;
    let isMapFetching = false;
    let activeMapDomain = 'all';
    let mapLayers = {
        emergency: null,
        traffic: null,
        issue: null,
        violation: null,
        risk: null,
        workOrder: null
    };
    let selectedMapFeature = null;
    let mapFeaturesCache = [];

    function initOperationsMap() {
        if (operationsMap) return;
        const container = document.getElementById('operationsMapContainer');
        const mapErrorOverlay = document.getElementById('mapErrorOverlay');
        const mapErrorMessage = document.getElementById('mapErrorMessage');
        const legendToggleBtn = document.getElementById('legendToggleBtn');
        const legendBody = document.getElementById('legendBody');

        if (!container) return;

        if (typeof L === 'undefined') {
            console.error("Leaflet library not loaded.");
            if (mapErrorOverlay) {
                mapErrorOverlay.style.display = 'flex';
                if (mapErrorMessage) mapErrorMessage.textContent = "Leaflet GIS library failed to load. Check vendor/leaflet assets.";
            }
            return;
        }

        operationsMap = L.map('operationsMapContainer', {
            zoomControl: true,
            attributionControl: true
        }).setView([21.1458, 79.0882], 12);

        L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
            subdomains: 'abcd',
            maxZoom: 19
        }).addTo(operationsMap);

        mapLayers.emergency = L.layerGroup().addTo(operationsMap);
        mapLayers.traffic = L.layerGroup().addTo(operationsMap);
        mapLayers.issue = L.layerGroup().addTo(operationsMap);
        mapLayers.violation = L.layerGroup().addTo(operationsMap);
        mapLayers.risk = L.layerGroup().addTo(operationsMap);
        mapLayers.workOrder = L.layerGroup().addTo(operationsMap);

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
        const escape = window.escapeHtml || ((s) => s);
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
                    <span>${escape(domainUpper)}</span>
                    <span>${escape(sev)}</span>
                </div>
                <div class="map-popup-body">
                    <div class="map-popup-title">${escape(feature.title)}</div>
                    <div class="text-xs text-muted"><strong>Location:</strong> ${escape(feature.location)}</div>
                    ${metric ? `<div class="map-popup-metric">${escape(metric)}</div>` : ''}
                    <div class="map-popup-footer">
                        <span>📍 ${sourceLabel}</span>
                        <span>${escape(feature.id)}</span>
                    </div>
                    ${isWo ? `
                        <div style="margin-top: 0.5rem; text-align: right;">
                            <button type="button" class="btn btn-primary btn-xs map-popup-wo-btn" data-wo-id="${escape(feature.id)}">
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
        const mapDrawerSelectedState = document.getElementById('mapDrawerSelectedState');
        const mapDrawerEmptyState = document.getElementById('mapDrawerEmptyState');
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
        const drawerInspectWoBtn = document.getElementById('drawerInspectWoBtn');

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
                drawerInspectWoBtn.onclick = () => {
                    if (window.openWorkOrderDetailsModal) window.openWorkOrderDetailsModal(feature.id);
                };
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

        const mapKpiTotal = document.getElementById('mapKpiTotal');
        const mapKpiEmergencies = document.getElementById('mapKpiEmergencies');
        const mapKpiTraffic = document.getElementById('mapKpiTraffic');
        const mapKpiIssues = document.getElementById('mapKpiIssues');
        const mapKpiViolations = document.getElementById('mapKpiViolations');
        const mapKpiRisk = document.getElementById('mapKpiRisk');
        const mapLastUpdated = document.getElementById('mapLastUpdated');

        const summary = data.summary || {};

        if (mapKpiTotal) mapKpiTotal.textContent = summary.mapped_count ?? 0;
        if (mapKpiEmergencies) mapKpiEmergencies.textContent = summary.emergencies_count ?? 0;
        if (mapKpiTraffic) mapKpiTraffic.textContent = summary.traffic_count ?? 0;
        if (mapKpiIssues) mapKpiIssues.textContent = summary.issues_count ?? 0;
        if (mapKpiViolations) mapKpiViolations.textContent = summary.violations_count ?? 0;
        if (mapKpiRisk) mapKpiRisk.textContent = summary.risk_areas_count ?? 0;

        const bounds = [];

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
                    if (window.openWorkOrderDetailsModal) window.openWorkOrderDetailsModal(feature.id);
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

        const mapLoadingOverlay = document.getElementById('mapLoadingOverlay');
        const mapErrorOverlay = document.getElementById('mapErrorOverlay');
        const mapErrorMessage = document.getElementById('mapErrorMessage');
        const mapAreaFilter = document.getElementById('mapAreaFilter');
        const mapSeverityFilter = document.getElementById('mapSeverityFilter');
        const apiBase = window.API_BASE_URL || 'http://127.0.0.1:8000/api';
        const getHeaders = window.getAuthHeaders || (() => ({}));

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
                const res = await fetch(`${apiBase}/map/overview${qs}`, {
                    headers: getHeaders()
                });

                if (!res.ok) {
                    throw new Error(`Map overview returned HTTP ${res.status}`);
                }

                data = await res.json();
            }

            try {
                const woParams = new URLSearchParams();
                if (mapAreaFilter && mapAreaFilter.value) {
                    woParams.append('area', mapAreaFilter.value);
                }
                const woQs = woParams.toString() ? `?${woParams.toString()}` : '';
                const woRes = await fetch(`${apiBase}/map/work-orders${woQs}`, {
                    headers: getHeaders()
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

    function initMapListeners() {
        const refreshMapBtn = document.getElementById('refreshMapBtn');
        const retryMapBtn = document.getElementById('retryMapBtn');
        const domainPillBtns = document.querySelectorAll('.domain-pill-btn');
        const mapAreaFilter = document.getElementById('mapAreaFilter');
        const mapSeverityFilter = document.getElementById('mapSeverityFilter');
        const resetMapFiltersBtn = document.getElementById('resetMapFiltersBtn');
        const closeMapDrawerBtn = document.getElementById('closeMapDrawerBtn');
        const drawerCenterBtn = document.getElementById('drawerCenterBtn');
        const mapDrawerSelectedState = document.getElementById('mapDrawerSelectedState');
        const mapDrawerEmptyState = document.getElementById('mapDrawerEmptyState');
        const toast = window.showToast || console.log;

        if (refreshMapBtn) {
            refreshMapBtn.addEventListener('click', () => {
                toast("Syncing spatial operations data from PostgreSQL...", "default");
                loadMapData(true);
            });
        }

        if (retryMapBtn) {
            retryMapBtn.addEventListener('click', () => {
                loadMapData(true);
            });
        }

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
                toast("Map filters reset.", "default");
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

        // Map popup work order inspect delegation
        document.addEventListener('click', (e) => {
            const btn = e.target.closest('.map-popup-wo-btn');
            if (btn && btn.dataset.woId) {
                if (window.openWorkOrderDetailsModal) {
                    window.openWorkOrderDetailsModal(btn.dataset.woId);
                }
            }
        });
    }

    const MapModule = {
        initOperationsMap,
        loadMapData,
        renderMapData,
        selectMapFeature,
        getMap: () => operationsMap,
        isFetching: () => isMapFetching,
        init: initMapListeners
    };

    window.MapModule = MapModule;
    window.initOperationsMap = initOperationsMap;
    window.loadMapData = loadMapData;
    window.selectMapFeature = selectMapFeature;
    Object.defineProperty(window, 'operationsMap', {
        get: () => operationsMap,
        configurable: true
    });
})(window);
