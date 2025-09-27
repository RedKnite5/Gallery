
const passwordProtected = false;  // not inteded to actually be secure
const preload_videos = false;

window.addEventListener("load", setup);

const topBar = document.getElementById("top");
const searchbar = document.getElementById("searchbar");
const galleryDiv = document.getElementById("gallery");
const bigImageDiv = document.getElementById("big-image-div");
const tagText = document.getElementById("tags");
const tagForm = document.getElementById("form");
const backbutton = document.getElementById("back-button");

function setup() {
    searchbar.addEventListener("keyup", search);

    tagForm.addEventListener("change", submitTags);
    tagForm.addEventListener("submit", submitTags);

    backbutton.addEventListener("click", BackToGallery);
    
    setupPassword();
}

function setupPassword() {
    if (passwordProtected === true) {
        const passwordInput = document.createElement("input");
        passwordInput.id = "passwordInput";
        passwordInput.type = "text";
        //passwordInput.addEventListener("keyup", checkPassword);

        const passwordLabel = document.createElement("label");
        passwordLabel.id = "passwordLabel";
        passwordLabel.for = "passwordInput";
        passwordLabel.innerText = "Password";

        const passDiv = document.createElement("div");
        passDiv.id = "passDiv";

        passDiv.appendChild(passwordLabel);
        passDiv.appendChild(passwordInput);

        document.body.appendChild(passDiv);
    } else {
        makeImages();
    }
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

function search(event) {
    if (event.key !== "Enter") {
        return;
    }

    const tags = searchbar.value.toLowerCase();
    const searchIndex = window.location.href.lastIndexOf("?");
    const url = window.location.href.substring(0, searchIndex);

    console.log("Searching for '" + tags + "'");
    
    if (tags === "") {
        if (searchIndex === -1) {
            return;
        }
        window.location = url;
        return;
    }
    window.location = url + "?q=" + tags;
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
    const currentTop = parseInt(window.getComputedStyle(backbutton).top, 10);
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
    //console.log("nextorprev end target: ", event.target.firstElementChild);
    //console.log(event.target);
    //console.log(event.target.firstElementChild);
    //console.log(source);

    const escapedSrc = prep_source_for_selector(source);
    const selector = ".image[src$='" + escapedSrc + "'],.image:has(> source[src$='" + escapedSrc + "'])";
    //console.log("target: ", event.target);
    //console.log("selector: ", selector);

    const width = window.innerWidth;
    let elem = null;
    if (event.clientX < width/3) {
        // console.log("x: ", event.clientX);
        // console.log("y: ", event.clientY);
        elem = document.querySelector(selector).previousElementSibling;
    } else { // if (event.clientX > width * 2/3) {
        elem = document.querySelector(selector).nextElementSibling;
    }

    //console.log("selected: ", elem);

    changeBigImage(elem);
}

function keyDown(event) {
    //console.log("pressed: ", event.key);

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
    const tags = document.getElementById("tags");
    const bigImage = document.getElementById("full-image");

    let src = bigImage.src;
    if (!src) {
        src = bigImage.firstChild.src;
    }
    
    console.log("submitting: ", tags.value);
    await fetch("/saving/", {
        method: "POST",
        headers: {
            "Accept": "application/json",
            "Content-Type": "application/json"
        },
        body: JSON.stringify({tags: tags.value, name: src})
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

    img_elem.setAttribute("description", tags.value);

    tagText.style.height = "";
    tagText.style.height = tagText.scrollHeight + "px";

    return false;
}

function BackToGallery() {
    galleryDiv.style.display = "block";
    topBar.style.display = "flex";
    const box = document.getElementById("full-image");
    box.removeEventListener("keydown", keyDown);
    box.parentNode.removeChild(box);
    tagForm.style.display = "none";
    backbutton.style.display = "none";
    const yscroll = document.body.getAttribute("previous_y_scroll_location");
    window.scrollTo(0, yscroll);
}

function openBigImage(e) {
    //console.log("openbigimage source: " + e.target.src);
    const yscroll = f_scrollTop();
    document.body.setAttribute("previous_y_scroll_location", yscroll);

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
    backbutton.style.display = "grid";

    bigImage.id = "full-image";
    bigImage.src = source;
    bigImage.setAttribute("tabindex", "0");
    bigImageDiv.addEventListener("click", nextOrPrev);
    bigImageDiv.addEventListener("keydown", keyDown);

    bigImageDiv.appendChild(bigImage);

    const root = document.documentElement;
    const css_top = getComputedStyle(root).getPropertyValue("--button-top").trim();
    if (is_video_file(source)) {
        // Shift it down
        backbutton.style.top = `${css_top + 32}px`;
    } else {
        backbutton.style.top = css_top
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

function makeInSteps(images) {
    //const searchString = window.location.search.substring(1);
    const len = images.length;
    const STEP_SIZE = 40;
    for (let i=0; i*STEP_SIZE < len; i++) {
        (function(j) {
            let sl = images.slice(j*STEP_SIZE, (j+1)*STEP_SIZE);
            window.setTimeout(() => {
                makeStep(sl, j===0);
                if ((j+1)*STEP_SIZE >= len) {
                    console.log("finished loading");
                }
            }, j*2000);
        })(i);
    }
}

function makeStep(images, first_step) {
    for (const [file, description] of images) {
        const filename = "/image/" + file;
        const image = makeImage(filename);
        if (!first_step) {
            image.loading = "lazy";
        }
        image.className = "image";
        image.alt = filename;
        image.setAttribute("description", description);
        image.addEventListener("click", openBigImage);
        galleryDiv.appendChild(image);
    }
}

function makeImages() {
    const searchString = window.location.search;
    res = fetch("list-media" + searchString)
        .then(r => r.json())
        .then(makeInSteps)
        .catch(error => {
            console.log(error);

            errorNotice = document.createElement("h2");
            errorMessage = document.createElement("p");
            errorNotice.textContent = "Error Failed to get list of media";
            errorMessage.textContent = error.toString();
            galleryDiv.appendChild(errorNotice);
            galleryDiv.appendChild(errorMessage);
        });
}

function makeImage(filename) {
    const image = document.createElement("img");

    if (is_video_file(filename)) {
        thumbpath = filename.replace("/image/", "/thumbnail/");
        image.src = thumbpath;
    } else {
        image.src = filename;
    }

    return image;
}

