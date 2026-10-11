/* Student and teacher photo profiles add-on. Keep app.js unchanged. */
(() => {
  "use strict";
  const DB_KEY = "school_college_management_v1";
  const main = document.getElementById("main");
  if (!main) return;

  const style = document.createElement("style");
  style.textContent = `
    .scm-profile-photo-label{display:flex;flex-direction:column;gap:7px;font-size:14px}
    .scm-profile-photo-label input{width:100%;padding:10px;border:1px solid #cbd5e1;border-radius:7px;background:#fff}
    .scm-profile-avatar-button{width:48px;height:48px;padding:2px;margin:0;border:1px solid #cbd5e1;border-radius:50%;background:#f8fafc;color:#475569;display:inline-flex;align-items:center;justify-content:center;overflow:hidden;font-size:10px}
    .scm-profile-avatar{width:44px;height:44px;object-fit:cover;border-radius:50%;display:block}
    .scm-profile-name{background:transparent!important;color:#075985!important;text-decoration:underline;padding:0!important;margin:0!important;font-weight:700}
    .scm-profile-modal{position:fixed;inset:0;background:#0f172ab8;z-index:100000;display:flex;align-items:center;justify-content:center;padding:16px;overflow:auto}
    .scm-profile-modal-card{background:#fff;color:#172033;width:min(720px,100%);max-height:92vh;overflow:auto;border-radius:16px;padding:22px;box-shadow:0 20px 60px #0004}
    .scm-profile-modal-top{display:flex;align-items:center;gap:18px;flex-wrap:wrap;margin-bottom:22px}
    .scm-profile-large-photo{width:120px;height:120px;object-fit:cover;border-radius:14px;border:1px solid #cbd5e1;background:#f1f5f9}
    .scm-profile-large-empty{display:flex;align-items:center;justify-content:center;color:#64748b}
    .scm-profile-modal-top h2{margin:0 0 8px;font-size:24px}
    .scm-profile-modal-top p{margin:0 0 6px;color:#64748b}
    .scm-profile-details-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:10px}
    .scm-profile-detail-box{padding:12px;border:1px solid #e2e8f0;border-radius:9px;overflow-wrap:anywhere}
    .scm-profile-detail-box span{display:block;color:#64748b;font-size:13px;margin-bottom:6px}
    .scm-profile-detail-box strong{font-weight:700}
    .scm-profile-modal-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:20px}
    @media(max-width:600px){.scm-profile-modal-card{padding:15px}.scm-profile-large-photo{width:96px;height:96px}.scm-profile-modal-top h2{font-size:20px}}
    @media print{body>*:not(.scm-profile-modal){display:none!important}.scm-profile-modal{position:static;inset:auto;background:white;padding:0;display:block}.scm-profile-modal-card{width:100%;max-height:none;overflow:visible;box-shadow:none}.scm-profile-modal-actions{display:none!important}}
  `;
  document.head.appendChild(style);

  function readDB() {
    try { return JSON.parse(localStorage.getItem(DB_KEY) || "{}"); }
    catch (_) { return {}; }
  }
  function esc(v) {
    return String(v == null ? "" : v).replace(/[&<>"']/g, c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[c]));
  }
  function toast(message) {
    let el = document.getElementById("scm-profile-toast");
    if (!el) {
      el = document.createElement("div"); el.id = "scm-profile-toast";
      el.style.cssText = "position:fixed;bottom:20px;left:50%;transform:translateX(-50%);z-index:100001;background:#173b2b;color:white;padding:12px 18px;border-radius:8px;max-width:90%;";
      document.body.appendChild(el);
    }
    el.textContent = message; el.hidden = false; clearTimeout(el._timer);
    el._timer = setTimeout(() => { el.hidden = true; }, 3500);
  }
  function decorateForms() {
    main.querySelectorAll('form[data-form="students"],form[data-form="teachers"]').forEach(form => {
      const grid = form.querySelector(".scm-form-grid");
      if (!grid || grid.querySelector("[data-scm-photo-field]")) return;
      const label = document.createElement("label");
      label.className = "scm-profile-photo-label"; label.dataset.scmPhotoField = "yes";
      label.appendChild(document.createTextNode("ছবি (ঐচ্ছিক; JPG/PNG)"));
      const input = document.createElement("input"); input.type = "file"; input.accept = "image/*"; input.dataset.scmProfilePhoto = "yes";
      label.appendChild(input); grid.insertBefore(label, grid.firstChild);
    });
  }
  function decorateTables() {
    main.querySelectorAll(".scm-table").forEach(table => {
      if (table.dataset.scmProfilesDecorated === "yes") return;
      const head = table.querySelector("thead tr"); if (!head) return;
      const labels = Array.from(head.querySelectorAll("th")).map(th => th.textContent.trim());
      let type = "";
      if (labels.includes("শ্রেণি") && labels.includes("রোল")) type = "students";
      else if (labels.includes("বিষয়/পদবি") && labels.includes("বেতন")) type = "teachers";
      if (!type) return;
      table.dataset.scmProfilesDecorated = "yes";
      const photoHead = document.createElement("th"); photoHead.textContent = "ছবি"; head.insertBefore(photoHead, head.firstChild);
      const profileHead = document.createElement("th"); profileHead.textContent = "প্রোফাইল";
      const actionHead = Array.from(head.querySelectorAll("th")).find(th => th.textContent.trim() === "Action");
      if (actionHead) head.insertBefore(profileHead, actionHead); else head.appendChild(profileHead);
      table.querySelectorAll("tbody tr").forEach(tr => {
        const cells = Array.from(tr.querySelectorAll("td")); const del = tr.querySelector("[data-delete]");
        if (!cells.length || !del) return;
        const id = del.dataset.delete; const recordType = del.dataset.type || type;
        const nameCell = cells[0]; const name = nameCell.textContent.trim();
        if (!name || name === "কোনো তথ্য পাওয়া যায়নি") return;
        const photoCell = document.createElement("td");
        const photoButton = document.createElement("button"); photoButton.type = "button";
        photoButton.className = "scm-profile-avatar-button"; photoButton.dataset.scmProfileOpen = recordType; photoButton.dataset.scmProfileId = id;
        photoButton.textContent = "ছবি নেই"; photoCell.appendChild(photoButton); tr.insertBefore(photoCell, tr.firstChild);
        const nameButton = document.createElement("button"); nameButton.type = "button"; nameButton.className = "scm-profile-name";
        nameButton.dataset.scmProfileOpen = recordType; nameButton.dataset.scmProfileId = id; nameButton.textContent = name;
        nameCell.textContent = ""; nameCell.appendChild(nameButton);
        const profileCell = document.createElement("td"); const profileButton = document.createElement("button");
        profileButton.type = "button"; profileButton.className = "scm-btn"; profileButton.dataset.scmProfileOpen = recordType;
        profileButton.dataset.scmProfileId = id; profileButton.textContent = "প্রোফাইল দেখুন"; profileCell.appendChild(profileButton);
        tr.insertBefore(profileCell, del.closest("td"));
        const person = ((readDB())[recordType] || []).find(p => p.id === id);
        if (person && person.photo) {
          const img = document.createElement("img"); img.className = "scm-profile-avatar"; img.src = person.photo; img.alt = "ছবি";
          photoButton.textContent = ""; photoButton.appendChild(img);
        }
      });
    });
  }
  function decorate() { decorateForms(); decorateTables(); }
  function compressPhoto(file) {
    return new Promise((resolve, reject) => {
      if (!file || !file.type || !file.type.startsWith("image/")) { reject(new Error("JPG বা PNG ছবি নির্বাচন করুন।")); return; }
      const reader = new FileReader();
      reader.onerror = () => reject(new Error("ছবি পড়া যায়নি। আবার চেষ্টা করুন।"));
      reader.onload = () => {
        const image = new Image(); image.onerror = () => reject(new Error("ছবিটি খোলা যায়নি। অন্য ছবি দিন।"));
        image.onload = () => {
          const scale = Math.min(1, 480 / Math.max(image.width, image.height));
          const canvas = document.createElement("canvas"); canvas.width = Math.max(1, Math.round(image.width * scale)); canvas.height = Math.max(1, Math.round(image.height * scale));
          const ctx = canvas.getContext("2d"); if (!ctx) { reject(new Error("ছবি প্রস্তুত করা যায়নি।")); return; }
          ctx.drawImage(image, 0, 0, canvas.width, canvas.height); resolve(canvas.toDataURL("image/jpeg", 0.7));
        };
        image.src = reader.result;
      };
      reader.readAsDataURL(file);
    });
  }
  document.addEventListener("submit", event => {
    const form = event.target.closest('form[data-form="students"],form[data-form="teachers"]'); if (!form) return;
    if (form.dataset.scmPhotoSubmitting === "yes") { delete form.dataset.scmPhotoSubmitting; return; }
    const input = form.querySelector("[data-scm-profile-photo]"); const file = input && input.files && input.files[0]; if (!file) return;
    event.preventDefault(); event.stopImmediatePropagation(); form.dataset.scmPhotoSubmitting = "yes";
    compressPhoto(file).then(photo => {
      let hidden = form.querySelector('input[name="photo"]');
      if (!hidden) { hidden = document.createElement("input"); hidden.type = "hidden"; hidden.name = "photo"; form.appendChild(hidden); }
      hidden.value = photo; form.requestSubmit();
    }).catch(error => { delete form.dataset.scmPhotoSubmitting; toast(error.message || "ছবি যোগ করা যায়নি"); });
  }, true);
  function openProfile(type, id) {
    const db = readDB(); const person = (db[type] || []).find(p => p.id === id);
    if (!person) { toast("প্রোফাইল পাওয়া যায়নি। পেজ রিফ্রেশ করে আবার চেষ্টা করুন।"); return; }
    const student = type === "students";
    const fields = student ? [["শিক্ষার্থী আইডি",person.studentId],["শ্রেণি",person.className],["রোল",person.roll],["মোবাইল",person.phone],["অভিভাবকের নাম",person.guardian],["ভর্তির তারিখ",person.date]] : [["শিক্ষক আইডি",person.teacherId],["বিষয়/পদবি",person.subject],["মোবাইল",person.phone],["বেতন",person.salary === undefined || person.salary === "" ? "" : "৳ " + Number(person.salary).toLocaleString("en-BD")]];
    const overlay = document.createElement("div"); overlay.className = "scm-profile-modal"; overlay.dataset.scmProfileModal = "yes";
    const photo = person.photo ? '<img class="scm-profile-large-photo" src="' + esc(person.photo) + '" alt="' + esc(person.name) + '">' : '<div class="scm-profile-large-photo scm-profile-large-empty">ছবি দেওয়া হয়নি</div>';
    overlay.innerHTML = '<section class="scm-profile-modal-card" role="dialog" aria-modal="true" aria-label="' + (student ? "শিক্ষার্থীর প্রোফাইল" : "শিক্ষকের প্রোফাইল") + '">' +
      '<div class="scm-profile-modal-top">' + photo + '<div><h2>' + esc(person.name) + '</h2><p>' + esc(student ? person.studentId : person.teacherId) + '</p><p>' + (student ? "শিক্ষার্থী" : "শিক্ষক") + '</p></div></div>' +
      '<div class="scm-profile-details-grid">' + fields.map(item => '<div class="scm-profile-detail-box"><span>' + esc(item[0]) + '</span><strong>' + esc(item[1] || "তথ্য দেওয়া হয়নি") + '</strong></div>').join("") + '</div>' +
      '<div class="scm-profile-modal-actions"><button type="button" class="scm-btn" data-scm-profile-close>বন্ধ করুন</button><button type="button" class="scm-btn" data-scm-profile-print>প্রোফাইল প্রিন্ট</button></div></section>';
    document.querySelectorAll("[data-scm-profile-modal]").forEach(old => old.remove()); document.body.appendChild(overlay); overlay.querySelector("[data-scm-profile-close]").focus();
  }
  document.addEventListener("click", event => {
    const open = event.target.closest("[data-scm-profile-open]");
    if (open) { openProfile(open.dataset.scmProfileOpen, open.dataset.scmProfileId); return; }
    const close = event.target.closest("[data-scm-profile-close]"); if (close) { const modal = close.closest("[data-scm-profile-modal]"); if (modal) modal.remove(); return; }
    if (event.target.closest("[data-scm-profile-print]")) { window.print(); return; }
    if (event.target.matches("[data-scm-profile-modal]")) event.target.remove();
  });
  document.addEventListener("keydown", event => { if (event.key === "Escape") document.querySelectorAll("[data-scm-profile-modal]").forEach(modal => modal.remove()); });
  new MutationObserver(decorate).observe(main, { childList: true, subtree: true }); decorate();
})();
