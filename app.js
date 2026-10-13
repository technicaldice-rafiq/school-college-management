JavaScript
/* School & College Management Software
   Premium Version 2.0
   LocalStorage + Backup + Cloud Sync + Accounts API
*/
(() => {
  "use strict";

  const DB_KEY = "school_college_management_v1";
  const AUTO_BACKUP_KEY = "school_college_management_auto_backup_v1";
  const PREVIOUS_BACKUP_KEY = "school_college_management_previous_backup_v1";

  const $ = (selector, root = document) => root.querySelector(selector);

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
    results: [],
    accountSalaries: [],
    accountStudentFees: [],
    accountExamFees: [],
    accountMonthlyRates: []
  };

  const clone = value => JSON.parse(JSON.stringify(value));

  function normalizeDB(data) {
    const source = data && typeof data === "object" ? data : {};

    const result = {
      ...clone(initial),
      ...source,
      settings: {
        ...initial.settings,
        ...(source.settings || {})
      }
    };

    [
      "students", "teachers", "attendance", "fees", "results",
      "accountSalaries", "accountStudentFees",
      "accountExamFees", "accountMonthlyRates"
    ].forEach(key => {
      if (!Array.isArray(result[key])) result[key] = [];
    });

    return result;
  }

  function loadDB() {
    try {
      const raw = localStorage.getItem(DB_KEY);
      return raw ? normalizeDB(JSON.parse(raw)) : clone(initial);
    } catch (error) {
      console.error("Local data load failed:", error);
      return clone(initial);
    }
  }

  let db = loadDB();
  let currentPage = "dashboard";
  let cloudTimer = null;

  function esc(value) {
    return String(value ?? "").replace(/[&<>"']/g, char => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    })[char]);
  }

  function today() {
    const date = new Date();
    return [
      date.getFullYear(),
      String(date.getMonth() + 1).padStart(2, "0"),
      String(date.getDate()).padStart(2, "0")
    ].join("-");
  }

  function id() {
    return Date.now().toString(36) +
      Math.random().toString(36).slice(2, 9);
  }

  function money(value) {
    return "৳ " + Number(value || 0).toLocaleString("en-BD", {
      maximumFractionDigits: 2
    });
  }

  function notice(message) {
    let element = $("#app-notice");

    if (!element) {
      element = document.createElement("div");
      element.id = "app-notice";
      element.setAttribute("role", "status");
      element.style.cssText =
        "position:fixed;bottom:20px;left:50%;transform:translateX(-50%);" +
        "background:#134e4a;color:white;padding:12px 18px;" +
        "border-radius:12px;z-index:99999;max-width:90vw;" +
        "box-shadow:0 5px 20px #0002;font-size:14px";
      document.body.appendChild(element);
    }

    element.textContent = message;
    element.hidden = false;
    clearTimeout(notice.timer);
    notice.timer = setTimeout(() => {
      element.hidden = true;
    }, 3500);
  }

  function saveDB() {
    const serialized = JSON.stringify(db);

    try {
      localStorage.setItem(DB_KEY, serialized);
    } catch (error) {
      console.error("Local save failed:", error);
      notice("ডেটা সংরক্ষণ করা যায়নি। স্টোরেজ খালি আছে কি না দেখুন।");
      return false;
    }

    // Automatic current and previous snapshots.
    try {
      const oldRaw = localStorage.getItem(AUTO_BACKUP_KEY);
      let oldSnapshot = null;

      try {
        oldSnapshot = oldRaw ? JSON.parse(oldRaw) : null;
      } catch (_) {}

      if (!oldSnapshot || JSON.stringify(oldSnapshot.data) !== serialized) {
        if (oldRaw && oldSnapshot?.data) {
          localStorage.setItem(PREVIOUS_BACKUP_KEY, oldRaw);
        }

        localStorage.setItem(AUTO_BACKUP_KEY, JSON.stringify({
          savedAt: new Date().toISOString(),
          data: db
        }));
      }
    } catch (error) {
      console.warn("Automatic backup failed:", error);
    }

    // Keep the existing cloud-sync integration.
    if (
      navigator.onLine &&
      window.schoolCloudSyncReady &&
      window.schoolCloudSync &&
      typeof window.schoolCloudSync.save === "function"
    ) {
      clearTimeout(cloudTimer);

      cloudTimer = setTimeout(async () => {
        try {
          await window.schoolCloudSync.save(db);
          window.schoolCloudStatus = "connected";
        } catch (error) {
          console.error("Cloud save failed:", error);
          window.schoolCloudStatus = "error";
        }
      }, 800);
    }

    return true;
  }

  const pageNames = {
    dashboard: "ড্যাশবোর্ড",
    students: "শিক্ষার্থী",
    teachers: "শিক্ষক",
    attendance: "উপস্থিতি",
    fees: "ফি আদায়",
    results: "পরীক্ষার ফলাফল",
    reports: "রিপোর্ট",
    backup: "ব্যাকআপ ও সিঙ্ক",
    settings: "সেটিংস"
  };

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
        ${options.map(option =>
          `<option value="${esc(option)}">${esc(option)}</option>`
        ).join("")}
      </select>
    </label>`;
  }

  function formBox(title, fields, buttonText = "সংরক্ষণ") {
    return `<section class="scm-card">
      <h3>${esc(title)}</h3>
      <form class="scm-form" data-form="${esc(currentPage)}">
        <div class="scm-form-grid">${fields}</div>
        <button class="scm-btn" type="submit">${esc(buttonText)}</button>
      </form>
    </section>`;
  }

  function table(headers, rows, emptyText = "কোনো তথ্য পাওয়া যায়নি") {
    return `<div class="scm-table-wrap">
      <table class="scm-table">
        <thead><tr>${headers.map(header =>
          `<th>${esc(header)}</th>`
        ).join("")}</tr></thead>
        <tbody>${rows.length ? rows.join("") :
          `<tr><td colspan="${headers.length}" class="scm-empty">${esc(emptyText)}</td></tr>`
        }</tbody>
      </table>
    </div>`;
  }

  function row(cells, recordId = "", type = currentPage) {
    const action = recordId
      ? `<td><button type="button" class="scm-btn scm-danger"
          data-delete="${esc(recordId)}" data-type="${esc(type)}">মুছুন</button></td>`
      : "";

    return `<tr>${cells.map(cell => `<td>${cell}</td>`).join("")}${action}</tr>`;
  }

  function actionHeaders(headers) {
    return [...headers, "কাজ"];
  }

  function pageTitle(title, description = "") {
    return `<div class="scm-heading">
      <div><h2>${esc(title)}</h2><p>${esc(description)}</p></div>
      <span class="scm-date">${esc(today())}</span>
    </div>`;
  }

  function cardStat(label, value, hint = "") {
    return `<article class="scm-stat">
      <span>${esc(label)}</span>
      <strong>${esc(value)}</strong>
      ${hint ? `<small>${esc(hint)}</small>` : ""}
    </article>`;
  }

  function quickButton(page) {
    return `<button type="button" class="scm-btn"
      data-page="${esc(page)}">${esc(pageNames[page] || page)}</button>`;
  }

  function dashboard() {
    const date = today();

    const present = db.attendance.filter(item =>
      item.date === date && item.status === "Present"
    ).length;

    const absent = db.attendance.filter(item =>
      item.date === date && item.status === "Absent"
    ).length;

    const totalCollected = db.fees.reduce(
      (sum, fee) => sum + Number(fee.amount || 0), 0
    );

    const todayCollected = db.fees
      .filter(fee => fee.date === date)
      .reduce((sum, fee) => sum + Number(fee.amount || 0), 0);

    const recentFees = [...db.fees]
      .sort((a, b) => String(b.date).localeCompare(String(a.date)))
      .slice(0, 5);

    const feeRows = recentFees.map(fee => {
      const student = db.students.find(item =>
        item.studentId === fee.studentId
      );

      return `<tr>
        <td>${esc(fee.date)}</td>
        <td>${esc(student?.name || fee.studentId || "—")}</td>
        <td>${esc(fee.feeType || "ফি")}</td>
        <td>${money(fee.amount)}</td>
      </tr>`;
    });

    return pageTitle("প্রতিষ্ঠানের ড্যাশবোর্ড",
      "আপনার স্কুল ও কলেজের বর্তমান কার্যক্রম এক নজরে") +

      `<div class="scm-welcome">
        <div>
          <h3>স্বাগতম, ${esc(db.settings.name || "School & College")}</h3>
          <p>শিক্ষার্থী, উপস্থিতি, ফি এবং ফলাফল পরিচালনা করুন।</p>
        </div>
        <span class="scm-online">${navigator.onLine ? "অনলাইন" : "অফলাইন"}</span>
      </div>

      <div class="scm-stats">
        ${cardStat("মোট শিক্ষার্থী", db.students.length, "নিবন্ধিত শিক্ষার্থী")}
        ${cardStat("মোট শিক্ষক", db.teachers.length, "নিবন্ধিত শিক্ষক")}
        ${cardStat("আজ উপস্থিত", present, `অনুপস্থিত: ${absent}`)}
        ${cardStat("মোট ফি আদায়", money(totalCollected), "সব রেকর্ড মিলিয়ে")}
        ${cardStat("আজকের আদায়", money(todayCollected), "আজকের তারিখ অনুযায়ী")}
        ${cardStat("ফলাফল রেকর্ড", db.results.length, "সংরক্ষিত ফলাফল")}
      </div>

      <section class="scm-card">
        <h3>দ্রুত কাজ</h3>
        <div class="scm-actions">
          ${["students", "teachers", "attendance", "fees",
             "results", "reports", "backup", "settings"]
            .map(quickButton).join("")}
        </div>
      </section>

      <section class="scm-card">
        <h3>সাম্প্রতিক ফি আদায়</h3>
        ${table(["তারিখ", "শিক্ষার্থী", "ফি-এর ধরন", "পরিমাণ"], feeRows)}
        <div class="scm-actions">${quickButton("fees")}${quickButton("reports")}</div>
      </section>

      <section class="scm-card">
        <h3>প্রতিষ্ঠানের তথ্য</h3>
        <div class="scm-info-grid">
          <p><b>নাম:</b> ${esc(db.settings.name || "সেট করা হয়নি")}</p>
          <p><b>ঠিকানা:</b> ${esc(db.settings.address || "সেট করা হয়নি")}</p>
          <p><b>ফোন:</b> ${esc(db.settings.phone || "সেট করা হয়নি")}</p>
          <p><b>প্রধান শিক্ষক/অধ্যক্ষ:</b> ${esc(db.settings.principal || "সেট করা হয়নি")}</p>
        </div>
      </section>`;
  }

  function studentsPage() {
    const fields =
      input("শিক্ষার্থীর নাম", "name", "text", true) +
      input("ভর্তি/আইডি নম্বর", "studentId", "text", true) +
      input("শ্রেণি", "className", "text", true) +
      input("রোল নম্বর", "roll", "text", true) +
      input("মোবাইল", "phone") +
      input("অভিভাবকের নাম", "guardian") +
      input("ভর্তির তারিখ", "admissionDate", "date", false, today());

    const rows = db.students.map(student => row([
      esc(student.name),
      esc(student.studentId),
      esc(student.className),
      esc(student.roll),
      esc(student.phone || ""),
      esc(student.guardian || ""),
      esc(student.admissionDate || "")
    ], student.id));

    return pageTitle("শিক্ষার্থী ব্যবস্থাপনা", "ভর্তি, তথ্য ও শিক্ষার্থীর তালিকা") +
      formBox("নতুন শিক্ষার্থী ভর্তি", fields, "শিক্ষার্থী সংরক্ষণ") +
      `<section class="scm-card">
        <h3>শিক্ষার্থীর তালিকা (${db.students.length})</h3>
        <input class="scm-search" data-search="students"
          placeholder="নাম, আইডি, শ্রেণি বা রোল দিয়ে খুঁজুন">
        ${table(actionHeaders([
          "নাম", "আইডি", "শ্রেণি", "রোল", "মোবাইল", "অভিভাবক", "ভর্তির তারিখ"
        ]), rows)}
      </section>`;
  }

  function teachersPage() {
    const fields =
      input("শিক্ষকের নাম", "name", "text", true) +
      input("শিক্ষক আইডি", "teacherId", "text", true) +
      input("বিষয়/পদবি", "subject", "text", true) +
      input("মোবাইল", "phone") +
      input("বেতন", "salary", "number");

    const rows = db.teachers.map(teacher => row([
      esc(teacher.name),
      esc(teacher.teacherId),
      esc(teacher.subject),
      esc(teacher.phone || ""),
      money(teacher.salary)
    ], teacher.id));

    return pageTitle("শিক্ষক ব্যবস্থাপনা", "শিক্ষক নিবন্ধন ও তথ্য") +
      formBox("নতুন শিক্ষক যোগ করুন", fields, "শিক্ষক সংরক্ষণ") +
      `<section class="scm-card">
        <h3>শিক্ষকের তালিকা (${db.teachers.length})</h3>
        <input class="scm-search" data-search="teachers"
          placeholder="শিক্ষক খুঁজুন">
        ${table(actionHeaders(["নাম", "আইডি", "বিষয়/পদবি", "মোবাইল", "বেতন"]), rows)}
      </section>`;
  }

  function attendancePage() {
    const fields =
      input("তারিখ", "date", "date", true, today()) +
      input("শিক্ষার্থী আইডি", "studentId", "text", true) +
      select("উপস্থিতি", "status", ["Present", "Absent", "Late"]);

    const rows = db.attendance.map(item => {
      const student = db.students.find(s => s.studentId === item.studentId);

      return row([
        esc(item.date),
        esc(item.studentId),
        esc(student?.name || "অজানা শিক্ষার্থী"),
        esc(item.status)
      ], item.id);
    });

    return pageTitle("উপস্থিতি ব্যবস্থাপনা", "শিক্ষার্থীর দৈনিক উপস্থিতি নথিভুক্ত করুন") +
      formBox("উপস্থিতি রেকর্ড", fields, "উপস্থিতি সংরক্ষণ") +
      `<section class="scm-card">
        <h3>উপস্থিতির তালিকা</h3>
        <input class="scm-search" data-search="attendance"
          placeholder="তারিখ, আইডি বা নাম দিয়ে খুঁজুন">
        ${table(actionHeaders(["তারিখ", "আইডি", "শিক্ষার্থী", "অবস্থা"]), rows)}
      </section>`;
  }

  function feesPage() {
    const fields =
      input("তারিখ", "date", "date", true, today()) +
      input("শিক্ষার্থী আইডি", "studentId", "text", true) +
      input("ফি-এর ধরন", "feeType", "text", true) +
      input("টাকার পরিমাণ", "amount", "number", true) +
      input("রসিদ নম্বর", "receipt");

    const total = db.fees.reduce(
      (sum, fee) => sum + Number(fee.amount || 0), 0
    );

    const todayTotal = db.fees
      .filter(fee => fee.date === today())
      .reduce((sum, fee) => sum + Number(fee.amount || 0), 0);

    const rows = db.fees.map(fee => {
      const student = db.students.find(s => s.studentId === fee.studentId);

      return row([
        esc(fee.date),
        esc(fee.studentId),
        esc(student?.name || "অজানা শিক্ষার্থী"),
        esc(fee.feeType),
        money(fee.amount),
        esc(fee.receipt || "")
      ], fee.id);
    });

    return pageTitle("ফি ও হিসাব", "ফি জমা, রসিদ এবং আদায়ের রেকর্ড") +
      `<div class="scm-stats">
        ${cardStat("মোট আদায়", money(total))}
        ${cardStat("আজকের আদায়", money(todayTotal))}
        ${cardStat("মোট রসিদ", db.fees.length)}
      </div>` +
      formBox("নতুন ফি জমা", fields, "ফি সংরক্ষণ") +
      `<section class="scm-card">
        <h3>ফি আদায়ের তালিকা</h3>
        <input class="scm-search" data-search="fees"
          placeholder="শিক্ষার্থী, তারিখ বা রসিদ দিয়ে খুঁজুন">
        ${table(actionHeaders([
          "তারিখ", "আইডি", "শিক্ষার্থী", "ফি-এর ধরন", "পরিমাণ", "রসিদ"
        ]), rows)}
      </section>`;
  }

  function resultsPage() {
    const fields =
      input("শিক্ষার্থী আইডি", "studentId", "text", true) +
      input("পরীক্ষার নাম", "exam", "text", true) +
      input("বিষয়", "subject", "text", true) +
      input("পূর্ণ নম্বর", "fullMarks", "number", true) +
      input("প্রাপ্ত নম্বর", "marks", "number", true);

    const rows = db.results.map(result => {
      const student = db.students.find(s => s.studentId === result.studentId);
      const full = Number(result.fullMarks);
      const marks = Number(result.marks);
      const percent = full > 0 ? (marks / full * 100).toFixed(1) + "%" : "—";

      return row([
        esc(result.studentId),
        esc(student?.name || "অজানা শিক্ষার্থী"),
        esc(result.exam),
        esc(result.subject),
        esc(result.marks),
        esc(result.fullMarks),
        esc(percent)
      ], result.id);
    });

    return pageTitle("পরীক্ষার ফলাফল", "নম্বর সংরক্ষণ ও শতকরা ফলাফল") +
      formBox("নতুন ফলাফল যোগ করুন", fields, "ফলাফল সংরক্ষণ") +
      `<section class="scm-card">
        <h3>ফলাফলের তালিকা</h3>
        <input class="scm-search" data-search="results"
          placeholder="আইডি, পরীক্ষা বা বিষয় দিয়ে খুঁজুন">
        ${table(actionHeaders([
          "আইডি", "শিক্ষার্থী", "পরীক্ষা", "বিষয়",
          "প্রাপ্ত নম্বর", "পূর্ণ নম্বর", "শতকরা"
        ]), rows)}
      </section>`;
  }

  function reportsPage() {
    const totalFees = db.fees.reduce(
      (sum, item) => sum + Number(item.amount || 0), 0
    );

    const todayFees = db.fees.filter(item => item.date === today())
      .reduce((sum, item) => sum + Number(item.amount || 0), 0);

    const rows = [
      `<tr><td>মোট শিক্ষার্থী</td><td>${db.students.length}</td></tr>`,
      `<tr><td>মোট শিক্ষক</td><td>${db.teachers.length}</td></tr>`,
      `<tr><td>উপস্থিতির রেকর্ড</td><td>${db.attendance.length}</td></tr>`,
      `<tr><td>ফি জমার রেকর্ড</td><td>${db.fees.length}</td></tr>`,
      `<tr><td>আজকের ফি আদায়</td><td>${money(todayFees)}</td></tr>`,
      `<tr><td>সর্বমোট ফি আদায়</td><td>${money(totalFees)}</td></tr>`,
      `<tr><td>ফলাফল রেকর্ড</td><td>${db.results.length}</td></tr>`
    ];

    return pageTitle("রিপোর্ট", "প্রতিষ্ঠানের তথ্য ও হিসাবের সারসংক্ষেপ") +
      `<section class="scm-card">
        <h3>প্রতিষ্ঠানের সারসংক্ষেপ</h3>
        ${table(["বিবরণ", "সংখ্যা/পরিমাণ"], rows)}
        <div class="scm-actions">
          <button type="button" class="scm-btn" data-print>রিপোর্ট প্রিন্ট করুন</button>
          <button type="button" class="scm-btn" data-export>JSON ব্যাকআপ ডাউনলোড</button>
        </div>
      </section>`;
  }

  function backupDate(raw) {
    try {
      const snapshot = JSON.parse(raw);
      return snapshot.savedAt
        ? new Date(snapshot.savedAt).toLocaleString("bn-BD")
        : "তারিখ নেই";
    } catch (_) {
      return "ব্যাকআপ নেই";
    }
  }

  function backupPage() {
    const auto = localStorage.getItem(AUTO_BACKUP_KEY);
    const previous = localStorage.getItem(PREVIOUS_BACKUP_KEY);
    const status = !navigator.onLine
      ? "ইন্টারনেট বন্ধ"
      : (window.schoolCloudStatus || "যাচাই করা হয়নি");

    return pageTitle("ব্যাকআপ ও সিঙ্ক", "ডেটা সংরক্ষণ এবং প্রয়োজনে ফিরিয়ে আনুন") +
      `<section class="scm-card">
        <h3>স্বয়ংক্রিয় ব্যাকআপ</h3>
        <p>সর্বশেষ ব্যাকআপ: <b>${esc(auto ? backupDate(auto) : "এখনও তৈরি হয়নি")}</b></p>
        <p>আগের ব্যাকআপ: <b>${esc(previous ? backupDate(previous) : "এখনও নেই")}</b></p>
        <div class="scm-actions">
          <button type="button" class="scm-btn" data-restore-auto>সর্বশেষ ব্যাকআপ ফিরিয়ে আনুন</button>
          <button type="button" class="scm-btn" data-restore-previous>আগের ব্যাকআপ ফিরিয়ে আনুন</button>
        </div>
        <hr>
        <h3>ফাইল ব্যাকআপ</h3>
        <button type="button" class="scm-btn" data-export>JSON ব্যাকআপ ডাউনলোড</button>
        <hr>
        <h3>অনলাইন–অফলাইন সিঙ্ক</h3>
        <p>ক্লাউডের অবস্থা: <b>${esc(status)}</b></p>
        <button type="button" class="scm-btn" data-cloud-sync>এখনই ক্লাউড সিঙ্ক করুন</button>
        <hr>
        <h3>JSON ফাইল থেকে ডেটা ফিরিয়ে আনুন</h3>
        <input type="file" id="backup-file" accept=".json,application/json">
        <button type="button" class="scm-btn" data-import>JSON ফাইল ইমপোর্ট</button>
        <p class="scm-warning">ইমপোর্ট করলে বর্তমান ডেটা প্রতিস্থাপিত হতে পারে। আগে ব্যাকআপ রাখুন।</p>
      </section>`;
  }

  function settingsPage() {
    const settings = db.settings;

    const fields =
      input("প্রতিষ্ঠানের নাম", "name", "text", true, settings.name) +
      input("ঠিকানা", "address", "text", false, settings.address) +
      input("ফোন নম্বর", "phone", "text", false, settings.phone) +
      input("প্রধান শিক্ষক/অধ্যক্ষ", "principal", "text", false, settings.principal);

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
    if ($("#scm-premium-styles")) return;

    const style = document.createElement("style");
    style.id = "scm-premium-styles";
    style.textContent = `
      #main { min-width:0; padding:22px; }
      .scm-heading { display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;margin-bottom:20px; }
      .scm-heading h2 { margin:0 0 5px;font-size:25px;font-weight:850;color:#172033; }
      .scm-heading p { margin:0;color:#64748b;font-size:13px; }
      .scm-date { color:#64748b;font-size:12px; }
      .scm-welcome { display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;background:linear-gradient(120deg,#115e59,#0f766e,#0e7490);color:white;padding:22px;border-radius:16px;margin-bottom:18px; }
      .scm-welcome h3 { margin:0 0 6px;font-size:20px; }
      .scm-welcome p { margin:0;font-size:13px;opacity:.9; }
      .scm-online { padding:5px 10px;background:#ffffff20;border:1px solid #ffffff40;border-radius:30px;font-size:12px; }
      .scm-card { background:#fff;border:1px solid #e2e8f0;border-radius:16px;padding:19px;margin:17px 0;box-shadow:0 5px 20px #0f172a08;min-width:0; }
      .scm-card h3 { margin:0 0 15px;font-size:17px;color:#172033; }
      .scm-stats { display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:13px;margin:18px 0; }
      .scm-stat { min-width:0;display:flex;flex-direction:column;gap:9px;padding:18px;background:linear-gradient(145deg,#fff,#f0fdfa);border:1px solid #ccfbf1;border-radius:14px; }
      .scm-stat span { color:#475569;font-size:13px;font-weight:650; }
      .scm-stat strong { font-size:25px;color:#115e59;overflow-wrap:anywhere; }
      .scm-stat small { color:#64748b;font-size:11px; }
      .scm-form-grid { display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:13px;margin-bottom:15px; }
      .scm-field { display:flex;flex-direction:column;gap:6px;font-size:13px;font-weight:700;color:#334155;min-width:0; }
      .scm-field input,.scm-field select,.scm-search,#backup-file { width:100%;min-width:0;box-sizing:border-box;padding:11px 12px;border:1px solid #cbd5e1;border-radius:10px;background:white;color:#172033;font:inherit;font-weight:400; }
      .scm-field input:focus,.scm-field select:focus,.scm-search:focus { outline:0;border-color:#14b8a6;box-shadow:0 0 0 3px #14b8a620; }
      .scm-btn { border:0;border-radius:9px;padding:10px 14px;margin:3px;background:#0f766e;color:white;cursor:pointer;font-size:13px;font-weight:700; }
      .scm-btn:hover { background:#115e59; }
      .scm-btn:disabled { opacity:.6;cursor:wait; }
      .scm-danger { background:#b91c1c; }
      .scm-danger:hover { background:#991b1b; }
      .scm-actions { display:flex;flex-wrap:wrap;gap:6px; }
      .scm-table-wrap { width:100%;overflow-x:auto;border:1px solid #e2e8f0;border-radius:11px;-webkit-overflow-scrolling:touch; }
      .scm-table { width:100%;border-collapse:collapse;min-width:620px; }
      .scm-table th,.scm-table td { text-align:left;border-bottom:1px solid #e2e8f0;padding:11px;font-size:13px;vertical-align:middle; }
      .scm-table th { background:#f8fafc;color:#475569;font-weight:800;white-space:nowrap; }
      .scm-table tbody tr:hover { background:#f0fdfa; }
      .scm-table tbody tr:last-child td { border-bottom:0; }
      .scm-empty { text-align:center;color:#64748b;padding:22px!important; }
      .scm-search { max-width:420px;margin:0 0 12px; }
      .scm-info-grid { display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:4px 18px; }
      .scm-info-grid p { overflow-wrap:anywhere; }
      .scm-warning { margin-top:12px;color:#92400e;background:#fffbeb;border:1px solid #fde68a;padding:10px;border-radius:9px;font-size:12px; }
      #app-notice { text-align:center; }
      @media(max-width:900px) { #main { padding:16px; } .scm-stats { grid-template-columns:repeat(2,minmax(0,1fr)); } }
      @media(max-width:600px) { #main { padding:12px; } .scm-card { padding:13px; } .scm-heading h2 { font-size:21px; } .scm-form-grid,.scm-info-grid { grid-template-columns:minmax(0,1fr); } .scm-stat { padding:14px; } .scm-stat strong { font-size:22px; } .scm-welcome { padding:17px; } }
      @media(max-width:360px) { .scm-stats { grid-template-columns:minmax(0,1fr); } }
      @media print { body { background:#fff!important; } #main { padding:0!important; } .scm-btn,.scm-form,.scm-search,#backup-file,.scm-actions { display:none!important; } .scm-card,.scm-stat { box-shadow:none!important;break-inside:avoid; } }
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

    const renderer = renderers[currentPage] || dashboard;
    main.innerHTML = renderer();

    document.querySelectorAll("[data-page]").forEach(button => {
      const active = button.dataset.page === currentPage;
      button.classList.toggle("active", active);
      button.setAttribute("aria-current", active ? "page" : "false");
    });
  }

  function mergeLists(localList, remoteList, key) {
    const merged = new Map();

    (remoteList || []).forEach(item => {
      if (item && item[key] != null) merged.set(item[key], item);
    });

    (localList || []).forEach(item => {
      if (item && item[key] != null && !merged.has(item[key])) {
        merged.set(item[key], item);
      }
    });

    return Array.from(merged.values());
  }

  function validBackup(data) {
    return !!data &&
      typeof data === "object" &&
      ["students", "teachers", "attendance", "fees", "results"]
        .every(key => Array.isArray(data[key]));
  }

  function downloadBackup() {
    const payload = {
      format: "school-college-management-backup",
      version: 2,
      savedAt: new Date().toISOString(),
      data: db
    };

    const blob = new Blob(
      [JSON.stringify(payload, null, 2)],
      { type: "application/json" }
    );

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `school-backup-${today()}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();

    setTimeout(() => URL.revokeObjectURL(url), 1000);
    notice("JSON ব্যাকআপ ডাউনলোড শুরু হয়েছে");
  }

  function restoreData(data) {
    if (!validBackup(data)) {
      notice("ব্যাকআপ ফাইলের কাঠামো সঠিক নয়");
      return false;
    }

    db = normalizeDB(data);

    if (!saveDB()) return false;

    render();
    notice("ব্যাকআপ সফলভাবে ফিরিয়ে আনা হয়েছে");
    return true;
  }

  async function manualCloudSync(button) {
    if (!navigator.onLine) {
      notice("আগে ইন্টারনেট চালু করুন");
      return;
    }

    const cloud = window.schoolCloudSync;

    if (!cloud ||
        typeof cloud.load !== "function" ||
        typeof cloud.save !== "function") {
      notice("ক্লাউড সিঙ্ক ব্যবস্থা পাওয়া যায়নি");
      return;
    }

    button.disabled = true;
    const oldText = button.textContent;
    button.textContent = "সিঙ্ক হচ্ছে...";

    try {
      const remote = await cloud.load();

      if (remote && validBackup(remote)) {
        // Keep local and remote records; don't blindly discard local data.
        db = normalizeDB({
          ...remote,
          settings: { ...(remote.settings || {}), ...db.settings },
          students: mergeLists(db.students, remote.students, "studentId"),
          teachers: mergeLists(db.teachers, remote.teachers, "teacherId"),
          attendance: mergeLists(db.attendance, remote.attendance, "id"),
          fees: mergeLists(db.fees, remote.fees, "id"),
          results: mergeLists(db.results, remote.results, "id"),
          accountSalaries: mergeLists(db.accountSalaries, remote.accountSalaries, "id"),
          accountStudentFees: mergeLists(db.accountStudentFees, remote.accountStudentFees, "id"),
          accountExamFees: mergeLists(db.accountExamFees, remote.accountExamFees, "id"),
          accountMonthlyRates: mergeLists(db.accountMonthlyRates, remote.accountMonthlyRates, "id")
        });

        saveDB();
      }

      await cloud.save(db);
      window.schoolCloudStatus = "connected";
      render();
      notice("ক্লাউড সিঙ্ক সম্পন্ন হয়েছে");
    } catch (error) {
      console.error("Cloud sync failed:", error);
      window.schoolCloudStatus = "error";
      notice("ক্লাউড সিঙ্ক হয়নি। লগইন ও ইন্টারনেট পরীক্ষা করুন।");
    } finally {
      button.disabled = false;
      button.textContent = oldText;
    }
  }

  document.addEventListener("click", async event => {
    const target = event.target;
    if (!(target instanceof Element)) return;

    const pageButton = target.closest("[data-page]");
    if (pageButton && renderers[pageButton.dataset.page]) {
      currentPage = pageButton.dataset.page;
      render();
      return;
    }

    const deleteButton = target.closest("[data-delete]");
    if (deleteButton) {
      const type = deleteButton.dataset.type;
      const recordId = deleteButton.dataset.delete;

      if (!Array.isArray(db[type])) return;

      if (confirm("এই রেকর্ডটি মুছে ফেলতে চান?")) {
        db[type] = db[type].filter(item => item.id !== recordId);
        if (saveDB()) {
          render();
          notice("রেকর্ড মুছে ফেলা হয়েছে");
        }
      }
      return;
    }

    if (target.closest("[data-print]")) {
      window.print();
      return;
    }

    if (target.closest("[data-export]")) {
      downloadBackup();
      return;
    }

    const restoreAuto = target.closest("[data-restore-auto]");
    const restorePrevious = target.closest("[data-restore-previous]");

    if (restoreAuto || restorePrevious) {
      const key = restoreAuto ? AUTO_BACKUP_KEY : PREVIOUS_BACKUP_KEY;
      const raw = localStorage.getItem(key);

      if (!raw) {
        notice("ব্যাকআপ পাওয়া যায়নি");
        return;
      }

      try {
        const snapshot = JSON.parse(raw);
        const data = snapshot.data;

        if (!validBackup(data)) {
          notice("ব্যাকআপ ফাইল সঠিক নয়");
          return;
        }

        if (!confirm("বর্তমান তথ্য ব্যাকআপ দিয়ে প্রতিস্থাপন করবেন? আগে JSON ব্যাকআপ রাখুন।")) {
          return;
        }

        restoreData(data);
      } catch (error) {
        console.error(error);
        notice("ব্যাকআপ ফিরিয়ে আনা যায়নি");
      }
      return;
    }

    const cloudButton = target.closest("[data-cloud-sync]");
    if (cloudButton) {
      await manualCloudSync(cloudButton);
      return;
    }

    const importButton = target.closest("[data-import]");
    if (importButton) {
      const file = $("#backup-file")?.files?.[0];

      if (!file) {
        notice("আগে JSON ব্যাকআপ ফাইল নির্বাচন করুন");
        return;
      }

      const reader = new FileReader();

      reader.onload = () => {
        try {
          const parsed = JSON.parse(reader.result);
          // Accept both the old raw database format and the new wrapper.
          const data = parsed?.data || parsed;

          if (!validBackup(data)) {
            notice("ফাইলটি সঠিক School Management ব্যাকআপ নয়");
            return;
          }

          if (!confirm("বর্তমান ডেটা নির্বাচিত ব্যাকআপ দিয়ে প্রতিস্থাপন করবেন?")) {
            return;
          }

          restoreData(data);
        } catch (error) {
          console.error(error);
          notice("JSON ফাইল পড়া যায়নি");
        }
      };

      reader.onerror = () => notice("ফাইল পড়তে সমস্যা হয়েছে");
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
      if (saveDB()) {
        render();
        notice("সেটিংস সংরক্ষণ হয়েছে");
      }
      return;
    }

    const listName = listMap[page];
    if (!listName) return;

    if (page === "students" || page === "teachers") {
      const key = page === "students" ? "studentId" : "teacherId";
      const identifier = String(data[key] || "").trim();

      if (!identifier) {
        notice("আইডি নম্বর লিখুন");
        return;
      }

      if (db[listName].some(item =>
        String(item[key]).trim() === identifier
      )) {
        notice("এই আইডি আগে থেকেই আছে");
        return;
      }

      data[key] = identifier;
    }

    if (["attendance", "fees", "results"].includes(page)) {
      const studentExists = db.students.some(student =>
        String(student.studentId).trim() === String(data.studentId).trim()
      );

      if (!studentExists) {
        notice("এই শিক্ষার্থী আইডি পাওয়া যায়নি। আগে শিক্ষার্থী ভর্তি করুন।");
        return;
      }
    }

    if (page === "fees" && Number(data.amount) <= 0) {
      notice("টাকার পরিমাণ শূন্যের বেশি হতে হবে");
      return;
    }

    if (page === "results") {
      const full = Number(data.fullMarks);
      const marks = Number(data.marks);

      if (full <= 0 || marks < 0 || marks > full) {
        notice("প্রাপ্ত নম্বর ০ থেকে পূর্ণ নম্বরের মধ্যে হতে হবে");
        return;
      }
    }

    if (page === "teachers" && data.salary && Number(data.salary) < 0) {
      notice("বেতন ঋণাত্মক হতে পারে না");
      return;
    }

    data.id = id();
    db[listName].push(data);

    if (saveDB()) {
      render();
      notice("তথ্য সফলভাবে সংরক্ষণ হয়েছে");
    }
  });

  document.addEventListener("input", event => {
    const search = event.target.closest("[data-search]");
    if (!search) return;

    const query = search.value.toLocaleLowerCase();
    const tableElement = search.parentElement?.querySelector("tbody");
    if (!tableElement) return;

    tableElement.querySelectorAll("tr").forEach(tr => {
      tr.hidden = !tr.textContent.toLocaleLowerCase().includes(query);
    });
  });

  // Preserve the existing cloud event integration.
  window.addEventListener("school:cloud-loaded", event => {
    try {
      const remote = event.detail;
      if (!remote || !validBackup(remote)) {
        notice("অনলাইন ডেটার কাঠামো সঠিক নয়");
        return;
      }

      db = normalizeDB({
        ...remote,
        settings: { ...(remote.settings || {}), ...db.settings },
        students: mergeLists(db.students, remote.students, "studentId"),
        teachers: mergeLists(db.teachers, remote.teachers, "teacherId"),
        attendance: mergeLists(db.attendance, remote.attendance, "id"),
        fees: mergeLists(db.fees, remote.fees, "id"),
        results: mergeLists(db.results, remote.results, "id"),
        accountSalaries: mergeLists(db.accountSalaries, remote.accountSalaries, "id"),
        accountStudentFees: mergeLists(db.accountStudentFees, remote.accountStudentFees, "id"),
        accountExamFees: mergeLists(db.accountExamFees, remote.accountExamFees, "id"),
        accountMonthlyRates: mergeLists(db.accountMonthlyRates, remote.accountMonthlyRates, "id")
      });

      saveDB();
      render();
      notice("অনলাইন ডেটা লোড হয়েছে");
    } catch (error) {
      console.error("Cloud data load failed:", error);
      notice("অনলাইন ডেটা লোড করা যায়নি");
    }
  });

  window.addEventListener("online", () => {
    window.schoolCloudStatus = window.schoolCloudSync ? "available" : "offline-mode";
  });

  window.addEventListener("offline", () => {
    window.schoolCloudStatus = "offline";
  });

  // IMPORTANT: Keep these APIs for accounts.js and other modules.
  window.schoolApp = {
    getData: () => db,
    save: saveDB,
    render,
    registerPage: (name, title, renderer) => {
      if (typeof renderer !== "function") return;
      pageNames[name] = title;
      renderers[name] = renderer;
    },
    setPage: name => {
      if (renderers[name]) {
        currentPage = name;
        render();
      }
    },
    esc,
    money,
    today,
    id,
    notice
  };

  render();
})();
