(function () {
  "use strict";

  function addSignupForm() {
    const screen = document.getElementById("loginScreen");

    if (!screen || document.getElementById("schoolSignupSection")) {
      return;
    }

    const section = document.createElement("section");
    section.id = "schoolSignupSection";
    section.style.cssText =
      "max-width:480px;margin:20px auto;padding:18px;" +
      "border:1px solid #ddd;border-radius:12px;background:#fff;";

    section.innerHTML = `
      <h3 style="text-align:center;color:#176b45">
        নতুন স্কুল/কলেজের অ্যাকাউন্ট
      </h3>

      <form id="schoolSignupForm">
        <label>স্কুল/কলেজের নাম</label>
        <input id="signupSchoolName" type="text"
          required maxlength="150"
          placeholder="প্রতিষ্ঠানের নাম"
          style="display:block;width:100%;box-sizing:border-box;padding:12px;margin:8px 0 14px">

        <label>ইমেইল</label>
        <input id="signupEmail" type="email"
          required autocomplete="email"
          placeholder="আপনার ইমেইল"
          style="display:block;width:100%;box-sizing:border-box;padding:12px;margin:8px 0 14px">

        <label>পাসওয়ার্ড (কমপক্ষে ৮ অক্ষর)</label>
        <input id="signupPassword" type="password"
          required minlength="8" autocomplete="new-password"
          placeholder="নতুন পাসওয়ার্ড"
          style="display:block;width:100%;box-sizing:border-box;padding:12px;margin:8px 0 14px">

        <label>পাসওয়ার্ড আবার লিখুন</label>
        <input id="signupConfirmPassword" type="password"
          required minlength="8" autocomplete="new-password"
          placeholder="পাসওয়ার্ড নিশ্চিত করুন"
          style="display:block;width:100%;box-sizing:border-box;padding:12px;margin:8px 0 14px">

        <button type="submit"
          style="width:100%;padding:13px;background:#176b45;color:white;border:0;border-radius:7px;font-size:16px">
          অ্যাকাউন্ট তৈরি করুন
        </button>

        <p id="signupMessage" role="status"
          style="margin-top:12px;overflow-wrap:anywhere"></p>
      </form>
    `;

    screen.appendChild(section);

    const form = document.getElementById("schoolSignupForm");
    const message = document.getElementById("signupMessage");

    form.addEventListener("submit", async function (event) {
      event.preventDefault();

      const schoolName =
        document.getElementById("signupSchoolName").value.trim();
      const email =
        document.getElementById("signupEmail").value.trim();
      const password =
        document.getElementById("signupPassword").value;
      const confirmPassword =
        document.getElementById("signupConfirmPassword").value;

      if (password.length < 8) {
        message.textContent = "পাসওয়ার্ড কমপক্ষে ৮ অক্ষরের দিন।";
        return;
      }

      if (password !== confirmPassword) {
        message.textContent = "দুটি পাসওয়ার্ড মিলছে না।";
        return;
      }

      if (typeof db === "undefined" || !db.auth) {
        message.textContent =
          "সিস্টেম প্রস্তুত নয়। পেজ রিফ্রেশ করে আবার চেষ্টা করুন।";
        return;
      }

      const submitButton = form.querySelector('button[type="submit"]');
      submitButton.disabled = true;
      submitButton.textContent = "অপেক্ষা করুন...";
      message.textContent = "";

      try {
        const { data, error } = await db.auth.signUp({
          email: email,
          password: password,
          options: {
            data: {
              school_name: schoolName,
              account_type: "school"
            }
          }
        });

        if (error) throw error;

        if (data && data.user) {
          message.textContent = data.session
            ? "অ্যাকাউন্ট তৈরি হয়েছে। এবার লগইন করুন।"
            : "অ্যাকাউন্টের অনুরোধ হয়েছে। ইমেইল যাচাই করতে বললে ইনবক্স দেখুন।";
          form.reset();
        } else {
          message.textContent =
            "অ্যাকাউন্টের অবস্থা যাচাই করা যায়নি। লগইন করে পরীক্ষা করুন।";
        }
      } catch (error) {
        console.error("School signup error:", error);
        message.textContent =
          "অ্যাকাউন্ট তৈরি হয়নি: " +
          (error.message || "আবার চেষ্টা করুন।");
      } finally {
        submitButton.disabled = false;
        submitButton.textContent = "অ্যাকাউন্ট তৈরি করুন";
      }
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", addSignupForm);
  } else {
    addSignupForm();
  }
})();
