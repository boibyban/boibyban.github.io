document.addEventListener("DOMContentLoaded", async () => {
  const path = window.location.pathname.toLowerCase();
  const storedUsername = localStorage.getItem("username");

  function logout() {
    localStorage.removeItem("username");
    localStorage.removeItem("ModPanelUsername");
    localStorage.removeItem("banFormData");
    localStorage.setItem("logoutTime", new Date().toISOString());
    window.location.href = "/login";
  }

  // Logout listeners
  [".logout", ".logoutlink", "#dropdownLogout"].forEach(sel => {
    document.querySelectorAll(sel).forEach(el => el.addEventListener("click", e => {
      e.preventDefault();
      logout();
    }));
  });

  // Not logged in
  if (!storedUsername) {
    if (path.includes("/users")) {
      const headerUser = document.querySelector(".right");
      if (headerUser) headerUser.innerHTML = `<a href="/login" class="login-btn" style="color:white;">Login</a>`;
    } else if (path.includes("/home")) {
      window.location.href = "/login";
    }
    return;
  }

  // Fetch users
  let users;
  try {
    const res = await fetch("/users.json");
    if (!res.ok) throw new Error("Failed to fetch users.json");
    users = await res.json();
  } catch (err) {
    console.error("Error fetching users:", err);
    return;
  }

  // Find current user
  const currentUser = Object.values(users).find(u => u.username === storedUsername);
  if (!currentUser) { logout(); return; }

  // Normalize isDeleted (convert string -> boolean)
  const isDeleted = currentUser.isDeleted === true || currentUser.isDeleted === "true";

  if (isDeleted) {
    // Store banFormData if present
    if (currentUser.banFormData) {
      try {
        const banData = typeof currentUser.banFormData === "string"
          ? JSON.parse(currentUser.banFormData)
          : currentUser.banFormData;
        localStorage.setItem("banFormData", JSON.stringify(banData));
      } catch (err) {
        console.error("Failed to parse banFormData:", err);
      }
    }
    if (!path.includes("/not-approved")) {
      window.location.href = "/not-approved";
      return;
    }
  } else {
    // Not deleted → remove banFormData
    localStorage.removeItem("banFormData");
  }

  // Display username
  const usernameElement = document.getElementById("username");
  if (usernameElement) usernameElement.textContent = currentUser.username;

  // Display profile picture
  const userCircle = document.querySelector(".user-circle");
  if (currentUser.profilePicture && userCircle && !isDeleted) {
    const profileImg = document.createElement("img");
    profileImg.src = currentUser.profilePicture;
    profileImg.alt = "Profile Picture";
    profileImg.style.width = "32px";
    profileImg.style.height = "32px";
    profileImg.style.borderRadius = "50%";
    profileImg.style.objectFit = "cover";
    userCircle.replaceWith(profileImg);
  }

  // Sidebar links
  const homeLink = document.getElementById("homeLink");
  const profileLink = document.getElementById("profileLink");
  const acquaintancesLink = document.getElementById("acquaintancesLink");
  if (homeLink) homeLink.href = "/home";
  if (profileLink) profileLink.href = `/users?id=${currentUser.id || currentUser.userId || ""}`;
  if (acquaintancesLink) acquaintancesLink.href = "/users.html?id=1";

  // Greeting
  const greetingText = document.getElementById("greetingText");
  const profilePic = document.getElementById("profilePic");
  if (greetingText) greetingText.textContent = `Hello, ${currentUser.username}!`;
  if (profilePic && currentUser.profilePicture) {
    profilePic.style.backgroundImage = `url('${currentUser.profilePicture}')`;
    profilePic.style.backgroundSize = "cover";
    profilePic.style.backgroundPosition = "center";
  }

  // 3-dot menu
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

  menuButton.addEventListener("click", () => {
    dropdown.style.display = dropdown.style.display === "none" ? "block" : "none";
  });
  document.addEventListener("click", e => {
    if (!menuWrapper.contains(e.target)) dropdown.style.display = "none";
  });
});
