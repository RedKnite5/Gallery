import sqlite3
import os
import json
from pprint import pprint
from pathlib import Path
import logging

from flask import Flask, jsonify, request, make_response, json
import gzip



# service file from
# https://medium.com/swlh/mini-project-deploying-python-application-with-nginx-30f9b25b195

# Extra Files:
# /etc/nginx/nginx.conf
# /etc/nginx/sites-available/my_gallery
# /etc/systemd/system/my_gallery.service

# sudo systemctl start my_gallery
# sudo nginx -s reload


logger = logging.getLogger(__name__)
logging.basicConfig(filename="app.log", level=logging.DEBUG)

conn = sqlite3.connect("secrets_and_data/database.db")
cur = conn.cursor()

app = Flask(__name__)

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
	file = name.split("/")[-1]

	res = cur.execute("SELECT description FROM media WHERE filename = ?", (file,))
	data = res.fetchall()
	cur.execute("UPDATE media SET description = ? WHERE filename = ?", (tags, file))

	conn.commit()

	logger.debug("data: %s", data)
	logger.info(f"updating {file} from {data[0][0]!r} to {tags!r}")


	return "200"



if __name__ == "__main__":
	app.run(debug=True, host="0.0.0.0")
