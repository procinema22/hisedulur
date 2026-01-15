/* script.js v3.0 - final
   Patch: laprak otomatis adjustable + rectangle offset/scale support
   Perbaikan: toggle watermark (Alt+W), perbaikan PDF watermark, scope bugs, duplicate handlers removed, safety checks
*/

/* ---------------------------
   Element refs
   --------------------------- */
   const upload = document.getElementById('upload');
   const canvas = document.getElementById('canvas');
   const ctx = canvas.getContext('2d');
   const sizeSelect = document.getElementById('sizeSelect');
   const customSize = document.getElementById('customSize');
   const customW = document.getElementById('customW');
   const customH = document.getElementById('customH');
   const marginInputMm = document.getElementById('marginInputMm');
   const gapInput = document.getElementById('gap');
   const priceDisplay = document.getElementById('priceDisplay');
   const userName = document.getElementById('userName');
   const previewBtn = document.getElementById('previewBtn');
   const generateBtn = document.getElementById('generateBtn');
   const downloadPdf = document.getElementById('downloadPdf');
   const resetBtn = document.getElementById('reset');
   const batchList = document.getElementById('batchList');
   const modeSelect = document.getElementById('modeSelect');
   const hargaPerFotoBox = document.getElementById('hargaPerFotoBox');
   const hargaPerFotoInput = document.getElementById('hargaPerFoto');
   if (hargaPerFotoInput && !hargaPerFotoInput.value) hargaPerFotoInput.value = '1000';
   const prevPageBtn = document.getElementById('prevPage');
   const nextPageBtn = document.getElementById('nextPage');
   const pageIndicator = document.getElementById('pageIndicator');
   const pageNav = document.getElementById('pageNav');
   const darkSwitch = document.getElementById('darkSwitch');
   const circleControls = document.getElementById('circleControls');
   const circleDiameter = document.getElementById('circleDiameter');
   const laprakMode = document.getElementById('laprakMode');
   const laprakControls = document.getElementById('laprakControls');
   const laprakPrice = document.getElementById('laprakPrice');
   const manualHargaCheckbox = document.getElementById('manualHargaCheckbox');
   const manualHargaBox = document.getElementById('manualHargaBox');
   const manualHargaInput = document.getElementById('manualHargaInput');
   const hideInfo = document.getElementById('hideInfo');
   const pilihanHargaBox = document.getElementById('pilihanHarga'); // used by tampilkanPilihanHarga
   const canvasDropOverlay = document.getElementById('canvasDropOverlay');
   const canvasDropHint = document.getElementById('canvasDropHint');
   
   /* ---------------------------
      Constants & state
      --------------------------- */
   const PREVIEW_SCALE = 0.25;
   const PX_PER_CM = 118; // px per cm for 300dpi ~ approximate mapping used in original script
   const STORAGE_KEY = 'cetakfoto_v3_placements';
   
   let batches = []; // array of { files, size, customW, customH, copy, mode }
   let placementsByPage = []; // array per page of placements
   let pagesCache = []; // preview/full canvases
   let currentPageIndex = 0;
   let selectedPlacement = null;
   let isDragging = false, dragStart = null;
   let watermarkEnabled = false;


   
   /* ---------------------------
      Watermark image (load once)
      --------------------------- */
   const watermarkImg = new Image();
   watermarkImg.src = "SDLR.png"; // pastikan file ada
   watermarkImg.onload = () => {
     console.log("✔ Watermark Loaded:", watermarkImg.width + "x" + watermarkImg.height);
     if (typeof autoPreview === "function") autoPreview();
   };
   watermarkImg.onerror = () => {
     console.warn("❌ Watermark image tidak ditemukan: SDLR.png");
   };
   
   /* ---------------------------
      Utility: tampilkan pilihan harga
      --------------------------- */
   let daftarHarga = [
     { nominal: 1000, bayar: 1000 },
     { nominal: 2000, bayar: 2000 },
     { nominal: 5000, bayar: 5000 },
   ];
   function tampilkanPilihanHarga() {
     if (!pilihanHargaBox) return;
     pilihanHargaBox.innerHTML = '';
     daftarHarga.forEach(item => {
       const div = document.createElement('div');
       div.className = 'harga-item';
       div.innerHTML = `
         <div class="nominal">${item.nominal.toLocaleString()}</div>
         <div class="bayar">Bayar: Rp ${item.bayar.toLocaleString()}</div>
       `;
       div.onclick = () => {
         [...document.querySelectorAll(".harga-item")].forEach(el => el.classList.remove("active"));
         div.classList.add("active");
         if (manualHargaInput) manualHargaInput.value = item.bayar;
         if (priceDisplay) priceDisplay.textContent = `Harga: Rp ${item.bayar.toLocaleString()} (manual)`;
       };
       pilihanHargaBox.appendChild(div);
     });
   
     // show more / collapse button
     const btn = document.createElement("div");
     btn.className = "show-more-btn";
     btn.textContent = "Tampilkan Semua Harga ▼";
     btn.onclick = () => {
       const collapsed = pilihanHargaBox.classList.contains("collapsed");
       if (collapsed) {
         pilihanHargaBox.classList.remove("collapsed");
         btn.textContent = "Sembunyikan Harga ▲";
       } else {
         pilihanHargaBox.classList.add("collapsed");
         btn.textContent = "Tampilkan Semua Harga ▼";
       }
     };
     pilihanHargaBox.after(btn);
   }
   tampilkanPilihanHarga();
   
   /* ---------------------------
      Inject loading overlay & CSS
      --------------------------- */
   (function injectLoadingOverlay() {
     const css = `
       #loadingOverlay_kolase { position: fixed; inset: 0; display: none; background: rgba(0,0,0,0.42); align-items: center; justify-content: center; z-index: 99999; }
       #loadingOverlay_kolase.active { display:flex; }
       @keyframes spin_kolase { to { transform: rotate(360deg); } }
       .kolase-done { transition: background-color 420ms cubic-bezier(.2,.8,.2,1), transform 220ms; background-color: #b71c1c !important; box-shadow: 0 6px 18px rgba(183,28,28,0.25) !important; color: #fff !important; transform: translateY(-1px); }
       .kolase-reset-transition { transition: background-color 420ms cubic-bezier(.2,.8,.2,1), box-shadow 320ms; }
     `;
     const style = document.createElement('style');
     style.setAttribute('data-generated', 'script-v3.0');
     style.appendChild(document.createTextNode(css));
     document.head.appendChild(style);
   
     const overlay = document.createElement('div');
     overlay.id = 'loadingOverlay_kolase';
     overlay.innerHTML = `<div style="background:#fff;padding:18px;border-radius:12px;">Menyusun... ⏳</div>`;
     document.body.appendChild(overlay);
   })();
   
   /* ---------------------------
      Theme init
      --------------------------- */
   (function initTheme() {
     const saved = localStorage.getItem('theme');
     if (saved === 'dark') {
       document.body.classList.add('dark');
       if (darkSwitch) darkSwitch.classList.add('on');
     }
   })();
   if (darkSwitch) darkSwitch.addEventListener('click', () => {
     document.body.classList.toggle('dark');
     const on = document.body.classList.contains('dark');
     darkSwitch.classList.toggle('on', on);
     localStorage.setItem('theme', on ? 'dark' : 'light');
   });
   
   /* ---------------------------
      Persistence helpers
      --------------------------- */
   function fileKeyFor(file) {
     try { return `${file.name}_${file.size || 0}_${file.lastModified || 0}`; } catch (e) { return file.name; }
   }
   function saveAllPlacementData() {
     const flat = [];
     placementsByPage.forEach(page => {
       (page || []).forEach(pl => {
         if (!pl.fileKey) return;
         flat.push({ key: pl.fileKey, offsetX: pl.offsetX || 0, offsetY: pl.offsetY || 0, scale: pl.scale || 1 });
       });
     });
     try { localStorage.setItem(STORAGE_KEY, JSON.stringify(flat)); } catch (e) {}
   }
   function loadSavedForKey(key) {
     const raw = localStorage.getItem(STORAGE_KEY);
     if (!raw) return null;
     try { const arr = JSON.parse(raw); return arr.find(x => x.key === key) || null; } catch (e) { return null; }
   }
   
   /* ---------------------------
      Drag & drop area (upload)
      --------------------------- */
   const dropArea = document.getElementById('dropArea');
   if (dropArea && upload) {
     dropArea.addEventListener("click", () => upload.click());
     ["dragenter", "dragover"].forEach(evt => {
       dropArea.addEventListener(evt, (e) => { e.preventDefault(); dropArea.classList.add("hover"); });
     });
     ["dragleave", "drop"].forEach(evt => {
       dropArea.addEventListener(evt, () => dropArea.classList.remove("hover"));
     });
   }
   
   /* ---------------------------
      Add files to batch
      --------------------------- */
   async function addFilesToBatch(files) {
     const mode = (modeSelect && modeSelect.value) || "normal";
     if (sizeSelect && sizeSelect.value === "custom") {
       const cw = parseFloat(customW.value) || 0, ch = parseFloat(customH.value) || 0;
       batches.push({ files, size: "custom", customW: cw, customH: ch, copy: 1, mode });
     } else {
       batches.push({ files, size: sizeSelect ? sizeSelect.value : "2x3", copy: 1, mode });
     }
     refreshBatchList();
     await autoPreview();
   }
   
   /* upload input */
   if (upload) upload.onchange = async e => {
     const files = Array.from(e.target.files || []);
     if (!files.length) return;
     await addFilesToBatch(files);
     upload.value = '';
     refreshBatchList();
     await updatePricePreview();
     await autoPreview();
   };
   
   /* paste (ctrl+v) support */
   document.addEventListener("paste", async (e) => {
     if (!e.clipboardData) return;
     const items = e.clipboardData.items;
     const collected = [];
     for (let item of items) {
       if (item.type && item.type.indexOf("image") !== -1) {
         collected.push(item.getAsFile());
       }
     }
     if (!collected.length) return;
     await addFilesToBatch(collected);
     await autoPreview();
     await updatePricePreview();
   });
   
   /* ---------------------------
      Batch list UI
      --------------------------- */
   function refreshBatchList() {
     if (!batchList) return;
     batchList.innerHTML = '';
     batches.forEach((b, i) => {
       const row = document.createElement('div'); row.className = 'batch-row';
       const sizeText = b.size === 'custom' ? `${b.customW}x${b.customH} cm` : (b.size ? b.size.replace('x', ' x ') : 'unknown');
       row.innerHTML = `<div style="flex:1"><strong>Batch ${i+1}</strong><div class="small">${(b.files||[]).length} foto — ${sizeText} — mode: ${b.mode||'normal'}</div></div>`;
       const copies = document.createElement('input');
       copies.type = 'number'; copies.value = b.copy || 1; copies.min = 1; copies.style.width = '60px';
       copies.onchange = async () => { b.copy = Math.max(1, parseInt(copies.value) || 1); await autoPreview(); };
       const del = document.createElement('button'); del.textContent = '❌'; del.className = 'warn';
       del.onclick = async () => { batches.splice(i, 1); refreshBatchList(); await updatePricePreview(); await autoPreview(); };
       row.append(copies, del);
       batchList.appendChild(row);
     });
     batchList.style.display = batches.length ? 'block' : 'none';
   }
   
   /* ---------------------------
      Load image w/ EXIF orientation & compress
      --------------------------- */
   function loadImageWithEXIF(file, mode = "preview") {
     return new Promise(res => {
       try {
         const reader = new FileReader();
         reader.onload = e => {
           const img = new Image();
           img.onerror = () => { console.warn(`Gagal memuat: ${file.name}`); res(null); };
           // try to handle EXIF if library available
           let orientation = 1;
           if (window.EXIF && typeof EXIF.getData === 'function') {
             EXIF.getData(file, function () { orientation = EXIF.getTag(this, 'Orientation') || 1; });
           }
           img.onload = () => {
             const maxDim = mode === "pdf" ? 2500 : 1500;
             const quality = mode === "pdf" ? 0.92 : 0.8;
             let iw = img.width, ih = img.height;
             let scale = Math.min(1, maxDim / Math.max(iw, ih));
             const newW = Math.round(iw * scale);
             const newH = Math.round(ih * scale);
             const c = document.createElement('canvas');
             const x = c.getContext('2d');
             if (orientation >= 5 && orientation <= 8) { c.width = newH; c.height = newW; } else { c.width = newW; c.height = newH; }
             switch (orientation) {
               case 2: x.translate(c.width, 0); x.scale(-1, 1); break;
               case 3: x.translate(c.width, c.height); x.rotate(Math.PI); break;
               case 4: x.translate(0, c.height); x.scale(1, -1); break;
               case 5: x.rotate(0.5 * Math.PI); x.scale(1, -1); break;
               case 6: x.translate(c.width, 0); x.rotate(0.5 * Math.PI); break;
               case 7: x.translate(c.width, c.height); x.rotate(0.5 * Math.PI); x.scale(-1, 1); break;
               case 8: x.translate(0, c.height); x.rotate(-0.5 * Math.PI); break;
             }
             x.drawImage(img, 0, 0, newW, newH);
             const compressed = new Image();
             compressed.onload = () => res(compressed);
             compressed.onerror = () => res(null);
             compressed.src = c.toDataURL('image/jpeg', quality);
           };
           img.src = e.target.result;
         };
         reader.readAsDataURL(file);
       } catch (err) {
         console.error('Error baca file:', err);
         res(null);
       }
     });
   }
   
   /* ---------------------------
      Draw helpers
      --------------------------- */
   function drawImageCover(ctxLocal, img, x, y, boxW, boxH, offsetX = 0, offsetY = 0, scale = 1, rotateLandscapeToPortrait = true) {
     let iw = img.width, ih = img.height; let rotate = false;
     if (rotateLandscapeToPortrait && iw > ih) { rotate = true; [iw, ih] = [ih, iw]; }
     const imgRatio = iw / ih; const boxRatio = boxW / boxH;
     let drawW, drawH;
     if (imgRatio > boxRatio) { drawH = boxH * scale; drawW = drawH * imgRatio; } else { drawW = boxW * scale; drawH = drawW / imgRatio; }
     const offsetPosX = x + (boxW - drawW) / 2 + (offsetX || 0);
     const offsetPosY = y + (boxH - drawH) / 2 + (offsetY || 0);
     ctxLocal.save(); ctxLocal.beginPath(); ctxLocal.rect(x + 1, y + 1, boxW - 2, boxH - 2); ctxLocal.clip();
     if (rotate) {
       const cx = x + boxW / 2, cy = y + boxH / 2; ctxLocal.translate(cx, cy); ctxLocal.rotate(-Math.PI / 2);
       ctxLocal.drawImage(img, -drawH / 2, -drawW / 2, drawH, drawW);
     } else {
       ctxLocal.drawImage(img, offsetPosX, offsetPosY, drawW, drawH);
     }
     // watermark inside photo
     if (watermarkEnabled && watermarkImg.complete) {
       ctxLocal.globalAlpha = 0.28;
       const wmWidth = boxW * 0.35;
       const wmHeight = wmWidth * (watermarkImg.height / watermarkImg.width);
       const wmX = x + (boxW - wmWidth) / 2;
       const wmY = y + (boxH - wmHeight) / 2;
       ctxLocal.drawImage(watermarkImg, wmX, wmY, wmWidth, wmHeight);
       ctxLocal.globalAlpha = 1;
     }
     ctxLocal.restore();
   }
   
   function drawCirclePlacement(ctxLocal, placement) {
     const { imgObj, x, y, diameterPx, offsetX = 0, offsetY = 0, scale = 1 } = placement;
     const radius = diameterPx / 2;
     const cx = x + radius, cy = y + radius;
     ctxLocal.save(); ctxLocal.beginPath(); ctxLocal.arc(cx, cy, radius - 2, 0, Math.PI * 2); ctxLocal.clip();
     const iw = imgObj.width, ih = imgObj.height;
     const imgRatio = iw / ih;
     let drawW, drawH;
     if (imgRatio >= 1) { drawH = diameterPx * scale; drawW = drawH * imgRatio; } else { drawW = diameterPx * scale; drawH = drawW / imgRatio; }
     const drawX = cx - drawW / 2 + offsetX; const drawY = cy - drawH / 2 + offsetY;
     ctxLocal.drawImage(imgObj, drawX, drawY, drawW, drawH);
     ctxLocal.restore();
     ctxLocal.beginPath(); ctxLocal.lineWidth = 2; ctxLocal.strokeStyle = (placement === selectedPlacement) ? '#1e88e5' : '#000';
     ctxLocal.arc(cx, cy, radius - 1, 0, Math.PI * 2); ctxLocal.stroke();
   }
   
   /* ---------------------------
      Build placements for pages (supports mixed modes)
      --------------------------- */
   async function buildPlacementsForPages() {
     placementsByPage = [];
     const fullW = 2480, fullH = 3508;
     const pxPerCm = PX_PER_CM;
     const marginPx = (Math.max(0, parseFloat(marginInputMm ? marginInputMm.value : 1) || 1) / 10) * pxPerCm;
     const gap = Math.max(0, parseInt(gapInput ? gapInput.value : 10) || 10);
     let pageIdx = 0;
     placementsByPage[pageIdx] = [];
     let x = marginPx, y = marginPx, rowMaxH = 0;
   
     for (const batch of batches) {
       const mode = batch.mode || 'normal';
       if (mode === 'circle') {
         const diameterCm = parseFloat(circleDiameter ? circleDiameter.value : 4) || 4;
         const diameterPx = diameterCm * pxPerCm;
         for (let cp = 0; cp < Math.max(1, batch.copy || 1); cp++) {
           for (const file of batch.files) {
             const imgObj = await loadImageWithEXIF(file, 'preview'); if (!imgObj) continue;
             if (x + diameterPx > fullW - marginPx) { x = marginPx; y += rowMaxH + gap; rowMaxH = 0; }
             if (y + diameterPx > fullH - marginPx) { pageIdx++; placementsByPage[pageIdx] = []; x = marginPx; y = marginPx; rowMaxH = 0; }
             const key = fileKeyFor(file);
             const saved = loadSavedForKey(key);
             placementsByPage[pageIdx].push({
               file, fileKey: key, imgObj, x, y, diameterPx, isCircle: true,
               offsetX: saved ? saved.offsetX : 0,
               offsetY: saved ? saved.offsetY : 0,
               scale: saved ? saved.scale : 1
             });
             rowMaxH = Math.max(rowMaxH, diameterPx); x += diameterPx + gap;
           }
         }
       } else {
         let wcm, hcm;
         if (batch.size === 'custom') { wcm = batch.customW; hcm = batch.customH; } else { [wcm, hcm] = (batch.size || '2x3').split('x').map(Number); }
         const boxW = wcm * pxPerCm, boxH = hcm * pxPerCm;
         for (let cp = 0; cp < Math.max(1, batch.copy || 1); cp++) {
           for (const file of batch.files) {
             const imgObj = await loadImageWithEXIF(file, 'preview'); if (!imgObj) continue;
             if (x + boxW > fullW - marginPx) { x = marginPx; y += rowMaxH + gap; rowMaxH = 0; }
             if (y + boxH > fullH - marginPx) { pageIdx++; placementsByPage[pageIdx] = []; x = marginPx; y = marginPx; rowMaxH = 0; }
             const key = fileKeyFor(file);
             const saved = loadSavedForKey(key);
             placementsByPage[pageIdx].push({
               file, fileKey: key, imgObj, x, y, boxW, boxH,
               offsetX: saved ? saved.offsetX : 0,
               offsetY: saved ? saved.offsetY : 0,
               scale: saved ? saved.scale : 1,
               isRectangle: true,
               isAdjustable: (batch.mode === 'normal')
             });
             rowMaxH = Math.max(rowMaxH, boxH); x += boxW + gap;
           }
         }
       }
     }
   }
   
   /* ---------------------------
      Render preview page (scaled)
      --------------------------- */
   function renderPreviewFromPlacements(pageIndex) {
     const fullW = 2480, fullH = 3508;
     const previewW = fullW * PREVIEW_SCALE, previewH = fullH * PREVIEW_SCALE;
     const scale = PREVIEW_SCALE;
     const pc = document.createElement('canvas'); pc.width = previewW; pc.height = previewH;
     const pctx = pc.getContext('2d'); pctx.fillStyle = '#fff'; pctx.fillRect(0, 0, previewW, previewH);
     const placements = placementsByPage[pageIndex] || [];
     for (const p of placements) {
       if (p.isRectangle && p.isAdjustable) {
         const r = Object.assign({}, p);
         r.x = Math.round(p.x * scale); r.y = Math.round(p.y * scale); r.boxW = Math.round(p.boxW * scale); r.boxH = Math.round(p.boxH * scale);
         const offX = Math.round((p.offsetX || 0) * scale);
         const offY = Math.round((p.offsetY || 0) * scale);
         r.imgObj = p.imgObj;
         drawImageCover(pctx, r.imgObj, r.x, r.y, r.boxW, r.boxH, offX, offY, p.scale, true);
         pctx.strokeStyle = '#000'; pctx.lineWidth = 2; pctx.strokeRect(r.x, r.y, r.boxW, r.boxH);
       } else if (p.isCircle) {
         const cp = Object.assign({}, p);
         cp.x = Math.round(p.x * scale); cp.y = Math.round(p.y * scale); cp.diameterPx = Math.round(p.diameterPx * scale);
         cp.offsetX = Math.round((p.offsetX || 0) * scale); cp.offsetY = Math.round((p.offsetY || 0) * scale); cp.scale = p.scale || 1;
         cp.imgObj = p.imgObj;
         drawCirclePlacement(pctx, cp);
       } else if (p.isRectangle) { // non-adjustable rectangle
         const r = Object.assign({}, p);
         r.x = Math.round(p.x * scale); r.y = Math.round(p.y * scale); r.boxW = Math.round(p.boxW * scale); r.boxH = Math.round(p.boxH * scale);
         r.imgObj = p.imgObj;
         drawImageCover(pctx, r.imgObj, r.x, r.y, r.boxW, r.boxH, Math.round((p.offsetX || 0) * scale), Math.round((p.offsetY || 0) * scale), p.scale, true);
         pctx.strokeStyle = '#000'; pctx.lineWidth = 2; pctx.strokeRect(r.x, r.y, r.boxW, r.boxH);
       }
     }
   
     // watermark overlay on preview page
     if (watermarkEnabled && watermarkImg.complete) {
       const wmScale = 0.35;
       const wmW = previewW * wmScale;
       const wmH = wmW * (watermarkImg.height / watermarkImg.width);
       const wmX = (previewW - wmW) / 2;
       const wmY = (previewH - wmH) / 2;
       pctx.globalAlpha = 0.25;
       pctx.drawImage(watermarkImg, wmX, wmY, wmW, wmH);
       pctx.globalAlpha = 1.0;
     }
   
     return pc;
   }
   
   /* ---------------------------
      Render all pages full-res for PDF
      --------------------------- */
   async function renderAllPagesToCanvases() {
     const fullW = 2480, fullH = 3508;
     const pxPerCm = PX_PER_CM;
     const marginPx = (Math.max(0, parseFloat(marginInputMm ? marginInputMm.value : 1) || 1) / 10) * pxPerCm;
     const pages = []; const usedHeightPerPagePx = [];
     for (let pi = 0; pi < (placementsByPage.length || 0); pi++) {
       const pagePlacements = placementsByPage[pi] || [];
       const pageCanvas = document.createElement('canvas'); pageCanvas.width = fullW; pageCanvas.height = fullH;
       const pctx = pageCanvas.getContext('2d'); pctx.fillStyle = '#fff'; pctx.fillRect(0, 0, fullW, fullH);
       let usedY = marginPx;
       for (const pl of pagePlacements) {
         const imgHigh = await loadImageWithEXIF(pl.file, 'pdf'); if (!imgHigh) continue;
         const placementHigh = Object.assign({}, pl); placementHigh.imgObj = imgHigh;
         if (pl.isRectangle) {
           drawImageCover(pctx, imgHigh, pl.x, pl.y, pl.boxW, pl.boxH, pl.offsetX, pl.offsetY, pl.scale, true);
           pctx.strokeStyle = '#000'; pctx.lineWidth = 2; pctx.strokeRect(pl.x, pl.y, pl.boxW, pl.boxH);
           usedY = Math.max(usedY, pl.y + (pl.boxH || 0));
         } else {
           drawCirclePlacement(pctx, placementHigh);
           usedY = Math.max(usedY, pl.y + pl.diameterPx);
         }
       }
       usedHeightPerPagePx.push(usedY);
       pages.push(pageCanvas);
     }
     return { pages, usedHeightPerPagePx };
   }
   
   /* ---------------------------
      Pricing helpers
      --------------------------- */
   function priceFromUsedHeightsArray(usedHeightPxArray) {
     const pxToMm = 297 / 3508;
     const halfPageMm = 297 / 2;
     let total = 0;
     usedHeightPxArray.forEach(px => {
       if (!px || px <= 0) return;
       const usedMm = px * pxToMm;
       total += (usedMm <= halfPageMm) ? 1000 : 2000;
     });
     return total;
   }
   function countPerfotoFromBatches(batchesArr) {
     let cnt = 0;
     for (const b of batchesArr) {
       const cp = Math.max(1, b.copy || 1);
       const fileCount = (b.files && b.files.length) ? b.files.length * cp : 0;
       if (b.mode === 'perfoto') cnt += fileCount;
     }
     return cnt;
   }
   
   /* ---------------------------
      Unified price compute
      --------------------------- */
   async function computeTotalPriceForPreviewOrGenerate() {
     const { pages, usedHeightPerPagePx } = await renderAllPagesToCanvases();
     const laprakPriceTotal = laprakMode && laprakMode.checked ? priceFromUsedHeightsArray(usedHeightPerPagePx) : 0;
     let normalPagePrice = 0;
     if (!laprakMode || !laprakMode.checked) {
       normalPagePrice = priceFromUsedHeightsArray(usedHeightPerPagePx);
     }
     const perFotoCount = countPerfotoFromBatches(batches);
     const hargaPerFoto = parseInt(hargaPerFotoInput ? hargaPerFotoInput.value : '1000') || 1000;
     const perfotoTotal = perFotoCount * hargaPerFoto;
     if (manualHargaCheckbox && manualHargaCheckbox.checked) {
       return parseInt(manualHargaInput.value) || 0;
     }
     const grandTotal = laprakPriceTotal + normalPagePrice + perfotoTotal;
     return { grandTotal, laprakPriceTotal, normalPagePrice, perfotoTotal, pagesCount: pages.length, pages, usedHeightPerPagePx };
   }
   
   /* ---------------------------
      Update price preview (safe)
      --------------------------- */
   async function updatePricePreview() {
     if (!batches.length) {
       if (priceDisplay) priceDisplay.textContent = 'Harga: Rp 0 (preview)';
       return;
     }
   
     // manual override has priority
     if (manualHargaCheckbox && manualHargaCheckbox.checked) {
       const val = parseInt(manualHargaInput ? manualHargaInput.value : '0') || 0;
       if (priceDisplay) priceDisplay.textContent = `Harga: Rp ${val.toLocaleString()} (manual)`;
       return;
     }
   
     try {
       await buildPlacementsForPages();
       const result = await computeTotalPriceForPreviewOrGenerate();
       const total = (typeof result === 'object' && result !== null) ? (result.grandTotal || 0) : (parseInt(result) || 0);
       if (priceDisplay) priceDisplay.textContent = `Harga: Rp ${total.toLocaleString()} (preview)`;
     } catch (err) {
       console.error(err);
       if (priceDisplay) priceDisplay.textContent = 'Harga: Rp 1000 (preview error)';
     }
   }
   
   /* ---------------------------
      Auto preview (used after changes)
      --------------------------- */
   async function autoPreview() {
     await buildPlacementsForPages();
     const result = await renderAllPagesToCanvases();
     pagesCache = result.pages || [];
     showPageAtIndex(0);
     await updatePricePreview();
   }
   
   /* ---------------------------
      Preview button
      --------------------------- */
   if (previewBtn) previewBtn.onclick = async () => {
     previewBtn.disabled = true;
     try {
       await buildPlacementsForPages();
       const result = await renderAllPagesToCanvases();
       pagesCache = result.pages || [];
       showPageAtIndex(0);
       await updatePricePreview();
     } catch (err) {
       console.error(err); alert('Error preview.');
     } finally { previewBtn.disabled = false; }
   };
   
   /* ---------------------------
      Show page on canvas
      --------------------------- */
   function showPageAtIndex(i) {
     if (!pagesCache || !pagesCache.length) return;
     currentPageIndex = Math.max(0, Math.min(i, pagesCache.length - 1));
     const p = pagesCache[currentPageIndex];
     ctx.clearRect(0, 0, canvas.width, canvas.height);
     ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, canvas.width, canvas.height);
     ctx.drawImage(p, 0, 0, canvas.width, canvas.height);
     if (pageNav) pageNav.style.display = pagesCache.length > 1 ? 'flex' : 'none';
     if (pageIndicator) pageIndicator.textContent = `Halaman ${currentPageIndex + 1} / ${pagesCache.length}`;
     if (prevPageBtn) prevPageBtn.disabled = currentPageIndex === 0;
     if (nextPageBtn) nextPageBtn.disabled = currentPageIndex === pagesCache.length - 1;
   }
   
   /* page nav handlers */
   if (prevPageBtn) prevPageBtn.onclick = () => showPageAtIndex(currentPageIndex - 1);
   if (nextPageBtn) nextPageBtn.onclick = () => showPageAtIndex(currentPageIndex + 1);
   
   /* ---------------------------
      Select / drag / zoom interactions on preview canvas
      --------------------------- */
   canvas.addEventListener('mousedown', (ev) => {
     if (!placementsByPage.length) return;
     const rect = canvas.getBoundingClientRect(); const mx = ev.clientX - rect.left; const my = ev.clientY - rect.top;
     const scale = PREVIEW_SCALE; selectedPlacement = null;
     const placements = placementsByPage[currentPageIndex] || [];
     for (const p of placements) {
       if (p.isRectangle && p.isAdjustable) {
         const inBox = mx >= p.x * scale && mx <= (p.x + p.boxW) * scale && my >= p.y * scale && my <= (p.y + p.boxH) * scale;
         if (inBox) { selectedPlacement = p; break; }
       } else if (p.isCircle) {
         const cx = p.x * scale + (p.diameterPx * scale) / 2; const cy = p.y * scale + (p.diameterPx * scale) / 2;
         const r = (p.diameterPx * scale) / 2; if (Math.hypot(mx - cx, my - cy) <= r) { selectedPlacement = p; break; }
       } else if (p.isRectangle) {
         const inBox = mx >= p.x * scale && mx <= (p.x + p.boxW) * scale && my >= p.y * scale && my <= (p.y + p.boxH) * scale;
         if (inBox) { selectedPlacement = p; break; }
       }
     }
     if (selectedPlacement) {
       isDragging = true;
       dragStart = { x: ev.clientX, y: ev.clientY, origOffsetX: selectedPlacement.offsetX || 0, origOffsetY: selectedPlacement.offsetY || 0 };
       canvas.classList.add('dragging');
       pagesCache[currentPageIndex] = renderPreviewFromPlacements(currentPageIndex); showPageAtIndex(currentPageIndex);
     }
   });
   canvas.addEventListener('mousemove', (ev) => {
     if (!isDragging || !selectedPlacement) return;
     const dx = ev.clientX - dragStart.x; const dy = ev.clientY - dragStart.y;
     const moveX_full = dx / PREVIEW_SCALE; const moveY_full = dy / PREVIEW_SCALE;
     selectedPlacement.offsetX = dragStart.origOffsetX + moveX_full; selectedPlacement.offsetY = dragStart.origOffsetY + moveY_full;
     pagesCache[currentPageIndex] = renderPreviewFromPlacements(currentPageIndex); showPageAtIndex(currentPageIndex);
   });
   canvas.addEventListener('mouseup', () => {
     if (isDragging && selectedPlacement) { isDragging = false; dragStart = null; canvas.classList.remove('dragging'); saveAllPlacementData(); }
   });
   canvas.addEventListener('mouseleave', () => { if (isDragging) { isDragging = false; dragStart = null; canvas.classList.remove('dragging'); saveAllPlacementData(); } });
   canvas.addEventListener('wheel', (ev) => {
     if (!selectedPlacement) return;
     ev.preventDefault();
     const delta = ev.deltaY < 0 ? 0.05 : -0.05;
     selectedPlacement.scale = Math.max(0.2, (selectedPlacement.scale || 1) + delta);
     pagesCache[currentPageIndex] = renderPreviewFromPlacements(currentPageIndex); showPageAtIndex(currentPageIndex);
     saveAllPlacementData();
   }, { passive: false });
   
   /* ---------------------------
      Reset handler (keamanan: manualHarga tetap aktif)
      --------------------------- */
   if (resetBtn) resetBtn.addEventListener("click", async (e) => {
     e.preventDefault();
     batches = []; placementsByPage = []; pagesCache = []; currentPageIndex = 0; selectedPlacement = null;
     try { localStorage.removeItem(STORAGE_KEY); } catch (e) {}
     ctx.clearRect(0, 0, canvas.width, canvas.height); ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, canvas.width, canvas.height);
     if (batchList) batchList.innerHTML = "";
     if (priceDisplay) priceDisplay.textContent = "Harga: Rp 0 (preview)";
     if (modeSelect) modeSelect.value = "normal";
     if (circleControls) circleControls.style.display = "none";
     if (laprakControls) laprakControls.style.display = "none";
     if (laprakMode) laprakMode.checked = false;
     if (manualHargaCheckbox) { manualHargaCheckbox.checked = true; manualHargaCheckbox.disabled = true; }
     if (manualHargaBox) manualHargaBox.style.display = "block";
     if (manualHargaInput) { manualHargaInput.value = "1000"; manualHargaInput.dispatchEvent(new Event('input')); }
     if (hideInfo) hideInfo.checked = false;
     if (userName) userName.value = "";
     document.querySelectorAll('input[type="file"]').forEach(inp => inp.value = "");
     if (sizeSelect) sizeSelect.value = "2x3";
     if (customSize) customSize.style.display = "none";
     if (marginInputMm) marginInputMm.value = "5";
     if (gapInput) gapInput.value = "20";
     if (hargaPerFotoInput) hargaPerFotoInput.value = "1000";
     if (pageNav) pageNav.style.display = "none";
     if (generateBtn) {
       generateBtn.classList.remove('kolase-done');
       generateBtn.classList.add('kolase-reset-transition');
       setTimeout(() => generateBtn.classList.remove('kolase-reset-transition'), 600);
     }
     const overlay = document.getElementById('loadingOverlay_kolase'); if (overlay) overlay.classList.remove('active');
     await updatePricePreview();
   });
   
   /* ---------------------------
      Generate button (preview + UI changes)
      --------------------------- */
   if (generateBtn) generateBtn.onclick = async () => {
     const overlay = document.getElementById('loadingOverlay_kolase');
     if (overlay) overlay.classList.add('active');
     generateBtn.disabled = true;
     try {
       await buildPlacementsForPages();
       const result = await computeTotalPriceForPreviewOrGenerate();
       pagesCache = (result && result.pages) ? result.pages : (pagesCache.length ? pagesCache : (Array.isArray(result.pages) ? result.pages : pagesCache));
       if (!pagesCache || !pagesCache.length) {
         const r = await renderAllPagesToCanvases();
         pagesCache = r.pages || pagesCache;
       }
       showPageAtIndex(0);
       let totalHarga = 0;
       if (typeof result === 'object' && result !== null) totalHarga = result.grandTotal || 0;
       else totalHarga = parseInt(result) || 0;
       if (priceDisplay) priceDisplay.textContent = `Harga: Rp ${totalHarga.toLocaleString()}`;
       generateBtn.classList.add('kolase-done');
     } catch (err) {
       console.error(err);
       alert('Terjadi kesalahan saat membuat kolase.');
     } finally {
       const o = document.getElementById('loadingOverlay_kolase'); if (o) o.classList.remove('active');
       generateBtn.disabled = false;
     }
   };
   
   /* ---------------------------
      Download / Open PDF (with watermark & footer)
      --------------------------- */
   if (downloadPdf) downloadPdf.onclick = async () => {
     if (!watermarkImg.complete) {
       await new Promise(resolve => {
         watermarkImg.onload = resolve;
         watermarkImg.onerror = resolve;
       });
     }
   
     if (!batches.length) return alert('Belum ada foto/batch.');
     if (!hideInfo || !hideInfo.checked) {
       if (!userName || !userName.value.trim()) {
         return alert('Silakan isi nama terlebih dahulu sebelum membuat PDF!');
       }
     }
     if (!pagesCache.length) return alert('Silakan klik "📄 Buat Kolase" terlebih dahulu sebelum membuka PDF.');
   
     downloadPdf.disabled = true;
     const prevText = downloadPdf.textContent;
     downloadPdf.textContent = '⏳ Menyiapkan PDF...';
   
     try {
       const pages = pagesCache;
       let totalHarga = 0;
       try { totalHarga = parseInt(priceDisplay.textContent.replace(/[^\d]/g, '')) || 0; } catch (e) { totalHarga = 0; }
   
       // attach footer on last page canvas copy (so we don't mutate cached canvas shown to user)
       const lastCanvas = document.createElement('canvas');
       lastCanvas.width = pages[pages.length - 1].width;
       lastCanvas.height = pages[pages.length - 1].height;
       const lastCtx = lastCanvas.getContext('2d');
       lastCtx.drawImage(pages[pages.length - 1], 0, 0);
   
       const fullW = lastCanvas.width, fullH = lastCanvas.height;
       const pxPerCm = PX_PER_CM;
       const footerHeightMm = 20;
       const footerPx = (footerHeightMm / 10) * pxPerCm;
       const footerX = 100;
       const footerYName = fullH - footerPx + 30;
       const footerYPrice = footerYName + 60;
   
       if (!hideInfo.checked) {
         lastCtx.font = `48px Poppins, sans-serif`;
         lastCtx.fillStyle = '#333';
         lastCtx.fillText(`Nama: ${userName.value || '-'}`, footerX, footerYName);
         lastCtx.fillText(`Harga: Rp ${totalHarga.toLocaleString()}`, footerX, footerYPrice);
       }
   
       // build PDF using jsPDF
       const { jsPDF } = window.jspdf;
       const pdf = new jsPDF('p', 'pt', 'a4');
   
       for (let i = 0; i < pages.length; i++) {
         const pg = (i === pages.length - 1) ? lastCanvas : pages[i];
         if (i > 0) pdf.addPage();
         pdf.addImage(pg.toDataURL('image/jpeg', 0.92), 'JPEG', 0, 0, 595, 842);
   
         // watermark in PDF (centered)
         if (watermarkEnabled && watermarkImg.complete) {
           const wmScale = 0.40;
           const wmW = 595 * wmScale;
           const wmH = wmW * (watermarkImg.height / watermarkImg.width);
           const wmX = (595 - wmW) / 2;
           const wmY = (842 - wmH) / 2;
           if (pdf.setGState && typeof pdf.GState === 'function') {
             const gs = pdf.GState({ opacity: 0.25 });
             pdf.setGState(gs);
             pdf.addImage(watermarkImg, "PNG", wmX, wmY, wmW, wmH, undefined, "FAST");
             const gsNormal = pdf.GState({ opacity: 1 });
             pdf.setGState(gsNormal);
           } else {
             // fallback: add without opacity setting
             pdf.addImage(watermarkImg, "PNG", wmX, wmY, wmW, wmH, undefined, "FAST");
           }
         }
       }
   
       const blob = pdf.output('blob');
       window.open(URL.createObjectURL(blob), '_blank');
   
     } catch (err) {
       console.error(err);
       alert('Gagal membuat PDF.');
     } finally {
       downloadPdf.disabled = false;
       downloadPdf.textContent = prevText || '💾 Buka PDF di Tab Baru';
     }
   };
   
   /* ---------------------------
      Save on unload
      --------------------------- */
   window.addEventListener('beforeunload', () => saveAllPlacementData());
   
   /* ---------------------------
      Canvas drop area interactions
      --------------------------- */
   if (canvas) {
     canvas.addEventListener("dragover", (e) => { e.preventDefault(); canvas.classList.add("hover-canvas"); if (canvasDropOverlay) canvasDropOverlay.classList.add("show"); if (canvasDropHint) canvasDropHint.classList.add("show"); });
     canvas.addEventListener("dragleave", () => { canvas.classList.remove("hover-canvas"); if (canvasDropOverlay) canvasDropOverlay.classList.remove("show"); if (canvasDropHint) canvasDropHint.classList.remove("show"); });
     canvas.addEventListener("drop", async (e) => {
       e.preventDefault();
       canvas.classList.remove("hover-canvas");
       if (canvasDropOverlay) canvasDropOverlay.classList.remove("show");
       if (canvasDropHint) canvasDropHint.classList.remove("show");
       const files = Array.from(e.dataTransfer.files || []);
       if (!files.length) return;
       await addFilesToBatch(files);
       await autoPreview();
       await updatePricePreview();
     });
   }
   
   /* ---------------------------
      Keyboard admin shortcut: toggle watermark (Alt+W)
      --------------------------- */
   document.addEventListener("keydown", (e) => {
     if (e.altKey && e.key.toLowerCase() === "w") {
       watermarkEnabled = !watermarkEnabled;
       console.log("Watermark:", watermarkEnabled ? "ON" : "OFF");
       if (typeof autoPreview === "function") autoPreview();
     }
   });
   
   /* ---------------------------
      Mode/size/controls listeners
      --------------------------- */
   if (customW) customW.oninput = autoPreview;
   if (customH) customH.oninput = autoPreview;
   if (marginInputMm) marginInputMm.oninput = autoPreview;
   if (gapInput) gapInput.oninput = autoPreview;
   
   if (modeSelect) modeSelect.onchange = async () => {
     saveAllPlacementData();
     if (hargaPerFotoBox) hargaPerFotoBox.style.display = modeSelect.value === 'perfoto' ? 'block' : 'none';
     if (circleControls) circleControls.style.display = modeSelect.value === 'circle' ? 'block' : 'none';
     if (modeSelect.value === 'circle' && batches.length) {
       await buildPlacementsForPages();
       pagesCache = [];
       showPageAtIndex(0);
     }
     updatePricePreview();
     await autoPreview();
   };
   
   if (sizeSelect) sizeSelect.onchange = async () => {
     if (customSize) customSize.style.display = sizeSelect.value === "custom" ? "flex" : "none";
     await autoPreview();
   };
   
   if (laprakMode) laprakMode.onchange = () => {
     if (laprakControls) laprakControls.style.display = laprakMode.checked ? 'block' : 'none';
     if (modeSelect) modeSelect.disabled = laprakMode.checked;
     updatePricePreview();
   };
   
   /* Ensure manualHarga defaults */
   if (manualHargaCheckbox) {
     manualHargaCheckbox.checked = true;
     manualHargaCheckbox.disabled = true;
     if (manualHargaBox) manualHargaBox.style.display = 'block';
     if (manualHargaInput && !manualHargaInput.value) manualHargaInput.value = 1000;
     if (priceDisplay) priceDisplay.textContent = `Harga: Rp ${parseInt(manualHargaInput.value).toLocaleString()} (manual)`;
   }
   if (manualHargaInput) {
     manualHargaInput.addEventListener("input", () => {
       const val = parseInt(manualHargaInput.value) || 0;
       if (priceDisplay) priceDisplay.textContent = `Harga: Rp ${val.toLocaleString()} (manual)`;
     });
   }
   
   /* ---------------------------
      Initial blank canvas
      --------------------------- */
   ctx.fillStyle = '#fff';
   ctx.fillRect(0, 0, canvas.width, canvas.height);
   
   function showLoading() {
    document.getElementById("loadingOverlay").style.display = "flex";
  }
  
  function hideLoading() {
    document.getElementById("loadingOverlay").style.display = "none";
  }
  previewBtn.addEventListener("click", async ()=> {
    showLoading();
    try{
        await generatePreview();
    }catch(e){
        toast("Gagal membuat preview");
    }
    hideLoading();
  });
  function toast(msg){
    const t = document.getElementById("toast");
    t.innerText = msg;
    t.classList.add("show");
    setTimeout(()=> t.classList.remove("show"),2500);
  }
         