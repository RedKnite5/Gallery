import sqlite3
import os
import json
from pprint import pprint, pformat
from pathlib import Path
import logging
from urllib.parse import unquote
import subprocess
from functools import reduce

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

def matches(term, tags):
	if isinstance(term, Exp):
		return term.evaluate(tags)
	else:
		return term in tags

class Exp:
	op = None

	def __init__(self, *args):
		self.terms = list(args)
	
	def add(self, arg):
		self.terms.append(arg)
	
	def evaluate(self, tags):
		return reduce(self.op, (matches(term, tags) for term in self.terms))

class And_Exp(Exp):
	op = "and"

	def evaluate(self, tags):
		return all(matches(term, tags) for term in self.terms)

class Or_Exp(Exp):
	op = "or"

	def evaluate(self, tags):
		return any(matches(term, tags) for term in self.terms)

class Not_Exp(Exp):
	op = "not"

	def evaluate(self, tags):
		assert len(self.terms) == 1

		return not matches(self.terms[0], tags)


def tokenize_search_string(string):
	tokens = []
	index = 0
	start = -1
	while index < len(string):
		hyphen_not_mid_word = string[index] == "-" and start == -1
		if string[index] in "() " or hyphen_not_mid_word:
			if start != -1:
				tokens.append(string[start:index])
				start = -1
			tokens.append(string[index])
		elif start == -1:
			start = index
		else:
			pass

		index += 1
	
	if start != -1:
		tokens.append(string[start:])
	
	return tokens

def parse_search_string(string):
	tokens = tokenize_search_string(string)

	tree = And_Exp()

	stack = [tree]
	stack_index = 0

	for token in tokens:
		if token == "or":
			exp = Or_Exp()
			stack[stack_index].add(exp)
			stack.append(exp)
			stack_index += 1

		elif token == "and":
			exp = And_Exp()
			stack[stack_index].add(exp)
			stack.append(exp)
			stack_index += 1

		elif token == ")":
			stack.pop()
			stack_index -= 1
		
		elif token == "-":
			exp = Not_Exp()
			stack[stack_index].add(exp)
			stack.append(exp)
			stack_index += 1

		# should do some kind of checking to make sure '(' is present
		elif token in " (":
			pass

		else:
			stack[stack_index].add(token)

			if stack[stack_index].op == "not":
				stack.pop()
				stack_index -= 1

	return tree

def filter_images(images, searchString):
	tags_all = searchString.lower()

	tree = parse_search_string(tags_all)

	return [image for image in images if tree.evaluate(image[1].lower())]


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
	#logger.debug("thumbnail")

	thumb_path_str = os.path.abspath(ROOT / "thumbnails" / filename)

	if not thumb_path_str.startswith(str(ROOT / "thumbnails") + os.sep):
		abort(400, "Invalid path")

	thumb_path_png = Path(replace_vid_extension_with_png(thumb_path_str))

	if thumb_path_png.is_file():
		return send_file(thumb_path_png, mimetype="image/jpeg")

	locations = ("images", "webp_bucket", "downloaded", "custom")
	video_path = None
	for directory in locations:
		if (candidate := ROOT / directory / filename).is_file():
			video_path = candidate
			break
	
	thumb_path = Path(thumb_path_str)

	logger.debug("generating video path: " + str(video_path))
	logger.debug("thumb path: " + str(thumb_path))

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
	query = request.args.get("q", "")
	logger.debug("/list-media/")
	logger.debug("search string " + query)
	res = cur.execute("SELECT filename, description FROM media ORDER BY time DESC")
	data = res.fetchall()

	filtered = filter_images(data, query)

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
