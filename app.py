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


app = Flask(__name__)

@app.route("/list-media/")
def list_images():
	logger.debug("/list-media/")
	res = conn.execute("SELECT filename, description FROM media ORDER BY time DESC")
	data = res.fetchall()
	return jsonify(data)

@app.route("/saving/")
def save_tags():
	logger.debug("/saving/")
	


if __name__ == "__main__":
	app.run(debug=True, host="0.0.0.0")
