"use strict";

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
  try {
    loginMessage.textContent = "অ্যাকাউন্ট যাচাই হচ্ছে...";

    let role = null;
    const roleCacheKey = "school_cached_role_" + user.id;

    // প্রথমে অনলাইন থেকে ব্যবহারকারীর ভূমিকা যাচাই
    if (navigator.onLine) {
      try {
        const { data, error } = await db
          .from("user_profiles")
          .select("role")
          .eq("id", user.id)
          .single();

        if (!error && data && roleNames[data.role]) {
          role = data.role;
          localStorage.setItem(roleCacheKey, role);
        }
      } catch (error) {
        console.warn("Online role check failed:", error);
      }
    }

    // ইন্টারনেট না থাকলে আগের যাচাইকৃত ভূমিকা ব্যবহার
    if (!role) {
      const cachedRole = localStorage.getItem(roleCacheKey);

      if (cachedRole && roleNames[cachedRole]) {
        role = cachedRole;
      }
    }

    if (!role || !roleNames[role]) {
      showLogin(
        "অ্যাকাউন্ট যাচাই করা যায়নি। ইন্টারনেট চালু করে আবার লগইন করুন।"
      );
      return;
    }

    // আগে সংরক্ষিত স্থানীয় ডেটা বজায় থাকবে
    window.schoolCloudSyncReady = false;

    // ইন্টারনেট থাকলে ক্লাউড ডেটা আনার চেষ্টা
    if (navigator.onLine && window.schoolCloudSync) {
      try {
        const cloudData = await window.schoolCloudSync.load();

        if (cloudData) {
          window.dispatchEvent(
            new CustomEvent("school:cloud-loaded", {
              detail: cloudData
            })
          );
        }

        window.schoolCloudSyncReady = true;
      } catch (error) {
        console.warn(
          "Cloud unavailable; continuing with local data:",
          error
        );
      }
    }

    loginScreen.style.display = "none";
    appShell.style.display = "block";

    document.getElementById("userInfo").textContent =
      (user.email || "") + " | " + roleNames[role];

    const permissions = {
      admin: [
        "dashboard",
        "students",
        "attendance",
        "fees",
        "results",
        "teachers",
        "reports",
        "backup",
        "accounts"
      ],
      teacher: [
        "dashboard",
        "students",
        "attendance",
        "results",
        "reports"
      ],
      accountant: [
        "dashboard",
        "fees",
        "reports",
        "accounts"
      ]
    };

    document.querySelectorAll(".nav").forEach(button => {
      button.style.display =
        permissions[role].includes(button.dataset.page)
          ? ""
          : "none";
    });

    window.currentSchoolRole = role;
  } catch (error) {
    console.error("Login/app error:", error);

    showLogin(
      "সফটওয়্যার খুলতে সমস্যা হয়েছে: " +
      (error.message || "অজানা ত্রুটি")
    );
  }
}

loginForm.addEventListener("submit", async event => {
  event.preventDefault();

  const email = document.getElementById("loginEmail").value.trim();
  const password = document.getElementById("loginPassword").value;

  loginButton.disabled = true;
  loginButton.textContent = "লগইন হচ্ছে...";
  loginMessage.textContent = "";

  try {
    const { data, error } = await db.auth.signInWithPassword({
      email,
      password
    });

    if (error) throw error;

    if (!data.user) {
      throw new Error("ব্যবহারকারীর তথ্য পাওয়া যায়নি");
    }

    await openApp(data.user);
  } catch (error) {
    console.error("Login failed:", error);

    let message = error.message || "লগইন করা যায়নি";

    if (error.message === "Invalid login credentials") {
      message = "ইমেইল অথবা পাসওয়ার্ড ভুল হয়েছে। আবার পরীক্ষা করুন।";
    } else if (error.message?.includes("Failed to fetch")) {
      message = "ইন্টারনেট বা Supabase সংযোগ পরীক্ষা করুন।";
    }

    showLogin(message);
  } finally {
    loginButton.disabled = false;
    loginButton.textContent = "লগইন করুন";
  }
});

document.getElementById("logoutBtn").addEventListener(
  "click",
  async () => {
    loginButton.disabled = false;

    const { error } = await db.auth.signOut();

    if (error) {
      showLogin("লগআউট করতে সমস্যা হয়েছে: " + error.message);
      return;
    }

    window.schoolCloudSyncReady = Boolean(window.schoolCloudSync);
    showLogin("আপনি লগআউট করেছেন।");
  }
);

(async function restoreSession() {
  try {
    const { data, error } = await db.auth.getSession();

    if (error) throw error;

    if (data.session?.user) {
      await openApp(data.session.user);
    }
  } catch (error) {
    console.error("Session restore failed:", error);
    showLogin("সেশন যাচাই করা যায়নি। আবার লগইন করুন।");
  }
})();

/* Offline PIN Login */
(function () {
  const pinStyle = document.createElement("style");
  pinStyle.textContent = `
    .offline-pin-box {
      margin-top: 18px;
      padding: 14px;
      border: 1px solid #ccc;
      border-radius: 10px;
    }
    .offline-pin-box input {
      display: block;
      width: 100%;
      box-sizing: border-box;
      padding: 12px;
      margin: 8px 0;
    }
    .offline-pin-box button {
      padding: 10px 14px;
      margin: 5px 4px 5px 0;
      cursor: pointer;
    }
  `;
  document.head.appendChild(pinStyle);

  const cacheKey = "school_offline_pin_user";
  const pinHashKey = "school_offline_pin_hash";
  const pinSaltKey = "school_offline_pin_salt";

  function getCachedUser() {
    try {
      return JSON.parse(localStorage.getItem(cacheKey) || "null");
    } catch (_) {
      return null;
    }
  }

  async function hashPin(pin, salt) {
    const bytes = new TextEncoder().encode(salt + ":" + pin);
    const digest = await crypto.subtle.digest("SHA-256", bytes);
    return Array.from(new Uint8Array(digest))
      .map(b => b.toString(16).padStart(2, "0"))
      .join("");
  }

  // আগের অনলাইন লগইন সেশন থেকে ব্যবহারকারীর পরিচয় সংরক্ষণ
  db.auth.onAuthStateChange((event, session) => {
    if (session && session.user) {
      const user = {
        id: session.user.id,
        email: session.user.email || ""
      };
      localStorage.setItem(cacheKey, JSON.stringify(user));
    }
  });

  // লগইন পেজে Offline PIN ঘর যোগ
  const pinBox = document.createElement("div");
  pinBox.className = "offline-pin-box";
  pinBox.innerHTML = `
    <h3>Offline PIN Login</h3>
    <p>আগে অনলাইনে লগইন করে PIN সেট করতে হবে।</p>
    <label for="offlinePin">৬ সংখ্যার PIN</label>
    <input id="offlinePin" type="password"
      inputmode="numeric" maxlength="6" pattern="[0-9]{6}"
      placeholder="৬ সংখ্যার PIN" autocomplete="off">
    <button type="button" id="offlinePinLogin">
      PIN দিয়ে খুলুন
    </button>
    <p id="offlinePinMessage" role="status"></p>
  `;
  loginScreen.appendChild(pinBox);

  // অনলাইনে লগইন থাকা অবস্থায় PIN সেট করার বাটন
  const setupButton = document.createElement("button");
  setupButton.type = "button";
  setupButton.textContent = "Offline PIN সেট করুন";
  setupButton.style.margin = "10px";
  appShell.appendChild(setupButton);

  setupButton.addEventListener("click", async () => {
    if (!navigator.onLine) {
      alert("PIN সেট করতে আগে ইন্টারনেট চালু করুন।");
      return;
    }

    let session;
    try {
      const result = await db.auth.getSession();
      session = result.data && result.data.session;
    } catch (_) {}

    if (!session || !session.user) {
      alert("আগে ইমেইল ও পাসওয়ার্ড দিয়ে লগইন করুন।");
      return;
    }

    const first = prompt("নতুন ৬ সংখ্যার PIN দিন:");
    if (!first || !/^\d{6}$/.test(first)) {
      alert("PIN অবশ্যই ৬ সংখ্যার হতে হবে।");
      return;
    }

    const second = prompt("একই PIN আবার লিখুন:");
    if (first !== second) {
      alert("দুটি PIN মেলেনি। আবার চেষ্টা করুন।");
      return;
    }

    try {
// Restore online session or previously unlocked offline PIN session
async function restoreOfflinePinSession() {
  if (navigator.onLine) return false;

  try {
    const user = JSON.parse(
      localStorage.getItem("school_offline_pin_user") || "null"
    );

    const unlockedUserId = sessionStorage.getItem(
      "school_offline_pin_unlocked_user"
    );

    if (!user || !user.id || unlockedUserId !== user.id) {
      return false;
    }

    const role = localStorage.getItem(
      "school_cached_role_" + user.id
    );

    if (!role || !roleNames[role]) return false;

    await openApp(user);
    return true;
  } catch (error) {
    console.warn("Offline session restore failed:", error);
    return false;
  }
}

(async function restoreSession() {
  try {
    const { data, error } = await db.auth.getSession();

    if (error) throw error;

    if (data.session?.user) {
      await openApp(data.session.user);
    } else if (!(await restoreOfflinePinSession())) {
      showLogin(
        navigator.onLine
          ? ""
          : "ইন্টারনেট নেই। Offline PIN দিয়ে ঢুকুন।"
      );
    }
  } catch (error) {
    console.error("Session restore failed:", error);

    if (!(await restoreOfflinePinSession())) {
      showLogin(
        navigator.onLine
          ? "সেশন যাচাই করা যায়নি। আবার লগইন করুন।"
          : "ইন্টারনেট নেই। Offline PIN দিয়ে ঢুকুন।"
      );
    }
  }
})();
