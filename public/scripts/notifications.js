function showNotification(message, type, duration) {
  console.log("[" + type.toUpperCase() + "]", message);

  let container = document.getElementById("notification-container");
  if (!container) {
    container = document.createElement("div");
    container.id = "notification-container";
    document.body.appendChild(container);
  }

  const notif = document.createElement("div");
  notif.className = "notification " + type;
  notif.textContent = message;

  const progress = document.createElement("div");
  progress.className = "progress";
  progress.style.animationDuration = duration + "ms";
  notif.appendChild(progress);

  notif.addEventListener("click", function () {
    dismissNotification(notif);
  });

  container.appendChild(notif);

  requestAnimationFrame(function () {
    notif.classList.add("show");
  });

  setTimeout(function () {
    dismissNotification(notif);
  }, duration);
}

function dismissNotification(el) {
  if (!el || el.dataset.dismissing) return;
  el.dataset.dismissing = "true";
  el.classList.remove("show");
  el.addEventListener("transitionend", function () {
    el.remove();
  });
}

function showError(message) {
  showNotification(message, "error", 5000);
}

function showSuccess(message) {
  showNotification(message, "success", 3000);
}

function showConfirmDialog(message, onConfirm) {
  const container = document.getElementById("confirm-modal");
  if (!container) {
    console.error("Confirm modal not found in DOM");
    return;
  }

  const msgEl = container.querySelector(".confirm-message");
  if (msgEl) msgEl.textContent = message;

  $(container).css({ opacity: 0, top: "-20px" }).show().animate({ opacity: 1, top: "0px" }, 200);

  const yesBtn = container.querySelector("#confirm-yes");
  const noBtn = container.querySelector("#confirm-no");

  function cleanup() {
    $(container).fadeOut();
    yesBtn.removeEventListener("click", onYes);
    noBtn.removeEventListener("click", onNo);
  }

  function onYes() {
    cleanup();
    if (typeof onConfirm === "function") onConfirm();
  }

  function onNo() {
    cleanup();
  }

  yesBtn.addEventListener("click", onYes);
  noBtn.addEventListener("click", onNo);
}

window.testToast = {
  success: function (msg) {
    showSuccess(msg || "Test success notification");
  },
  error: function (msg) {
    showError(msg || "Test error notification");
  },
};
