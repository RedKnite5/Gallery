import sqlite3
import os
import json
from pprint import pprint
from pathlib import Path
import logging

from flask import Flask, jsonify, request


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

@app.route("/list-media/")
def list_images():
	logger.debug("/list-media/")
	res = cur.execute("SELECT filename, description FROM media ORDER BY time DESC")
	data = res.fetchall()
	return jsonify(data)

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


	res = cur.execute("SELECT description FROM media WHERE filename = ?", (file,))
	data = res.fetchall()
	logger.debug("data 2: %s", data)


	return "200"



if __name__ == "__main__":
	app.run(debug=True, host="0.0.0.0")
