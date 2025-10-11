document.addEventListener("DOMContentLoaded", function () {
    const showPopupButton = document.getElementById("showPopup");
    const popupModal = new bootstrap.Modal(document.getElementById("popupModal"));

    showPopupButton.addEventListener("click", function () {
      popupModal.show();
    });
  });