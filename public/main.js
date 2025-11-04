import * as utils from './utils.mjs'


let delete_mode = false;

window.addEventListener("load", setup);

const topBar = document.getElementById("top");
const searchbar = document.getElementById("searchbar");
const galleryDiv = document.getElementById("gallery");
const bigImageDiv = document.getElementById("big-image-div");
const tagText = document.getElementById("tags");
const tagForm = document.getElementById("form");
const backButton = document.getElementById("back-button");
const deleteButton = document.getElementById("delete-button");
const footer = document.getElementById("footer");


function setup() {
    searchbar.addEventListener("keyup", search);

    tagForm.addEventListener("change", submitTags);
    tagForm.addEventListener("submit", submitTags);

    backButton.addEventListener("click", BackToGallery);

    const clear_search_button = document.getElementById("clear-search-button-container");
    clear_search_button.addEventListener("click", clear_search);

    const sort_select = document.getElementById("sort-select-dropdown");
    sort_select.addEventListener("change", change_sorting);

    sort_select.value = localStorage.getItem("sort_order") || "new";

    const urlParams = new URLSearchParams(window.location.search);
    searchbar.value = urlParams.get("q");

    deleteButton.addEventListener("click", enable_delete_selection);

    makeImages();
}

async function digestMessage(message) {
    const encoder = new TextEncoder();
    const data = encoder.encode(message);
    const hashBuffer = await crypto.subtle.digest("SHA-512", data);

    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");

    return hashHex;
}

// https://www.softcomplex.com/docs/get_window_size_and_scrollbar_position.html
function f_filterResults(n_win, n_docel, n_body) {
	let n_result = n_win ? n_win : 0;
	if (n_docel && (!n_result || (n_result > n_docel)))
		n_result = n_docel;
	return n_body && (!n_result || (n_result > n_body)) ? n_body : n_result;
}
function f_scrollTop() {
	return f_filterResults (
		window.pageYOffset ? window.pageYOffset : 0,
		document.documentElement ? document.documentElement.scrollTop : 0,
		document.body ? document.body.scrollTop : 0
	);
}

function is_video_file(filename) {
    const video_formats = [".mov", ".mp4"];
    for (const format of video_formats) {
        if (filename.endsWith(format)) {
            return true;
        }
    }
    return false;
}

function prep_source_for_selector(source) {
    const filenameStart = source.lastIndexOf("/");
    const filename = source.substring(filenameStart)
    const src = decodeURI(filename);
    return CSS.escape(src);
}

function get_search_string_from_url() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get("q");
}

function change_sorting(event) {
    localStorage.setItem("sort_order", event.target.value);
}

function enable_delete_selection(event) {
    if (delete_mode) {
        deleteButton.classList.remove("red-outline");
        galleryDiv.classList.remove("red-outline");
        deleteButton.textContent = "delete mode"
    } else {
        // red outline
        deleteButton.classList.add("red-outline");
        galleryDiv.classList.add("red-outline");
        deleteButton.textContent = "view mode"
    }
    delete_mode = !delete_mode;
}

function search(event) {
    if (event.key !== "Enter") {
        return;
    }

    const tags = searchbar.value.toLowerCase();
    // if previous search contains a '?' then the next search wont work
    // const searchIndex = window.location.href.lastIndexOf("?");
    // const url = window.location.href.substring(0, searchIndex);
    const location = window.location;
    const url = location.origin + location.pathname;

    // console.log("Searching for '" + tags + "'");
    
    if (tags === "") {
        //
        // if (searchIndex === -1) {
        //     return;
        // }
        window.location = url;
        return;
    }
    window.location = url + "?q=" + tags;
}

function clear_search(event) {
    searchbar.value = "";
}


function make_bigger(event) {
    const fullImage = document.getElementById("full-image");
    fullImage.classList.add("full-size");
}

function should_switch_image(x, y) {
    const buffer = 10;
    const back_arrow_size = 48 + buffer;

    // don't register clicks near top of screen because of
    // full screen button on videos
    if (y < back_arrow_size) {
        return false;
    }

    // don't switch if clicked too close to back button
    const currentTop = parseInt(window.getComputedStyle(backButton).top, 10);
    const y_bottom = back_arrow_size + currentTop;
    if (x < back_arrow_size && y < y_bottom) {
        return false;
    }

    const width = window.innerWidth;
    if (x > width / 3 && x < width * 2 / 3) {
        return false;
    }

    return true;
}

function nextOrPrev(event) {
    if (!should_switch_image(event.clientX, event.clientY)) {
        return;
    }

    let target = event.target;
    if (target.id !== "full-image") {
        target = target.firstElementChild;
    }

    // used to get gallery version of current image
    //console.log("nextorprev start target: ", event.target);
    const source = target.src;

    const escapedSrc = prep_source_for_selector(source);
    const selector = ".image[src$='" + escapedSrc + "'],.image:has(> source[src$='" + escapedSrc + "'])";
    //console.log("target: ", event.target);
    //console.log("selector: ", selector);

    let elem = document.querySelector(selector);
    const num = Number(elem.id.slice("image_id_".length));

    const width = window.innerWidth;
    let next_elem = null;
    if (event.clientX < width/3) {
        let prev_id = "image_id_" + (num - 1).toString();
        next_elem = document.getElementById(prev_id);
    } else { // if (event.clientX > width * 2/3) {
        let next_id = "image_id_" + (num + 1).toString();
        next_elem = document.getElementById(next_id);
    }


    changeBigImage(next_elem);
}

function keyDown(event) {
    const bigImage = document.getElementById("full-image");
    const escapedSrc = prep_source_for_selector(bigImage.src);
    const selector = ".image[src$='" + escapedSrc + "']";
    const image = document.querySelector(selector);
    if (event.key === "ArrowLeft") {
        changeBigImage(image.previousElementSibling);
    } else if (event.key === "ArrowRight") {
        changeBigImage(image.nextElementSibling);
    }
}

function changeBigImage(elem) {
    if (elem === null) {
        return;
    }

    //console.log("Changing to: ", elem);

    const box = document.getElementById("full-image");
    if (box.nodeName === "VIDEO") {
        box.pause();
        box.removeAttribute('src');
        box.load();
    }

    box.parentNode.removeChild(box);

    const desc = elem.getAttribute("description");
    
    let source = elem.src;

    const filenameStart = source.lastIndexOf("/");
    const src = "/image" + source.substring(filenameStart);

    makeBigImage(desc, src);

    tagText.value = elem.getAttribute("description");
}

async function submitTags(event) {
    event.preventDefault();
    const bigImage = document.getElementById("full-image");

    let src = bigImage.src;
    if (!src) {
        src = bigImage.firstChild.src;
    }
    
    console.log("submitting: ", tagText.value);
    const promise = fetch("/saving/", {
        method: "POST",
        credentials: "include",
        headers: {
            "Accept": "application/json",
            "Content-Type": "application/json",
            "X-CSRFToken": utils.getCSRF()
        },
        body: JSON.stringify({tags: tagText.value, name: src})
    });

    const escapedPath = prep_source_for_selector(src);

    let img_elem = null;
    if (is_video_file(src)) {
        const thumbpath = CSS.escape("/thumbnail") + escapedPath;
        
        img_elem = document.querySelector(`img.image[src=${thumbpath}]`)

        // console.log(`thumbpath:   '${thumbpath}'`);
        // console.log(`escapedPath: '${escapedPath}'`);
    } else {
        const path_sel = CSS.escape("/image") + escapedPath;
        img_elem = document.querySelector(`img.image[src=${path_sel}]`);
    }

    if (!img_elem) {
        console.log(`cant find: '${escapedPath}'`);
    }

    await promise.then(async r => {
        if (r.ok) {
            return;
        }

        const text = await r.text();
        throw new Error(`Request failed (${r.status} ${r.statusText}): ${text}`);
    });

    img_elem.setAttribute("description", tagText.value);

    tagText.style.height = "";
    tagText.style.height = tagText.scrollHeight + "px";

    return false;
}

function BackToGallery() {
    galleryDiv.style.display = "flex";
    topBar.style.display = "flex";
    const box = document.getElementById("full-image");
    box.removeEventListener("keydown", keyDown);
    box.parentNode.removeChild(box);
    tagForm.style.display = "none";
    backButton.style.display = "none";
    footer.style.display = "block";
    const yscroll = document.body.getAttribute("previous_y_scroll_location");
    window.scrollTo(0, yscroll);
}

async function on_click_image(e) {
    if (delete_mode) {
        let value = window.confirm("Delete this image?")
        if (!value) {
            return
        }

        const src = e.target.src;
        const filenameStart = src.lastIndexOf("/");
        const delete_url = "/delete" + src.substring(filenameStart);

        console.log("sending: ", delete_url);

        await fetch(delete_url, {
            credentials: "include",
            headers: {
                "X-CSRFToken": utils.getCSRF()
            }
        }).then(async r => {
            if (r.ok) {
                return;
            }

            const text = await r.text();
            throw new Error(`Request failed (${r.status} ${r.statusText}): ${text}`);
        });

    } else {
        openBigImage(e)
    }
}

function openBigImage(e) {
    //console.log("openbigimage source: " + e.target.src);
    const yscroll = f_scrollTop();
    document.body.setAttribute("previous_y_scroll_location", yscroll);

    footer.style.display = "none";

    let src = e.target.src;
    // if this is a video
    
    const filenameStart = src.lastIndexOf("/");
    src = "/image" + src.substring(filenameStart);

    const bigImage = makeBigImage(e.target.getAttribute("description"), src);
    tagText.value = e.target.getAttribute("description");
}

function makeBigImage(description, source) {
    //const form = document.createElement("form");

    tagText.innerHTML = description;
    tagForm.style.display = "block";

    galleryDiv.style.display = "none";
    topBar.style.display = "none";

    const bigImage = makeBigImageElement(source);
    backButton.style.display = "grid";

    //bigImage.classList.remove("full-size");

    bigImage.id = "full-image";
    bigImage.src = source;
    bigImage.setAttribute("tabindex", "0");
    bigImageDiv.addEventListener("click", nextOrPrev);
    bigImageDiv.addEventListener("keydown", keyDown);
    bigImageDiv.addEventListener("dblclick", make_bigger);


    bigImageDiv.appendChild(bigImage);

    const root = document.documentElement;
    const css_top = getComputedStyle(root).getPropertyValue("--button-top").trim();
    if (is_video_file(source)) {
        // Shift it down
        backButton.style.top = `${css_top + 32}px`;
    } else {
        backButton.style.top = css_top
    }


    bigImage.focus();
    return bigImage;
}

function makeBigImageElement(source) {
    //console.log("makebigimageelement source: " + source);

    if (is_video_file(source)) {
        const video = document.createElement("video");
        video.controls = "controls";

        const sourceEl = document.createElement("source");
        sourceEl.src = source;
        video.appendChild(sourceEl);

        return video
    }

    const image = document.createElement("img");
    image.src = source;
    return image;
}

const STEP_SIZE = 30;

function makeInSteps(images) {
    //const searchString = window.location.search.substring(1);
    //console.log(images)

    const sort_select = document.getElementById("sort-select-dropdown");
    if (sort_select.value === "old") {
        images.reverse();
    }
    
    const len = images.length;
    for (let i=0; i*STEP_SIZE < len; i++) {
        (function(j) {
            let sl = images.slice(j*STEP_SIZE, (j+1)*STEP_SIZE);
            window.setTimeout(() => {
                makeStep(sl, j);
            }, j*2000);
        })(i);
    }
}

function makeStep(images, step_index) {
    const first_step = step_index === 0;
    let count = 0;
    const divs = document.getElementsByClassName("gallery-col");
    for (const [file, description] of images) {
        const filename = "/image/" + file;
        const image = makeImage(filename);
        if (!first_step) {
            image.loading = "lazy";
        }
        image.className = "image";
        image.alt = filename;
        image.id = "image_id_" + (step_index * STEP_SIZE + count).toString();
        image.setAttribute("description", description);
        image.addEventListener("click", on_click_image);
        //galleryDiv.appendChild(image);
        divs[count % 3].appendChild(image)
        count += 1;
    }
}

function makeImages() {
    const searchString = window.location.search;
    fetch("list-media" + searchString)
        .then(utils.listMediaToJson)
        .then(makeInSteps)
        .catch(error => {
            console.log(error);

            const errorNotice = document.createElement("h2");
            const errorMessage = document.createElement("p");
            errorNotice.textContent = "Error Failed to get list of media";
            errorMessage.textContent = error.toString();

            const contentWrapper = document.getElementById("content-wrapper-div");
            contentWrapper.insertBefore(errorNotice, galleryDiv);
            contentWrapper.insertBefore(errorMessage, galleryDiv);
        });
}

function makeImage(filename) {
    const image = document.createElement("img");

    if (is_video_file(filename)) {
        const thumbpath = filename.replace("/image/", "/thumbnail/");
        image.src = thumbpath;
    } else {
        image.src = filename;
    }

    return image;
}

