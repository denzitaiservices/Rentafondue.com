
/* =========================================================
   CURRENT YEAR
========================================================= */

function initCurrentYear() {
  const yearElement = document.getElementById("currentYear");

  if (yearElement) {
    yearElement.textContent = new Date().getFullYear();
  }
}


/* =========================================================
   COUNTRY DETECTION
   Requires Cloudflare endpoint:
   /api/country

   Expected response:
   {
     "country": "CH"
   }
========================================================= */

async function initCountryDetection() {
  const popup = document.getElementById("swissPopup");
  const stayInternationalButton =
    document.getElementById("stayInternational");

  if (!popup) {
    return;
  }

  /*
    We only show the Switzerland question once per browser session.
  */
  const popupAlreadyHandled =
    sessionStorage.getItem("raf_country_popup_handled") === "true";

  if (stayInternationalButton) {
    stayInternationalButton.addEventListener("click", () => {
      closeSwissPopup();
      sessionStorage.setItem("raf_country_popup_handled", "true");
    });
  }

  /*
    Optional:
    Clicking the dark background also closes the popup.
  */
  const backdrop = popup.querySelector(".country-popup__backdrop");

  if (backdrop) {
    backdrop.addEventListener("click", () => {
      closeSwissPopup();
      sessionStorage.setItem("raf_country_popup_handled", "true");
    });
  }

  /*
    ESC closes the popup.
  */
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && popup.classList.contains("active")) {
      closeSwissPopup();
      sessionStorage.setItem("raf_country_popup_handled", "true");
    }
  });

  /*
    If visitor has already answered during this session,
    don't call the API again.
  */
  if (popupAlreadyHandled) {
    return;
  }

  try {
    const response = await fetch("/api/country", {
      method: "GET",
      headers: {
        Accept: "application/json"
      },
      cache: "no-store"
    });

    if (!response.ok) {
      throw new Error(`Country API returned ${response.status}`);
    }

    const data = await response.json();

    const countryCode =
      typeof data.country === "string"
        ? data.country.toUpperCase().trim()
        : "";

    /*
      Store detected country for use in the contact form.
    */
    if (countryCode) {
      sessionStorage.setItem("raf_detected_country", countryCode);
      addDetectedCountryToForm(countryCode);
    }

    /*
      Switzerland:
      Ask whether the visitor wants to switch to rentafondue.ch.
      Do NOT redirect automatically.
    */
    if (countryCode === "CH") {
      openSwissPopup();
    }

  } catch (error) {
    console.warn("RentaFondue country detection unavailable:", error);
  }
}


function openSwissPopup() {
  const popup = document.getElementById("swissPopup");

  if (!popup) {
    return;
  }

  popup.classList.add("active");
  popup.setAttribute("aria-hidden", "false");
  document.body.classList.add("popup-open");

  const firstButton = popup.querySelector("a, button");

  if (firstButton) {
    setTimeout(() => firstButton.focus(), 50);
  }
}


function closeSwissPopup() {
  const popup = document.getElementById("swissPopup");

  if (!popup) {
    return;
  }

  popup.classList.remove("active");
  popup.setAttribute("aria-hidden", "true");
  document.body.classList.remove("popup-open");
}


function addDetectedCountryToForm(countryCode) {
  const form = document.getElementById("contactForm");

  if (!form) {
    return;
  }

  let hiddenCountry =
    form.querySelector('input[name="detected_country"]');

  if (!hiddenCountry) {
    hiddenCountry = document.createElement("input");
    hiddenCountry.type = "hidden";
    hiddenCountry.name = "detected_country";
    form.appendChild(hiddenCountry);
  }

  hiddenCountry.value = countryCode;
}


/* =========================================================
   CONTACT FORM

   IMPORTANT:
   Replace DEINE_FORM_ID below with your Formspree ID.

   Example:
   https://formspree.io/f/abcdwxyz
========================================================= */

function initContactForm() {
  const form = document.getElementById("contactForm");

  if (!form) {
    return;
  }

  const submitButton =
    document.getElementById("submitButton") ||
    form.querySelector('button[type="submit"]');

  const successMessage =
    document.getElementById("formSuccess");

  const errorMessage =
    document.getElementById("formError");

  /*
    >>> CHANGE THIS <<<
  */
  const FORM_ENDPOINT =
    "https://formspree.io/f/DEINE_FORM_ID";


  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    hideFormMessages(successMessage, errorMessage);

    /*
      Browser validation first.
    */
    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    /*
      Prevent accidental configuration errors.
    */
    if (FORM_ENDPOINT.includes("DEINE_FORM_ID")) {
      console.error(
        "Please add your Formspree form ID in public/js/script.js"
      );

      showFormError(
        errorMessage,
        "The contact form is not fully configured yet."
      );

      return;
    }

    setSubmittingState(submitButton, true);

    try {
      const formData = new FormData(form);

      /*
        Add useful technical information to the email.
      */
      formData.set(
        "detected_country",
        sessionStorage.getItem("raf_detected_country") || "UNKNOWN"
      );

      formData.set(
        "website",
        "rentafondue.com"
      );

      formData.set(
        "page_url",
        window.location.href
      );

      const response = await fetch(FORM_ENDPOINT, {
        method: "POST",
        body: formData,
        headers: {
          Accept: "application/json"
        }
      });

      if (!response.ok) {
        let serverMessage = "";

        try {
          const result = await response.json();

          if (result && Array.isArray(result.errors)) {
            serverMessage = result.errors
              .map((error) => error.message)
              .filter(Boolean)
              .join(" ");
          }
        } catch (_) {
          // Ignore JSON parsing errors and show generic error below.
        }

        throw new Error(
          serverMessage || `Form request failed (${response.status})`
        );
      }

      /*
        Success
      */
      form.reset();

      if (successMessage) {
        successMessage.hidden = false;
      }

      if (errorMessage) {
        errorMessage.hidden = true;
      }

      /*
        Keep detected country attached after form.reset().
      */
      const detectedCountry =
        sessionStorage.getItem("raf_detected_country");

      if (detectedCountry) {
        addDetectedCountryToForm(detectedCountry);
      }

      setSubmittingState(submitButton, false, "Request sent ✓");

      /*
        Return button text after a few seconds.
      */
      setTimeout(() => {
        if (submitButton) {
          submitButton.textContent = "Send request";
        }
      }, 4500);

    } catch (error) {
      console.error("RentaFondue form error:", error);

      showFormError(
        errorMessage,
        "Something went wrong. Please try again."
      );

      setSubmittingState(submitButton, false, "Send request");
    }
  });
}


function setSubmittingState(button, isSubmitting, text) {
  if (!button) {
    return;
  }

  button.disabled = isSubmitting;

  if (isSubmitting) {
    button.dataset.originalText =
      button.textContent.trim() || "Send request";

    button.textContent = "Sending...";
    button.setAttribute("aria-busy", "true");
  } else {
    button.removeAttribute("aria-busy");

    button.textContent =
      text ||
      button.dataset.originalText ||
      "Send request";
  }
}


function hideFormMessages(successMessage, errorMessage) {
  if (successMessage) {
    successMessage.hidden = true;
  }

  if (errorMessage) {
    errorMessage.hidden = true;
  }
}


function showFormError(errorMessage, message) {
  if (!errorMessage) {
    return;
  }

  errorMessage.textContent = message;
  errorMessage.hidden = false;
}
'''

path = Path("/mnt/data/script.js")
path.write_text(js, encoding="utf-8")
print(f"Created {path} ({path.stat().st_size} bytes)")
