
const passwordProtected = false;  // not inteded to actually be secure
const preload_videos = false;

const video_formats = [".mov", ".mp4"];

window.addEventListener("load", setup);

function setup() {
    const searchbar = document.getElementById("searchbar");
    searchbar.addEventListener("keyup", search);

    const tags_textarea = document.getElementById("tags");
    tags_textarea.addEventListener("change", saveNewTags);
    tagForm.addEventListener("submit", submitTags);
    
    setupPassword();
}

function setupPassword() {
    if (passwordProtected === true) {
        const passwordInput = document.createElement("input");
        passwordInput.id = "passwordInput";
        passwordInput.type = "text";
        passwordInput.addEventListener("keyup", checkPassword);

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

async function checkPassword(event) {
    if (event.key !== "Enter") {
        return;
    }

    const passwordInput = document.getElementById("passwordInput");
    const givenPassword = passwordInput.value;

    const pepperedPassowrd = givenPassword + "\"!B[}~,w^q-NWA4aKT<J]&_hmHIN%@Br;$";

    const hash = await digestMessage(pepperedPassowrd);

    const correctHash = "d8f4d8d25947f0478d4cd9efc32efa46d816074c4921bf4bba8d50" +
        "e7c8414e5ac6a3e34ac51afc65feedfe2da7c521f31667c5f4499d38b21be52a25e2266a57";

    //console.log(hash);

    if (hash === correctHash) {
        //console.log("successfully logged in");
        const passDiv = document.getElementById("passDiv");
        passDiv.parentNode.removeChild(passDiv);
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


const topBar = document.getElementById("top");
const searchbar = document.getElementById("searchbar");
const galleryDiv = document.getElementById("gallery");
const bigImageDiv = document.getElementById("big-image-div");
const tagText = document.getElementById("tags");
const tagForm = document.getElementById("form");
const backbutton = document.getElementById("back-button");
backbutton.addEventListener("click", BackToGallery);

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


function search(event) {
    if (event.key !== "Enter") {
        return;
    }

    const tags = searchbar.value.toLowerCase();
    const searchIndex = window.location.href.lastIndexOf("?");
    const url = window.location.href.substr(0, searchIndex);
    
    if (tags === "") {
        if (searchIndex === -1) {
            return;
        }
        window.location = url;
        return;
    }
    window.location = url + "?" + tags;
}

function nextOrPrev(event) {
    const width = event.target.offsetWidth;  // reflow

    let target = event.target;
    if (event.target.id === "full-image") {
        target = event.target.parentElement;
    }

    // used to get gallery version of current image
    //console.log("nextorprev start target: ", event.target);
    let source = target.firstElementChild.src;
    //console.log("nextorprev end target: ", event.target.firstElementChild);
    //console.log(event.target);
    //console.log(event.target.firstElementChild);
    //console.log(source);

    if (!source) {
        source = target.firstElementChild.firstElementChild.src;
        //console.log("video source: ", source);
    }
    const filenameStart = source.lastIndexOf("/");
    const src = decodeURI(source.substr(filenameStart));
    const selector = ".image[src$='" + src + "'],.image:has(> source[src$='" + src + "'])";
    //console.log("target: ", event.target);
    //console.log("selector: ", selector);
    
    let elem = null;
    if (event.clientX < width/3) {
        elem = document.querySelector(selector).previousElementSibling;
    } else if (event.clientX > width * 2/3) {
        elem = document.querySelector(selector).nextElementSibling;
    }

    //console.log("selected: ", elem);

    changeBigImage(elem);
}

function keyDown(event) {
    //console.log("pressed: ", event.key);

    const bigImage = document.getElementById("full-image");
    const filenameStart = bigImage.src.lastIndexOf("/");
    const selector = ".image[src$='" + decodeURI(bigImage.src.substr(filenameStart)) + "']";
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
    
    const tagname = elem.tagName.toLowerCase();
    if (tagname === "img") {
        makeBigImage(desc, elem.src);
    } else if (tagname === "video") {
        makeBigImage(desc, elem.firstChild.src);
    }

    tagText.value = elem.getAttribute("description");
}

function saveNewTags(event) {
    tagText.style.height = "";
    tagText.style.height = tagText.scrollHeight + "px";

    const form = document.getElementById("form");
    //form.requestSubmit();
    console.log("submitted");
    console.log(form)
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

    const url = new URL(src);
    const path = url.pathname;

    const img_elem = document.querySelector('img.image[src="' + path + '"]');
    img_elem.setAttribute("description", tags.value);

    return false;
}

function BackToGallery() {
    galleryDiv.style.display = "block";
    topBar.style.display = "block";
    const box = document.getElementById("full-image");
    box.removeEventListener("keydown", keyDown);
    box.parentNode.removeChild(box);
    tagForm.style.display = "none";
    backbutton.style.display = "none";
    const yscroll = document.body.getAttribute("previous_y_scroll_location");
    window.scrollTo(0, yscroll);
}

function openBigImage(e) {
    console.log("openbigimage source: " + e.target.src);
    const yscroll = f_scrollTop();
    document.body.setAttribute("previous_y_scroll_location", yscroll);

    let src = e.target.src;
    // if this is a video
    if (src === "") {
        src = e.target.firstElementChild.src;
    }
    const bigImage = makeBigImage(e.target.getAttribute("description"), src);
    tagText.value = e.target.getAttribute("description");
}

function makeBigImage(description, source) {
    const form = document.createElement("form");

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

    bigImage.focus();
    return bigImage;
}

function makeBigImageElement(source) {
    console.log("makebigimageelement source: " + source);

    let tag = "img";
    for (const format of video_formats) {
        if (source.endsWith(format)) {
            tag = "video";
        }
    }

    if (tag === "img") {
        const image = document.createElement("img");
        image.src = source;
        return image;
    } else if (tag === "video") {
        const video = document.createElement("video");
        video.controls = "controls";

        const sourceEl = document.createElement("source");
        sourceEl.src = source;
        video.appendChild(sourceEl);

        return video
    }
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
    let tag = "img";
    for (const format of video_formats) {
        if (filename.endsWith(format)) {
            tag = "video";
        }
    }

    if (tag === "img") {
        const image = document.createElement("img");
        image.src = filename;
        return image;
    } else if (tag === "video") {
        const video = document.createElement("video");
        video.controls = "controls";

        if (!preload_videos) {
            video.preload = "metadata";
        }

        const source = document.createElement("source");
        source.src = filename;
        video.appendChild(source);

        return video
    }
}

