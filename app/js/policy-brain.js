/* ============================================================
   VETERANS BACKBONE CORE
   POLICY BRAIN MODULE

   Responsibilities:
   - Wait for authenticated VB Core application context
   - Use the authenticated Supabase client supplied by app.js
   - Load Policy Brain data from the database
   - Update Policy Brain interface values
   - Surface genuine policy gaps from live DEV data

   Security:
   - app.js establishes authenticated staff identity
   - Supabase RLS remains the database security boundary
   - This module does not determine permissions itself
   - No service-role credentials belong in browser code
   ============================================================ */


/* ============================================================
   1. MODULE STATE
   ============================================================ */

let supabase = null;
let currentUser = null;
let currentStaffProfile = null;


/* ============================================================
   2. POLICY BRAIN INITIALISATION

   This function runs only after app.js has:

   - validated the Supabase user
   - confirmed an active VB staff profile
   - dispatched the vb:ready event
   ============================================================ */

async function initialisePolicyBrain(event) {

  try {

    const {
      user,
      staffProfile,
      supabase: authenticatedSupabase
    } = event.detail;


    if (
      !user ||
      !staffProfile ||
      !authenticatedSupabase
    ) {

      throw new Error(
        "Policy Brain received incomplete VB Core application context."
      );
    }


    supabase =
      authenticatedSupabase;

    currentUser =
      user;

    currentStaffProfile =
      staffProfile;


    console.info(
      `Policy Brain initialising for ${currentStaffProfile.staff_code}.`
    );


    /*
       LIVE POLICY BRAIN DATABASE READS
       WILL BE ADDED HERE.

       We deliberately do not invent table/view names,
       columns or status values.

       Actual schema will be verified first.
    */


    console.info(
      "Policy Brain module ready."
    );


  } catch (error) {

    console.error(
      "Policy Brain initialisation failed:",
      error
    );
  }
}


/* ============================================================
   3. WAIT FOR VB CORE

   app.js dispatches vb:ready only after authentication
   and active staff-profile validation succeed.
   ============================================================ */

document.addEventListener(
  "vb:ready",
  initialisePolicyBrain,
  {
    once: true
  }
);


/* ============================================================
   4. EXPORT MODULE CONTEXT

   These exports are available for future Policy Brain
   functionality without exposing credentials or bypassing RLS.
   ============================================================ */

export {
  initialisePolicyBrain
};
