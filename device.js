(async function collectSystemInfo() {
  const qs = sel => document.querySelector(sel);
  const safe = fn => { try { return fn(); } catch { return undefined; } };

  // Parse browser
  function parseBrowser(ua = navigator.userAgent) {
    let name = "Unknown", version = "Unknown";
    const rules = [
      [/Edg\/([\d\.]+)/i, "Edge"],
      [/OPR\/([\d\.]+)/i, "Opera"],
      [/Chrome\/([\d\.]+)/i, "Chrome"],
      [/Firefox\/([\d\.]+)/i, "Firefox"],
      [/Version\/([\d\.]+).*Safari/i, "Safari"],
      [/MSIE\s([\d\.]+)/i, "IE"],
      [/Trident.*rv:([\d\.]+)/i, "IE"]
    ];
    for (const [re, n] of rules) {
      const m = ua.match(re);
      if (m) { name = n; version = m[1]; break; }
    }
    return { name, version, raw: ua };
  }

  // GPU info
  function detectGPU() {
    try {
      const canvas = document.createElement("canvas");
      const gl = canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
      if (!gl) return { renderer: "Unavailable", vendor: "Unavailable" };
      const ext = gl.getExtension("WEBGL_debug_renderer_info");
      return {
        renderer: ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : "Unknown",
        vendor: ext ? gl.getParameter(ext.UNMASKED_VENDOR_WEBGL) : "Unknown"
      };
    } catch {
      return { renderer: "Unavailable", vendor: "Unavailable" };
    }
  }

  // Stable stringify
  function stableStringify(obj) {
    if (obj === null || typeof obj !== "object") return JSON.stringify(obj);
    if (Array.isArray(obj)) return "[" + obj.map(stableStringify).join(",") + "]";
    const keys = Object.keys(obj).sort();
    return "{" + keys.map(k => JSON.stringify(k) + ":" + stableStringify(obj[k])).join(",") + "}";
  }

  // UUID from SHA-256
  async function uuidFromDataString(str) {
    const enc = new TextEncoder().encode(str);
    const hashBuffer = await crypto.subtle.digest("SHA-256", enc);
    const hash = new Uint8Array(hashBuffer);
    const b = Array.from(hash.slice(0, 16));
    b[6] = (b[6] & 0x0f) | 0x40;
    b[8] = (b[8] & 0x3f) | 0x80;
    const hex = n => (n + 0x100).toString(16).slice(1);
    return [
      b.slice(0,4).map(hex).join(""),
      b.slice(4,6).map(hex).join(""),
      b.slice(6,8).map(hex).join(""),
      b.slice(8,10).map(hex).join(""),
      b.slice(10,16).map(hex).join("")
    ].join("-");
  }

  // Collect info (no timestamp)
  const browser = parseBrowser(navigator.userAgent);
  const gpu = detectGPU();

  const data = {
    deviceMemoryGB: safe(() => navigator.deviceMemory) ?? "Unknown",
    logicalCPUCores: safe(() => navigator.hardwareConcurrency) ?? "Unknown",
    userAgentString: navigator.userAgent || "Unknown",
    browserName: browser.name,
    browserVersion: browser.version,
    gpu,
    platform: navigator.platform || "Unknown",
  };

  // Add “extra” fields (don’t affect UUID stability, just stored info)
  Object.assign(data, {
    screenWidth: safe(() => screen.width) ?? "Unknown",
    screenHeight: safe(() => screen.height) ?? "Unknown",
    pixelRatio: safe(() => window.devicePixelRatio) ?? 1,
    orientation: safe(() => (screen.orientation && screen.orientation.type) || window.orientation) ?? "Unknown",
    plugins: safe(() => Array.from(navigator.plugins).map(p => p.name)) || [],
    cookieEnabled: navigator.cookieEnabled ?? false,
    online: navigator.onLine ?? true,
    connection: (function() {
      const c = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
      if (!c) return { available: false };
      return {
        available: true,
        effectiveType: c.effectiveType || "Unknown",
        downlink: c.downlink || "Unknown",
        rtt: c.rtt || "Unknown",
        saveData: c.saveData || false,
        type: c.type || "Unknown"
      };
    })(),
    language: navigator.language || "Unknown",
    languages: navigator.languages || [],
    timezone: safe(() => Intl.DateTimeFormat().resolvedOptions().timeZone) || "Unknown",
    touch: {
      maxTouchPoints: navigator.maxTouchPoints ?? 0,
      touchEvent: "ontouchstart" in window
    }
  });

  // Battery (async)
  try {
    if (navigator.getBattery) {
      const batt = await navigator.getBattery();
      data.battery = {
        supported: true,
        charging: batt.charging,
        level: batt.level
      };
    } else {
      data.battery = { supported: false };
    }
  } catch {
    data.battery = { supported: false };
  }

  // Core signature (major change detection)
  const coreSignature = stableStringify({
    cpu: data.logicalCPUCores,
    ram: data.deviceMemoryGB,
    gpu: data.gpu
  });

  // Load existing
  let stored = null;
  try { stored = JSON.parse(localStorage.getItem("systemData")); } catch {}

  let uuid;
  if (stored && stored.coreSignature === coreSignature && stored.uuid) {
    // Reuse existing
    uuid = stored.uuid;
    data.uuid = uuid;
  } else {
    // Generate new
    const dataString = stableStringify(data);
    uuid = await uuidFromDataString(dataString);
    data.uuid = uuid;
    data.coreSignature = coreSignature;
    try { localStorage.setItem("systemData", JSON.stringify(data)); } catch {}
  }

  // Update UI
  const interventionEl = qs(".interventionId") || qs("#interventionIdItem");
  if (interventionEl) interventionEl.textContent = uuid;
})();
