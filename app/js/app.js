/* ============================================================
   VETERANS BACKBONE CORE
   PROTECTED APPLICATION SHELL

   Responsibilities:
   - Connect to Supabase
   - Require an authenticated session
   - Load the authenticated VB staff profile
   - Provide staff identity to the interface
   - Handle sign out

   IMPORTANT:
   Browser-safe publishable key only.
   NEVER use the service_role / secret key here.
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
   2. CREATE CLIENT
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
   3. WORK OUT WHERE WE ARE

   Pages inside /app/pages/ need to travel up one level to
   reach login.html.

   Dashboard /app/index.html does not.
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

function redirectToLogin() {
  window.location.replace(LOGIN_URL);
}


/* ============================================================
   5. LOAD CURRENT AUTHENTICATED USER

   getUser() validates the current user with Supabase Auth.

   We do not rely purely on information sitting in browser
   storage when deciding who the current user is.
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
   6. LOAD VB STAFF PROFILE

   RLS remains the security boundary.

   This query asks the database for the staff profile attached
   to the authenticated Supabase Auth identity.

   It does NOT accept a staff ID from the browser.
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
    .eq("auth_user_id", authUserId)
    .eq("is_active", true)
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
   7. STAFF IDENTITY IN THE UI

   Existing pages currently contain fictional/static staff
   labels.

   When elements with these data attributes exist, we replace
   them with authenticated values.

   This means we can update the HTML progressively instead of
   ripping all fourteen screens apart today.
   ============================================================ */

function applyStaffIdentity(user, staffProfile) {
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


  nameTargets.forEach((element) => {
    element.textContent =
      staffProfile.display_name;
  });


  codeTargets.forEach((element) => {
    element.textContent =
      staffProfile.staff_code;
  });


  emailTargets.forEach((element) => {
    element.textContent =
      user.email ?? "";
  });


  /*
    Useful for later module scripts.

    This is convenience information only.

    It is NOT an authorisation mechanism.
    Database permissions must still be enforced by RLS.
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
   9. ATTACH SIGN-OUT BUTTONS

   Any button/link on any page can become a logout control by
   adding:

       data-vb-sign-out

   Example:

       <button type="button" data-vb-sign-out>
         Sign out
       </button>
   ============================================================ */

function initialiseSignOutControls() {
  const signOutControls =
    document.querySelectorAll(
      "[data-vb-sign-out]"
    );

  signOutControls.forEach((control) => {
    control.addEventListener(
      "click",
      async (event) => {
        event.preventDefault();

        control.disabled = true;

        await signOut();
      }
    );
  });
}


/* ============================================================
   10. AUTH STATE CHANGES

   If the session disappears while VB Core is open, return the
   user to the login page.
   ============================================================ */

function watchAuthentication() {
  supabase.auth.onAuthStateChange(
    (event, session) => {
      if (
        event === "SIGNED_OUT" ||
        !session
      ) {
        redirectToLogin();
      }
    }
  );
}


/* ============================================================
   11. PROTECT APPLICATION

   Sequence:

   1. Validate Supabase Auth user
   2. Require active VB staff profile
   3. Apply identity
   4. Enable sign-out
   5. Watch session

   A valid Supabase login WITHOUT an active VB staff profile
   does not get application access.
   ============================================================ */

async function protectApplication() {
  try {

    /* --------------------------------------------------------
       Authentication
       -------------------------------------------------------- */

    const user =
      await getAuthenticatedUser();

    if (!user) {
      redirectToLogin();
      return;
    }


    /* --------------------------------------------------------
       VB staff identity
       -------------------------------------------------------- */

    const staffProfile =
      await getStaffProfile(user.id);

    if (!staffProfile) {
      console.error(
        "Authenticated user has no active VB staff profile."
      );

      await supabase.auth.signOut();

      redirectToLogin();

      return;
    }


    /* --------------------------------------------------------
       Application ready
       -------------------------------------------------------- */

    applyStaffIdentity(
      user,
      staffProfile
    );

    initialiseSignOutControls();

    watchAuthentication();


    console.info(
      `VB Core access established for ${staffProfile.staff_code}.`
    );


    /*
      Tell future module scripts that authentication and
      staff-profile loading have completed.

      Example:

      document.addEventListener(
        "vb:ready",
        (event) => {
          console.log(event.detail.staffProfile);
        }
      );
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

      If we cannot establish who this person is and whether
      they have an active VB staff profile, they do not enter.
    */

    redirectToLogin();
  }
}


/* ============================================================
   12. START
   ============================================================ */

protectApplication();


/* ============================================================
   13. EXPORTS

   Later scripts can import the same client rather than create
   their own Supabase connection.
   ============================================================ */

export {
  supabase,
  signOut
};
