js = r'''document.addEventListener("DOMContentLoaded", () => {
  initCurrentYear();
  initCountryDetection();
  initContactForm();
});

function initCurrentYear() {
  const yearElement = document.getElementById("currentYear");
  if (yearElement) {
    yearElement.textContent = new Date().getFullYear();
  }
}

async function initCountryDetection() {
  const popup = document.getElementById("swissPopup");
  const stayButton = document.getElementById("stayInternational");

  if (!popup) return;

  if (stayButton) {
    stayButton.addEventListener("click", () => {
      popup.classList.remove("active");
      popup.setAttribute("aria-hidden", "true");
      document.body.classList.remove("popup-open");
      sessionStorage.setItem("raf_country_popup_handled", "true");
    });
  }

  if (sessionStorage.getItem("raf_country_popup_handled") === "true") {
    return;
  }

  try {
    const response = await fetch("/api/country", {
      headers: { Accept: "application/json" },
      cache: "no-store"
    });

    if (!response.ok) throw new Error("Country detection failed");

    const data = await response.json();
    const country = String(data.country || "").toUpperCase();

    sessionStorage.setItem("raf_detected_country", country);

    if (country === "CH") {
      popup.classList.add("active");
      popup.setAttribute("aria-hidden", "false");
      document.body.classList.add("popup-open");
    }
  } catch (error) {
    console.warn("Country detection unavailable:", error);
  }
}

function initContactForm() {
  const form = document.getElementById("contactForm");
  const submitButton = document.getElementById("submitButton");
  const successMessage = document.getElementById("formSuccess");
  const errorMessage = document.getElementById("formError");

  if (!form) return;

  const FORM_ENDPOINT = "https://formspree.io/f/moeqdnoa";

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (successMessage) successMessage.hidden = true;
    if (errorMessage) errorMessage.hidden = true;

    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    if (submitButton) {
      submitButton.disabled = true;
      submitButton.textContent = "Sending...";
    }

    try {
      const formData = new FormData(form);

      formData.set(
        "detected_country",
        sessionStorage.getItem("raf_detected_country") || "UNKNOWN"
      );

      formData.set("website", "rentafondue.com");
      formData.set("page_url", window.location.href);

      const response = await fetch(FORM_ENDPOINT, {
        method: "POST",
        body: formData,
        headers: {
          Accept: "application/json"
        }
      });

      if (!response.ok) {
        throw new Error("Form submission failed");
      }

      form.reset();

      if (successMessage) {
        successMessage.hidden = false;
      }

      if (submitButton) {
        submitButton.textContent = "Request sent ✓";
      }

      setTimeout(() => {
        if (submitButton) {
          submitButton.disabled = false;
          submitButton.textContent = "Send request";
        }
      }, 4000);

    } catch (error) {
      console.error(error);

      if (errorMessage) {
        errorMessage.hidden = false;
        errorMessage.textContent =
          "Something went wrong. Please try again.";
      }

      if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent = "Send request";
      }
    }
  });
}
