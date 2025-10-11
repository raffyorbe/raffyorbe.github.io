document.addEventListener('DOMContentLoaded', function () {
    const loginForm = document.getElementById('loginForm');
    const netidField = document.getElementById('netid');
    const passwordField = document.getElementById('password');
    const errorAlert = document.getElementById('errorAlert');
    const successAlert = document.getElementById('successAlert');

    // Hardcoded credentials
    const hardcodedNetID = 'admin';
    const hardcodedPassword = 'default';

    // Form submission handler
    loginForm.addEventListener('submit', function (e) {
      e.preventDefault(); // Prevent the form from submitting and refreshing the page

      const enteredNetID = netidField.value.trim();
      const enteredPassword = passwordField.value.trim();

      // Check credentials
      if (enteredNetID === hardcodedNetID && enteredPassword === hardcodedPassword) {
        // Show success alert
        errorAlert.classList.add('d-none');
        successAlert.classList.remove('d-none');
        setTimeout(() => {
          window.location.href = "../sites/admin.html"; 
        }, 1000);
      } else {
        // Show error alert
        successAlert.classList.add('d-none');
        errorAlert.classList.remove('d-none');
      }
    });
  });