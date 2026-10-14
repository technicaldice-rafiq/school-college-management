
/* Accounts & Fees - School & College Management */
(() => {
  "use strict";

  const api = window.schoolApp;

  if (!api) {
    console.error("School app connection not found.");
    return;
  }

  const arrayNames = [
    "accountSalaries",
    "accountStudentFees",
    "accountExamFees",
    "accountMonthlyRates"
  ];

  function getDB() {
    const db = api.getData();
    arrayNames.forEach(name => {
      if (!Array.isArray(db[name])) db[name] = [];
    });
    return db;
  }

  function esc(value) {
    return String(value ?? "").replace(/[&<>"']/g, ch => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    })[ch]);
  }

  function money(value) {
    return Number(value || 0).toLocaleString("en-BD", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }

  function today() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }

  function currentMonth() {
    return today().slice(0, 7);
  }

  function makeId() {
    return api.id ? api.id() : String(Date.now());
  }

  function saveAndRender(message) {
    api.save();
    api.render();
    if (message) {
      if (api.notice) api.notice(message);
      else alert(message);
    }
  }

  function studentOptions(selected = "") {
    const db = getDB();
    return `<option value="">শিক্ষার্থী নির্বাচন করুন</option>` +
      db.students.map(s => `
        <option value="${esc(s.studentId)}" ${s.studentId === selected ? "selected" : ""}>
          ${esc(s.name)} — রোল: ${esc(s.roll || "-")} — আইডি: ${esc(s.studentId)}
        </option>`).join("");
  }

  function studentName(studentId) {
    const s = getDB().students.find(x => String(x.studentId) === String(studentId));
    return s ? s.name : "অজানা শিক্ষার্থী";
  }

  function institute() {
    const s = getDB().settings || {};
    return {
      name: s.name || "প্রতিষ্ঠানের নাম সেটিংসে দিন",
      address: s.address || "",
      phone: s.phone || ""
    };
  }

  function printDocument(title, rows, recordNo) {
    const inst = institute();
    const w = window.open("", "_blank", "width=800,height=700");

    if (!w) {
      alert("প্রিন্ট খুলতে বাধা দেওয়া হয়েছে। ব্রাউজারের pop-up অনুমতি দিন।");
      return;
    }

    w.document.write(`<!doctype html>
<html lang="bn">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title>
<style>
body{font-family:Arial,sans-serif;color:#111;padding:24px}
.paper{max-width:700px;margin:auto;border:1px solid #444;padding:24px}
h2,h3,p{text-align:center;margin:7px 0}
hr{margin:18px 0}
table{width:100%;border-collapse:collapse;margin-top:20px}
td{padding:10px;border:1px solid #aaa}
td:first-child{width:40%;font-weight:bold}
.sign{display:flex;justify-content:space-between;margin-top:65px}
@media print{button{display:none}.paper{border:0}}
</style>
</head>
<body>
<div class="paper">
<h2>${esc(inst.name)}</h2>
<p>${esc(inst.address)}</p>
<p>মোবাইল: ${esc(inst.phone)}</p>
<hr>
<h3>${esc(title)}</h3>
<p>রসিদ/স্লিপ নং: ${esc(recordNo)}</p>
<table>
${rows.map(r => `<tr><td>${esc(r[0])}</td><td>${esc(r[1])}</td></tr>`).join("")}
</table>
<div class="sign"><span>গ্রহণকারীর স্বাক্ষর</span><span>প্রতিষ্ঠান প্রধানের স্বাক্ষর</span></div>
<p><button onclick="window.print()">প্রিন্ট করুন</button></p>
</div>
</body>
</html>`);
    w.document.close();
    w.focus();
  }

  function printSalary(r) {
    printDocument("বেতন পরিশোধ স্লিপ", [
      ["তারিখ", r.date],
      ["বেতন মাস", r.month],
      ["কর্মীর নাম", r.staffName],
      ["কর্মীর ধরন", r.staffType],
      ["পরিশোধিত টাকা", "৳ " + money(r.amount)],
      ["মন্তব্য", r.note || "-"]
    ], r.receiptNo);
  }

  function printFee(r, type) {
    const exam = type === "exam";
    printDocument(exam ? "পরীক্ষার ফি রসিদ" : "মাসিক বেতন/ফি রসিদ", [
      ["তারিখ", r.date],
      ["শিক্ষার্থীর নাম", r.studentName || studentName(r.studentId)],
      ["শিক্ষার্থী আইডি", r.studentId],
      [exam ? "পরীক্ষার নাম" : "ফি মাস", exam ? r.examName : r.month],
      ["পরিশোধিত টাকা", "৳ " + money(r.amount)],
      ["পরিশোধের ধরন", exam ? "পরীক্ষার ফি" : "মাসিক ফি"]
    ], r.receiptNo);
  }

  function feeRate(sid) {
    return getDB().accountMonthlyRates.find(x => String(x.studentId) === String(sid));
  }

  function accountsPage() {
    const db = getDB();
    const month = currentMonth();
    const date = today();

    const salaryTotal = db.accountSalaries
      .filter(x => x.month === month)
      .reduce((n, x) => n + Number(x.amount || 0), 0);
// শিক্ষকদের মাসিক বেতন ও বকেয়া হিসাব
    const teacherSalaryRows = db.teachers.map(t => {
      const expected = Math.max(0, Number(t.salary || 0));

      const paid = db.accountSalaries
        .filter(x =>
          x.month === month &&
          String(x.staffName || "").trim() ===
          String(t.name || "").trim()
        )
        .reduce((n, x) => n + Number(x.amount || 0), 0);

      return {
        name: t.name || "",
        teacherId: t.teacherId || "",
        expected,
        paid,
        due: Math.max(0, expected - paid)
      };
    });

    const expectedTeacherSalary = teacherSalaryRows
      .reduce((n, t) => n + t.expected, 0);

    const teacherSalaryDue = teacherSalaryRows
      .reduce((n, t) => n + t.due, 0);
    const teacherSalaryPaid = teacherSalaryRows
      .reduce((n, t) => n + Math.min(t.expected, t.paid), 0);

    const teacherSalaryDueRows = teacherSalaryRows.map(t => `
      <tr>
        <td>${esc(t.name)}</td>
        <td>${esc(t.teacherId || "-")}</td>
        <td>৳ ${money(t.expected)}</td>
        <td>৳ ${money(t.paid)}</td>
        <td>৳ ${money(t.due)}</td>
      </tr>
    `).join("") ||
      '<tr><td colspan="5">শিক্ষকের তথ্য নেই</td></tr>';
    const monthlyIncome = db.accountStudentFees
      .filter(x => x.month === month)
      .reduce((n, x) => n + Number(x.amount || 0), 0);

    const examIncome = db.accountExamFees
      .filter(x => String(x.date || "").startsWith(month))
      .reduce((n, x) => n + Number(x.amount || 0), 0);

    const todayIncome = [...db.accountStudentFees, ...db.accountExamFees]
      .filter(x => x.date === date)
      .reduce((n, x) => n + Number(x.amount || 0), 0);

    const arrears = db.students.reduce((sum, s) => {
      const rate = feeRate(s.studentId);
      if (!rate) return sum;
      const paid = db.accountStudentFees
        .filter(x => String(x.studentId) === String(s.studentId) && x.month === month)
        .reduce((n, x) => n + Number(x.amount || 0), 0);
      return sum + Math.max(0, Number(rate.amount || 0) - paid);
    }, 0);

    const salaryRows = db.accountSalaries.slice().reverse().map(r => `
      <tr>
        <td>${esc(r.date)}</td><td>${esc(r.staffName)}</td>
        <td>${esc(r.month)}</td><td>৳ ${money(r.amount)}</td>
        <td><button type="button" data-account-print="salary" data-id="${esc(r.id)}">স্লিপ</button></td>
      </tr>`).join("") || `<tr><td colspan="5">এখনও বেতন রেকর্ড নেই</td></tr>`;

    const monthlyRows = db.accountStudentFees.slice().reverse().map(r => `
      <tr>
        <td>${esc(r.date)}</td><td>${esc(r.studentName || studentName(r.studentId))}</td>
        <td>${esc(r.month)}</td><td>৳ ${money(r.amount)}</td>
        <td><button type="button" data-account-print="monthly" data-id="${esc(r.id)}">রসিদ</button></td>
      </tr>`).join("") || `<tr><td colspan="5">এখনও মাসিক ফি রেকর্ড নেই</td></tr>`;

    const examRows = db.accountExamFees.slice().reverse().map(r => `
      <tr>
        <td>${esc(r.date)}</td><td>${esc(r.studentName || studentName(r.studentId))}</td>
        <td>${esc(r.examName)}</td><td>৳ ${money(r.amount)}</td>
        <td><button type="button" data-account-print="exam" data-id="${esc(r.id)}">রসিদ</button></td>
      </tr>`).join("") || `<tr><td colspan="5">এখনও পরীক্ষার ফি রেকর্ড নেই</td></tr>`;

    const rateRows = db.accountMonthlyRates.map(r => `
      <tr><td>${esc(studentName(r.studentId))}</td><td>৳ ${money(r.amount)}</td></tr>
    `).join("") || `<tr><td colspan="2">মাসিক ফি নির্ধারণ করা হয়নি</td></tr>`;

    return `
      <div class="account-module">
        <h2>Accounts & Fees — হিসাব ও ফি</h2>
        <p>বর্তমান মাস: <b>${esc(month)}</b></p>

        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px;margin:16px 0">
          <div style="padding:14px;border:1px solid #ddd;border-radius:8px"><b>আজকের আয়</b><h3>৳ ${money(todayIncome)}</h3></div>
          <div style="padding:14px;border:1px solid #ddd;border-radius:8px"><b>মাসিক ফি আদায়</b><h3>৳ ${money(monthlyIncome)}</h3></div>
          <div style="padding:14px;border:1px solid #ddd;border-radius:8px"><b>পরীক্ষার ফি</b><h3>৳ ${money(examIncome)}</h3></div>
          <div style="padding:14px;border:1px solid #ddd;border-radius:8px"><b>এই মাসের বেতন</b><h3>৳ ${money(salaryTotal)}</h3></div>
          <div style="padding:14px;border:1px solid #ddd;border-radius:8px"><b>মাসিক ফি বকেয়া</b><h3>৳ ${money(arrears)}</h3></div>
        </div>
<h3>শিক্ষকদের মাসিক বেতন রিপোর্ট</h3>
        <p>হিসাবের মাস: ${esc(month)}</p>

        <div style="overflow-x:auto">
          <table border="1" cellpadding="8"
            style="border-collapse:collapse;width:100%">
            <thead>
              <tr>
                <th>শিক্ষকের নাম</th>
                <th>আইডি</th>
                <th>নির্ধারিত বেতন</th>
                <th>পরিশোধ</th>
                <th>বাকি</th>
              </tr>
            </thead>
            <tbody>${teacherSalaryDueRows}</tbody>
            <tfoot>
              <tr>
                <th colspan="2">মোট</th>
                <th>৳ ${money(expectedTeacherSalary)}</th>
                <th>৳ ${money(teacherSalaryPaid)}</th>
                <th>৳ ${money(teacherSalaryDue)}</th>
              </tr>
            </tfoot>
          </table>
        </div>
        <h3>১. কর্মচারী/শিক্ষকের বেতন</h3>
        <form data-account-form="salary" style="display:grid;gap:10px;max-width:650px">
          
          
<label>কর্মীর ধরন
  <select name="staffType" required>
    <option value="শিক্ষক">শিক্ষক</option>
    <option value="অন্যান্য কর্মচারী">অন্যান্য কর্মচারী</option>
  </select>
</label>

<label>শিক্ষক নির্বাচন করুন
  <select name="staffName">
    <option value="">শিক্ষক নির্বাচন করুন</option>
    ${db.teachers.map(t => `
      <option value="${esc(t.name || "")}">
        ${esc(t.name || "")}
      </option>
    `).join("")}
  </select>
</label>

<label>অন্যান্য কর্মচারীর নাম
  <input name="staffNameOther"
    placeholder="কর্মচারীর নাম লিখুন">
</label>


          <label>বেতন মাস <input name="month" type="month" value="${month}" required></label>
          <label>পরিশোধের তারিখ <input name="date" type="date" value="${date}" required></label>
          <label>পরিশোধিত টাকা <input name="amount" type="number" min="1" step="0.01" required></label>
          <label>মন্তব্য <input name="note" placeholder="ঐচ্ছিক"></label>
          <button type="submit">বেতন সেভ করুন</button>
        </form>

        <h3 style="margin-top:22px">বেতন পরিশোধের তালিকা</h3>
        <div style="overflow-x:auto"><table border="1" cellpadding="8" style="border-collapse:collapse;width:100%">
          <thead><tr><th>তারিখ</th><th>কর্মী</th><th>মাস</th><th>টাকা</th><th>স্লিপ</th></tr></thead>
          <tbody>${salaryRows}</tbody>
        </table></div>

        <hr style="margin:25px 0">
        <h3>২. শিক্ষার্থীর মাসিক ফি নির্ধারণ</h3>
        <p>বকেয়া হিসাব করতে প্রতিটি শিক্ষার্থীর মাসিক ফি একবার নির্ধারণ করুন।</p>
        <form data-account-form="rate" style="display:grid;gap:10px;max-width:650px">
          <label>শিক্ষার্থী <select name="studentId" required>${studentOptions()}</select></label>
          <label>মাসিক ফি (টাকা) <input name="amount" type="number" min="0" step="0.01" required></label>
          <button type="submit">মাসিক ফি সেভ করুন</button>
        </form>
        <div style="overflow-x:auto;margin-top:12px"><table border="1" cellpadding="8" style="border-collapse:collapse;width:100%">
          <thead><tr><th>শিক্ষার্থী</th><th>মাসিক ফি</th></tr></thead><tbody>${rateRows}</tbody>
        </table></div>

        <h3 style="margin-top:22px">৩. মাসিক ফি আদায়</h3>
        <form data-account-form="monthly" style="display:grid;gap:10px;max-width:650px">
          <label>শিক্ষার্থী <select name="studentId" required>${studentOptions()}</select></label>
          <label>ফি মাস <input name="month" type="month" value="${month}" required></label>
          <label>তারিখ <input name="date" type="date" value="${date}" required></label>
          <label>আদায়কৃত টাকা <input name="amount" type="number" min="1" step="0.01" required></label>
          <button type="submit">ফি আদায় সেভ করুন</button>
        </form>

        <h3 style="margin-top:22px">মাসিক ফি আদায়ের তালিকা</h3>
        <div style="overflow-x:auto"><table border="1" cellpadding="8" style="border-collapse:collapse;width:100%">
          <thead><tr><th>তারিখ</th><th>শিক্ষার্থী</th><th>মাস</th><th>টাকা</th><th>রসিদ</th></tr></thead>
          <tbody>${monthlyRows}</tbody>
        </table></div>

        <hr style="margin:25px 0">
        <h3>৪. পরীক্ষার ফি আদায়</h3>
        <form data-account-form="exam" style="display:grid;gap:10px;max-width:650px">
          <label>শিক্ষার্থী <select name="studentId" required>${studentOptions()}</select></label>
          <label>পরীক্ষার নাম <input name="examName" required placeholder="যেমন: অর্ধবার্ষিক পরীক্ষা"></label>
          <label>তারিখ <input name="date" type="date" value="${date}" required></label>
          <label>আদায়কৃত টাকা <input name="amount" type="number" min="1" step="0.01" required></label>
          <button type="submit">পরীক্ষার ফি সেভ করুন</button>
        </form>

        <h3 style="margin-top:22px">পরীক্ষার ফি আদায়ের তালিকা</h3>
        <div style="overflow-x:auto"><table border="1" cellpadding="8" style="border-collapse:collapse;width:100%">
          <thead><tr><th>তারিখ</th><th>শিক্ষার্থী</th><th>পরীক্ষা</th><th>টাকা</th><th>রসিদ</th></tr></thead>
          <tbody>${examRows}</tbody>
        </table></div>
      </div>`;
  }

  api.registerPage("accounts", "Accounts & Fees", accountsPage);

  function addNavigation() {
    if (document.querySelector('[data-page="accounts"]')) return;
    const backupButton = document.querySelector('[data-page="backup"]');
    if (backupButton && backupButton.parentElement) {
      const button = document.createElement("button");
      button.type = "button";
      button.setAttribute("data-page", "accounts");
      button.textContent = "Accounts & Fees";
      button.className = backupButton.className;
      backupButton.insertAdjacentElement("afterend", button);
    }
  }

  document.addEventListener("submit", event => {
    const form = event.target.closest("form[data-account-form]");
    if (!form) return;

    event.preventDefault();
    const data = Object.fromEntries(new FormData(form).entries());
    const db = getDB();
    const type = form.getAttribute("data-account-form");
    const amount = Number(data.amount);

    if (type === "rate") {
      if (!data.studentId || !Number.isFinite(amount) || amount < 0) {
        alert("শিক্ষার্থী এবং সঠিক মাসিক ফি দিন।");
        return;
      }
      const old = db.accountMonthlyRates.find(x => String(x.studentId) === String(data.studentId));
      if (old) old.amount = amount;
      else db.accountMonthlyRates.push({
        id: makeId(), studentId: data.studentId, amount
      });
      saveAndRender("মাসিক ফি নির্ধারণ সেভ হয়েছে।");
      return;
    }

    
if (!Number.isFinite(amount) || amount <= 0) {
  alert("সঠিক টাকার পরিমাণ দিন।");
  return;
}

if (type === "salary") {
  const staffName = (
    data.staffType === "শিক্ষক"
      ? data.staffName
      : data.staffNameOther
  ).trim();

  if (!staffName) {
    alert("কর্মীর নাম নির্বাচন বা লিখুন।");
    return;
  }

  db.accountSalaries.push({
    id: makeId(),
    receiptNo: "PAY-" + Date.now(),
    date: data.date,
    month: data.month,
    staffType: data.staffType,
    staffName,
    amount,
    note: data.note || ""
  });

  saveAndRender("বেতনের তথ্য সেভ হয়েছে।");
} else if (type === "monthly" || type === "exam") {
  const student = db.students.find(
    s => String(s.studentId) === String(data.studentId)
  );

  if (!student) {
    alert("আগে শিক্ষার্থী যোগ করুন এবং সঠিক শিক্ষার্থী নির্বাচন করুন।");
    return;
  }

  if (type === "monthly") {
    db.accountStudentFees.push({
      id: makeId(),
      receiptNo: "FEE-" + Date.now(),
      date: data.date,
      month: data.month,
      studentId: data.studentId,
      studentName: student.name,
      amount
    });

    saveAndRender("মাসিক ফি সেভ হয়েছে।");
  } else {
    db.accountExamFees.push({
      id: makeId(),
      receiptNo: "EXAM-" + Date.now(),
      date: data.date,
      examName: data.examName.trim(),
      studentId: data.studentId,
      studentName: student.name,
      amount
    });

    saveAndRender("পরীক্ষার ফি সেভ হয়েছে।");
  }
}

  });

  document.addEventListener("click", event => {
    const btn = event.target.closest("[data-account-print]");
    if (!btn) return;

    const db = getDB();
    const id = btn.getAttribute("data-id");
    const type = btn.getAttribute("data-account-print");

    if (type === "salary") {
      const r = db.accountSalaries.find(x => String(x.id) === String(id));
      if (r) printSalary(r);
    } else if (type === "monthly") {
      const r = db.accountStudentFees.find(x => String(x.id) === String(id));
      if (r) printFee(r, "monthly");
    } else if (type === "exam") {
      const r = db.accountExamFees.find(x => String(x.id) === String(id));
      if (r) printFee(r, "exam");
    }
  });

  function startModule() {
    getDB();
    addNavigation();
    api.render();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", startModule);
  } else {
    startModule();
  }

  window.addEventListener("school:cloud-loaded", () => {
    getDB();
  });
})();
