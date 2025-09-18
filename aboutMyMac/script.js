async function loadData() {
  const response = await fetch("macs.json");
  return response.json();
}

function generateSerial() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let serial = "";
  for (let i = 0; i < 12; i++) {
    serial += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return serial;
}

document.addEventListener("DOMContentLoaded", async () => {
  const data = await loadData();

  const modelSelect = document.getElementById("model");
  const cpuSelect = document.getElementById("cpu");
  const gpuSelect = document.getElementById("gpu");
  const memorySelect = document.getElementById("memory");
  const osSelect = document.getElementById("os");
  const showUnsupported = document.getElementById("show-unsupported");

  if (modelSelect) {
    // Populate models
    Object.keys(data).forEach(model => {
      const option = document.createElement("option");
      option.value = model;
      option.textContent = model;
      modelSelect.appendChild(option);
    });

    modelSelect.addEventListener("change", () => {
      const model = data[modelSelect.value];

      // CPU
      cpuSelect.innerHTML = "";
      model.cpus.forEach(cpu => {
        const option = document.createElement("option");
        option.value = JSON.stringify(cpu);
        option.textContent = `${cpu.clock} GHz ${cpu.model}`;
        cpuSelect.appendChild(option);
      });

      // GPU
      gpuSelect.innerHTML = "";
      model.graphics.forEach(gpu => {
        const option = document.createElement("option");
        option.value = JSON.stringify(gpu);
        option.textContent = gpu.gpu;
        gpuSelect.appendChild(option);
      });

      // Memory
      memorySelect.innerHTML = "";
      model.memory.forEach(mem => {
        const option = document.createElement("option");
        option.value = JSON.stringify(mem);
        option.textContent = `${mem.amount} GB ${mem.type}`;
        memorySelect.appendChild(option);
      });

      // macOS versions
      function populateOS() {
        osSelect.innerHTML = "";
        model.os.supported.forEach(os => {
          const option = document.createElement("option");
          option.value = os;
          option.textContent = os;
          osSelect.appendChild(option);
        });
        if (showUnsupported.checked) {
          model.os.unsupported.forEach(os => {
            const option = document.createElement("option");
            option.value = os;
            option.textContent = os + " (unsupported)";
            osSelect.appendChild(option);
          });
        }
      }
      populateOS();
      showUnsupported.addEventListener("change", populateOS);
    });

    // Form submit
    const form = document.getElementById("mac-form");
    form.addEventListener("submit", e => {
      e.preventDefault();

      const model = modelSelect.value;
      const cpu = JSON.parse(cpuSelect.value);
      const gpu = JSON.parse(gpuSelect.value);
      const memory = JSON.parse(memorySelect.value);
      const os = osSelect.value;

      const serial = generateSerial();

      const state = {
        model,
        cpu,
        gpu,
        memory,
        os,
        serial
      };

      localStorage.setItem("aboutData", JSON.stringify(state));
      window.open("about.html", "_blank");
    });
  }

  // about.html rendering
  const aboutModel = document.getElementById("about-model");
  if (aboutModel) {
    const state = JSON.parse(localStorage.getItem("aboutData"));
    if (!state) return;

    document.getElementById("about-model").textContent = state.model.split("(")[0].trim();
    document.getElementById("about-submodel").textContent = state.model;

    const cpuEl = document.getElementById("about-cpu");
    cpuEl.textContent = `${state.cpu.clock} GHz ${state.cpu.model}`;
    cpuEl.title = `${state.cpu.clock} GHz ${state.cpu.model} (${state.cpu.generation} generation, up to ${state.cpu.boost} GHz)`;

    document.getElementById("about-gpu").textContent = state.gpu.gpu + " " + (state.gpu.vram || "");
    document.getElementById("about-memory").textContent = `${state.memory.amount} GB ${state.memory.type}`;
    document.getElementById("about-os").textContent = state.os;
    document.getElementById("about-serial").textContent = state.serial;
  }
});
