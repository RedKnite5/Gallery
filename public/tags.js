
const tagList = document.getElementById("tag-list");
window.addEventListener("load", makeTags);


(function() {
    const theme = localStorage.getItem("theme") || "light";
    document.documentElement.setAttribute("data-theme", theme);

    document.body.classList.add("disable-transitions");

    const checkbox = document.getElementById("darkmode-checkbox");

    if (theme === "light") {
        checkbox.checked = false;
    } else {
        checkbox.checked = true;
    }

    checkbox.addEventListener("change", dark_mode_toggle);

    requestAnimationFrame(() => {
        document.body.classList.remove("disable-transitions");
    });
    const slider = document.getElementById("darkmode-slider");
    slider.classList.add("ready");

    const logoutButton = document.getElementById("logout-button");
    logoutButton.addEventListener("click", logout);
})();

function dark_mode_toggle(event) {
    let theme = "light";
    if (event.currentTarget.checked) {
        theme = "dark";
    }

    localStorage.setItem("theme", theme);
    document.documentElement.setAttribute("data-theme", theme);
}

function makeTags() {
    const tags = new Set();

    // .then(r => r.ok ? r.json() : Promise.reject(`Server error: ${r.status}`))
    res = fetch("list-media")
        .then(r => r.json())
        .then(images => {
            for (const [file, description] of images) {
                const list = description.split(" ");
                for (let j=0; j < list.length; ++j) {
                    tags.add(list[j].toLowerCase());
                }
            }

            tag_array = Array.from(tags)
            tag_array.sort()

            for (const item of tag_array) {
                if (item === "") {
                    continue;
                }

                const END = 9; // "tags.html".length
                const urlLength = window.location.href.length;
                const url = window.location.href.substring(0, urlLength - END);

                const newUrl = url + "?q=" + item;

                const tag = document.createElement("a");
                tag.className = "rounded-box tag";
                tag.href = newUrl;
                tag.innerHTML = item;

                tagList.appendChild(tag);
            }
        });
}

async function logout(event) {
    await fetch("/logout/", {
        method: "POST",
        credentials: "include"
    });

    window.location.href = "login.html";
}
