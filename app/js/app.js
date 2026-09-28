/* ============================================================
   VETERANS BACKBONE CORE
   PROTECTED APPLICATION SHELL

   Responsibilities:
   - Require authenticated Supabase user
   - Require active VB staff profile
   - Provide staff identity to the interface
   - Handle sign out
   - Expose authenticated application context
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

   getUser() validates the stored session with Supabase Auth.
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

   RLS remains the actual security boundary.

   The browser supplies the authenticated Auth UID only.
   Database policies determine what may be returned.
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
    These values are useful to the interface.

    They are NOT permission controls.

    RLS remains responsible for authorisation.
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

   Any element containing:

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

   We redirect ONLY on an explicit SIGNED_OUT event.

   We do NOT redirect merely because an auth event temporarily
   contains no session.

   This prevents login.html and index.html fighting each other
   during Supabase initialisation/token refresh.
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
       Validate authenticated Supabase user
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


    console.info(
      "Supabase user authenticated:",
      user.id
    );


    /* --------------------------------------------------------
       STEP 2
       Find active VB staff profile
       -------------------------------------------------------- */

    const staffProfile =
      await getStaffProfile(
        user.id
      );


    if (!staffProfile) {

      console.error(
        "Authenticated user has no active VB staff profile."
      );


      /*
        Authentication alone does not grant VB Core access.

        A person must also have an active staff profile.
      */

      await supabase.auth.signOut();

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
       Enable application controls
       -------------------------------------------------------- */

    initialiseSignOutControls();

    watchAuthentication();


    /* --------------------------------------------------------
       STEP 5
       Application ready
       -------------------------------------------------------- */

    console.info(
      `VB Core access established for ${staffProfile.staff_code}.`
    );


    /*
      Other VB Core modules can listen for this event.

      This allows future module scripts to wait until both:

      - Supabase authentication
      - VB staff-profile validation

      have completed.
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
      Fail closed.

      If identity / staff access cannot be established,
      application access is not granted.
    */

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
