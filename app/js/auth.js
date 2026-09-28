/* ============================================================
   VETERANS BACKBONE CORE
   STAFF AUTHENTICATION
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
   3. PAGE ELEMENTS
   ============================================================ */

const loginForm =
  document.getElementById("staff-login-form");

const emailInput =
  document.getElementById("email");

const passwordInput =
  document.getElementById("password");

const passwordToggle =
  document.getElementById("password-toggle");

const submitButton =
  document.getElementById("login-submit");

const messageBox =
  document.getElementById("login-message");


/* ============================================================
   4. MESSAGE HANDLING
   ============================================================ */

function showMessage(message, type = "error") {
  if (!messageBox) {
    return;
  }

  messageBox.textContent = message;

  messageBox.className =
    `login-message ${type} show`;
}


function clearMessage() {
  if (!messageBox) {
    return;
  }

  messageBox.textContent = "";

  messageBox.className =
    "login-message";
}


/* ============================================================
   5. LOADING STATE
   ============================================================ */

function setLoading(isLoading) {
  if (!submitButton) {
    return;
  }

  submitButton.disabled = isLoading;

  submitButton.textContent =
    isLoading
      ? "Signing in..."
      : "Sign in to VB Core";
}


/* ============================================================
   6. PASSWORD SHOW / HIDE
   ============================================================ */

if (passwordToggle && passwordInput) {

  passwordToggle.addEventListener(
    "click",
    () => {

      const passwordIsHidden =
        passwordInput.type === "password";

      passwordInput.type =
        passwordIsHidden
          ? "text"
          : "password";

      passwordToggle.textContent =
        passwordIsHidden
          ? "Hide"
          : "Show";

      passwordToggle.setAttribute(
        "aria-label",
        passwordIsHidden
          ? "Hide password"
          : "Show password"
      );
    }
  );
}


/* ============================================================
   7. DASHBOARD REDIRECT
   ============================================================ */

function goToDashboard() {
  window.location.replace("index.html");
}


/* ============================================================
   8. EXISTING SESSION CHECK

   If somebody already has a valid Supabase session and visits
   login.html, send them into VB Core.

   IMPORTANT:
   We only redirect when a real session exists.
   ============================================================ */

async function checkExistingSession() {

  try {

    const {
      data,
      error
    } = await supabase.auth.getSession();


    if (error) {

      console.error(
        "VB Core session check failed:",
        error
      );

      return;
    }


    if (data?.session) {

      console.info(
        "Existing VB Core session found."
      );

      goToDashboard();
    }

  } catch (error) {

    console.error(
      "Unexpected VB Core session error:",
      error
    );
  }
}


/* ============================================================
   9. STAFF SIGN IN
   ============================================================ */

async function signInStaff(
  email,
  password
) {

  const {
    data,
    error
  } = await supabase.auth.signInWithPassword({
    email,
    password
  });


  if (error) {
    throw error;
  }


  if (
    !data?.session ||
    !data?.user
  ) {

    throw new Error(
      "Supabase did not return an authenticated session."
    );
  }


  return data;
}


/* ============================================================
   10. LOGIN FORM
   ============================================================ */

if (loginForm) {

  loginForm.addEventListener(
    "submit",
    async (event) => {

      event.preventDefault();

      clearMessage();


      const email =
        emailInput?.value
          .trim();

      const password =
        passwordInput?.value;


      /* ------------------------------------------------------
         Validate input
         ------------------------------------------------------ */

      if (
        !email ||
        !password
      ) {

        showMessage(
          "Enter your email address and password."
        );

        return;
      }


      /* ------------------------------------------------------
         Sign in
         ------------------------------------------------------ */

      setLoading(true);


      try {

        const authData =
          await signInStaff(
            email,
            password
          );


        console.info(
          "VB Core authentication successful:",
          authData.user.id
        );


        showMessage(
          "Signed in. Opening VB Core...",
          "success"
        );


        /*
          Redirect directly after authentication.

          The dashboard's app.js is responsible for validating
          the authenticated staff profile and deciding whether
          application access is permitted.
        */

        window.setTimeout(
          () => {
            goToDashboard();
          },
          300
        );


      } catch (error) {

        console.error(
          "VB Core sign-in failed:",
          error
        );


        /*
          Keep the visible message deliberately generic.

          We don't reveal whether a particular staff account
          exists.
        */

        showMessage(
          "Unable to sign in. Check your details and try again."
        );


      } finally {

        setLoading(false);
      }
    }
  );
}


/* ============================================================
   11. AUTH EVENT LOGGING

   Login page does NOT perform redirects from auth events.

   Redirect decisions are made explicitly by:
   - successful login
   - existing-session check

   This prevents auth-state events fighting with app.js.
   ============================================================ */

supabase.auth.onAuthStateChange(
  (event) => {

    if (event === "SIGNED_IN") {

      console.info(
        "VB Core auth event: SIGNED_IN"
      );
    }


    if (event === "SIGNED_OUT") {

      console.info(
        "VB Core auth event: SIGNED_OUT"
      );
    }
  }
);


/* ============================================================
   12. INITIALISE LOGIN PAGE
   ============================================================ */

checkExistingSession();


/* ============================================================
   13. EXPORT
   ============================================================ */

export { supabase };
