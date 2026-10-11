
"use strict";

const SUPABASE_URL = "https://clivmkonzwyrnwluymkf.supabase.co";
const SUPABASE_KEY = "sb_publishable_7yisPY9_ME1pDF-nxARKFw_u2VaIE-v";

const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const loginScreen = document.getElementById("loginScreen");
const appShell = document.getElementById("appShell");
const loginForm = document.getElementById("loginForm");
const loginMessage = document.getElementById("loginMessage");
const loginButton = document.getElementById("loginButton");

const PIN_USER_KEY = "school_offline_pin_user";
const PIN_HASH_KEY = "school_offline_pin_hash";
const PIN_SALT_KEY = "school_offline_pin_salt";
const UNLOCK_KEY = "school_offline_pin_unlocked_user";

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

function showAppScreen() {
  loginScreen.style.display = "none";
  appShell.style.display = "block";
}

function getCachedUser() {
  try {
    return JSON.parse(localStorage.getItem(PIN_USER_KEY) || "null");
  } catch (_) {
    return null;
  }
}

function makeSalt() {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return Array.from(bytes)
    .map(byte => byte.toString(16).padStart(2, "0"))
    .join("");
}

async function hashPin(pin, salt) {
  if (!crypto.subtle) {
    throw new Error("নিরাপদ PIN ব্যবস্থা চালু হয়নি। HTTPS দিয়ে সাইট খুলুন।");
  }

  const bytes = new TextEncoder().encode(salt + ":" + pin);
  const digest = await crypto.subtle.digest("SHA-256", bytes);

  return Array.from(new Uint8Array(digest))
    .map(byte => byte.toString(16).padStart(2, "0"))
    .join("");
}

async function openApp(user) {
  try {
    if (!user || !user.id) {
      showLogin("ব্যবহারকারীর তথ্য পাওয়া যায়নি। আবার লগইন করুন।");
      return;
    }

    loginMessage.textContent = "অ্যাকাউন্ট যাচাই হচ্ছে...";

    localStorage.setItem(PIN_USER_KEY, JSON.stringify({
      id: user.id,
      email: user.email || ""
    }));

    const roleCacheKey = "school_cached_role_" + user.id;
    let role = null;

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

    window.schoolCloudSyncReady = false;

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
        console.warn("Cloud sync unavailable:", error);
      }
    }

    showAppScreen();

    document.getElementById("userInfo").textContent =
      (user.email || "") + " | " + roleNames[role];

    const permissions = {
      admin: [
        "dashboard", "students", "attendance", "fees",
        "results", "teachers", "reports", "backup", "accounts"
      ],
      teacher: [
        "dashboard", "students", "attendance", "results", "reports"
      ],
      accountant: [
        "dashboard", "fees", "reports", "accounts"
      ]
    };

    document.querySelectorAll(".nav").forEach(button => {
      button.style.display =
        permissions[role].includes(button.dataset.page) ? "" : "none";
    });

    window.currentSchoolRole = role;
  } catch (error) {
    console.error("Open app error:", error);
    showLogin("সফটওয়্যার খুলতে সমস্যা হয়েছে: " + error.message);
  }
}

/* Online email and password login */
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
    if (!data.user) throw new Error("ব্যবহারকারীর তথ্য পাওয়া যায়নি");

    sessionStorage.setItem(UNLOCK_KEY, data.user.id);
    await openApp(data.user);
  } catch (error) {
    console.error("Login failed:", error);

    let message = error.message || "লগইন করা যায়নি";

    if (error.message === "Invalid login credentials") {
      message = "ইমেইল অথবা পাসওয়ার্ড ভুল হয়েছে।";
    } else if (error.message?.includes("Failed to fetch")) {
      message = "ইন্টারনেট বা Supabase সংযোগ পরীক্ষা করুন।";
    }

    showLogin(message);
  } finally {
    loginButton.disabled = false;
    loginButton.textContent = "লগইন করুন";
  }
});

/* Offline PIN interface */
(function setupOfflinePin() {
  const style = document.createElement("style");

  style.textContent = `
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
    .offline-pin-box button,
    .offline-setup-button {
      padding: 10px 14px;
      margin: 5px 4px 5px 0;
      cursor: pointer;
    }
    .offline-pin-box button {
      width: 100%;
    }
  `;

  document.head.appendChild(style);

  const pinBox = document.createElement("div");
  pinBox.className = "offline-pin-box";

  pinBox.innerHTML = `
    <h3>Offline PIN Login</h3>
    <p>আগে অনলাইনে লগইন করে PIN সেট করুন।</p>
    <label for="offlinePin">৬ সংখ্যার PIN</label>
    <input
      id="offlinePin"
      type="password"
      inputmode="numeric"
      maxlength="6"
      pattern="[0-9]{6}"
      placeholder="৬ সংখ্যার PIN"
      autocomplete="off"
    >
    <button type="button" id="offlinePinLogin">PIN দিয়ে খুলুন</button>
    <p id="offlinePinMessage" role="status"></p>
  `;

  loginScreen.appendChild(pinBox);

  const pinInput = document.getElementById("offlinePin");
  const pinMessage = document.getElementById("offlinePinMessage");
  const pinLoginButton = document.getElementById("offlinePinLogin");

  const setupButton = document.createElement("button");
  setupButton.type = "button";
  setupButton.className = "offline-setup-button";
  setupButton.textContent = "Offline PIN সেট করুন";
  appShell.appendChild(setupButton);

  setupButton.addEventListener("click", async () => {
    try {
      if (!navigator.onLine) {
        alert("PIN সেট করতে ইন্টারনেট চালু করুন।");
        return;
      }

      const { data, error } = await db.auth.getSession();

      if (error) throw error;

      const user = data.session?.user;

      if (!user) {
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

      const salt = makeSalt();
      const hash = await hashPin(first, salt);

      localStorage.setItem(PIN_USER_KEY, JSON.stringify({
        id: user.id,
        email: user.email || ""
      }));

      localStorage.setItem(PIN_HASH_KEY, hash);
      localStorage.setItem(PIN_SALT_KEY, salt);

      alert("Offline PIN সফলভাবে সেট হয়েছে। PIN নিরাপদে মনে রাখুন।");
    } catch (error) {
      console.error("PIN setup failed:", error);
      alert("PIN সেট করা যায়নি: " + error.message);
    }
  });

  pinLoginButton.addEventListener("click", async () => {
    pinMessage.textContent = "";

    try {
      const pin = pinInput.value;

      if (!/^\d{6}$/.test(pin)) {
        pinMessage.textContent = "৬ সংখ্যার PIN লিখুন।";
        return;
      }

      const user = getCachedUser();
      const savedHash = localStorage.getItem(PIN_HASH_KEY);
      const salt = localStorage.getItem(PIN_SALT_KEY);

      if (!user?.id || !savedHash || !salt) {
        pinMessage.textContent =
          "Offline PIN সেট করা নেই। ইন্টারনেট দিয়ে লগইন করে PIN সেট করুন।";
        return;
      }

      const enteredHash = await hashPin(pin, salt);

      if (enteredHash !== savedHash) {
        pinMessage.textContent = "PIN সঠিক নয়। আবার চেষ্টা করুন।";
        return;
      }

      const role = localStorage.getItem(
        "school_cached_role_" + user.id
      );

      if (!role || !roleNames[role]) {
        pinMessage.textContent =
          "আগে অনলাইনে লগইন করে অ্যাকাউন্ট যাচাই করুন।";
        return;
      }

      sessionStorage.setItem(UNLOCK_KEY, user.id);
      pinMessage.textContent = "সফটওয়্যার খোলা হচ্ছে...";

      await openApp(user);
    } catch (error) {
      console.error("PIN login failed:", error);
      pinMessage.textContent =
        "PIN দিয়ে ঢোকা যায়নি। আবার চেষ্টা করুন।";
    }
  });
})();

/* Logout */
document.getElementById("logoutBtn").addEventListener("click", async () => {
  try {
    sessionStorage.removeItem(UNLOCK_KEY);

    if (navigator.onLine) {
      const { error } = await db.auth.signOut();
      if (error) throw error;
    }

    window.schoolCloudSyncReady = false;
    showLogin("আপনি লগআউট করেছেন।");
  } catch (error) {
    console.error("Logout failed:", error);
    showLogin("লগআউট করতে সমস্যা হয়েছে: " + error.message);
  }
});

/* Restore online session or an unlocked offline session */
async function restoreOfflinePinSession() {
  if (navigator.onLine) return false;

  try {
    const user = getCachedUser();
    const unlockedUserId = sessionStorage.getItem(UNLOCK_KEY);

    if (!user?.id || unlockedUserId !== user.id) {
      return false;
    }

    const role = localStorage.getItem("school_cached_role_" + user.id);

    if (!role || !roleNames[role]) {
      return false;
    }

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
          : "ইন্টারনেট নেই। আগে সেট করা Offline PIN দিয়ে ঢুকুন।"
      );
    }
  } catch (error) {
    console.error("Session restore failed:", error);

    if (!(await restoreOfflinePinSession())) {
      showLogin(
        navigator.onLine
          ? "সেশন যাচাই করা যায়নি। আবার লগইন করুন।"
          : "ইন্টারনেট নেই। আগে সেট করা Offline PIN দিয়ে ঢুকুন।"
      );
    }
  }
})();
