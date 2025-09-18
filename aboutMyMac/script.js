let macData = {};
fetch("macs.json")
  .then(res => res.json())
  .then(data => {
    macData = data;
    populateModels();
  });

function populateModels() {
  const modelSelect = document.getElementById("model");
  Object.keys(macData).forEach(model => {
    let opt = document.createElement("option");
    opt.value = model;
    opt.textContent = model;
    modelSelect.appendChild(opt);
  });

  modelSelect.addEventListener("change", () => {
    populateCPUs(macData[modelSelect.value]);
  });
}

function populateCPUs(model) {
  const cpuSelect = document.getElementById("cpu");
  cpuSelect.innerHTML = "";
  model.cpu.forEach(cpu => {
    let opt = document.createElement("option");
    opt.value = cpu;
    opt.textContent = cpu;
    cpuSelect.appendChild(opt);
  });
  cpuSelect.addEventListener("change", () => {
    populateGPUs(model);
  });
}

function populateGPUs(model) {
  const gpuSelect = document.getElementById("gpu");
  gpuSelect.innerHTML = "";
  model.gpu.forEach(gpu => {
    let opt = document.createElement("option");
    opt.value = gpu;
    opt.textContent = gpu;
    gpuSelect.appendChild(opt);
  });
  gpuSelect.addEventListener("change", () => {
    populateMemory(model);
  });
}

function populateMemory(model) {
  const memSelect = document.getElementById("memory");
  memSelect.innerHTML = "";
  model.memory.forEach(mem => {
    let opt = document.createElement("option");
    opt.value = mem;
    opt.textContent = mem;
    memSelect.appendChild(opt);
  });
  populateOS(model);
}

function populateOS(model) {
  const osSelect = document.getElementById("os");
  osSelect.innerHTML = "";
  model.os.forEach(os => {
    let opt = document.createElement("option");
    opt.value = os;
    opt.textContent = os;
    osSelect.appendChild(opt);
  });
}

// Random Serial Generator
function generateSerial() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let serial = "";
  for (let i = 0; i < 12; i++) {
    serial += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return serial;
}

// Handle Submit
document.getElementById("macForm").addEventListener("submit", e => {
  e.preventDefault();
  const formData = {
    model: document.getElementById("model").value,
    cpu: document.getElementById("cpu").value,
    gpu: document.getElementById("gpu").value,
    memory: document.getElementById("memory").value,
    os: document.getElementById("os").value,
    serial: generateSerial()
  };
  localStorage.setItem("aboutMac", JSON.stringify(formData));
  window.open("about.html", "_blank");
});

// On About Page
if (window.location.pathname.endsWith("about.html")) {
  const data = JSON.parse(localStorage.getItem("aboutMac"));
  if (data) {
    document.getElementById("mac-name").textContent = "MacBook Pro";
    document.getElementById("mac-model").textContent = data.model;
    document.getElementById("mac-cpu").textContent = data.cpu;
    document.getElementById("mac-memory").textContent = data.memory;
    document.getElementById("mac-gpu").textContent = data.gpu;
    document.getElementById("mac-serial").textContent = data.serial;
    document.getElementById("mac-os").textContent = data.os;
  }
}
