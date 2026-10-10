
const SUPABASE_URL = "https://clivmkonzwyrnwluymkf.supabase.co";
const SUPABASE_KEY = "sb_publishable_7yisPY9_ME1pDF-nxARKFw_u2VaIE-v";

const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const loginScreen = document.getElementById("loginScreen");
const appShell = document.getElementById("appShell");
const loginForm = document.getElementById("loginForm");
const loginMessage = document.getElementById("loginMessage");
const loginButton = document.getElementById("loginButton");

const roleNames = {
  admin: "Admin — প্রশাসক",
  teacher: "Teacher — শিক্ষক",
  accountant: "Accountant — হিসাবরক্ষক"
};

function showLogin(message = "") {
  appShell.style.display = "none";
  loginScreen.style.display = "block";
  loginMessage.textContent = message;
}

async function openApp(user) {
  const { data, error } = await db
    .from("user_profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (error || !data || !roleNames[data.role]) {
    await db.auth.signOut();
    showLogin("অ্যাকাউন্টের ভূমিকা পাওয়া যায়নি। Supabase-এর User Profile পরীক্ষা করুন।");
    return;
  }

  loginScreen.style.display = "none";
  appShell.style.display = "block";

  document.getElementById("userInfo").textContent =
    user.email + " | " + roleNames[data.role];

  // Role অনুযায়ী মেনু দেখানো
  document.querySelectorAll(".nav").forEach(button => {
    const page = button.dataset.page;

    const permissions = {
      admin: ["dashboard", "students", "attendance", "fees",
        "results", "teachers", "reports", "backup"],
      teacher: ["dashboard", "students", "attendance", "results", "reports"],
      accountant: ["dashboard", "fees", "reports"]
    };

    button.style.display =
      permissions[data.role].includes(page) ? "" : "none";
  });

  window.currentSchoolRole = data.role;
}

loginForm.addEventListener("submit", async event => {
  event.preventDefault();

  loginButton.disabled = true;
  loginButton.textContent = "লগইন হচ্ছে...";
  loginMessage.textContent = "";

  try {
    const email = document.getElementById("loginEmail").value.trim();
    const password = document.getElementById("loginPassword").value;

    const { data, error } = await db.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      showLogin("লগইন হয়নি: ইমেইল ও পাসওয়ার্ড পরীক্ষা করুন।");
      return;
    }

    await openApp(data.user);
  } catch (error) {
    showLogin("সংযোগে সমস্যা হয়েছে। ইন্টারনেট ও Supabase সেটিংস পরীক্ষা করুন।");
  } finally {
    loginButton.disabled = false;
    loginButton.textContent = "লগইন করুন";
  }
});

document.getElementById("logoutBtn").addEventListener("click", async () => {
  const { error } = await db.auth.signOut();

  if (error) {
    alert("লগআউট করা যায়নি। আবার চেষ্টা করুন।");
    return;
  }

  showLogin("আপনি লগআউট করেছেন।");
});

async function checkExistingSession() {
  const { data, error } = await db.auth.getSession();

  if (error) {
    showLogin("সেশন যাচাই করা যায়নি। আবার লগইন করুন।");
    return;
  }

  if (data.session) {
    await openApp(data.session.user);
  } else {
    showLogin();
  }
}

checkExistingSession();
