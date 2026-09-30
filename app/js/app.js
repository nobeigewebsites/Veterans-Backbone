/* ============================================================
   VETERANS BACKBONE CORE
   PROTECTED APPLICATION SHELL

   Responsibilities:
   - Require authenticated Supabase user
   - Require active VB staff profile
   - Provide staff identity to the interface
   - Handle sign out
   - Expose authenticated application context

   Security:
   - Supabase Auth establishes identity
   - RLS remains the database security boundary
   - Authentication alone does NOT grant VB Core access
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
   3. APPLICATION PATHS

   app/index.html
      -> login.html

   app/pages/*.html
      -> ../login.html
   ============================================================ */

const isInsidePagesFolder =
  window.location.pathname.includes("/app/pages/");

const LOGIN_URL =
  isInsidePagesFolder
    ? "../login.html"
    : "login.html";


/* ============================================================
   4. REDIRECT TO LOGIN
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

   getUser() validates the stored Supabase session.
   ============================================================ */

async function getAuthenticatedUser() {

  const {
    data,
    error
  } = await supabase.auth.getUser();


  if (error) {

    console.error(
      "VB Core authentication check failed:",
      error
    );

    return null;
  }


  return data?.user ?? null;
}


/* ============================================================
   6. LOAD ACTIVE VB STAFF PROFILE

   The authenticated Auth UID is matched against staff_profiles.

   RLS controls whether the authenticated user may read the row.

   Current self-read policy requires:

       auth_user_id = auth.uid()
       AND is_active = true
   ============================================================ */

async function getStaffProfile(authUserId) {

  const {
    data,
    error
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


  if (error) {

    console.error(
      "Unable to load VB staff profile:",
      error
    );

    throw error;
  }


  return data;
}


/* ============================================================
   7. APPLY STAFF IDENTITY

   Optional HTML targets:

       data-current-staff-name
       data-current-staff-code
       data-current-staff-email

   These values are for interface display only.

   They are NOT permission controls.
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


  /*
    Application state exposed to the interface.

    These attributes must never be treated as authorisation.

    Database permissions and RLS remain authoritative.
  */

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
   9. SIGN-OUT CONTROLS

   Any HTML element containing:

       data-vb-sign-out

   becomes a sign-out control.
   ============================================================ */

function initialiseSignOutControls() {

  const signOutControls =
    document.querySelectorAll(
      "[data-vb-sign-out]"
    );


  signOutControls.forEach(
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

   IMPORTANT:

   Redirect ONLY when Supabase explicitly reports SIGNED_OUT.

   Do not redirect merely because an auth event temporarily
   contains no session during initialisation or token refresh.
   ============================================================ */

function watchAuthentication() {

  supabase.auth.onAuthStateChange(
    (event) => {

      if (event === "SIGNED_OUT") {

        console.info(
          "VB Core session ended."
        );

        redirectToLogin();
      }
    }
  );
}


/* ============================================================
   11. PROTECT APPLICATION
   ============================================================ */

async function protectApplication() {

  try {

    /* --------------------------------------------------------
       STEP 1
       Validate Supabase authentication
       -------------------------------------------------------- */

    const user =
      await getAuthenticatedUser();


    if (!user) {

      console.info(
        "No authenticated VB Core user."
      );

      redirectToLogin();

      return;
    }


    /* --------------------------------------------------------
       STEP 2
       Require active VB staff profile
       -------------------------------------------------------- */

    const staffProfile =
      await getStaffProfile(
        user.id
      );


    if (!staffProfile) {

  console.error(
    "VB CORE ACCESS DENIED:",
    {
      reason: "No active staff profile returned",
      authenticatedUserId: user.id,
      authenticatedEmail: user.email
    }
  );

  /*
    DEV DIAGNOSTIC MODE

    Access still fails closed.

    Do NOT destroy the valid Supabase session here.
    We need to preserve authentication so we can inspect
    why the staff-profile lookup returned no row.
  */

  redirectToLogin();

  return;
}
      redirectToLogin();

      return;
    }


    /* --------------------------------------------------------
       STEP 3
       Apply authenticated staff identity
       -------------------------------------------------------- */

    applyStaffIdentity(
      user,
      staffProfile
    );


    /* --------------------------------------------------------
       STEP 4
       Initialise protected application controls
       -------------------------------------------------------- */

    initialiseSignOutControls();

    watchAuthentication();


    /* --------------------------------------------------------
       STEP 5
       VB CORE READY
       -------------------------------------------------------- */

    console.info(
      `VB Core access established for ${staffProfile.staff_code}.`
    );


    /*
      Future module scripts can listen for:

          vb:ready

      This ensures they do not attempt protected database work
      until authentication AND staff-profile validation have
      completed.
    */

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

    console.error(
      "VB Core application protection failed:",
      error
    );


    /*
      FAIL CLOSED

      If authentication or staff identity cannot be safely
      established, VB Core access is not granted.
    */

    try {

      await supabase.auth.signOut();

    } catch (signOutError) {

      console.error(
        "Unable to clear failed VB Core session:",
        signOutError
      );
    }


    redirectToLogin();
  }
}


/* ============================================================
   12. START VB CORE
   ============================================================ */

protectApplication();


/* ============================================================
   13. EXPORTS
   ============================================================ */

export {
  supabase,
  signOut
};
