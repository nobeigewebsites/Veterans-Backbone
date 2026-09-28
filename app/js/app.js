/* ============================================================
   VETERANS BACKBONE CORE
   PROTECTED APPLICATION SHELL — DEBUG BUILD
   ============================================================ */

import { createClient } from
  "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";


/* ============================================================
   1. SUPABASE CONFIGURATION
   ============================================================ */

const SUPABASE_URL =
  "https://jygyirqtiuxjllcltpks.supabase.co";

const SUPABASE_PUBLISHABLE_KEY =
  "sb_publishable_36yMEHR4-bWypaun6X2oNw_fTaoOt9p";


/* ============================================================
   2. SUPABASE CLIENT
   ============================================================ */

const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true
    }
  }
);


/* ============================================================
   3. PATHS
   ============================================================ */

const isInsidePagesFolder =
  window.location.pathname.includes("/app/pages/");

const LOGIN_URL =
  isInsidePagesFolder
    ? "../login.html"
    : "login.html";


/* ============================================================
   4. REDIRECT
   ============================================================ */

let redirectingToLogin = false;


function redirectToLogin() {

  if (redirectingToLogin) {
    return;
  }

  redirectingToLogin = true;

  window.location.replace(LOGIN_URL);
}


/* ============================================================
   5. GET AUTHENTICATED USER
   ============================================================ */

async function getAuthenticatedUser() {

  console.info(
    "VB DEBUG: Checking authenticated Supabase user..."
  );


  const {
    data,
    error
  } = await supabase.auth.getUser();


  if (error) {

    console.error(
      "VB DEBUG: Authentication check failed:",
      error
    );

    return null;
  }


  if (!data?.user) {

    console.warn(
      "VB DEBUG: No authenticated user found."
    );

    return null;
  }


  console.info(
    "VB DEBUG: Authenticated user found:",
    {
      id: data.user.id,
      email: data.user.email
    }
  );


  return data.user;
}


/* ============================================================
   6. GET STAFF PROFILE
   ============================================================ */

async function getStaffProfile(authUserId) {

  console.info(
    "VB DEBUG: Requesting staff profile for:",
    authUserId
  );


  const {
    data,
    error,
    status,
    statusText
  } = await supabase
    .from("staff_profiles")
    .select(`
      id,
      auth_user_id,
      organisation_id,
      primary_site_id,
      primary_team_id,
      staff_code,
      display_name,
      employment_type,
      is_active
    `)
    .eq(
      "auth_user_id",
      authUserId
    )
    .eq(
      "is_active",
      true
    )
    .maybeSingle();


  console.info(
    "VB DEBUG: staff_profiles response:",
    {
      data,
      error,
      status,
      statusText
    }
  );


  if (error) {

    console.error(
      "VB DEBUG: staff_profiles query failed:",
      {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      }
    );

    throw error;
  }


  return data;
}


/* ============================================================
   7. APPLY STAFF IDENTITY
   ============================================================ */

function applyStaffIdentity(
  user,
  staffProfile
) {

  const nameTargets =
    document.querySelectorAll(
      "[data-current-staff-name]"
    );

  const codeTargets =
    document.querySelectorAll(
      "[data-current-staff-code]"
    );

  const emailTargets =
    document.querySelectorAll(
      "[data-current-staff-email]"
    );


  nameTargets.forEach(
    (element) => {

      element.textContent =
        staffProfile.display_name;
    }
  );


  codeTargets.forEach(
    (element) => {

      element.textContent =
        staffProfile.staff_code;
    }
  );


  emailTargets.forEach(
    (element) => {

      element.textContent =
        user.email ?? "";
    }
  );


  document.documentElement.dataset.authenticated =
    "true";

  document.documentElement.dataset.staffProfileId =
    staffProfile.id;

  document.documentElement.dataset.staffCode =
    staffProfile.staff_code;
}


/* ============================================================
   8. SIGN OUT
   ============================================================ */

async function signOut() {

  console.info(
    "VB DEBUG: Signing out..."
  );


  try {

    const {
      error
    } = await supabase.auth.signOut();


    if (error) {
      throw error;
    }


  } catch (error) {

    console.error(
      "VB Core sign-out failed:",
      error
    );


  } finally {

    redirectToLogin();
  }
}


/* ============================================================
   9. SIGN OUT CONTROLS
   ============================================================ */

function initialiseSignOutControls() {

  const controls =
    document.querySelectorAll(
      "[data-vb-sign-out]"
    );


  controls.forEach(
    (control) => {

      control.addEventListener(
        "click",
        async (event) => {

          event.preventDefault();

          control.disabled = true;

          await signOut();
        }
      );
    }
  );
}


/* ============================================================
   10. AUTH STATE WATCHER

   DEBUG BUILD:

   We log auth events but DO NOT redirect from them.

   This prevents the page disappearing while we're diagnosing
   the staff-profile/RLS stage.
   ============================================================ */

function watchAuthentication() {

  supabase.auth.onAuthStateChange(
    (event, session) => {

      console.info(
        "VB DEBUG: Auth state event:",
        event,
        session ? "session present" : "no session"
      );

    }
  );
}


/* ============================================================
   11. PROTECT APPLICATION
   ============================================================ */

async function protectApplication() {

  console.info(
    "============================================"
  );

  console.info(
    "VB DEBUG: Starting application protection"
  );

  console.info(
    "============================================"
  );


  try {

    /* --------------------------------------------------------
       AUTHENTICATION
       -------------------------------------------------------- */

    const user =
      await getAuthenticatedUser();


    /*
      This redirect stays enabled.

      A genuinely logged-out person still does not belong on
      the protected application.
    */

    if (!user) {

      console.warn(
        "VB DEBUG: No authenticated user — redirecting to login."
      );

      redirectToLogin();

      return;
    }


    /* --------------------------------------------------------
       STAFF PROFILE
       -------------------------------------------------------- */

    let staffProfile;


    try {

      staffProfile =
        await getStaffProfile(
          user.id
        );


    } catch (profileError) {

      /*
        DEBUG ONLY.

        Normally we would fail closed here.

        For this diagnostic build we deliberately leave the
        dashboard visible so the Console remains available.
      */

      console.error(
        "VB DEBUG: Staff profile lookup threw an error."
      );

      console.error(
        profileError
      );

      console.error(
        "VB DEBUG: Redirect suppressed for diagnosis."
      );

      return;
    }


    /* --------------------------------------------------------
       NO PROFILE RETURNED
       -------------------------------------------------------- */

    if (!staffProfile) {

      /*
        DEBUG ONLY.

        Do NOT sign the user out.

        We need the authenticated session to remain alive while
        we inspect why RLS returned no staff record.
      */

      console.error(
        "VB DEBUG: Auth succeeded but no active staff profile was returned."
      );

      console.error(
        "VB DEBUG: Expected Auth UID:",
        user.id
      );

      console.error(
        "VB DEBUG: Auth email:",
        user.email
      );

      console.error(
        "VB DEBUG: Redirect and sign-out suppressed for diagnosis."
      );

      return;
    }


    /* --------------------------------------------------------
       SUCCESS
       -------------------------------------------------------- */

    console.info(
      "VB DEBUG: Staff profile found:",
      staffProfile
    );


    applyStaffIdentity(
      user,
      staffProfile
    );


    initialiseSignOutControls();

    watchAuthentication();


    console.info(
      "============================================"
    );

    console.info(
      `VB CORE ACCESS GRANTED: ${staffProfile.staff_code}`
    );

    console.info(
      "============================================"
    );


    document.dispatchEvent(
      new CustomEvent(
        "vb:ready",
        {
          detail: {
            user,
            staffProfile,
            supabase
          }
        }
      )
    );


  } catch (error) {

    /*
      DEBUG ONLY.

      Leave the page where it is so we can inspect the error.
    */

    console.error(
      "VB DEBUG: Unexpected application protection failure:",
      error
    );

    console.error(
      "VB DEBUG: Redirect suppressed for diagnosis."
    );
  }
}


/* ============================================================
   12. START
   ============================================================ */

protectApplication();


/* ============================================================
   13. EXPORTS
   ============================================================ */

export {
  supabase,
  signOut
};
