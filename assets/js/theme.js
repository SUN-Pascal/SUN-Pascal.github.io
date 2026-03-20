/*
  Theme + mobile nav + visitor map.
  - Stores theme and map pins in localStorage.
  - Visitor map uses approximate IP geolocation.
*/
(function(){
  const themeStorageKey = "theme";
  const pinStorageKey = "visitorMapPins";
  const pinApiEndpoint = "/api/visitor-pins";
  const root = document.documentElement;

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
    localStorage.setItem(pinStorageKey, JSON.stringify(pins.slice(-40)));
  }

  async function fetchServerPins(){
    const res = await fetch(pinApiEndpoint, { cache: "no-store" });
    if(!res.ok) throw new Error("Backend unavailable");
    const data = await res.json();
    if(!data || !Array.isArray(data.pins)) throw new Error("Invalid backend response");
    return data.pins;
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
    return data.pins;
  }

  function setMapText(id, text){
    const el = document.getElementById(id);
    if(el) el.textContent = text;
  }

  function updatePinCount(pins){
    const el = document.getElementById("visitorCount");
    if(el) el.textContent = String(pins.length);
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

    const date = new Date(pin.recordedAt).toLocaleString();
    const label = mapPinLabel(pin);
    marker.bindPopup(`<strong>${isCurrent ? "Current visit" : "Saved visit"}</strong><br>${label}<br><span>${date}</span>`);
    marker.addTo(map);
  }

  async function fetchApproxLocation(){
    const res = await fetch("https://ipwho.is/", { cache: "no-store" });
    if(!res.ok) throw new Error("Location service unavailable");
    const data = await res.json();

    if(!data || data.success === false || typeof data.latitude !== "number" || typeof data.longitude !== "number"){
      throw new Error("Invalid location response");
    }

    return {
      lat: data.latitude,
      lng: data.longitude,
      city: data.city || "",
      region: data.region || "",
      country: data.country || "",
      recordedAt: new Date().toISOString()
    };
  }

  function isSameArea(a, b){
    return Math.abs(a.lat - b.lat) < 0.35 && Math.abs(a.lng - b.lng) < 0.35;
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

    function renderPins(allPins, currentPin){
      markerLayer.clearLayers();
      allPins.forEach((pin) => addMarkerToMap(markerLayer, pin, currentPin && isSameArea(pin, currentPin)));
      if(currentPin && !allPins.some((pin) => isSameArea(pin, currentPin))){
        addMarkerToMap(markerLayer, currentPin, true);
      }
      updatePinCount(allPins);
    }

    try{
      pins = await fetchServerPins();
      savePins(pins);
    }catch(_){
      pins = loadPins();
      if(pins.length){
        setMapText("visitorLocation", "Backend offline. Showing cached visitor pins.");
      }
    }

    renderPins(pins, null);
    updatePinCount(pins);

    try{
      const current = await fetchApproxLocation();
      setMapText("visitorLocation", `This visit: ${mapPinLabel(current)}`);

      let updatedPins = pins;
      try{
        updatedPins = await postServerPin(current);
        savePins(updatedPins);
      }catch(_){
        if(!pins.some((pin) => isSameArea(pin, current))){
          pins.push(current);
          savePins(pins);
        }
        updatedPins = pins;
      }

      renderPins(updatedPins, current);
      map.flyTo([current.lat, current.lng], 3, { duration: 1.35 });
    }catch(_){
      setMapText("visitorLocation", "Unable to detect this visit location right now.");
    }
  }

  // Apply ASAP (prevents flash)
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
