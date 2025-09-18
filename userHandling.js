
if (!window.__userHandlingInitialized) {
  window.__userHandlingInitialized = true;

  document.addEventListener("DOMContentLoaded", async () => {
    const path = window.location.pathname.toLowerCase();

    // --- Get username from localStorage ---
    const storedUsername = localStorage.getItem("username");

    // --- Logout function ---
    function logout() {
      // Only remove banFormData if it was sourced from this logged-in user
      try {
        const banSource = localStorage.getItem("banFormDataSource");
        if (banSource && banSource === storedUsername) {
          localStorage.removeItem("banFormData");
          localStorage.removeItem("banFormDataSource");
        }
      } catch (e) {
      }

      localStorage.removeItem("username");
      localStorage.removeItem("ModPanelUsername");
      // keep other unrelated local banFormData if present
      localStorage.setItem("logoutTime", new Date().toISOString());
      window.location.href = "/login";
    }

    // Attach logout listeners (covers all static/dynamic cases)
    const logoutSelectors = [".logout", ".logoutlink", "#dropdownLogout"];
    logoutSelectors.forEach(selector => {
      document.querySelectorAll(selector).forEach(el => {
        el.addEventListener("click", e => {
          e.preventDefault();
          logout();
        });
      });
    });

    // --- No username stored, treat as logged out ---
    if (!storedUsername) {
      if (path.includes("/users")) {
        const headerUser = document.querySelector(".right");
        if (headerUser) headerUser.innerHTML = `<a href="/login" class="login-btn" style="color:white;">Login</a>`;
      } else if (path.includes("/home")) {
        window.location.href = "/login";
      }
      // /404.html is accessible even if not logged in
      return;
    }

    // --- Fetch user JSON (no-store to avoid stale/cached edge responses) ---
    let users;
    try {
      const res = await fetch("/users.json", { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to fetch users.json: " + res.status);
      users = await res.json();
    } catch (err) {
      console.error("Error fetching users:", err);
      return;
    }

    // --- Find current user by username (safe) ---
    let currentUser = null;
    try {
      if (users && typeof users === "object") {
        currentUser = Object.values(users).find(u => u && u.username === storedUsername) || null;
      }
    } catch (err) {
      console.error("Error searching users object:", err);
    }

    if (!currentUser) {
      // Username in localStorage no longer exists in JSON
      logout();
      return;
    }

    // --- Normalize isDeleted flag (ONLY consider OWN properties) ---
    const hasOwnIsDeleted = Object.prototype.hasOwnProperty.call(currentUser, "isDeleted");
    const rawIsDeleted = hasOwnIsDeleted ? currentUser.isDeleted : undefined;
    const isDeleted = hasOwnIsDeleted && (
      rawIsDeleted === true ||
      rawIsDeleted === "true" ||
      rawIsDeleted === 1 ||
      rawIsDeleted === "1" ||
      (typeof rawIsDeleted === "string" && rawIsDeleted.toLowerCase() === "yes")
    );

    // --- Handle deleted/banned users (defensive redirect) ---
    if (isDeleted) {
      // Save banFormData into localStorage if present (and parse if necessary)
      if (currentUser.banFormData) {
        try {
          const banData = typeof currentUser.banFormData === "string"
            ? JSON.parse(currentUser.banFormData)
            : currentUser.banFormData;
          localStorage.setItem("banFormData", JSON.stringify(banData));
          // mark the source so we don't clobber unrelated local ban data
          localStorage.setItem("banFormDataSource", storedUsername);
        } catch (err) {
          console.error("Failed to parse banFormData:", err);
        }
      }

      // Prevent accidental double-redirects
      // treat both '/not-approved' and '/membership/notapproved' as "already on not-approved"
      const onNotApproved = path.includes("/not-approved") || path.includes("/membership/notapproved");
      if (!onNotApproved && !window.__redirectingToNotApproved) {
        window.__redirectingToNotApproved = true;
        console.warn("Redirecting to /not-approved because currentUser.isDeleted is true (own property).");
        console.log({ currentUserHasOwnIsDeleted: hasOwnIsDeleted, rawIsDeleted });
        console.trace();
        window.location.href = "/Membership/NotApproved";
        return;
      }
    } else {
      // Not deleted → remove any leftover banFormData **only if** it was sourced from this logged-in user.
      try {
        const localBanSource = localStorage.getItem("banFormDataSource");
        if (localBanSource && localBanSource === storedUsername) {
          localStorage.removeItem("banFormData");
          localStorage.removeItem("banFormDataSource");
        } else {
          // if local ban data exists but was not created by this logged-in user, leave it alone.
          // this preserves unrelated local banFormData for manual navigation to the not-approved pages.
        }
      } catch (e) {
        // ignore storage errors
      }
    }

    // --- Display username in header ---
    const usernameElement = document.getElementById("username");
    if (usernameElement) usernameElement.textContent = currentUser.username;

    // --- Display profile picture ---
    const userCircle = document.querySelector(".user-circle");
    if (currentUser.profilePicture && userCircle && !isDeleted) {
      try {
        const profileImg = document.createElement("img");
        profileImg.src = currentUser.profilePicture;
        profileImg.alt = "Profile Picture";
        profileImg.style.width = "32px";
        profileImg.style.height = "32px";
        profileImg.style.borderRadius = "50%";
        profileImg.style.objectFit = "cover";
        userCircle.replaceWith(profileImg);
      } catch (err) {
        console.warn("Failed to set profile picture:", err);
      }
    }

    // --- Sidebar links ---
    const homeLink = document.getElementById("homeLink");
    const profileLink = document.getElementById("profileLink");
    const acquaintancesLink = document.getElementById("acquaintancesLink");
    if (homeLink) homeLink.href = "/home";
    if (profileLink) profileLink.href = `/users?id=${currentUser.id || currentUser.userId || ""}`;
    if (acquaintancesLink) acquaintancesLink.href = "/users.html?id=1";

    // --- Home page greeting ---
    const greetingText = document.getElementById("greetingText");
    const profilePic = document.getElementById("profilePic");
    if (greetingText) greetingText.textContent = `Hello, ${currentUser.username}!`;
    if (profilePic && currentUser.profilePicture) {
      profilePic.style.backgroundImage = `url('${currentUser.profilePicture}')`;
      profilePic.style.backgroundSize = "cover";
      profilePic.style.backgroundPosition = "center";
    }

    // --- 3-dot menu for logout ---
    try {
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
    } catch (err) {
      console.warn("Could not attach menu:", err);
    }
  });
}
