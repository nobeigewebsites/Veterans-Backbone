/* ============================================================
   VETERANS BACKBONE CORE
   STAFF AUTHENTICATION

   Browser-side Supabase Auth only.

   IMPORTANT:
   - Publishable key only.
   - NEVER put a secret/service_role key in this file.
   ============================================================ */

import { createClient } from
  "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";


/* ============================================================
   1. SUPABASE CONFIGURATION
   ============================================================

   We will replace these two placeholders with the project's
   public browser-safe values in the next step.
   ============================================================ */

const SUPABASE_URL = "https://jygyriqtiuxjlcltpks.supabase.co";

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
   4. CONFIG CHECK
   ============================================================ */

function configurationIsReady() {
  return (
    SUPABASE_URL &&
    SUPABASE_PUBLISHABLE_KEY &&
    SUPABASE_URL !== "YOUR_SUPABASE_URL" &&
    SUPABASE_PUBLISHABLE_KEY !==
      "YOUR_SUPABASE_PUBLISHABLE_KEY"
  );
}


/* ============================================================
   5. MESSAGE HANDLING
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

  messageBox.className = "login-message";
}


/* ============================================================
   6. LOADING STATE
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
   7. PASSWORD SHOW / HIDE
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
   8. REDIRECT
   ============================================================ */

function goToDashboard() {
  window.location.replace("index.html");
}


/* ============================================================
   9. CHECK FOR EXISTING SESSION
   ============================================================ */

async function checkExistingSession() {
  if (!configurationIsReady()) {
    return;
  }

  try {
    const {
      data,
      error
    } = await supabase.auth.getSession();

    if (error) {
      console.error(
        "Unable to check existing session:",
        error
      );

      return;
    }

    if (data.session) {
      goToDashboard();
    }
  } catch (error) {
    console.error(
      "Unexpected session check error:",
      error
    );
  }
}


/* ============================================================
   10. LOGIN
   ============================================================ */

async function signInStaff(email, password) {
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

  if (!data.session || !data.user) {
    throw new Error(
      "No authenticated session was returned."
    );
  }

  return data;
}


/* ============================================================
   11. FORM SUBMISSION
   ============================================================ */

if (loginForm) {
  loginForm.addEventListener(
    "submit",
    async (event) => {
      event.preventDefault();

      clearMessage();


      /* ----------------------------------------
         Configuration
         ---------------------------------------- */

      if (!configurationIsReady()) {
        showMessage(
          "VB Core authentication has not been connected yet."
        );

        return;
      }


      /* ----------------------------------------
         Input
         ---------------------------------------- */

      const email =
        emailInput?.value.trim();

      const password =
        passwordInput?.value;


      if (!email || !password) {
        showMessage(
          "Enter your email address and password."
        );

        return;
      }


      /* ----------------------------------------
         Authenticate
         ---------------------------------------- */

      setLoading(true);

      try {
        await signInStaff(
          email,
          password
        );

        showMessage(
          "Signed in. Opening VB Core...",
          "success"
        );

        /*
          Small pause purely so the success state
          doesn't disappear instantly.
        */

        window.setTimeout(
          goToDashboard,
          350
        );

      } catch (error) {
        console.error(
          "VB Core sign-in failed:",
          error
        );

        /*
          Deliberately generic.

          We do not tell somebody whether an
          account exists.
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
   12. AUTH STATE LISTENER
   ============================================================ */

if (configurationIsReady()) {
  supabase.auth.onAuthStateChange(
    (event, session) => {
      if (
        event === "SIGNED_IN" &&
        session
      ) {
        console.info(
          "VB Core authenticated session established."
        );
      }

      if (event === "SIGNED_OUT") {
        console.info(
          "VB Core session ended."
        );
      }
    }
  );
}


/* ============================================================
   13. INITIALISE
   ============================================================ */

checkExistingSession();


/* ============================================================
   14. EXPORT CLIENT

   Other VB Core modules will eventually import this client
   rather than creating duplicate Supabase clients everywhere.
   ============================================================ */

export { supabase };
