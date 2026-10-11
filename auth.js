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

    window.schoolCloudSyncReady = false;
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
