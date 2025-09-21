import sqlite3
import os
import json
from pprint import pprint
from pathlib import Path
import logging
from urllib.parse import unquote
import subprocess
import gzip

from flask import (Flask,
				   jsonify,
				   request,
				   make_response,
				   json,
				   Response,
				   abort,
				   send_file)





# service file from
# https://medium.com/swlh/mini-project-deploying-python-application-with-nginx-30f9b25b195

# Extra Files:
# /etc/nginx/nginx.conf
# /etc/nginx/sites-available/my_gallery
# /etc/systemd/system/my_gallery.service

# sudo systemctl start my_gallery
# sudo nginx -s reload

ROOT = Path(__file__).resolve().parent

video_formats = (".mov", ".mp4")

logger = logging.getLogger(__name__)
logging.basicConfig(filename=ROOT / "app.log", level=logging.DEBUG)

conn = sqlite3.connect(ROOT / "secrets_and_data/database_no_blob.db")
cur = conn.cursor()

app = Flask(__name__)

def replace_vid_extension_with_png(filename):
	for ext in video_formats:
		if filename.endswith(ext):
			return filename[:-len(ext)] + ".png"
	return filename

def partition(lst, predicate):
	arr1 = []
	arr2 = []
	for item in lst:
		if predicate(item):
			arr1.append(item)
		else:
			arr2.append(item)
	return (arr1, arr2)


def matches_tags(description, pos_tags, neg_tags):
	imageTags = description.lower().split(" ")

	keep = all(tag in imageTags for tag in pos_tags)
	keep = keep and all(tag[1:] not in imageTags for tag in neg_tags)

	return keep

def filter_images(images, searchString):
	tags_all = searchString.lower().split("%20")
	tags = [tag for tag in tags_all if tag != ""]
	neg_tags, pos_tags = partition(tags, lambda tag: tag.startswith("-"))
	return [image for image in images if matches_tags(image[1], pos_tags, neg_tags)]


def get_video_len(video_path):
	# 1. Get video duration with ffprobe
	return subprocess.run(
		[
			"/usr/bin/ffprobe",
			"-v", "error",
			"-show_entries", "format=duration",
			"-of", "default=noprint_wrappers=1:nokey=1",
			str(video_path)
		],
		stdout=subprocess.PIPE,
		stderr=subprocess.PIPE,
		text=True,
		check=True
	).stdout

@app.route("/thumbnail/<path:filename>")
def thumbnail(filename):
	logger.debug("thumbnail")

	thumb_path_str = os.path.abspath(ROOT / "thumbnails" / filename)
	thumb_path = Path(thumb_path_str)

	if not thumb_path_str.startswith(str(ROOT / "thumbnails") + os.sep):
		abort(400, "Invalid path")

	if thumb_path.is_file():
		return send_file(thumb_path, mimetype="image/jpeg")

	locations = ("images", "webp_bucket", "downloaded", "custom")
	video_path = None
	for directory in locations:
		if (candidate := ROOT / directory / filename).is_file():
			video_path = candidate
			break

	logger.debug("video path: " + str(video_path))

	os.makedirs(ROOT / "thumbnails", exist_ok=True)

	if video_path is None:
		abort(404, "Video not found")

	thumb_path_png = replace_vid_extension_with_png(thumb_path_str)

	vid_len = get_video_len(video_path)

	duration = float(vid_len.strip())
	halfway = duration / 2

	# Run ffmpeg to capture 1 frame at 50% of video duration
	# pipe:1 writes to stdout so we can stream back to client
	cmd = [
		"/usr/bin/ffmpeg",
		"-ss", str(halfway),
		"-i", video_path,
		"-vframes", "1",         # one frame only
		"-q:v", "2",             # quality (2 = high)
		"-vf", "scale=320:-1",   # optional resize
		thumb_path_png
	]

	subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=True)

	return send_file(thumb_path_png, mimetype="image/jpeg")

@app.route("/list-media/")
def list_images():
	logger.debug("/list-media/")
	logger.debug(b"search string " + request.query_string)
	res = cur.execute("SELECT filename, description FROM media ORDER BY time DESC")
	data = res.fetchall()

	filtered = filter_images(data, request.query_string.decode("utf-8"))


	#content = gzip.compress(json.dumps(filtered).encode('utf8'), 5)
	#response = make_response(content)
	#response.headers['Content-length'] = len(content)
	#response.headers['Content-Encoding'] = 'gzip'
	#return response

	return jsonify(filtered)

@app.route("/saving/", methods=["POST"])
def save_tags():
	logger.debug(request.method)
	logger.debug(getattr(request, "json", "default"))
	logger.debug("/saving/")

	tags = request.json["tags"]
	name = request.json["name"]
	file_encoded = name.split("/")[-1]
	file = unquote(file_encoded)

	res = cur.execute("SELECT description FROM media WHERE filename = ?", (file,))
	data = res.fetchall()
	cur.execute("UPDATE media SET description = ? WHERE filename = ?", (tags, file))

	conn.commit()

	logger.debug("data: %s", data)
	logger.info(f"updating {file} from {data[0][0]!r} to {tags!r}")


	return "200"



if __name__ == "__main__":
	app.run(debug=True, host="0.0.0.0")
