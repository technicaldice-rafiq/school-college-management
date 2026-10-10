
/* School & College Management — Cloud connection */
(() => {
  "use strict";

  const URL = "https://clivmkonzwyrnwluymkf.supabase.co";
  const KEY = "sb_publishable_7yisPY9_ME1pDF-nxARKFw_u2VaIE-v";

  if (!window.supabase) {
    console.error("Supabase library পাওয়া যায়নি");
    return;
  }

  const cloud = window.supabase.createClient(URL, KEY);

  window.schoolCloud = cloud;

  window.schoolCloudStatus = async function () {
    const { data, error } = await cloud.auth.getSession();

    if (error) {
      console.error("সংযোগ যাচাই হয়নি:", error.message);
      return false;
    }

    if (!data.session) {
      console.log("লগইন নেই");
      return false;
    }

    console.log("অনলাইন সংযোগ প্রস্তুত");
    return true;
  };

  console.log("School Cloud module loaded");
})();
