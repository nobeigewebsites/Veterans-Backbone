/* =========================================================
   VETERANS BACKBONE CORE
   Assurance Queue
   Live read-only assurance workspace
   ========================================================= */

let supabase = null;
let currentUser = null;
let currentStaffProfile = null;

let assuranceItems = [];
let filteredItems = [];
let selectedItemId = null;


/* =========================================================
   DISPLAY MAPS

   Database values remain untouched.
   These maps only translate them for humans in the UI.
   ========================================================= */

const STATUS_LABELS = {
  raised: "Open",
  acknowledged: "Acknowledged",
  assessed: "Assessed",
  resolved: "Resolved",
  closed: "Closed"
};

const SEVERITY_LABELS = {
  ACTION: "Needs review",
  INFO: "Information",
  WARNING: "Attention",
  CRITICAL: "Critical"
};

const SOURCE_LABELS = {
  RULE: "Deterministic system rule",
  WORKFLOW: "Workflow control",
  HUMAN: "Human raised",
  AI: "AI assurance"
};


/* =========================================================
   SMALL HELPERS
   ========================================================= */

function setText(id, value) {
  const element = document.getElementById(id);

  if (element) {
    element.textContent = value ?? "";
  }
}


function normalise(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase();
}


function friendlyStatus(value) {
  return STATUS_LABELS[value] ?? value ?? "Unknown";
}


function friendlySeverity(value) {
  return SEVERITY_LABELS[value] ?? value ?? "Unknown";
}


function friendlySource(value) {
  return SOURCE_LABELS[value] ?? value ?? "Unknown source";
}


function formatDate(value) {
  if (!value) {
    return "Not recorded";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Not recorded";
  }

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  }).format(date);
}


function safeContextValue(value) {
  return value || null;
}


function isOpenItem(item) {
  return !["resolved", "closed"].includes(
    normalise(item.item_status)
  );
}


function isAssignedToMe(item) {
  if (!currentStaffProfile?.id) {
    return false;
  }

  return item.assigned_to_staff_id === currentStaffProfile.id;
}


/* =========================================================
   LOAD ASSURANCE QUEUE
   ========================================================= */

async function loadAssuranceQueue() {
  const { data, error } = await supabase
    .from("assurance_queue")
    .select(`
      id,
      assurance_code,
      source_type,
      rule_code,
      assurance_area,
      severity,
      item_status,
      item_title,
      item_summary,
      detection_reason,
      organisation_id,
      site_id,
      case_id,
      veteran_id,
      referral_id,
      policy_version_id,
      human_decision_required,
      assigned_to_staff_id,
      raised_at,
      acknowledged_at,
      assessed_at,
      human_decision,
      decision_rationale,
      decided_at,
      decided_by_staff_id,
      action_required,
      action_taken,
      outcome_summary,
      resolved_at,
      closed_at,
      created_at,
      updated_at
    `)
    .order("raised_at", {
      ascending: false
    });

  if (error) {
    throw error;
  }

  assuranceItems = Array.isArray(data) ? data : [];

  updateSummary();
  populateFilterOptions();
  applyFilters();

  console.log(
    `Assurance Queue loaded: ${assuranceItems.length} permitted item(s).`
  );
}


/* =========================================================
   SUMMARY
   ========================================================= */

function updateSummary() {
  const openItems = assuranceItems.filter(isOpenItem);

  const reviewDue = openItems.filter((item) =>
    item.human_decision_required === true
  );

  const referralFindings = openItems.filter((item) =>
    normalise(item.assurance_area) === "referrals"
  );

  /*
   The current assurance_queue view does not expose a dedicated
   assessment deadline/due-at column.

   We therefore do NOT invent an overdue calculation.
   This remains zero until the database exposes a real field
   that can support the calculation.
  */
  const overdueAssessments = 0;

  setText(
    "assurance-open-count",
    openItems.length
  );

  setText(
    "assurance-review-count",
    reviewDue.length
  );

  setText(
    "assurance-referral-count",
    referralFindings.length
  );

  setText(
    "assurance-overdue-count",
    overdueAssessments
  );

  setText(
    "assurance-nav-count",
    openItems.length
  );
}


/* =========================================================
   FILTER OPTIONS
   ========================================================= */

function populateFilterOptions() {
  const statusSelect =
    document.getElementById("assurance-status");

  const sourceSelect =
    document.getElementById("assurance-source");

  if (statusSelect) {
    statusSelect.innerHTML = "";

    const options = [
      ["open-items", "Open items"],
      ["all", "All statuses"]
    ];

    const statuses = [
      ...new Set(
        assuranceItems
          .map((item) => item.item_status)
          .filter(Boolean)
      )
    ].sort();

    statuses.forEach((status) => {
      options.push([
        status,
        friendlyStatus(status)
      ]);
    });

    options.forEach(([value, label]) => {
      const option =
        document.createElement("option");

      option.value = value;
      option.textContent = label;

      statusSelect.appendChild(option);
    });

    statusSelect.value = "open-items";
  }


  if (sourceSelect) {
    sourceSelect.innerHTML = "";

    const allOption =
      document.createElement("option");

    allOption.value = "all";
    allOption.textContent = "All sources";

    sourceSelect.appendChild(allOption);

    const sources = [
      ...new Set(
        assuranceItems
          .map((item) => item.source_type)
          .filter(Boolean)
      )
    ].sort();

    sources.forEach((source) => {
      const option =
        document.createElement("option");

      option.value = source;
      option.textContent =
        friendlySource(source);

      sourceSelect.appendChild(option);
    });

    sourceSelect.value = "all";
  }
}


/* =========================================================
   FILTERING
   ========================================================= */

function applyFilters() {
  const searchValue = normalise(
    document.getElementById("assurance-search")?.value
  );

  const statusValue =
    document.getElementById("assurance-status")?.value
    ?? "open-items";

  const sourceValue =
    document.getElementById("assurance-source")?.value
    ?? "all";

  const ownerValue =
    document.getElementById("assurance-owner")?.value
    ?? "anyone";


  filteredItems = assuranceItems.filter((item) => {

    /* -------------------------
       SEARCH
       ------------------------- */

    if (searchValue) {
      const searchable = [
        item.assurance_code,
        item.item_title,
        item.item_summary,
        item.detection_reason,
        item.rule_code,
        item.assurance_area,
        item.case_id,
        item.veteran_id,
        item.referral_id,
        item.source_type,
        item.severity,
        item.item_status
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      if (!searchable.includes(searchValue)) {
        return false;
      }
    }


    /* -------------------------
       STATUS
       ------------------------- */

    if (
      statusValue === "open-items"
      && !isOpenItem(item)
    ) {
      return false;
    }

    if (
      statusValue !== "open-items"
      && statusValue !== "all"
      && item.item_status !== statusValue
    ) {
      return false;
    }


    /* -------------------------
       SOURCE
       ------------------------- */

    if (
      sourceValue !== "all"
      && item.source_type !== sourceValue
    ) {
      return false;
    }


    /* -------------------------
       OWNER
       ------------------------- */

    if (
      ownerValue === "mine"
      && !isAssignedToMe(item)
    ) {
      return false;
    }

    if (
      ownerValue === "unassigned"
      && item.assigned_to_staff_id
    ) {
      return false;
    }


    return true;
  });


  renderAssuranceItems();
}


/* =========================================================
   RENDER QUEUE
   ========================================================= */

function renderAssuranceItems() {
  const container =
    document.getElementById("assurance-item-list");

  if (!container) {
    return;
  }

  container.replaceChildren();

  setText(
    "assurance-item-note",
    `${filteredItems.length} ${
      filteredItems.length === 1
        ? "item"
        : "items"
    }`
  );


  if (filteredItems.length === 0) {
    const empty =
      document.createElement("div");

    empty.className =
      "assurance-empty-state";

    const heading =
      document.createElement("strong");

    heading.textContent =
      "No assurance items match these filters.";

    const text =
      document.createElement("p");

    text.textContent =
      "Try changing the search or filter options.";

    empty.append(
      heading,
      text
    );

    container.appendChild(empty);

    clearFindingDetail();

    return;
  }


  filteredItems.forEach((item) => {
    container.appendChild(
      buildAssuranceCard(item)
    );
  });


  const selectedStillVisible =
    filteredItems.some(
      (item) => item.id === selectedItemId
    );

  if (!selectedStillVisible) {
    selectAssuranceItem(
      filteredItems[0].id,
      false
    );
  }
}


/* =========================================================
   BUILD ONE ASSURANCE CARD

   Database-derived values are inserted with textContent.
   ========================================================= */

function buildAssuranceCard(item) {
  const article =
    document.createElement("article");

  article.className =
    "assurance-item-card";

  if (
    item.human_decision_required === true
    || normalise(item.item_status) === "raised"
  ) {
    article.classList.add("warning");
  }

  article.dataset.assuranceId = item.id;


  /* -------------------------
     SYMBOL
     ------------------------- */

  const symbol =
    document.createElement("div");

  symbol.className =
    "assurance-item-symbol";

  symbol.textContent = "!";


  /* -------------------------
     MAIN
     ------------------------- */

  const main =
    document.createElement("div");

  main.className =
    "assurance-item-main";


  const heading =
    document.createElement("div");

  heading.className =
    "assurance-item-heading";


  const headingText =
    document.createElement("div");


  const recordLabel =
    document.createElement("span");

  recordLabel.className =
    "record-label";

  recordLabel.textContent =
    `ASSURANCE ITEM · ${item.assurance_code ?? "NO CODE"}`;


  const title =
    document.createElement("h3");

  title.textContent =
    item.item_title
    || "Assurance item";


  headingText.append(
    recordLabel,
    title
  );


  const statusTag =
    document.createElement("span");

  statusTag.className =
    "tag warning";

  statusTag.textContent =
    item.human_decision_required
      ? "NEEDS REVIEW"
      : friendlySeverity(item.severity).toUpperCase();


  heading.append(
    headingText,
    statusTag
  );


  const summary =
    document.createElement("p");

  summary.textContent =
    item.item_summary
    || item.detection_reason
    || "This assurance item requires review.";


  /* -------------------------
     CONTEXT
     ------------------------- */

  const context =
    document.createElement("div");

  context.className =
    "assurance-context";


  const contextValues = [];

  if (item.case_id) {
    contextValues.push(
      `Case · ${item.case_id}`
    );
  }

  if (item.referral_id) {
    contextValues.push(
      `Referral · ${item.referral_id}`
    );
  }

  if (item.veteran_id) {
    contextValues.push(
      `Veteran · ${item.veteran_id}`
    );
  }

  if (item.site_id) {
    contextValues.push(
      `Site · ${item.site_id}`
    );
  }

  if (contextValues.length === 0) {
    contextValues.push(
      "No linked record"
    );
  }

  contextValues.forEach((value) => {
    const span =
      document.createElement("span");

    span.textContent = value;

    context.appendChild(span);
  });


  /* -------------------------
     SOURCE
     ------------------------- */

  const sourceBox =
    document.createElement("div");

  sourceBox.className =
    "assurance-source-box";


  const sourceLabel =
    document.createElement("span");

  sourceLabel.className =
    "record-label";

  sourceLabel.textContent =
    "SOURCE";


  const sourceName =
    document.createElement("strong");

  sourceName.textContent =
    friendlySource(item.source_type);


  const rule =
    document.createElement("span");

  rule.textContent =
    item.rule_code
    || "No rule code";


  sourceBox.append(
    sourceLabel,
    sourceName,
    rule
  );


  main.append(
    heading,
    summary,
    context,
    sourceBox
  );


  /* -------------------------
     SIDE
     ------------------------- */

  const side =
    document.createElement("div");

  side.className =
    "assurance-item-side";


  const createdBlock =
    document.createElement("div");

  const createdLabel =
    document.createElement("span");

  createdLabel.className =
    "record-label";

  createdLabel.textContent =
    "CREATED";


  const createdValue =
    document.createElement("strong");

  createdValue.textContent =
    formatDate(
      item.raised_at
      || item.created_at
    );


  createdBlock.append(
    createdLabel,
    createdValue
  );


  const statusBlock =
    document.createElement("div");

  const itemStatusLabel =
    document.createElement("span");

  itemStatusLabel.className =
    "record-label";

  itemStatusLabel.textContent =
    "STATUS";


  const itemStatusValue =
    document.createElement("strong");

  itemStatusValue.textContent =
    friendlyStatus(item.item_status);


  statusBlock.append(
    itemStatusLabel,
    itemStatusValue
  );


  side.append(
    createdBlock,
    statusBlock
  );


  /* -------------------------
     VIEW BUTTON

     Read-only for this phase.
     ------------------------- */

  const button =
    document.createElement("button");

  button.className =
    "primary-button";

  button.type =
    "button";

  button.textContent =
    "Review";

  button.addEventListener(
    "click",
    () => {
      selectAssuranceItem(
        item.id,
        true
      );
    }
  );


  article.append(
    symbol,
    main,
    side,
    button
  );


  return article;
}


/* =========================================================
   SELECT / DISPLAY FINDING
   ========================================================= */

function selectAssuranceItem(
  itemId,
  scrollToDetail = false
) {
  const item =
    assuranceItems.find(
      (record) => record.id === itemId
    );

  if (!item) {
    return;
  }

  selectedItemId = item.id;

  renderFindingDetail(item);


  document
    .querySelectorAll(
      ".assurance-item-card"
    )
    .forEach((card) => {
      card.classList.toggle(
        "selected",
        card.dataset.assuranceId === item.id
      );
    });


  if (scrollToDetail) {
    document
      .getElementById(
        "assurance-finding-detail"
      )
      ?.scrollIntoView({
        behavior: "smooth",
        block: "start"
      });
  }
}


/* =========================================================
   FINDING DETAIL
   ========================================================= */

function renderFindingDetail(item) {
  const panel =
    document.getElementById(
      "assurance-finding-panel"
    );

  if (panel) {
    panel.hidden = false;
  }


  setText(
    "assurance-detail-code",
    item.assurance_code
    || "Assurance item"
  );

  setText(
    "assurance-detail-title",
    item.item_title
    || "Assurance item"
  );

  setText(
    "assurance-detail-status",
    friendlyStatus(
      item.item_status
    ).toUpperCase()
  );

  setText(
    "assurance-detail-rule",
    item.rule_code
    || "Not rule generated"
  );

  setText(
    "assurance-detail-source",
    friendlySource(
      item.source_type
    )
  );

  setText(
    "assurance-detail-context",
    item.assurance_area
      ? item.assurance_area
          .replaceAll("_", " ")
          .replace(/\b\w/g, (letter) =>
            letter.toUpperCase()
          )
      : "General assurance"
  );

  setText(
    "assurance-detail-created",
    formatDate(
      item.raised_at
      || item.created_at
    )
  );

  setText(
    "assurance-detail-reason",
    item.detection_reason
    || item.item_summary
    || "No additional detection reason was recorded."
  );


  const veteranLink =
    document.getElementById(
      "assurance-veteran-link"
    );

  if (veteranLink) {
    if (item.veteran_id) {
      veteranLink.hidden = false;

      /*
       Veteran-record deep linking can be expanded when
       that module is wired to live records.
      */
      veteranLink.href =
        "veteran-record.html#assurance";
    } else {
      veteranLink.hidden = true;
    }
  }


  const beginButton =
    document.getElementById(
      "assurance-begin-assessment"
    );

  if (beginButton) {
    beginButton.disabled = true;
    beginButton.textContent =
      "Assessment actions coming next";
  }
}


function clearFindingDetail() {
  selectedItemId = null;

  const panel =
    document.getElementById(
      "assurance-finding-panel"
    );

  if (panel) {
    panel.hidden = true;
  }
}


/* =========================================================
   FILTER EVENTS
   ========================================================= */

function initialiseFilters() {
  const search =
    document.getElementById(
      "assurance-search"
    );

  const status =
    document.getElementById(
      "assurance-status"
    );

  const source =
    document.getElementById(
      "assurance-source"
    );

  const owner =
    document.getElementById(
      "assurance-owner"
    );


  search?.addEventListener(
    "input",
    applyFilters
  );

  status?.addEventListener(
    "change",
    applyFilters
  );

  source?.addEventListener(
    "change",
    applyFilters
  );

  owner?.addEventListener(
    "change",
    applyFilters
  );
}


/* =========================================================
   LOADING / ERROR STATE
   ========================================================= */

function showLoadingState() {
  const container =
    document.getElementById(
      "assurance-item-list"
    );

  if (!container) {
    return;
  }

  container.replaceChildren();

  const message =
    document.createElement("p");

  message.textContent =
    "Loading assurance queue…";

  container.appendChild(message);
}


function showErrorState(error) {
  console.error(
    "Unable to load Assurance Queue:",
    error
  );

  const container =
    document.getElementById(
      "assurance-item-list"
    );

  if (!container) {
    return;
  }

  container.replaceChildren();

  const message =
    document.createElement("div");

  message.className =
    "assurance-empty-state";


  const heading =
    document.createElement("strong");

  heading.textContent =
    "Assurance Queue could not be loaded.";


  const text =
    document.createElement("p");

  text.textContent =
    "No assurance decision has been made. Refresh the page or contact an authorised administrator if the problem continues.";


  message.append(
    heading,
    text
  );

  container.appendChild(message);

  setText(
    "assurance-item-note",
    "Unable to load"
  );

  clearFindingDetail();
}


/* =========================================================
   INITIALISE

   app.js authenticates the user and verifies the active
   staff profile first.

   It then dispatches vb:ready.
   ========================================================= */

window.addEventListener(
  "vb:ready",
  async (event) => {
    try {
      supabase =
        event.detail?.supabase;

      currentUser =
        event.detail?.user;

      currentStaffProfile =
        event.detail?.staffProfile;


      if (
        !supabase
        || !currentUser
        || !currentStaffProfile
      ) {
        throw new Error(
          "VB Core authentication context is unavailable."
        );
      }


      initialiseFilters();
      showLoadingState();

      await loadAssuranceQueue();

    } catch (error) {
      showErrorState(error);
    }
  },
  {
    once: true
  }
);
