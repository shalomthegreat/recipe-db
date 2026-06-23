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

window.testToast = {
  success: function (msg) {
    showSuccess(msg || "Test success notification");
  },
  error: function (msg) {
    showError(msg || "Test error notification");
  },
};
