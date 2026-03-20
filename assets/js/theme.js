/*
  Theme + mobile nav + visitor map.
  - Stores theme and visitor pins in localStorage.
  - Visitor map uses approximate IP geolocation.
*/
(function(){
  const themeStorageKey = "theme";
  const pinStorageKey = "visitorMapPins";
  const pinApiEndpoint = "/api/visitor-pins";
  const root = document.documentElement;
  const MAX_LOCAL_PINS = 80;

  function systemPrefersDark(){
    return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
  }

  function applyTheme(theme){
    if(theme === "dark") root.setAttribute("data-theme", "dark");
    else root.setAttribute("data-theme", "light");
  }

  function getTheme(){
    const saved = localStorage.getItem(themeStorageKey);
    if(saved === "light" || saved === "dark") return saved;
    return systemPrefersDark() ? "dark" : "light";
  }

  function loadPins(){
    try{
      const raw = localStorage.getItem(pinStorageKey);
      if(!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    }catch(_){
      return [];
    }
  }

  function savePins(pins){
    localStorage.setItem(pinStorageKey, JSON.stringify(pins.slice(-MAX_LOCAL_PINS)));
  }

  async function fetchServerPins(){
    const res = await fetch(pinApiEndpoint, { cache: "no-store" });
    if(!res.ok) throw new Error("Backend unavailable");
    const data = await res.json();
    if(!data || !Array.isArray(data.pins)) throw new Error("Invalid backend response");
    return data;
  }

  async function postServerPin(pin){
    const res = await fetch(pinApiEndpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pin })
    });
    if(!res.ok) throw new Error("Pin submission failed");
    const data = await res.json();
    if(!data || !Array.isArray(data.pins)) throw new Error("Invalid backend response");
    return data;
  }

  function setMapText(id, text){
    const el = document.getElementById(id);
    if(el) el.textContent = text;
  }

  function updatePinCount(count){
    const el = document.getElementById("visitorCount");
    if(el) el.textContent = String(count);
  }

  function mapPinLabel(pin){
    const place = [pin.city, pin.region, pin.country].filter(Boolean).join(", ");
    return place || "Unknown location";
  }

  function addMarkerToMap(map, pin, isCurrent){
    if(!window.L) return;
    const marker = window.L.circleMarker([pin.lat, pin.lng], {
      radius: isCurrent ? 8 : 6,
      color: isCurrent ? "#ef476f" : "#2ec4b6",
      weight: 2,
      fillOpacity: 0.82
    });

    const date = pin.recordedAt ? new Date(pin.recordedAt).toLocaleString() : "Unknown time";
    const label = mapPinLabel(pin);
    const visitLine = typeof pin.visits === "number" ? `<br><span>Visits: ${pin.visits}</span>` : "";
    marker.bindPopup(`<strong>${isCurrent ? "Current visit" : "Saved visit"}</strong><br>${label}${visitLine}<br><span>${date}</span>`);
    marker.addTo(map);
  }

  function normalizeGeoResult(data){
    const lat = Number(data.latitude ?? data.lat);
    const lng = Number(data.longitude ?? data.lon ?? data.lng);

    if(!Number.isFinite(lat) || !Number.isFinite(lng)){
      throw new Error("Missing coordinates");
    }

    return {
      ip: String(data.ip || "").trim(),
      lat,
      lng,
      city: data.city || "",
      region: data.region || data.regionName || "",
      country: data.country || data.country_name || "",
      recordedAt: new Date().toISOString(),
      visits: 1
    };
  }

  async function fetchApproxLocation(){
    const providers = [
      {
        url: "https://ipwho.is/",
        parse(data){
          if(!data || data.success === false) throw new Error("ipwho.is failed");
          return normalizeGeoResult(data);
        }
      },
      {
        url: "https://ipapi.co/json/",
        parse(data){
          if(!data || data.error) throw new Error("ipapi failed");
          return normalizeGeoResult(data);
        }
      },
      {
        url: "https://ip-api.com/json/?fields=status,message,country,regionName,city,lat,lon,query",
        parse(data){
          if(!data || data.status !== "success") throw new Error(data && data.message ? data.message : "ip-api failed");
          return normalizeGeoResult({
            ip: data.query,
            lat: data.lat,
            lon: data.lon,
            city: data.city,
            regionName: data.regionName,
            country: data.country
          });
        }
      }
    ];

    let lastError = null;
    for(const provider of providers){
      try{
        const res = await fetch(provider.url, { cache: "no-store" });
        if(!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        const location = provider.parse(data);
        if(!location.ip) location.ip = "Unknown";
        return location;
      }catch(err){
        lastError = err;
      }
    }

    throw lastError || new Error("No location providers available");
  }

  function isSameArea(a, b){
    return Math.abs(a.lat - b.lat) < 0.35 && Math.abs(a.lng - b.lng) < 0.35;
  }

  function mergeLocalPins(existingPins, currentPin){
    const match = existingPins.find((pin) => pin.ip && currentPin.ip && pin.ip === currentPin.ip);
    if(match){
      match.lat = currentPin.lat;
      match.lng = currentPin.lng;
      match.city = currentPin.city;
      match.region = currentPin.region;
      match.country = currentPin.country;
      match.recordedAt = currentPin.recordedAt;
      match.visits = (Number(match.visits) || 0) + 1;
      return existingPins;
    }

    existingPins.push(currentPin);
    return existingPins;
  }

  async function initVisitorMap(){
    const mapEl = document.getElementById("worldMap");
    if(!mapEl) return;
    if(!window.L){
      setMapText("visitorLocation", "Map is unavailable right now.");
      return;
    }

    const map = window.L.map(mapEl, {
      worldCopyJump: true,
      minZoom: 2,
      maxZoom: 6,
      zoomControl: true,
      scrollWheelZoom: false
    }).setView([20, 8], 2);

    window.L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; CARTO'
    }).addTo(map);

    const markerLayer = window.L.layerGroup().addTo(map);
    let pins = [];
    let totalVisitors = 0;

    function renderPins(allPins, currentPin){
      markerLayer.clearLayers();
      allPins.forEach((pin) => addMarkerToMap(markerLayer, pin, currentPin && isSameArea(pin, currentPin)));
      if(currentPin && !allPins.some((pin) => isSameArea(pin, currentPin))){
        addMarkerToMap(markerLayer, currentPin, true);
      }
      updatePinCount(totalVisitors || allPins.length);
    }

    try{
      const data = await fetchServerPins();
      pins = data.pins;
      totalVisitors = Number.isFinite(data.totalVisitors) ? data.totalVisitors : pins.length;
      savePins(pins);
    }catch(_){
      pins = loadPins();
      totalVisitors = pins.length;
      if(pins.length){
        setMapText("visitorLocation", "Backend offline. Showing cached visitor pins.");
      }
    }

    renderPins(pins, null);

    try{
      const current = await fetchApproxLocation();
      setMapText("visitorLocation", `This visit: ${mapPinLabel(current)}`);

      let updatedPins = pins;
      try{
        const data = await postServerPin(current);
        updatedPins = data.pins;
        totalVisitors = Number.isFinite(data.totalVisitors) ? data.totalVisitors : updatedPins.length;
        savePins(updatedPins);
      }catch(_){
        updatedPins = mergeLocalPins(pins, current);
        totalVisitors = updatedPins.length;
        savePins(updatedPins);
      }

      renderPins(updatedPins, current);
      map.flyTo([current.lat, current.lng], 3, { duration: 1.35 });
    }catch(_){
      setMapText("visitorLocation", "Unable to detect this visit location right now.");
    }
  }

  applyTheme(getTheme());

  window.addEventListener("DOMContentLoaded", () => {
    const y = document.getElementById("year");
    if(y) y.textContent = new Date().getFullYear();

    const btn = document.getElementById("themeToggle");
    if(btn){
      btn.addEventListener("click", () => {
        const now = root.getAttribute("data-theme") === "dark" ? "light" : "dark";
        localStorage.setItem(themeStorageKey, now);
        applyTheme(now);
      });
    }

    const toggle = document.querySelector(".nav-toggle");
    const nav = document.querySelector(".nav");
    if(toggle && nav){
      toggle.addEventListener("click", () => {
        const isOpen = nav.classList.toggle("open");
        toggle.setAttribute("aria-expanded", String(isOpen));
        toggle.setAttribute("aria-label", isOpen ? "Close menu" : "Open menu");
      });
    }

    initVisitorMap();
  });
})();
