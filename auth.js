
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

  try {
    if (!window.schoolCloudSync) {
      throw new Error("Cloud sync module missing");
    }

    const cloudData = await window.schoolCloudSync.load();

    window.schoolCloudSyncReady = true;

    window.dispatchEvent(
      new CustomEvent("school:cloud-loaded", {
        detail: cloudData
      })
    );
  } catch (cloudError) {
    console.error("Online data connection failed:", cloudError);
    showLogin(
      "অনলাইন ডেটাবেসে সংযোগ হয়নি। SQL, ইন্টারনেট ও Supabase সেটিংস পরীক্ষা করুন।"
    );
    return;
  }

  loginScreen.style.display = "none";
  appShell.style.display = "block";

  document.getElementById("userInfo").textContent =
    user.email + " | " + roleNames[data.role];

  const permissions = {
    admin: [
      "dashboard", "students", "attendance", "fees",
      "results", "teachers", "reports", "backup"
    ],
    teacher: [
      "dashboard", "students", "attendance", "results", "reports"
    ],
    accountant: ["dashboard", "fees", "reports"]
  };

  document.querySelectorAll(".nav").forEach(button => {
    const page = button.dataset.page;
    button.style.display =
      permissions[data.role].includes(page) ? "" : "none";
  });

  window.currentSchoolRole = data.role;
}
