if (!window.__userHandlingInitialized) {
  window.__userHandlingInitialized = true;

  // Helper function to generate UUID
  function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  // Paths where redirects are allowed (only these pages may be redirected)
  const ALLOWED_REDIRECT_SEGMENTS = [
    "/home",
    "/users",
    "/not-approved",
    "/membership/notapproved"
  ];

  function isAllowedRedirectPath(pathnameLower) {
    // Normalize and only allow if one of the important segments appears in the pathname.
    // This also accommodates .html, querystrings, trailing slashes, etc.
    return ALLOWED_REDIRECT_SEGMENTS.some(seg => pathnameLower.includes(seg));
  }

  function isDeviceBlockedPath(pathnameLower) {
    return pathnameLower.includes('/membership/deviceblocked');
  }
  function isNotApprovedPath(pathnameLower) {
    return pathnameLower.includes('/not-approved') || pathnameLower.includes('/membership/notapproved');
  }

  // --- Immediate device blocking check (runs before DOMContentLoaded) ---
  (async () => {
    const storedUsername = localStorage.getItem("username");
    if (!storedUsername) return; // No user logged in

    // --- Fetch user JSON immediately ---
    let users;
    try {
      const res = await fetch("/users.json", { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to fetch users.json: " + res.status);
      users = await res.json();
    } catch (err) {
      console.error("Error fetching users:", err);
      return;
    }

    // --- Find current user by username ---
    let currentUser = null;
    try {
      if (users && typeof users === "object") {
        currentUser = Object.values(users).find(u => u && u.username === storedUsername) || null;
      }
    } catch (err) {
      console.error("Error searching users object:", err);
    }

    if (!currentUser) return; // User not found

    const pathnameLower = window.location.pathname.toLowerCase();
    const allowedRedirect = isAllowedRedirectPath(pathnameLower);
    const isOnDeviceBlockedPage = isDeviceBlockedPath(pathnameLower);

    // --- DEVICE BLOCKING CHECK - IMMEDIATE AND UNCONDITIONAL (but only redirect on allowed pages) ---
    const existingDeviceTag = localStorage.getItem("deviceTag");
    const deviceBlockedStatus = currentUser.deviceBlocked;

    if (deviceBlockedStatus === "alt" && !isOnDeviceBlockedPage && allowedRedirect) {
      // Redirect to device blocked page (use replace to avoid a history loop)
      if (!window.__redirectingToDeviceBlocked) {
        window.__redirectingToDeviceBlocked = true;
        window.location.replace("/Membership/DeviceBlocked.html");
      }
      return; // STOP further execution
    } else if (deviceBlockedStatus === "root" && !existingDeviceTag) {
      // Generate and store a device tag UUID *and* mark source
      const deviceTag = generateUUID();
      localStorage.setItem("deviceTag", deviceTag);
      localStorage.setItem("deviceTagSource", storedUsername);
      // Do not attempt any redirect here — return to avoid further immediate checks treating this tag as previous evidence
      return;
    } else if (existingDeviceTag && deviceBlockedStatus !== "root" && !isOnDeviceBlockedPage && allowedRedirect) {
      // Redirect to device blocked page (use replace to avoid a history loop)
      if (!window.__redirectingToDeviceBlocked) {
        window.__redirectingToDeviceBlocked = true;
        window.location.replace("/Membership/DeviceBlocked.html");
      }
      return; // STOP further execution
    }

    // If we are on the DeviceBlocked page and the device is actually blocked, mark and stop further DOM processing
    if (isOnDeviceBlockedPage && (deviceBlockedStatus === "alt" || (existingDeviceTag && deviceBlockedStatus !== "root"))) {
      window.__deviceBlockedUser = true;
      return;
    }
  })();

  // --- Regular DOMContentLoaded handling ---
  document.addEventListener("DOMContentLoaded", async () => {
    const path = window.location.pathname.toLowerCase();

    // If we're on the deviceblocked page, bail early (no more processing)
    if (isDeviceBlockedPath(path)) {
      window.__deviceBlockedUser = true;
      return;
    }

    // Skip processing if flagged as a device-blocked user
    if (window.__deviceBlockedUser) {
      return;
    }

    // --- Check for existing device tag ---
    const existingDeviceTag = localStorage.getItem("deviceTag");

    // --- Get username from localStorage ---
    const storedUsername = localStorage.getItem("username");

    // --- Logout function ---
    function logout() {
      try {
        const banSource = localStorage.getItem("banFormDataSource");
        if (banSource && banSource === storedUsername) {
          localStorage.removeItem("banFormData");
          localStorage.removeItem("banFormDataSource");
        }
      } catch (e) { /* ignore */ }

      localStorage.removeItem("username");
      localStorage.removeItem("ModPanelUsername");
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
      if (currentUser.banFormData) {
        try {
          const banData = typeof currentUser.banFormData === "string"
            ? JSON.parse(currentUser.banFormData)
            : currentUser.banFormData;
          localStorage.setItem("banFormData", JSON.stringify(banData));
          localStorage.setItem("banFormDataSource", storedUsername);
        } catch (err) {
          console.error("Failed to parse banFormData:", err);
        }
      }

      const onNotApproved = isNotApprovedPath(path);
      const allowedRedirect = isAllowedRedirectPath(path);
      // Only redirect to NotApproved when we are on an allowed redirect path.
      if (!onNotApproved && !window.__redirectingToNotApproved && allowedRedirect) {
        window.__redirectingToNotApproved = true;
        console.warn("Redirecting to /Membership/NotApproved because currentUser.isDeleted is true (own property).");
        window.location.replace("/Membership/NotApproved");
        return;
      }
    } else {
      // Not deleted → remove any leftover banFormData **only if** it was sourced from this logged-in user.
      try {
        const localBanSource = localStorage.getItem("banFormDataSource");
        if (localBanSource && localBanSource === storedUsername) {
          localStorage.removeItem("banFormData");
          localStorage.removeItem("banFormDataSource");
        }
      } catch (e) {
        // ignore storage errors
      }
    }

    // --- Display username/profile (rest unchanged) ---
    const usernameElement = document.getElementById("username");
    if (usernameElement) usernameElement.textContent = currentUser.username;

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

    const homeLink = document.getElementById("homeLink");
    const profileLink = document.getElementById("profileLink");
    const acquaintancesLink = document.getElementById("acquaintancesLink");
    if (homeLink) homeLink.href = "/home";
    if (profileLink) profileLink.href = `/users?id=22`;
    if (acquaintancesLink) acquaintancesLink.href = `/users?id=22`;

    const greetingText = document.getElementById("greetingText");
    const profilePic = document.getElementById("profilePic");
    if (greetingText) greetingText.textContent = `Hello, ${currentUser.username}!`;
    if (profilePic && currentUser.profilePicture) {
      profilePic.style.backgroundImage = `url('${currentUser.profilePicture}')`;
      profilePic.style.backgroundSize = "cover";
      profilePic.style.backgroundPosition = "center";
    }

    // 3-dot menu code (unchanged)
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
