
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

