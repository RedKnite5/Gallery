import * as utils from './utils.mjs'

const loginButton = document.getElementById("login-confirm");
loginButton.addEventListener("click", login);

async function login(event) {
    const usernameInput = document.getElementById("username-input");
    const passwordInput = document.getElementById("password-input");

    const username = usernameInput.value;
    const password = passwordInput.value;

    const payload = {
        "username": username,
        "password": password
    };

    await fetch("/login/", {
        method: "POST",
        headers: {
            "Accept": "application/json",
            "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
    }).then(async r => {
            if (r.ok) {
                window.location.href = "/gallery/";
                return;
            }

            const text = await r.text();
            throw new Error(`Request failed (${r.status} ${r.statusText}): ${text}`);
    });
}
