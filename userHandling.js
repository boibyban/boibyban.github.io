// userHandling.js - Script to handle user information in the header

document.addEventListener('DOMContentLoaded', async function() {
    // Get the username from localStorage
    const username = localStorage.getItem('username');
    const usernameElement = document.getElementById('username');
    const userCircle = document.querySelector('.user-circle');
    
    // Update the username in the header if available
    if (username && usernameElement) {
        usernameElement.textContent = username;
        
        try {
            // Fetch users from users.json
            const response = await fetch('/users.json');
            if (response.ok) {
                const users = await response.json();
                
                // Find the current user
                let currentUser = null;
                for (const id in users) {
                    if (users[id].username === username) {
                        currentUser = users[id];
                        break;
                    }
                }
                
                // Update profile picture if user exists and is not deleted
                if (currentUser && !currentUser.isDeleted && currentUser.profilePicture) {
                    // Replace the user circle with the actual profile picture
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
                    // If user is deleted, show blank/default avatar
                    if (userCircle) {
                        userCircle.style.background = '#ccc';
                        userCircle.innerHTML = '?';
                        userCircle.style.display = 'flex';
                        userCircle.style.alignItems = 'center';
                        userCircle.style.justifyContent = 'center';
                        userCircle.style.color = '#666';
                        userCircle.style.fontWeight = 'bold';
                    }
                }
            }
        } catch (error) {
            console.error('Failed to fetch user data:', error);
        }
        
        // Create and add logout button
        const logoutButton = document.createElement('button');
        logoutButton.textContent = 'Logout';
        logoutButton.className = 'logout';
        logoutButton.style.marginLeft = '10px';
        logoutButton.style.padding = '4px 8px';
        logoutButton.style.background = '#e74c3c';
        logoutButton.style.color = 'white';
        logoutButton.style.border = 'none';
        logoutButton.style.borderRadius = '4px';
        logoutButton.style.cursor = 'pointer';
        logoutButton.style.fontSize = '14px';
        
        logoutButton.addEventListener('click', function() {
            // Clear user data from localStorage
            localStorage.removeItem('username');
            localStorage.removeItem('ModPanelUsername');
            
            // Clear banFormData if it exists
            if (localStorage.getItem('banFormData')) {
                localStorage.removeItem('banFormData');
            }
            
            // Redirect to login page
            window.location.href = '/login';
        });
        
        // Add logout button next to username
        usernameElement.parentNode.insertBefore(logoutButton, usernameElement.nextSibling);
    }
});
