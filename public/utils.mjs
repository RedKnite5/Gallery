
export const listMediaToJson = async r => {
    if (r.ok) {
        return r.json();
    }

    // Not logged in
    if (r.status === 401) {
        window.location.href = "login.html";
        return;
    }

    const text = await r.text();
    throw new Error(`Request failed (${r.status} ${r.statusText}): ${text}`);
}


function getCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) {
        return parts.pop().split(";")[0];
    }
}

export function getCSRF() {
    return getCookie("csrf_token");
}

async function logout(event) {
    await fetch("/logout/", {
        method: "POST",
        credentials: "include",
        headers: {
            "X-CSRFToken": getCSRF()
        }
    }).then(async r => {
        if (r.ok) {
            window.location.href = "login.html";
            return;
        }

        const text = await r.text();
        throw new Error(`Request failed (${r.status} ${r.statusText}): ${text}`);
    });
}

const logoutButton = document.getElementById("logout-button");
if (logoutButton) {
    logoutButton.addEventListener("click", logout);
}

function dark_mode_toggle(event) {
    let theme = "light";
    if (event.currentTarget.checked) {
        theme = "dark";
    }

    localStorage.setItem("theme", theme);
    document.documentElement.setAttribute("data-theme", theme);
}

const checkbox = document.getElementById("darkmode-checkbox");
if (checkbox) {
    checkbox.addEventListener("change", dark_mode_toggle);

    const theme = localStorage.getItem("theme") || "light";
    document.documentElement.setAttribute("data-theme", theme);

    document.body.classList.add("disable-transitions");

    if (theme === "light") {
        checkbox.checked = false;
    } else {
        checkbox.checked = true;
    }

    requestAnimationFrame(() => {
        document.body.classList.remove("disable-transitions");
    });
    const slider = document.getElementById("darkmode-slider");
    slider.classList.add("ready");
}

