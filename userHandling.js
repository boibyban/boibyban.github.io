document.addEventListener('DOMContentLoaded', async function() {
    const username = localStorage.getItem('username');
    const usernameElement = document.getElementById('username');
    const userCircle = document.querySelector('.user-circle');

    if (username && usernameElement) {
        usernameElement.textContent = username;

        try {
            const response = await fetch('/users.json');
            if (response.ok) {
                const users = await response.json();
                let currentUser = null;

                for (const id in users) {
                    if (users[id].username === username) {
                        currentUser = users[id];
                        break;
                    }
                }

                if (currentUser && !currentUser.isDeleted && currentUser.profilePicture) {
                    if (userCircle) {
                        const profileImg = document.createElement('img');
                        profileImg.src = currentUser.profilePicture;
                        profileImg.alt = "Profile Picture";
                        profileImg.style.width = '32px';
                        profileImg.style.height = '32px';
                        profileImg.style.borderRadius = '50%';
                        profileImg.style.objectFit = 'cover';
                        userCircle.replaceWith(profileImg);
                    }
                } else if (currentUser && currentUser.isDeleted) {
                    // Store banFormData if available
                    if (currentUser.banFormData) {
                        try {
                            let banData = currentUser.banFormData;
                            if (typeof banData === "string") {
                                banData = JSON.parse(banData); // if stored as a string
                            }
                            localStorage.setItem('banFormData', JSON.stringify(banData));
                        } catch (e) {
                            console.error("Failed to parse banFormData:", e);
                        }
                    }

                    // Check if we should redirect
                    const path = window.location.pathname.toLowerCase();
                    if (
                        !path.includes('/membership') &&
                        !path.includes('/not-approved') &&
                        !path.includes('/device-restricted') &&
                        !path.includes('/login')
                    ) {
                        window.location.href = '/Membership/NotApproved';
                    }
                }
            }
        } catch (error) {
            console.error('Failed to fetch user data:', error);
        }

        // Create menu wrapper
        const menuWrapper = document.createElement('div');
        menuWrapper.style.position = 'relative';
        menuWrapper.style.display = 'inline-block';
        menuWrapper.style.marginLeft = '8px';

        // Three dot button
        const menuButton = document.createElement('button');
        menuButton.textContent = '⋮';
        menuButton.style.background = 'transparent';
        menuButton.style.border = 'none';
        menuButton.style.cursor = 'pointer';
        menuButton.style.fontSize = '18px';
        menuButton.style.color = 'black';

        // Dropdown menu
        const dropdown = document.createElement('div');
        dropdown.style.display = 'none';
        dropdown.style.position = 'absolute';
        dropdown.style.top = '100%';
        dropdown.style.right = '0';
        dropdown.style.background = '#333';
        dropdown.style.borderRadius = '4px';
        dropdown.style.minWidth = '100px';
        dropdown.style.boxShadow = '0 2px 5px rgba(0,0,0,0.3)';
        dropdown.style.zIndex = '9999';

        // Logout button
        const logoutButton = document.createElement('button');
        logoutButton.textContent = 'Logout';
        logoutButton.style.background = 'transparent';
        logoutButton.style.color = 'white';
        logoutButton.style.border = 'none';
        logoutButton.style.padding = '8px 12px';
        logoutButton.style.width = '100%';
        logoutButton.style.textAlign = 'left';
        logoutButton.style.cursor = 'pointer';

        logoutButton.addEventListener('click', function() {
            localStorage.removeItem('username');
            localStorage.removeItem('ModPanelUsername');
            localStorage.removeItem('banFormData');
            window.location.href = '/login';
        });

        dropdown.appendChild(logoutButton);
        menuWrapper.appendChild(menuButton);
        menuWrapper.appendChild(dropdown);
        usernameElement.parentNode.insertBefore(menuWrapper, usernameElement.nextSibling);

        // Toggle menu
        menuButton.addEventListener('click', function() {
            dropdown.style.display = dropdown.style.display === 'none' ? 'block' : 'none';
        });

        // Close menu if clicking outside
        document.addEventListener('click', function(e) {
            if (!menuWrapper.contains(e.target)) {
                dropdown.style.display = 'none';
            }
        });

    } else {
        window.location.href = '/login';
    }
});
document.addEventListener("DOMContentLoaded", () => {
  const currentUser = JSON.parse(localStorage.getItem("currentUser"));
  const path = window.location.pathname;

  // --- Logout function ---
  function logout() {
    if (currentUser) {
      // Remove banFormData if it exists
      if (currentUser.banFormData) {
        delete currentUser.banFormData;
      }

      // Clear login session
      localStorage.removeItem("currentUser");
      localStorage.setItem("logoutTime", new Date().toISOString());
    }

    // Redirect to login page
    window.location.href = "/login";
  }

  // Attach logout listeners to buttons/links
  const logoutBtns = document.querySelectorAll(".logout, .logoutlink");
  logoutBtns.forEach(btn => {
    btn.addEventListener("click", e => {
      e.preventDefault();
      logout();
    });
  });

  // --- Page routing logic ---
  if (!currentUser) {
    if (path.includes("/users")) {
      // Replace header user info with Login button
      const headerUser = document.querySelector(".header-user");
      if (headerUser) {
        headerUser.innerHTML = `<a href="/login" class="login-btn">Login</a>`;
      }
    } else if (path.includes("/home")) {
      // Redirect to login if not logged in
      window.location.href = "/login";
    }
  } else {
    // If account is deleted, redirect
    if (currentUser.isDeleted) {
      window.location.href = "/Membership/NotApproved";
    }
  }
});
