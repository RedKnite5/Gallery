import sqlite3
import os
import json
from pprint import pprint, pformat
from pathlib import Path
import logging
from urllib.parse import unquote
import subprocess
from functools import reduce
import shutil
import hashlib

from flask import (Flask,
				   jsonify,
				   request,
				   session,
				   abort,
				   send_file)

from flask_wtf.csrf import CSRFProtect, generate_csrf




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

database = ROOT / "secrets_and_data/database_no_blob.db"

app = Flask(__name__)
app.secret_key = "N:ZZNqouT.Fq]Knj1RkU6Rnm97784z2L@CEnGon59-y@}~5Pc#,g+Ue!%fv,XNWo!QK,^jb3Z44ma~}k58Q+Tp^71*Z>CfK}pmx9"
csrf = CSRFProtect(app)


def replace_vid_extension_with_png(filename):
	for ext in video_formats:
		if filename.endswith(ext):
			return filename[:-len(ext)] + ".png"
	return filename

def matches(term, tags):
	if isinstance(term, Exp):
		return term.evaluate(tags)
	else:
		# logger.debug(f"{term = }")
		# logger.debug(f"{tags.split() = }")
		return term in tags.split()

class Exp:
	op = None

	def __init__(self, *args):
		self.terms = list(args)

	def __str__(self):
		return f"{self.op}({', '.join(map(str, self.terms))})"

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

	for token in tokens:
		if token == "or":
			exp = Or_Exp()
			stack[-1].add(exp)
			stack.append(exp)

		elif token == "and":
			exp = And_Exp()
			stack[-1].add(exp)
			stack.append(exp)

		elif token == ")":
			if len(stack) >= 2:
				stack.pop()
			else:
				# error
				# ignore it?
				pass

		elif token == "-":
			exp = Not_Exp()
			stack[-1].add(exp)
			stack.append(exp)

		# should do some kind of checking to make sure '(' is present
		elif token in " (":
			pass

		else:
			stack[-1].add(token)

			if stack[-1].op == "not":
				stack.pop()

	return tree

def filter_images(images, searchString):
	tags_all = searchString.lower()

	tree = parse_search_string(tags_all)
	# logger.debug(str(tree))

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


@app.after_request
def set_csrf_cookie(response):
    response.set_cookie(
        "csrf_token",               # cookie name your JS will read
        generate_csrf(),
        secure=False,
        samesite="Strict",
        httponly=False
    )
    return response


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
	with sqlite3.connect(database) as conn:
		res = conn.execute("SELECT filename, description FROM media ORDER BY time DESC")
		data = res.fetchall()
	conn.close()

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

	with sqlite3.connect(database) as conn:
		res = conn.execute("SELECT description FROM media WHERE filename = ?", (file,))
		data = res.fetchall()
		conn.execute("UPDATE media SET description = ? WHERE filename = ?", (tags, file))
	conn.close()

	logger.debug("data: %s", data)
	logger.info(f"updating {file} from {data[0][0]!r} to {tags!r}")


	return "200"

@app.route("/delete/<path:filename>")
def delete(filename):
	logger.info(f"delete request: {filename}")

	with sqlite3.connect(database) as conn:
		res = conn.execute("SELECT time, description FROM media WHERE filename = ?", (filename,))
		time, description = res.fetchone()
		logger.info(f"deleting {filename=} {time=} {description=}")
		conn.execute("DELETE FROM media WHERE filename = ?", (filename,))
	conn.close()

	shutil.move(f"images/{filename}", "deleted")

	return "200"

@app.route("/auth")
def auth():
    if "user" not in session:
        abort(401)
    return "", 200

@app.route("/login/", methods=["POST"])
@csrf.exempt
def login():
	data = request.json
	logger.debug("login")

	salt1 = bytes.fromhex("13ea68762a32b9937f35d7ddf4333fef")
	salt2 = bytes.fromhex("f25022f9a919973fa3c24f12e544d3ed")
	password = salt1 + data["password"].encode("utf-8") + salt2

	hash = hashlib.sha256(password).hexdigest()

	correct_hash = "5697e7b0d85db902dd75b531e055a831a2907e230f213b50e3f98598c26db859"
	if data["username"] == "veronica" and hash == correct_hash:
		session["user"] = data["username"]
		return "200"

	return "403"

@app.route("/logout/", methods=["POST"])
def logout():
	logger.debug("logout")
	session.clear()
	return "200"

app.config.update(
    #SESSION_COOKIE_SECURE=True,
    #SESSION_COOKIE_HTTPONLY=True,
    SESSION_COOKIE_SAMESITE='Lax'
)

if __name__ == "__main__":
	app.run(debug=True, host="0.0.0.0")
