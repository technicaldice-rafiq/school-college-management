(function () {
  "use strict";

  const SUPABASE_URL =
    "https://clivmkonzwyrnwluymkf.supabase.co";

  const SUPABASE_KEY =
    "sb_publishable_7yisPY9_ME1pDF-nxARKFw_u2VaIE-v";

  const ROW_ID = "00000000-0000-4000-8000-000000000001";

  if (!window.supabase || !window.supabase.createClient) {
    console.error("Supabase library was not loaded.");
    window.schoolCloudStatus = "error";
    return;
  }

  const client = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
  );

  async function checkLogin() {
    const result = await client.auth.getSession();

    if (result.error) {
      throw result.error;
    }

    if (!result.data.session) {
      throw new Error("Please log in first.");
    }
  }

  async function load() {
    await checkLogin();

    const { data, error } = await client
      .from("school_app_data")
      .select("payload")
      .eq("id", ROW_ID)
      .maybeSingle();

    if (error) {
      throw error;
    }

    window.schoolCloudStatus = "connected";

    return data ? data.payload : null;
  }

  async function save(payload) {
    await checkLogin();

    if (!payload || typeof payload !== "object") {
      throw new Error("Invalid school data.");
    }

    const { error } = await client
      .from("school_app_data")
      .upsert(
        {
          id: ROW_ID,
          payload: payload,
          updated_at: new Date().toISOString()
        },
        {
          onConflict: "id"
        }
      );

    if (error) {
      window.schoolCloudStatus = "error";
      throw error;
    }

    window.schoolCloudStatus = "connected";

    return true;
  }

  window.schoolCloudSync = {
    load: load,
    save: save,
    client: client
  };

  window.schoolCloudStatus = "ready";

  console.log("School cloud sync module loaded.");
})();
