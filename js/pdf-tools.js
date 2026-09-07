
(() => {
 const page=document.querySelector(".workspace"); if(!page)return;
 const tool=page.dataset.tool;
 const status=document.getElementById("status"), result=document.getElementById("result"), input=document.getElementById("fileInput"), btn=document.getElementById("processBtn");
 const files=[];
 const setStatus=x=>status.textContent=x;
 const esc=x=>String(x).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
 const renderFiles=()=>{const box=document.getElementById("fileList");if(!box)return;box.innerHTML=files.map((f,i)=>`<div class="file-item"><span>PDF</span><div class="grow"><strong>${esc(f.name)}</strong><small>${Siznora.fmtSize(f.size)}</small></div><button type="button" data-remove="${i}">Remove</button></div>`).join("");box.querySelectorAll("[data-remove]").forEach(b=>b.onclick=()=>{files.splice(+b.dataset.remove,1);renderFiles();btn.disabled=!files.length})};
 if(input)input.addEventListener("change",()=>{if(tool==="pdf-merge")files.push(...[...input.files].filter(f=>f.type==="application/pdf"&&f.size));else{files.length=0;const f=input.files[0];if(f&&f.type==="application/pdf"&&f.size)files.push(f)}renderFiles();btn.disabled=!files.length});
 const lib=async()=>await import("https://cdn.jsdelivr.net/npm/pdf-lib@1.17.1/+esm");
 const loadPDF=async bytes=>{const {PDFDocument}=await lib();return PDFDocument.load(bytes)};
 const parseRanges=(s,max)=>{const out=new Set();for(const p of s.split(",").map(x=>x.trim()).filter(Boolean)){const m=p.match(/^(\d+)\s*-\s*(\d+)$/);if(m){let a=+m[1],b=+m[2];if(a>b)[a,b]=[b,a];for(let i=a;i<=b;i++)if(i>=1&&i<=max)out.add(i-1)}else if(/^\d+$/.test(p)){const n=+p;if(n>=1&&n<=max)out.add(n-1)}}return[...out].sort((a,b)=>a-b)};
 const links=(items)=>{result.hidden=false;result.innerHTML="<h3>✓ Complete</h3>"+items.map(x=>`<a class="download" href="${x.url}" download="${esc(x.name)}">${esc(x.label||"Download")}</a>`).join("")};
 async function merge(){setStatus("Reading PDFs...");const {PDFDocument}=await lib();const out=await PDFDocument.create();for(let i=0;i<files.length;i++){setStatus(`Reading PDF ${i+1} of ${files.length}...`);const src=await PDFDocument.load(await files[i].arrayBuffer());const copied=await out.copyPages(src,src.getPageIndices());copied.forEach(p=>out.addPage(p))}setStatus("Generating output...");const blob=new Blob([await out.save()],{type:"application/pdf"});Siznora.download(blob,"Siznora_Merged.pdf");links([{url:URL.createObjectURL(blob),name:"Siznora_Merged.pdf",label:"Download Merged PDF"}])}
 async function split(){const {PDFDocument}=await lib();const src=await PDFDocument.load(await files[0].arrayBuffer());const n=src.getPageCount();const mode=document.getElementById("splitMode").value;let groups=[];if(mode==="individual")for(let i=0;i<n;i++)groups.push([i]);else{groups=[];for(const p of document.getElementById("ranges").value.split(",").map(x=>x.trim()).filter(Boolean)){const m=p.match(/^(\d+)-(\d+)$/);if(m){let a=+m[1],b=+m[2];if(a>b)[a,b]=[b,a];groups.push(Array.from({length:b-a+1},(_,j)=>a+j-1).filter(i=>i>=0&&i<n))}else if(/^\d+$/.test(p))groups.push([+p-1])}}if(!groups.length)throw Error("Enter valid page ranges.");setStatus("Generating split files...");const JSZip=(await import("https://cdn.jsdelivr.net/npm/jszip@3.10.1/+esm")).default;const zip=new JSZip();const urls=[];for(let i=0;i<groups.length;i++){const d=await PDFDocument.create();const ps=await d.copyPages(src,groups[i]);ps.forEach(p=>d.addPage(p));const blob=new Blob([await d.save()],{type:"application/pdf"});zip.file(`Siznora_Part_${i+1}.pdf`,blob);if(groups.length<=10)urls.push({url:URL.createObjectURL(blob),name:`Siznora_Part_${i+1}.pdf`,label:`Download Part ${i+1}`})}const zb=new Blob([await zip.generateAsync({type:"uint8array"})],{type:"application/zip"});urls.push({url:URL.createObjectURL(zb),name:"Siznora_Split_PDFs.zip",label:"Download All as ZIP"});links(urls)}
 async function rotate(){const {PDFDocument,degrees}=await lib();const src=await PDFDocument.load(await files[0].arrayBuffer());const out=await PDFDocument.create();const sel=document.getElementById("rotatePages").value==="all"?src.getPageIndices():parseRanges(document.getElementById("rotateSelected").value,src.getPageCount());const chosen=new Set(sel);const pages=await out.copyPages(src,src.getPageIndices());pages.forEach((p,i)=>{if(chosen.has(i))p.setRotation(degrees(+document.getElementById("angle").value));out.addPage(p)});const blob=new Blob([await out.save()],{type:"application/pdf"});links([{url:URL.createObjectURL(blob),name:"Siznora_Rotated.pdf",label:"Download Rotated PDF"}])}
 async function watermark(){const {PDFDocument,rgb,degrees}=await lib();const src=await PDFDocument.load(await files[0].arrayBuffer());const text=document.getElementById("watermarkText").value.trim();if(!text)throw Error("Enter watermark text.");const out=await PDFDocument.create();const pages=await out.copyPages(src,src.getPageIndices());const sel=document.getElementById("wmPages").value==="all"?src.getPageIndices():parseRanges(document.getElementById("wmSelected").value,src.getPageCount());const set=new Set(sel);for(const [i,p] of pages.entries()){out.addPage(p);if(set.has(i)){const {width,height}=p.getSize();let x=width/2,y=height/2;const pos=document.getElementById("position").value;if(pos.includes("left"))x=60;if(pos.includes("right"))x=width-60;if(pos.includes("top"))y=height-60;if(pos.includes("bottom"))y=60;p.drawText(text,{x,y,size:+document.getElementById("wmSize").value,opacity:+document.getElementById("wmOpacity").value,rotate:degrees(+document.getElementById("wmRotation").value),color:rgb(.35,.25,.85),xSkew:degrees(0),ySkew:degrees(0)})}}const blob=new Blob([await out.save()],{type:"application/pdf"});links([{url:URL.createObjectURL(blob),name:"Siznora_Watermarked.pdf",label:"Download Watermarked PDF"}])}
 async function organize(){const {PDFDocument,degrees}=await lib();const src=await PDFDocument.load(await files[0].arrayBuffer());const order=[...document.querySelectorAll(".page-card")].map(x=>+x.dataset.page);const out=await PDFDocument.create();const ps=await out.copyPages(src,order);ps.forEach((p,i)=>{const card=document.querySelector(`.page-card[data-page="${order[i]}"]`);const r=card?.querySelector("select");if(r&&+r.value)p.setRotation(degrees(+r.value));if(!card?.querySelector("input").checked)return;out.addPage(p)});const blob=new Blob([await out.save()],{type:"application/pdf"});links([{url:URL.createObjectURL(blob),name:"Siznora_Organized.pdf",label:"Download Organized PDF"}])}
async function compressPDF() {
  const original = files[0];

  if (!original) {
    throw new Error("Please select a PDF file.");
  }

  setStatus("Loading PDF compressor...");

  /* =====================================================
     LOAD PDF.JS
  ===================================================== */

  const pdfjs = await import(
    "https://cdn.jsdelivr.net/npm/pdfjs-dist@4.5.136/build/pdf.min.mjs"
  );

  pdfjs.GlobalWorkerOptions.workerSrc =
    "https://cdn.jsdelivr.net/npm/pdfjs-dist@4.5.136/build/pdf.worker.min.mjs";


  /* =====================================================
     LOAD PDF
  ===================================================== */

  setStatus("Reading PDF...");

  const pdf = await pdfjs.getDocument({
    data: new Uint8Array(await original.arrayBuffer())
  }).promise;

  const pageCount = pdf.numPages;


  /* =====================================================
     SLIDER
     
     Siznora slider:
     10 = light compression
     50 = medium compression
     90 = strong compression
  ===================================================== */

  const slider =
    document.getElementById("compressionTarget");

  const compressionPercent =
    Number(slider?.value || 50);


  /* =====================================================
     CONVERT COMPRESSION % TO JPEG QUALITY
     
     Higher percentage = lower JPEG quality
  ===================================================== */

  const quality =
    Math.max(
      0.10,
      Math.min(
        0.95,
        1 - (compressionPercent / 100) * 0.85
      )
    );


  /* =====================================================
     RESOLUTION SCALE
     
     Higher compression = lower resolution
  ===================================================== */

  const scale =
    Math.max(
      0.75,
      1.6 - (compressionPercent / 100) * 0.75
    );


  /* =====================================================
     CREATE NEW PDF
  ===================================================== */

  const { PDFDocument } = await lib();

  const out =
    await PDFDocument.create();


  /* =====================================================
     PROCESS EACH PAGE
  ===================================================== */

  for (let pageNumber = 1; pageNumber <= pageCount; pageNumber++) {

    setStatus(
      `Compressing page ${pageNumber} of ${pageCount}...`
    );

    const page =
      await pdf.getPage(pageNumber);

    const viewport =
      page.getViewport({
        scale: scale
      });


    /* ===================================================
       CANVAS
    =================================================== */

    const canvas =
      document.createElement("canvas");

    const context =
      canvas.getContext("2d", {
        alpha: false
      });

    canvas.width =
      Math.ceil(viewport.width);

    canvas.height =
      Math.ceil(viewport.height);


    /* ===================================================
       RENDER PDF PAGE
    =================================================== */

    await page.render({
      canvasContext: context,
      viewport: viewport
    }).promise;


    /* ===================================================
       JPEG COMPRESSION
    =================================================== */

    const jpegBlob =
      await new Promise((resolve, reject) => {

        canvas.toBlob(
          blob => {
            if (blob) {
              resolve(blob);
            } else {
              reject(
                new Error(
                  "Failed to compress PDF page."
                )
              );
            }
          },
          "image/jpeg",
          quality
        );

      });


    /* ===================================================
       EMBED JPEG INTO PDF
    =================================================== */

    const jpegBytes =
      new Uint8Array(
        await jpegBlob.arrayBuffer()
      );

    const image =
      await out.embedJpg(jpegBytes);


    /* ===================================================
       PRESERVE PAGE PROPORTION
    =================================================== */

    const width =
      image.width;

    const height =
      image.height;


    const newPage =
      out.addPage([
        width,
        height
      ]);


    /* ===================================================
       DRAW COMPRESSED PAGE
    =================================================== */

    newPage.drawImage(
      image,
      {
        x: 0,
        y: 0,
        width: width,
        height: height
      }
    );


    /* ===================================================
       CLEAN CANVAS
    =================================================== */

    canvas.width = 1;
    canvas.height = 1;
  }


  /* =====================================================
     SAVE PDF
  ===================================================== */

  setStatus("Creating compressed PDF...");

  const bytes =
    await out.save({
      useObjectStreams: true,
      addDefaultPage: false
    });


  const blob =
    new Blob(
      [bytes],
      {
        type: "application/pdf"
      }
    );


  /* =====================================================
     SIZE CALCULATION
  ===================================================== */

  const originalSize =
    original.size;

  const compressedSize =
    blob.size;

  const saved =
    originalSize > 0
      ? Math.max(
          0,
          (
            (originalSize - compressedSize)
            / originalSize
          ) * 100
        )
      : 0;


  /* =====================================================
     UPDATE ORIGINAL SIZE
  ===================================================== */

  const originalSizeEl =
    document.getElementById("originalSize");

  if (originalSizeEl) {
    originalSizeEl.textContent =
      Siznora.fmtSize(originalSize);
  }


  /* =====================================================
     UPDATE COMPRESSED SIZE
  ===================================================== */

  const targetSizeEl =
    document.getElementById("targetSize");

  if (targetSizeEl) {
    targetSizeEl.textContent =
      Siznora.fmtSize(compressedSize);
  }


  /* =====================================================
     UPDATE COMPRESSION RESULT
  ===================================================== */

  const qualityEl =
    document.getElementById(
      "compressionQuality"
    );

  if (qualityEl) {

    qualityEl.innerHTML =
      `<strong>${Math.round(saved)}% smaller</strong>`;
  }


  /* =====================================================
     STATUS
  ===================================================== */

  if (saved > 0) {

    setStatus(
      `Done. ${Math.round(saved)}% smaller`
    );

  } else {

    setStatus(
      "Compression complete."
    );
  }


  /* =====================================================
     DOWNLOAD
  ===================================================== */

  links([
    {
      url: URL.createObjectURL(blob),
      name: `compressed-${original.name}`,
      label: "Download Compressed PDF"
    }
  ]);


  return blob;
}
const compressionTarget =
  document.getElementById("compressionTarget");

const sliderValue =
  document.getElementById("sliderValue");

function updateSliderValue() {
  if (!compressionTarget || !sliderValue) return;

  const min = Number(compressionTarget.min) || 10;
  const max = Number(compressionTarget.max) || 90;
  const value = Number(compressionTarget.value);

  const percent = (value - min) / (max - min);

  const thumbSize = 24;
  const trackWidth = compressionTarget.offsetWidth;

  const usableWidth = trackWidth - thumbSize;
  const x = (thumbSize / 2) + (percent * usableWidth);

  sliderValue.style.left = `${x}px`;
  sliderValue.textContent = `${value}%`;
}

if (compressionTarget) {
  compressionTarget.addEventListener(
    "input",
    updateSliderValue
  );

  window.addEventListener(
    "resize",
    updateSliderValue
  );

  updateSliderValue();
}
 async function protect(){
  const password=document.getElementById("password")?.value || "";
  const confirmPassword=document.getElementById("password2")?.value || "";

  if(!files.length) throw Error("Please select a PDF file.");
  if(!password) throw Error("Please enter a password.");
  if(password !== confirmPassword) throw Error("Passwords do not match.");

  if(!window.isSecureContext || !window.crypto?.subtle){
    throw Error("AES-256 requires a secure HTTPS connection.");
  }

  if(!window.PDFEncrypt?.encryptPDF){
    throw Error("AES-256 encryption library failed to load.");
  }

  setStatus("Encrypting PDF with AES-256...");

  const pdfBytes=new Uint8Array(await files[0].arrayBuffer());

  const encrypted=await window.PDFEncrypt.encryptPDF(
    pdfBytes,
    password,
    {
      algorithm:"AES-256",
      ownerPassword:password,
      allowPrinting:true,
      allowModifying:false,
      allowCopying:false,
      allowAnnotating:false,
      allowFillingForms:true,
      allowExtraction:false,
      allowAssembly:false,
      allowHighQualityPrint:true
    }
  );

  const blob=new Blob([encrypted],{type:"application/pdf"});

  links([{
    url:URL.createObjectURL(blob),
    name:"Siznora_Protected.pdf",
    label:"Download Protected PDF"
  }]);

  setStatus("AES-256 encryption complete.");
 }
 async function jpgpdf(){const {PDFDocument}=await lib();const out=await PDFDocument.create();const size=document.getElementById("pageSize").value;const orient=document.getElementById("orientation").value;const margin=+document.getElementById("margin").value*2.83465;for(const f of files){const img=await createImageBitmap(f);let w=img.width*72/96,h=img.height*72/96;let pw=w+margin*2,ph=h+margin*2;if(size!=="original"){pw=size==="a4"?595.28:612;ph=size==="a4"?841.89:792;if(orient==="landscape")[pw,ph]=[ph,pw]}const p=out.addPage([pw,ph]);const c=document.createElement("canvas");c.width=img.width;c.height=img.height;c.getContext("2d").drawImage(img,0,0);const data=c.toDataURL("image/jpeg",.92);const bytes=await (await fetch(data)).arrayBuffer();const emb=f.type==="image/png"?await out.embedPng(bytes):await out.embedJpg(bytes);const maxw=pw-margin*2,maxh=ph-margin*2,scale=Math.min(maxw/emb.width,maxh/emb.height);p.drawImage(emb,{x:(pw-emb.width*scale)/2,y:(ph-emb.height*scale)/2,width:emb.width*scale,height:emb.height*scale})}const blob=new Blob([await out.save()],{type:"application/pdf"});links([{url:URL.createObjectURL(blob),name:"Siznora_Images.pdf",label:"Download PDF"}])}
 async function pdfjpg(){setStatus("Loading PDF renderer...");const pdfjs=await import("https://cdn.jsdelivr.net/npm/pdfjs-dist@4.5.136/build/pdf.min.mjs");pdfjs.GlobalWorkerOptions.workerSrc="https://cdn.jsdelivr.net/npm/pdfjs-dist@4.5.136/build/pdf.worker.min.mjs";const pdf=await pdfjs.getDocument({data:new Uint8Array(await files[0].arrayBuffer())}).promise;const q=document.getElementById("pages").value.trim();let inds=q?parseRanges(q,pdf.numPages):Array.from({length:pdf.numPages},(_,i)=>i);const urls=[];const zip=(await import("https://cdn.jsdelivr.net/npm/jszip@3.10.1/+esm")).default();for(const i of inds){const p=await pdf.getPage(i+1);const vp=p.getViewport({scale:1.7});const c=document.createElement("canvas");c.width=vp.width;c.height=vp.height;await p.render({canvasContext:c.getContext("2d"),viewport:vp}).promise;const blob=await new Promise(r=>c.toBlob(r,"image/jpeg",+document.getElementById("quality").value));const name=`Siznora_Page_${i+1}.jpg`;zip.file(name,blob);if(inds.length<=10)urls.push({url:URL.createObjectURL(blob),name,label:`Download Page ${i+1}`})}const zb=new Blob([await zip.generateAsync({type:"uint8array"})],{type:"application/zip"});urls.push({url:URL.createObjectURL(zb),name:"Siznora_PDF_Pages.zip",label:"Download All as ZIP"});links(urls)}
 const actions={"pdf-compress":compressPDF,"pdf-merge":merge,"pdf-split":split,"pdf-organize":organize,"jpg-pdf":jpgpdf,"pdf-jpg":pdfjpg,"pdf-protect":protect,"pdf-watermark":watermark,"pdf-rotate":rotate};
 if(btn)btn.onclick=async()=>{btn.disabled=true;try{setStatus("Processing...");await actions[tool]();setStatus("Done.");}catch(e){setStatus(e.message?.includes("encryption")?e.message:"Unable to process this file. Please check that the file is valid and try again.");}finally{btn.disabled=false}};
 if(tool==="pdf-split"){document.getElementById("splitMode")?.addEventListener("change",e=>document.getElementById("rangesWrap").hidden=e.target.value!=="ranges")}
 if(tool==="pdf-watermark")document.getElementById("wmPages")?.addEventListener("change",e=>document.getElementById("wmSelectedWrap").hidden=e.target.value!=="selected");
 if(tool==="pdf-rotate")document.getElementById("rotatePages")?.addEventListener("change",e=>document.getElementById("rotateSelectedWrap").hidden=e.target.value!=="selected");
 if(tool==="pdf-organize")input?.addEventListener("change",async()=>{const {default:pdfjs}=await import("https://cdn.jsdelivr.net/npm/pdfjs-dist@4.5.136/build/pdf.min.mjs").catch(()=>({}));});
/* Show compression settings only after PDF upload */
if (tool === "pdf-compress") {

  const compressionSettings =
    document.getElementById("compressionSettings");

  if (compressionSettings) {

    // Initially hidden
    compressionSettings.hidden = true;

    // Watch for PDF selection
    input?.addEventListener("change", () => {

      if (files.length > 0) {
        compressionSettings.hidden = false;

        const originalSize =
          document.getElementById("originalSize");

        if (originalSize) {
          originalSize.textContent =
            Siznora.fmtSize(files[0].size);
        }

        const targetSize =
          document.getElementById("targetSize");

        if (targetSize) {
          const slider =
            Number(
              document.getElementById("compressionTarget")?.value || 75
            );

          const estimated =
            files[0].size * (1 - slider / 100);

          targetSize.textContent =
            Siznora.fmtSize(Math.max(0, estimated));
        }
      } else {
        compressionSettings.hidden = true;
      }

    });
  }
}
if (tool === "pdf-compress") {

  const slider =
    document.getElementById("compressionTarget");

  const value =
    document.getElementById("compressionValue");

  const quality =
    document.getElementById("qualityValue");

  const targetSize =
    document.getElementById("targetSize");

  if (slider) {

    slider.addEventListener("input", () => {

      const percent = Number(slider.value);

      if (value) {
        value.textContent = percent;
      }

      if (quality) {
        quality.textContent = percent;
      }

      if (files.length > 0 && targetSize) {

        const estimated =
          files[0].size * (1 - percent / 100);

        targetSize.textContent =
          Siznora.fmtSize(Math.max(0, estimated));
      }
    });

  }
}
})();
