/* ============================================================
   VETERANS BACKBONE CORE
   POLICY BRAIN — LIVE DATA MODULE

   Reads authenticated Policy Brain data from Supabase.
   app.js remains responsible for authentication and staff access.
   Supabase RLS remains the security boundary.
   ============================================================ */

let supabase = null;


/* ============================================================
   HELPERS
   ============================================================ */

function setText(id, value) {
  const element = document.getElementById(id);

  if (element) {
    element.textContent = value;
  }
}


function setGapVisibility(sourceMissingCount) {
  const gapSection = document.getElementById("policy-source-gap-section");

  if (!gapSection) {
    return;
  }

  gapSection.hidden = sourceMissingCount === 0;
}


/* ============================================================
   LOAD POLICY MAPPING DATA
   ============================================================ */

async function loadPolicyMapping() {

  const { data, error } = await supabase
    .from("policy_mapping_audit")
    .select(
      "policy_code, policy_name, mapping_status, requirement_count"
    );

  if (error) {
    throw error;
  }


  const policies = data ?? [];

  const statusCounts = {
    MAPPED: 0,
    PARTIAL: 0,
    REVIEW_REQUIRED: 0,
    SOURCE_MISSING: 0
  };


  for (const policy of policies) {

    if (
      Object.prototype.hasOwnProperty.call(
        statusCounts,
        policy.mapping_status
      )
    ) {
      statusCounts[policy.mapping_status] += 1;
    }
  }


  const totalPolicies = policies.length;

  const mapped =
    statusCounts.MAPPED;

  const partial =
    statusCounts.PARTIAL;

  const reviewRequired =
    statusCounts.REVIEW_REQUIRED;

  const sourceMissing =
    statusCounts.SOURCE_MISSING;


  setText(
    "policy-active-count",
    totalPolicies
  );

  setText(
    "policy-mapped-count",
    mapped
  );

  setText(
    "policy-mapped-summary",
    `${mapped} of ${totalPolicies}`
  );

  setText(
    "policy-health-ratio",
    `${mapped} / ${totalPolicies}`
  );

  setText(
    "policy-health-mapped",
    mapped
  );

  setText(
    "policy-health-partial",
    partial
  );

  setText(
    "policy-health-review",
    reviewRequired
  );

  setText(
    "policy-health-source-missing",
    sourceMissing
  );


  setGapVisibility(
    sourceMissing
  );

   /* ============================================================
   BUILD LIVE POLICY REGISTER
   ============================================================ */

const policyRegisterBody =
  document.getElementById("policy-register-body");


setText(
  "policy-register-count",
  `${totalPolicies} active policies`
);


if (policyRegisterBody) {

  policyRegisterBody.innerHTML = "";


  const sortedPolicies =
    [...policies].sort(
      (a, b) =>
        a.policy_name.localeCompare(
          b.policy_name
        )
    );


  for (const policy of sortedPolicies) {

    const row =
      document.createElement("tr");


    const mappingClass =
      policy.mapping_status === "MAPPED"
        ? "complete"
        : "warning";


    const displayStatus =
      policy.mapping_status
        .replaceAll("_", " ");


    row.innerHTML = `
      <td>
        <div class="policy-name-cell">

          <strong></strong>

          <span></span>

        </div>
      </td>

      <td>
        <span class="status-pill active">
          Active
        </span>
      </td>

      <td>
        <span class="tag ${mappingClass}">
        </span>
      </td>

      <td class="policy-requirement-value">
      </td>

      <td>
        Current
      </td>

      <td>
        <button
          class="row-button"
          type="button"
          disabled
          title="Policy detail view not yet connected"
        >
          Open
        </button>
      </td>
    `;


    row
      .querySelector(".policy-name-cell strong")
      .textContent =
        policy.policy_name;


    row
      .querySelector(".policy-name-cell span")
      .textContent =
        policy.policy_code;


    row
      .querySelector(".tag")
      .textContent =
        displayStatus;


    row
      .querySelector(".policy-requirement-value")
      .textContent =
        policy.requirement_count;


    policyRegisterBody.appendChild(
      row
    );
  }
}

  const welfare = policies.find(
    policy =>
      policy.policy_code === "WELFARE_ENGAGEMENT"
  );


  if (welfare) {

    setText(
      "welfare-mapping-status",
      welfare.mapping_status
    );

    setText(
      "welfare-requirement-count",
      welfare.requirement_count
    );
  }


  return policies;
}


/* ============================================================
   LOAD REQUIREMENT TOTALS
   ============================================================ */

async function loadRequirementTotals() {

  const { data, error } = await supabase
    .from("policy_requirements")
    .select(
      "system_enforceable"
    )
    .eq(
      "is_active",
      true
    );


  if (error) {
    throw error;
  }


  const requirements =
    data ?? [];


  const activeRequirements =
    requirements.length;


  const systemEnforceable =
    requirements.filter(
      requirement =>
        requirement.system_enforceable === true
    ).length;


  const otherRequirements =
    activeRequirements - systemEnforceable;


  setText(
    "policy-requirement-count",
    activeRequirements
  );

  setText(
    "requirement-inventory-count",
    `${activeRequirements} active requirements`
  );

  setText(
    "requirement-total",
    activeRequirements
  );

  setText(
    "system-enforceable-summary",
    systemEnforceable
  );

  setText(
    "system-enforceable-total",
    systemEnforceable
  );

  setText(
    "system-enforceable-note",
    `${systemEnforceable} system-enforceable requirements`
  );

  setText(
    "human-led-total",
    otherRequirements
  );
}


/* ============================================================
   LOAD IMPLEMENTATION PLAN
   ============================================================ */

async function loadImplementationPlan() {

  const { data, error } = await supabase
    .from("policy_implementation_plan")
    .select(
      "proposed_implementation_route"
    );


  if (error) {
    throw error;
  }


  const routeCounts = {
    access_or_system_control_candidate: 0,
    deterministic_rule_candidate: 0,
    assurance_trigger_candidate: 0,
    workflow_control_candidate: 0,
    human_led_with_system_support: 0
  };


  for (const requirement of data ?? []) {

    const route =
      requirement.proposed_implementation_route;


    if (
      Object.prototype.hasOwnProperty.call(
        routeCounts,
        route
      )
    ) {
      routeCounts[route] += 1;
    }
  }


  setText(
    "implementation-access-count",
    routeCounts.access_or_system_control_candidate
  );

  setText(
    "implementation-rule-count",
    routeCounts.deterministic_rule_candidate
  );

  setText(
    "implementation-assurance-count",
    routeCounts.assurance_trigger_candidate
  );

  setText(
    "implementation-workflow-count",
    routeCounts.workflow_control_candidate
  );

  setText(
    "implementation-human-count",
    routeCounts.human_led_with_system_support
  );
}


/* ============================================================
   INITIALISE POLICY BRAIN
   ============================================================ */

async function initialisePolicyBrain(event) {

  try {

    const {
      supabase: authenticatedSupabase
    } = event.detail;


    if (!authenticatedSupabase) {
      throw new Error(
        "Authenticated Supabase client was not supplied."
      );
    }


    supabase =
      authenticatedSupabase;


    await Promise.all([
      loadPolicyMapping(),
      loadRequirementTotals(),
      loadImplementationPlan()
    ]);


    console.info(
      "Policy Brain live data loaded."
    );


  } catch (error) {

    console.error(
      "Policy Brain live data failed:",
      error
    );
  }
}


/* ============================================================
   WAIT FOR AUTHENTICATED VB CORE
   ============================================================ */

document.addEventListener(
  "vb:ready",
  initialisePolicyBrain,
  {
    once: true
  }
);
