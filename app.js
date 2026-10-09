

/* School & College Management Software
   Version 1.0
   Data storage: Browser LocalStorage
*/
(() => {
  "use strict";

  const DB_KEY = "school_college_management_v1";
  const $ = (s, root = document) => root.querySelector(s);

  const initial = {
    settings: {
      name: "School & College",
      address: "",
      phone: "",
      principal: ""
    },
    students: [],
    teachers: [],
    attendance: [],
    fees: [],
    results: []
  };

  function loadDB() {
    try {
      return { ...initial, ...JSON.parse(localStorage.getItem(DB_KEY) || "{}") };
    } catch {
      return structuredClone(initial);
    }
  }

  let db = loadDB();
  let currentPage = "dashboard";

  function saveDB() {
    localStorage.setItem(DB_KEY, JSON.stringify(db));
  }

  function esc(value) {
    return String(value ?? "").replace(/[&<>"']/g, c => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;",
      '"': "&quot;", "'": "&#39;"
    })[c]);
  }

  function today() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }

  function id() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }

  function money(n) {
    return "৳ " + Number(n || 0).toLocaleString("en-BD");
  }

  function notice(message) {
    let el = $("#app-notice");
    if (!el) {
      el = document.createElement("div");
      el.id = "app-notice";
      el.style.cssText = "position:fixed;bottom:20px;left:50%;transform:translateX(-50%);background:#173b2b;color:white;padding:12px 20px;border-radius:8px;z-index:9999;max-width:90%;";
      document.body.appendChild(el);
    }
    el.textContent = message;
    el.hidden = false;
    clearTimeout(notice.timer);
    notice.timer = setTimeout(() => { el.hidden = true; }, 3000);
  }

  function input(label, name, type = "text", required = false, value = "") {
    return `<label class="scm-field">${esc(label)}
      <input name="${esc(name)}" type="${esc(type)}"
      value="${esc(value)}" ${required ? "required" : ""}
      ${type === "number" ? 'min="0" step="any"' : ""}>
    </label>`;
  }

  function select(label, name, options, required = true) {
    return `<label class="scm-field">${esc(label)}
      <select name="${esc(name)}" ${required ? "required" : ""}>
      ${options.map(v => `<option value="${esc(v)}">${esc(v)}</option>`).join("")}
      </select></label>`;
  }

  function formBox(title, fields, button = "Save") {
    return `<section class="scm-card">
      <h3>${esc(title)}</h3>
      <form class="scm-form" data-form="${esc(currentPage)}">
        <div class="scm-form-grid">${fields}</div>
        <button class="scm-btn" type="submit">${esc(button)}</button>
      </form>
    </section>`;
  }

  function table(headers, rows, empty = "কোনো তথ্য পাওয়া যায়নি") {
    return `<div class="scm-table-wrap"><table class="scm-table">
      <thead><tr>${headers.map(h => `<th>${esc(h)}</th>`).join("")}</tr></thead>
      <tbody>${rows.length ? rows.join("") : `<tr><td colspan="${headers.length}">${esc(empty)}</td></tr>`}</tbody>
    </table></div>`;
  }

  function row(cells, recordId = "") {
    return `<tr>${cells.map(c => `<td>${c}</td>`).join("")}
      ${recordId ? `<td><button class="scm-btn scm-danger" data-delete="${esc(recordId)}" data-type="${esc(currentPage)}">Delete</button></td>` : ""}
    </tr>`;
  }

  function actionColumn(headers) {
    return [...headers, "Action"];
  }

  function pageTitle(title, description = "") {
    return `<div class="scm-heading"><div><h2>${esc(title)}</h2><p>${esc(description)}</p></div><span>${esc(today())}</span></div>`;
  }

  function dashboard() {
    const present = db.attendance.filter(a => a.date === today() && a.status === "Present").length;
    const collected = db.fees.reduce((sum, f) => sum + Number(f.amount || 0), 0);
    return pageTitle("Dashboard", "আপনার প্রতিষ্ঠানের সারসংক্ষেপ") +
      `<div class="scm-stats">
        <div class="scm-stat"><span>মোট শিক্ষার্থী</span><strong>${db.students.length}</strong></div>
        <div class="scm-stat"><span>মোট শিক্ষক</span><strong>${db.teachers.length}</strong></div>
        <div class="scm-stat"><span>আজ উপস্থিত</span><strong>${present}</strong></div>
        <div class="scm-stat"><span>মোট ফি আদায়</span><strong>${money(collected)}</strong></div>
      </div>
      <section class="scm-card"><h3>প্রতিষ্ঠানের তথ্য</h3>
      <p><b>নাম:</b> ${esc(db.settings.name)}</p>
      <p><b>ঠিকানা:</b> ${esc(db.settings.address || "সেট করা হয়নি")}</p>
      <p><b>ফোন:</b> ${esc(db.settings.phone || "সেট করা হয়নি")}</p></section>
      <section class="scm-card"><h3>দ্রুত কাজ</h3>
      <div class="scm-actions">
      ${["students","teachers","attendance","fees","results","reports","backup","settings"].map(p =>
        `<button class="scm-btn" data-page="${p}">${esc(pageNames[p])}</button>`).join("")}
      </div></section>`;
  }

  const pageNames = {
    dashboard: "Dashboard",
    students: "শিক্ষার্থী",
    teachers: "শিক্ষক",
    attendance: "উপস্থিতি",
    fees: "ফি আদায়",
    results: "পরীক্ষার ফলাফল",
    reports: "রিপোর্ট",
    backup: "ব্যাকআপ",
    settings: "সেটিংস"
  };

  function studentsPage() {
    const fields = input("শিক্ষার্থীর নাম", "name", "text", true) +
      input("ভর্তি/আইডি নম্বর", "studentId", "text", true) +
      input("শ্রেণি", "className", "text", true) +
      input("রোল নম্বর", "roll", "text", true) +
      input("মোবাইল", "phone") +
      input("অভিভাবকের নাম", "guardian") +
      input("ভর্তির তারিখ", "date", "date", false, today());

    const rows = db.students.map(s => row([
      esc(s.name), esc(s.studentId), esc(s.className),
      esc(s.roll), esc(s.phone || ""), esc(s.guardian || "")
    ], s.id));

    return pageTitle("শিক্ষার্থী ব্যবস্থাপনা", "নতুন শিক্ষার্থী যোগ ও তালিকা") +
      formBox("নতুন শিক্ষার্থী ভর্তি", fields, "শিক্ষার্থী সংরক্ষণ") +
      `<section class="scm-card"><h3>শিক্ষার্থীর তালিকা</h3>
      <input class="scm-search" data-search="students" placeholder="নাম বা আইডি দিয়ে খুঁজুন">
      ${table(actionColumn(["নাম","আইডি","শ্রেণি","রোল","মোবাইল","অভিভাবক"]), rows)}</section>`;
  }

  function teachersPage() {
    const fields = input("শিক্ষকের নাম", "name", "text", true) +
      input("শিক্ষক আইডি", "teacherId", "text", true) +
      input("বিষয়/পদবি", "subject", "text", true) +
      input("মোবাইল", "phone") +
      input("বেতন", "salary", "number");

    const rows = db.teachers.map(t => row([
      esc(t.name), esc(t.teacherId), esc(t.subject),
      esc(t.phone || ""), money(t.salary)
    ], t.id));

    return pageTitle("শিক্ষক ব্যবস্থাপনা", "শিক্ষক নিবন্ধন ও তালিকা") +
      formBox("নতুন শিক্ষক যোগ করুন", fields, "শিক্ষক সংরক্ষণ") +
      `<section class="scm-card"><h3>শিক্ষকের তালিকা</h3>
      ${table(actionColumn(["নাম","আইডি","বিষয়/পদবি","মোবাইল","বেতন"]), rows)}</section>`;
  }

  function attendancePage() {
    const fields = input("তারিখ", "date", "date", true, today()) +
      input("শিক্ষার্থী আইডি", "studentId", "text", true) +
      select("উপস্থিতি", "status", ["Present", "Absent", "Late"]);

    const rows = db.attendance.map(a => {
      const student = db.students.find(s => s.studentId === a.studentId);
      return row([
        esc(a.date), esc(a.studentId), esc(student?.name || "অজানা শিক্ষার্থী"),
        esc(a.status)
      ], a.id);
    });

    return pageTitle("উপস্থিতি", "শিক্ষার্থীর আইডি দিয়ে দৈনিক উপস্থিতি নিন") +
      formBox("উপস্থিতি রেকর্ড", fields, "উপস্থিতি সংরক্ষণ") +
      `<section class="scm-card"><h3>উপস্থিতির তালিকা</h3>
      ${table(actionColumn(["তারিখ","আইডি","শিক্ষার্থী","অবস্থা"]), rows)}</section>`;
  }

  function feesPage() {
    const fields = input("তারিখ", "date", "date", true, today()) +
      input("শিক্ষার্থী আইডি", "studentId", "text", true) +
      input("ফি-এর ধরন", "feeType", "text", true) +
      input("টাকার পরিমাণ", "amount", "number", true) +
      input("রসিদ নম্বর", "receipt");

    const rows = db.fees.map(f => {
      const student = db.students.find(s => s.studentId === f.studentId);
      return row([
        esc(f.date), esc(f.studentId), esc(student?.name || "অজানা শিক্ষার্থী"),
        esc(f.feeType), money(f.amount), esc(f.receipt || "")
      ], f.id);
    });

    return pageTitle("ফি ও হিসাব", "ফি জমা এবং রসিদের তথ্য রাখুন") +
      formBox("নতুন ফি জমা", fields, "ফি সংরক্ষণ") +
      `<section class="scm-card"><h3>ফি আদায়ের তালিকা</h3>
      ${table(actionColumn(["তারিখ","আইডি","শিক্ষার্থী","ফি-এর ধরন","পরিমাণ","রসিদ"]), rows)}
      <h3>সর্বমোট আদায়: ${money(db.fees.reduce((s, f) => s + Number(f.amount || 0), 0))}</h3></section>`;
  }

  function resultsPage() {
    const fields = input("শিক্ষার্থী আইডি", "studentId", "text", true) +
      input("পরীক্ষার নাম", "exam", "text", true) +
      input("বিষয়", "subject", "text", true) +
      input("পূর্ণ নম্বর", "fullMarks", "number", true) +
      input("প্রাপ্ত নম্বর", "marks", "number", true);

    const rows = db.results.map(r => {
      const student = db.students.find(s => s.studentId === r.studentId);
      const percent = Number(r.fullMarks) > 0
        ? (Number(r.marks) / Number(r.fullMarks) * 100).toFixed(1) + "%"
        : "—";
      return row([
        esc(r.studentId), esc(student?.name || "অজানা শিক্ষার্থী"),
        esc(r.exam), esc(r.subject), esc(r.marks),
        esc(r.fullMarks), esc(percent)
      ], r.id);
    });

    return pageTitle("পরীক্ষার ফলাফল", "নম্বর সংরক্ষণ ও ফলাফল দেখুন") +
      formBox("নতুন ফলাফল যোগ করুন", fields, "ফলাফল সংরক্ষণ") +
      `<section class="scm-card"><h3>ফলাফলের তালিকা</h3>
      ${table(actionColumn(["আইডি","শিক্ষার্থী","পরীক্ষা","বিষয়","প্রাপ্ত নম্বর","পূর্ণ নম্বর","শতকরা"]), rows)}</section>`;
  }

  function reportsPage() {
    const collected = db.fees.reduce((s, f) => s + Number(f.amount || 0), 0);
    return pageTitle("রিপোর্ট", "প্রতিষ্ঠানের বর্তমান তথ্য") +
      `<section class="scm-card"><h3>সারসংক্ষেপ</h3>
      ${table(["বিবরণ","সংখ্যা/পরিমাণ"], [
        `<tr><td>মোট শিক্ষার্থী</td><td>${db.students.length}</td></tr>`,
        `<tr><td>মোট শিক্ষক</td><td>${db.teachers.length}</td></tr>`,
        `<tr><td>উপস্থিতি রেকর্ড</td><td>${db.attendance.length}</td></tr>`,
        `<tr><td>ফি জমার রেকর্ড</td><td>${db.fees.length}</td></tr>`,
        `<tr><td>মোট ফি আদায়</td><td>${money(collected)}</td></tr>`,
        `<tr><td>ফলাফল রেকর্ড</td><td>${db.results.length}</td></tr>`
      ])}
      <button class="scm-btn" data-print>রিপোর্ট প্রিন্ট করুন</button></section>`;
  }

  function backupPage() {
    return pageTitle("ব্যাকআপ", "ডেটা ফাইল হিসেবে সংরক্ষণ বা ফিরিয়ে আনুন") +
      `<section class="scm-card"><h3>ডেটা ব্যাকআপ</h3>
      <p>ব্যাকআপ ফাইল আপনার ডিভাইসে JSON ফাইল হিসেবে সংরক্ষিত হবে।</p>
      <button class="scm-btn" data-export>ব্যাকআপ ডাউনলোড</button>
      <hr><h3>ব্যাকআপ ফিরিয়ে আনুন</h3>
      <p>শুধু এই সফটওয়্যারের ব্যাকআপ JSON ফাইল নির্বাচন করুন।</p>
      <input type="file" id="backup-file" accept=".json,application/json">
      <button class="scm-btn" data-import>ব্যাকআপ ইমপোর্ট</button></section>`;
  }

  function settingsPage() {
    const s = db.settings;
    const fields = input("প্রতিষ্ঠানের নাম", "name", "text", true, s.name) +
      input("ঠিকানা", "address", "text", false, s.address) +
      input("ফোন নম্বর", "phone", "text", false, s.phone) +
      input("প্রধান শিক্ষক/অধ্যক্ষ", "principal", "text", false, s.principal);

    return pageTitle("সেটিংস", "প্রতিষ্ঠানের তথ্য পরিবর্তন করুন") +
      formBox("প্রতিষ্ঠানের তথ্য", fields, "সেটিংস সংরক্ষণ");
  }

  const renderers = {
    dashboard,
    students: studentsPage,
    teachers: teachersPage,
    attendance: attendancePage,
    fees: feesPage,
    results: resultsPage,
    reports: reportsPage,
    backup: backupPage,
    settings: settingsPage
  };

  function addStyles() {
    if ($("#scm-styles")) return;
    const style = document.createElement("style");
    style.id = "scm-styles";
    style.textContent = `
      #main { padding:20px; min-width:0; }
      .scm-heading { display:flex;justify-content:space-between;gap:12px;align-items:center;flex-wrap:wrap;margin-bottom:20px; }
      .scm-heading h2 { margin:0 0 6px;font-size:25px; }
      .scm-heading p { margin:0;color:#64748b; }
      .scm-card { background:var(--card-bg,#fff);border:1px solid #e2e8f0;border-radius:12px;padding:18px;margin:16px 0;overflow:hidden; }
      .scm-card h3 { margin:0 0 15px; }
      .scm-stats { display:grid;grid-template-columns:repeat(auto-fit,minmax(145px,1fr));gap:12px; }
      .scm-stat { padding:20px;background:#eaf5ef;border-radius:12px;display:flex;flex-direction:column;gap:10px; }
      .scm-stat span { color:#345746; }
      .scm-stat strong { font-size:27px;color:#17633c;overflow-wrap:anywhere; }
      .scm-form-grid { display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px;margin-bottom:15px; }
      .scm-field { display:flex;flex-direction:column;gap:6px;font-size:14px; }
      .scm-field input,.scm-field select,.scm-search,#backup-file { width:100%;box-sizing:border-box;padding:11px;border:1px solid #cbd5e1;border-radius:7px;background:white;color:#172033; }
      .scm-btn { border:0;border-radius:7px;padding:10px 15px;margin:3px;background:#167447;color:white;cursor:pointer;font-size:14px; }
      .scm-btn:hover { filter:brightness(.92); }
      .scm-danger { background:#b42318; }
      .scm-actions { display:flex;flex-wrap:wrap;gap:5px; }
      .scm-table-wrap { width:100%;overflow-x:auto; }
      .scm-table { width:100%;border-collapse:collapse;min-width:650px; }
      .scm-table th,.scm-table td { text-align:left;border-bottom:1px solid #e2e8f0;padding:10px;white-space:nowrap; }
      .scm-table th { background:#f1f5f9; }
      .scm-search { max-width:350px;margin:0 0 12px; }
      @media(max-width:600px) { #main { padding:12px; } .scm-card { padding:12px; } .scm-heading h2 { font-size:21px; } }
      @media print { button,.scm-form,.scm-search,#backup-file { display:none!important; } #main { padding:0; } }
    `;
    document.head.appendChild(style);
  }

  function render() {
    addStyles();
    const main = $("#main");
    if (!main) {
      console.error("School Management: #main element not found.");
      return;
    }
    main.innerHTML = (renderers[currentPage] || dashboard)();

    document.querySelectorAll("[data-page]").forEach(btn => {
      btn.setAttribute("aria-current", btn.dataset.page === currentPage ? "page" : "false");
    });
  }

  function findNavPage(button) {
    if (button.dataset.page && renderers[button.dataset.page]) return button.dataset.page;
    const label = (button.innerText || button.textContent || "").trim().toLowerCase();
    const map = [
      ["dashboard", ["dashboard", "ড্যাশবোর্ড", "হোম"]],
      ["students", ["students", "student", "শিক্ষার্থী", "ছাত্র", "ছাত্রী"]],
      ["teachers", ["teachers", "teacher", "শিক্ষক"]],
      ["attendance", ["attendance", "উপস্থিতি", "হাজিরা"]],
      ["fees", ["fees", "fee", "ফি", "পেমেন্ট", "হিসাব"]],
      ["results", ["results", "result", "ফলাফল", "রেজাল্ট"]],
      ["reports", ["reports", "report", "রিপোর্ট"]],
      ["backup", ["backup", "ব্যাকআপ"]],
      ["settings", ["settings", "setting", "সেটিংস"]]
    ];
    return map.find(([, words]) => words.some(w => label.includes(w)))?.[0];
  }

  document.addEventListener("click", event => {
    const pageButton = event.target.closest("[data-page]");
    if (pageButton && renderers[pageButton.dataset.page]) {
      currentPage = pageButton.dataset.page;
      render();
      return;
    }

    const deleteButton = event.target.closest("[data-delete]");
    if (deleteButton) {
      const type = deleteButton.dataset.type;
      const recordId = deleteButton.dataset.delete;
      if (!Array.isArray(db[type])) return;
      if (confirm("এই রেকর্ডটি মুছে ফেলতে চান?")) {
        db[type] = db[type].filter(item => item.id !== recordId);
        saveDB();
        render();
        notice("রেকর্ড মুছে ফেলা হয়েছে");
      }
      return;
    }

    const printButton = event.target.closest("[data-print]");
    if (printButton) {
      window.print();
      return;
    }

    const exportButton = event.target.closest("[data-export]");
    if (exportButton) {
      const blob = new Blob([JSON.stringify(db, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `school-backup-${today()}.json`;
      a.click();
      URL.revokeObjectURL(url);
      notice("ব্যাকআপ ডাউনলোড শুরু হয়েছে");
      return;
    }

    const importButton = event.target.closest("[data-import]");
    if (importButton) {
      const file = $("#backup-file")?.files?.[0];
      if (!file) return notice("আগে ব্যাকআপ JSON ফাইল নির্বাচন করুন");
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const data = JSON.parse(reader.result);
          const required = ["students", "teachers", "attendance", "fees", "results"];
          if (!data || !required.every(k => Array.isArray(data[k]))) {
            throw new Error("Invalid backup");
          }
          if (!confirm("বর্তমান ডেটা ব্যাকআপ দিয়ে প্রতিস্থাপন করবেন?")) return;
          db = { ...initial, ...data };
          saveDB();
          render();
          notice("ব্যাকআপ সফলভাবে ইমপোর্ট হয়েছে");
        } catch {
          notice("ফাইলটি সঠিক ব্যাকআপ JSON নয়");
        }
      };
      reader.readAsText(file);
    }
  });

  document.addEventListener("submit", event => {
    const form = event.target.closest("form[data-form]");
    if (!form) return;
    event.preventDefault();

    const data = Object.fromEntries(new FormData(form).entries());
    const page = form.dataset.form;
    const listMap = {
      students: "students",
      teachers: "teachers",
      attendance: "attendance",
      fees: "fees",
      results: "results"
    };

    if (page === "settings") {
      db.settings = { ...db.settings, ...data };
      saveDB();
      render();
      notice("সেটিংস সংরক্ষণ হয়েছে");
      return;
    }

    const listName = listMap[page];
    if (!listName) return;

    if (["students", "teachers"].includes(page)) {
      const key = page === "students" ? "studentId" : "teacherId";
      if (db[listName].some(item => item[key] === data[key])) {
        notice("এই আইডি আগে থেকেই আছে");
        return;
      }
    }

    if (page === "attendance" && !db.students.some(s => s.studentId === data.studentId)) {
      notice("এই শিক্ষার্থী আইডি পাওয়া যায়নি। আগে শিক্ষার্থী ভর্তি করুন");
      return;
    }

    if (page === "fees" && !db.students.some(s => s.studentId === data.studentId)) {
      notice("এই শিক্ষার্থী আইডি পাওয়া যায়নি। আগে শিক্ষার্থী ভর্তি করুন");
      return;
    }

    if (page === "results" && !db.students.some(s => s.studentId === data.studentId)) {
      notice("এই শিক্ষার্থী আইডি পাওয়া যায়নি। আগে শিক্ষার্থী ভর্তি করুন");
      return;
    }

    if (page === "results" && Number(data.marks) > Number(data.fullMarks)) {
      notice("প্রাপ্ত নম্বর পূর্ণ নম্বরের চেয়ে বেশি হতে পারবে না");
      return;
    }

    if (page === "fees" && Number(data.amount) <= 0) {
      notice("টাকার পরিমাণ শূন্যের বেশি হতে হবে");
      return;
    }

    if (page === "results" && (Number(data.fullMarks) <= 0 || Number(data.marks) < 0)) {
      notice("নম্বর সঠিকভাবে লিখুন");
      return;
    }

    data.id = id();
    db[listName].push(data);
    saveDB();
    render();
    notice("তথ্য সফলভাবে সংরক্ষণ হয়েছে");
  });

  document.addEventListener("click", event => {
    const button = event.target.closest("button");
    if (!button || button.dataset.page || button.dataset.delete) return;
    if (button.closest("#main")) return;

    const page = findNavPage(button);
    if (page) {
      currentPage = page;
      render();
    }
  });

  document.addEventListener("input", event => {
    const search = event.target.closest("[data-search]");
    if (!search) return;
    const query = search.value.toLowerCase();
    const rows = document.querySelectorAll(".scm-table tbody tr");
    rows.forEach(tr => {
      tr.hidden = !tr.textContent.toLowerCase().includes(query);
    });
  });

  render();
})();

