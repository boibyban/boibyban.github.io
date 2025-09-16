document.addEventListener("DOMContentLoaded", async () => {
  const path = window.location.pathname.toLowerCase();

  // --- Get current user from storage ---
  let currentUser = localStorage.getItem("currentUser");
  if (currentUser) {
    currentUser = JSON.parse(currentUser);
  }

  // --- Logout function ---
  function logout() {
    localStorage.removeItem("currentUser");
    localStorage.removeItem("username");
    localStorage.removeItem("ModPanelUsername");
    localStorage.removeItem("banFormData");
    localStorage.setItem("logoutTime", new Date().toISOString());
    window.location.href = "/login";
  }

  // Attach logout listeners to buttons/links
  document.querySelectorAll(".logout, .logoutlink").forEach(btn => {
    btn.addEventListener("click", e => {
      e.preventDefault();
      logout();
    });
  });

  // --- Handle logged-in users ---
  if (currentUser) {
    const usernameElement = document.getElementById("username");
    const userCircle = document.querySelector(".user-circle");

    // Redirect banned users to NotApproved
    if (currentUser.isDeleted) {
      // Store banFormData if exists
      if (currentUser.banFormData) {
        try {
          const banData =
            typeof currentUser.banFormData === "string"
              ? JSON.parse(currentUser.banFormData)
              : currentUser.banFormData;
          localStorage.setItem("banFormData", JSON.stringify(banData));
        } catch (e) {
          console.error("Failed to parse banFormData:", e);
        }
      }

      if (
        !path.includes("/membership/notapproved") &&
        !path.includes("/login") &&
        !path.includes("/device-restricted")
      ) {
        window.location.href = "/Membership/NotApproved";
      }
    }

    // Show username in header
    if (usernameElement) usernameElement.textContent = currentUser.username;

    // Show profile picture if available
    if (currentUser.profilePicture && !currentUser.isDeleted && userCircle) {
      const profileImg = document.createElement("img");
      profileImg.src = currentUser.profilePicture;
      profileImg.alt = "Profile Picture";
      profileImg.style.width = "32px";
      profileImg.style.height = "32px";
      profileImg.style.borderRadius = "50%";
      profileImg.style.objectFit = "cover";
      userCircle.replaceWith(profileImg);
    }

    // After currentUser is loaded and verified in userHandling.js
if (currentUser) {
  // Sidebar links
  const homeLink = document.getElementById("homeLink");
  const profileLink = document.getElementById("profileLink");
  const acquaintancesLink = document.getElementById("acquaintancesLink");

  if (homeLink) homeLink.href = "/home";
  if (profileLink) profileLink.href = `/users?id=${currentUser.id || currentUser.userId || ""}`;
  if (acquaintancesLink) acquaintancesLink.href = "/users.html?id=1";

  // Update greeting with profile picture
  const greetingText = document.getElementById("greetingText");
  const profilePic = document.getElementById("profilePic");

  if (greetingText) greetingText.textContent = `Hello, ${currentUser.username}!`;

  if (profilePic && currentUser.profilePicture) {
    profilePic.style.backgroundImage = `url('${currentUser.profilePicture}')`;
    profilePic.style.backgroundSize = "cover";
    profilePic.style.backgroundPosition = "center";
  }
}


    // Create 3-dot menu
    const menuWrapper = document.createElement("div");
    menuWrapper.style.position = "relative";
    menuWrapper.style.display = "inline-block";
    menuWrapper.style.marginLeft = "8px";

    const menuButton = document.createElement("button");
    menuButton.textContent = "⋮";
    menuButton.style.background = "transparent";
    menuButton.style.border = "none";
    menuButton.style.cursor = "pointer";
    menuButton.style.fontSize = "18px";
    menuButton.style.color = "black";

    const dropdown = document.createElement("div");
    dropdown.style.display = "none";
    dropdown.style.position = "absolute";
    dropdown.style.top = "100%";
    dropdown.style.right = "0";
    dropdown.style.background = "#333";
    dropdown.style.borderRadius = "4px";
    dropdown.style.minWidth = "100px";
    dropdown.style.boxShadow = "0 2px 5px rgba(0,0,0,0.3)";
    dropdown.style.zIndex = "9999";

    const logoutButton = document.createElement("button");
    logoutButton.textContent = "Logout";
    logoutButton.style.background = "transparent";
    logoutButton.style.color = "white";
    logoutButton.style.border = "none";
    logoutButton.style.padding = "8px 12px";
    logoutButton.style.width = "100%";
    logoutButton.style.textAlign = "left";
    logoutButton.style.cursor = "pointer";
    logoutButton.addEventListener("click", logout);

    dropdown.appendChild(logoutButton);
    menuWrapper.appendChild(menuButton);
    menuWrapper.appendChild(dropdown);

    if (usernameElement && usernameElement.parentNode) {
      usernameElement.parentNode.insertBefore(menuWrapper, usernameElement.nextSibling);
    }

    // Toggle menu
    menuButton.addEventListener("click", () => {
      dropdown.style.display = dropdown.style.display === "none" ? "block" : "none";
    });

    // Close menu when clicking outside
    document.addEventListener("click", e => {
      if (!menuWrapper.contains(e.target)) {
        dropdown.style.display = "none";
      }
    });
  } else {
    // --- Logged-out users ---
    if (path.includes("/users")) {
      const headerUser = document.querySelector(".right");
      if (headerUser) {
        headerUser.innerHTML = `<a href="/login" class="login-btn" style="color:white;">Login</a>`;
      }
    } else if (path.includes("/home")) {
      window.location.href = "/login";
    }
  }
});
