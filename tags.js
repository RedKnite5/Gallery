
window.addEventListener("load", makeTags);

const tagList = document.getElementById("tag-list");

function makeTags() {
    const tags = new Set();

    res = fetch("list-media")
        .then(r => r.json())
        .then(images => {
            for (const [file, description] of images) {
                const list = description.split(" ");
                for (let j=0; j < list.length; ++j) {
                    tags.add(list[j].toLowerCase());
                }
            }

            for (const item of tags) {
                if (item === "") {
                    continue;
                }

                const END = 9; // "tags.html".length
                const urlLength = window.location.href.length;
                const url = window.location.href.substr(0, urlLength - END);

                const newUrl = url + "?" + item;

                const tag = document.createElement("a");
                tag.className = "rounded-box tag";
                tag.href = newUrl;
                tag.innerHTML = item;

                tagList.appendChild(tag);
            }
        });
}

