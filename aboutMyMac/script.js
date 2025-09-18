/* script.js — handles index.html and about.html */
(function () {
  'use strict';

  // ---- Helpers ----
  const $ = id => document.getElementById(id);
  const safeParse = s => {
    try { return JSON.parse(s); } catch (e) { return null; }
  };

  function generateSerial() {
    // simple random serial (12 chars)
    const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
    let s = '';
    for (let i = 0; i < 12; i++) s += chars.charAt(Math.floor(Math.random() * chars.length));
    return s;
  }

  // ---- Index page logic ----
  const form = $('mac-form');
  if (form) {
    let data = {};
    (async function loadAndInit() {
      try {
        const res = await fetch('macs.json');
        if (!res.ok) throw new Error('HTTP ' + res.status);
        data = await res.json();
      } catch (err) {
        console.error('Failed to load macs.json:', err);
        const container = document.querySelector('.container');
        const errbox = document.createElement('div');
        errbox.className = 'error';
        errbox.textContent = 'Error loading macs.json. If you opened the page using file:// the browser may block fetch; run a local server (e.g. `python -m http.server`) or use a web server.';
        container.insertBefore(errbox, container.firstChild);
        // continue with empty data
        data = {};
      }

      const modelSelect = $('model');
      const cpuSelect = $('cpu');
      const gpuSelect = $('gpu');
      const memorySelect = $('memory');
      const osSelect = $('os');
      const showUnsupported = $('show-unsupported');

      // populate models
      function populateModels() {
        modelSelect.innerHTML = '';
        const placeholder = document.createElement('option');
        placeholder.value = '';
        placeholder.textContent = 'Select a model...';
        placeholder.disabled = true;
        placeholder.selected = true;
        modelSelect.appendChild(placeholder);

        Object.keys(data).forEach(name => {
          const opt = document.createElement('option');
          opt.value = name;
          opt.textContent = name;
          modelSelect.appendChild(opt);
        });

        // auto-select first real model if found
        if (modelSelect.options.length > 1) {
          modelSelect.selectedIndex = 1;
          modelSelect.dispatchEvent(new Event('change'));
        }
      }

      function populateForModel(modelName) {
        const model = data[modelName];
        cpuSelect.innerHTML = '';
        gpuSelect.innerHTML = '';
        memorySelect.innerHTML = '';
        osSelect.innerHTML = '';

        if (!model) return;

        // CPUs
        (model.cpus || []).forEach((cpu, idx) => {
          const opt = document.createElement('option');
          opt.value = idx.toString();
          opt.textContent = cpu.type === 'Apple'
            ? `${cpu.model}${cpu.gpu_cores ? ' — ' + cpu.gpu_cores + ' GPU cores' : ''}`
            : `${cpu.clock} GHz ${cpu.model}${cpu.generation ? ' (' + cpu.generation + ' gen)' : ''}`;
          opt.dataset.cpu = JSON.stringify(cpu);
          cpuSelect.appendChild(opt);
        });

        // GPUs
        (model.graphics || []).forEach((gpu, idx) => {
          const opt = document.createElement('option');
          opt.value = idx.toString();
          opt.textContent = gpu.gpu + (gpu.vram ? ` ${gpu.vram}` : (gpu.gpu_cores ? ` ${gpu.gpu_cores} cores` : ''));
          opt.dataset.gpu = JSON.stringify(gpu);
          gpuSelect.appendChild(opt);
        });

        // Memory
        (model.memory || []).forEach((mem, idx) => {
          const opt = document.createElement('option');
          opt.value = idx.toString();
          opt.dataset.mem = JSON.stringify(mem);
          opt.textContent = mem.type ? `${mem.amount} GB ${mem.type}` : `${mem.amount} GB`;
          if (mem.note) opt.textContent += ` (${mem.note})`;
          memorySelect.appendChild(opt);
        });

        // macOS versions
        function populateOS() {
          osSelect.innerHTML = '';
          (model.os && model.os.supported || []).forEach(v => {
            const o = document.createElement('option');
            o.value = v;
            o.textContent = v;
            osSelect.appendChild(o);
          });
          if (showUnsupported.checked) {
            (model.os && model.os.unsupported || []).forEach(v => {
              const o = document.createElement('option');
              o.value = v;
              o.textContent = v + ' (unsupported)';
              osSelect.appendChild(o);
            });
          }
        }
        populateOS();
      }

      // wire events
      modelSelect.addEventListener('change', () => {
        const modelName = modelSelect.value;
        populateForModel(modelName);
      });

      showUnsupported.addEventListener('change', () => {
        if (modelSelect.value) populateForModel(modelSelect.value);
      });

      populateModels();

      // submit
      form.addEventListener('submit', (ev) => {
        ev.preventDefault();
        if (!modelSelect.value) return alert('Please select a model.');

        const modelName = modelSelect.value;
        const cpuData = cpuSelect.selectedOptions[0] && cpuSelect.selectedOptions[0].dataset.cpu ? JSON.parse(cpuSelect.selectedOptions[0].dataset.cpu) : null;
        const gpuData = gpuSelect.selectedOptions[0] && gpuSelect.selectedOptions[0].dataset.gpu ? JSON.parse(gpuSelect.selectedOptions[0].dataset.gpu) : null;
        const memData = memorySelect.selectedOptions[0] && memorySelect.selectedOptions[0].dataset.mem ? JSON.parse(memorySelect.selectedOptions[0].dataset.mem) : null;
        const os = osSelect.value || '';

        const serial = generateSerial();

        const state = {
          model: modelName,
          cpu: cpuData,
          gpu: gpuData,
          memory: memData,
          os: os,
          serial: serial
        };

        // Save to localStorage for about.html to read
        try {
          localStorage.setItem('aboutData', JSON.stringify(state));
        } catch (e) {
          console.error('Could not write localStorage:', e);
        }

        window.open('about.html', '_blank');
      });

    })();
  }

  // ---- About page logic ----
  const aboutModal = $('about-modal');
  if (aboutModal) {
    document.addEventListener('DOMContentLoaded', () => {
      const state = safeParse(localStorage.getItem('aboutData'));
      if (!state) {
        aboutModal.innerHTML = '<p class="error">No data found. Please use the selector (index.html) to create an About window.</p>';
        return;
      }

      // model name & submodel (split at first parenthesis)
      const full = state.model || '';
      let main = full;
      let sub = '';
      const p = full.indexOf('(');
      if (p !== -1) {
        main = full.substring(0, p).trim();
        sub = full.substring(p + 1, full.length - 1).trim();
      }

      $('about-model').textContent = main;
      $('about-submodel').textContent = sub;

      // CPU / Chip
      const cpuTitle = $('cpu-title');
      const cpuEl = $('about-cpu');
      const cpu = state.cpu || {};
      if (cpu.type === 'Apple') {
        cpuTitle.textContent = 'Chip';
        // show model and GPU cores if present
        let cpuText = cpu.model || 'Apple chip';
        if (cpu.gpu_cores) cpuText += ` — ${cpu.gpu_cores} GPU cores`;
        cpuEl.innerHTML = `${cpuText} <span class="cpu-extra">${cpu.boost ? `up to ${cpu.boost} GHz` : ''}${cpu.generation ? ' ' + cpu.generation + ' generation' : ''}</span>`;
      } else {
        cpuTitle.textContent = 'Processor';
        const clock = cpu.clock ? `${cpu.clock} GHz ` : '';
        const modelName = cpu.model || '';
        cpuEl.innerHTML = `${clock}${modelName} <span class="cpu-extra">${cpu.generation ? cpu.generation + ' generation' : ''}${cpu.boost ? (cpu.generation ? ', ' : '') + 'up to ' + cpu.boost + ' GHz' : ''}</span>`;
      }

      // show/hide extra on hover and toggle on click
      cpuEl.addEventListener('click', () => cpuEl.classList.toggle('active'));
      // note: :hover also reveals via CSS

      // GPU
      const gpuEl = $('about-gpu');
      const gpu = state.gpu || {};
      if (state.cpu && state.cpu.type === 'Apple') {
        // Apple silicon: still show graphics but it's usually integrated
        gpuEl.textContent = gpu.gpu ? `${gpu.gpu}${gpu.gpu_cores ? ' — ' + gpu.gpu_cores + ' cores' : ''}` : (state.cpu.model ? state.cpu.model + ' integrated' : 'Apple integrated graphics');
      } else {
        gpuEl.textContent = gpu.gpu ? `${gpu.gpu}${gpu.vram ? ' ' + gpu.vram : ''}` : '—';
      }

      // Memory: Apple shows only capacity, Intel shows capacity + type
      const memEl = $('about-memory');
      const mem = state.memory || {};
      if (state.cpu && state.cpu.type === 'Apple') {
        memEl.textContent = mem.amount ? `${mem.amount} GB` : '—';
      } else {
        memEl.textContent = mem.amount ? `${mem.amount} GB${mem.type ? ' ' + mem.type : ''}` : '—';
      }

      // Serial
      const serialEl = $('about-serial');
      serialEl.textContent = state.serial || generateSerial();
      serialEl.addEventListener('click', () => {
        try {
          navigator.clipboard.writeText(serialEl.textContent);
          serialEl.title = 'Copied!';
          setTimeout(() => serialEl.title = 'Click to copy', 1500);
        } catch (e) {
          // silent
        }
      });

      // macOS
      $('about-os').textContent = state.os || '—';
    });
  }

})();
