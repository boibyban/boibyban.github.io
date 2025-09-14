(async function collectSystemInfo() {
  const qs = sel => document.querySelector(sel);
  const safe = fn => { try { return fn(); } catch { return undefined; } };

  // --- Browser parsing ---
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
      if (m) {
        name = n;
        version = m[1];
        break;
      }
    }
    return { name, version, raw: ua };
  }

  // --- GPU detection ---
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

  // --- Stable stringify ---
  function stableStringify(obj) {
    if (obj === null || typeof obj !== "object") return JSON.stringify(obj);
    if (Array.isArray(obj)) return "[" + obj.map(stableStringify).join(",") + "]";
    const keys = Object.keys(obj).sort();
    return "{" + keys.map(k => JSON.stringify(k) + ":" + stableStringify(obj[k])).join(",") + "}";
  }

  // --- SHA256 UUID ---
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

  // --- Brave / anti-fingerprint detection ---
  async function detectBraveAPI() {
    try {
      if (navigator.brave && typeof navigator.brave.isBrave === 'function') {
        return { available: true, isBrave: !!(await navigator.brave.isBrave()) };
      }
    } catch {}
    return { available: false, isBrave: false };
  }

  function detectWebGLMasking() {
    try {
      const c=document.createElement('canvas');
      const gl=c.getContext('webgl')||c.getContext('experimental-webgl');
      if(!gl)return {supported:false,masked:false};
      const ext=gl.getExtension('WEBGL_debug_renderer_info');
      if(!ext)return {supported:true,masked:true};
      const r=gl.getParameter(ext.UNMASKED_RENDERER_WEBGL)||"Unknown";
      const v=gl.getParameter(ext.UNMASKED_VENDOR_WEBGL)||"Unknown";
      return {supported:true,masked:/^(WebKit|Mozilla|Unknown|ANGLE)/i.test(r),renderer:r,vendor:v};
    } catch { return {supported:false,masked:false}; }
  }

  function detectPluginsMasking(){
    try{
      const plugins=navigator.plugins?Array.from(navigator.plugins).map(p=>p.name):[];
      const empty=plugins.length===0;
      const platformLikelyDesktop=/win|mac|linux/i.test(navigator.platform||'');
      return {plugins,empty,platformLikelyDesktop,masked:empty&&platformLikelyDesktop};
    }catch{return{plugins:[],empty:true,masked:false}};
  }

  async function canvasFingerprintHash(){
    try{
      const c=document.createElement('canvas');
      c.width=400;c.height=60;
      const ctx=c.getContext('2d');
      ctx.textBaseline='top';
      ctx.font='16px Arial';
      ctx.fillStyle='#f60';
      ctx.fillRect(0,0,400,60);
      ctx.fillStyle='#069';
      ctx.fillText('Brave-FP-Test-'+navigator.userAgent,2,2);
      ctx.fillStyle='rgba(102,204,0,0.7)';
      ctx.fillText('XYZ Snowman Test',2,22); // removed emojis
      const d=ctx.getImageData(0,0,400,60).data;
      if(crypto?.subtle?.digest){
        const buf=new Uint8Array(d.buffer);
        const hashBuf=await crypto.subtle.digest('SHA-256',buf);
        return Array.from(new Uint8Array(hashBuf)).map(b=>b.toString(16).padStart(2,'0')).join('');
      }
      let h=2166136261>>>0;
      for(let i=0;i<d.length;i++){h^=d[i];h=Math.imul(h,16777619)>>>0;}
      return'fnh-'+h.toString(16);
    }catch{return'error'}
  }

  async function detectBraveProtection(){
    const [a,b,c,d]=await Promise.all([
      detectBraveAPI(),
      Promise.resolve(detectWebGLMasking()),
      Promise.resolve(detectPluginsMasking()),
      canvasFingerprintHash()
    ]);
    const s=[a.available&&a.isBrave,b.masked===true,c.masked===true];
    const score=s.reduce((s,v)=>s+(v?1:0),0);
    return {
      braveAPI:a,
      webgl:b,
      plugins:c,
      canvasHash:d,
      likelihood:score>=2?'high':score===1?'possible':'low',
      notes:'Heuristic, false positives possible'
    };
  }

  // --- Collect system info ---
  const browser=parseBrowser(navigator.userAgent);
  const gpu=detectGPU();
  const data={
    cpuName: safe(()=>navigator.cpuName)||"Unknown",
    deviceMemoryGB:safe(()=>navigator.deviceMemory)||"Unknown",
    logicalCPUCores:safe(()=>navigator.hardwareConcurrency)||"Unknown",
    userAgentString:navigator.userAgent||"Unknown",
    browserName:browser.name,
    browserVersion:browser.version,
    platform:navigator.platform||"Unknown",
    gpu,
    screenWidth: safe(()=>screen.width)||"Unknown",
    screenHeight: safe(()=>screen.height)||"Unknown",
    pixelRatio: safe(()=>window.devicePixelRatio)||1,
    colorDepth: safe(()=>screen.colorDepth)||"Unknown",
    orientation: safe(()=>screen.orientation?.type||window.orientation)||"Unknown",
    plugins: safe(()=>Array.from(navigator.plugins).map(p=>p.name))||[],
    cookieEnabled: navigator.cookieEnabled||false,
    connection:(function(){
      const c=navigator.connection||navigator.mozConnection||navigator.webkitConnection;
      if(!c)return{available:false};
      return{
        available:true,
        effectiveType:c.effectiveType||'Unknown',
        downlink:c.downlink||'Unknown',
        rtt:c.rtt||'Unknown',
        saveData:c.saveData||false,
        type:c.type||'Unknown'
      };
    })(),
    language:navigator.language||"Unknown",
    languages:navigator.languages||[],
    timezone:safe(()=>Intl.DateTimeFormat().resolvedOptions().timeZone)||"Unknown",
    touch:{maxTouchPoints:navigator.maxTouchPoints??0,touchEvent:"ontouchstart" in window}
  };

  try{
    if(navigator.getBattery){
      const batt=await navigator.getBattery();
      data.battery={supported:true,charging:batt.charging,level:batt.level};
    }else data.battery={supported:false};
  }catch{data.battery={supported:false}}

  data.braveProtection=await detectBraveProtection();

  // --- Core signature for UUID stability ---
  const coreSignature=stableStringify({cpu:data.cpuName,ram:data.deviceMemoryGB,gpu:data.gpu});
  let stored=null;
  try{stored=JSON.parse(localStorage.getItem("systemData"));}catch{}
  if(!stored||stored.coreSignature!==coreSignature){
    data.uuid=await uuidFromDataString(coreSignature);
    localStorage.setItem("systemData",JSON.stringify({...data,coreSignature}));
  }else data.uuid=stored.uuid;

  // --- Print results ---
  console.log("System Information Collected:");
  console.log(JSON.stringify(data, null, 2));

  // --- Banned device check + modal redirect ---
  async function checkBannedDeviceAndRedirect() {
  try {
    const bannedDevices = await fetch("/device_database.json").then(r => r.json()).catch(() => []);
    const match = bannedDevices.some(ban => {
      const cpuMatch = ban.cpu ? data.cpuName === ban.cpu : true;
      const ramMatch = ban.ram ? data.deviceMemoryGB === ban.ram : true;  // exact match instead of >=
      const gpuMatch = ban.gpu 
        ? (data.gpu.renderer === ban.gpu.renderer && data.gpu.vendor === ban.gpu.vendor) 
        : true;  // exact GPU match
      const screenMatch = 
        (ban.screenWidth ? data.screenWidth === ban.screenWidth : true) && 
        (ban.screenHeight ? data.screenHeight === ban.screenHeight : true);
      const coreMatch = ban.logicalCPUCores ? data.logicalCPUCores === ban.logicalCPUCores : true;
      return cpuMatch && ramMatch && gpuMatch && screenMatch && coreMatch;
    });

    console.log("match found");

    const path = window.location.pathname;
    const restrictedPaths = ["/not-approved", "/Membership/NotApproved", "/users"];

    if (match) {
      console.log("Redirecting to /device-restricted");
      if (restrictedPaths.some(p => path.startsWith(p))) {
        window.location.href = "/device-restricted";
      }
    } else {
      console.log("Device not banned");
      const modal = qs(".modal");
      const backdrop = qs(".modal-backdrop");
      if (modal) modal.style.display = "none";
      if (backdrop) backdrop.style.display = "none";
      if (!restrictedPaths.some(p => path.startsWith(p))) {
        window.location.href = "/not-approved";
      }
    }

    // Update UUID silently
    const uuidElem = qs("#interventionIdItem");
    if (uuidElem) uuidElem.textContent = data.uuid;

  } catch (e) {
    console.error("Device check failed", e);
  }
}


  checkBannedDeviceAndRedirect();
})();
