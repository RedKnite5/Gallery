import sqlite3
import os
import json
from pprint import pprint
from pathlib import Path

from flask import Flask, jsonify, request



# Extra Files:
# /etc/nginx/nginx.conf
# /etc/nginx/sites-available/my_gallery
# /etc/systemd/system/my_gallery.service

# sudo systemctl start my_gallery
# sudo nginx -s reload


conn = sqlite3.connect("database.db")


app = Flask(__name__)

@app.route("/list-media/")
def list_images():
	res = conn.execute("SELECT filename, description FROM media ORDER BY time DESC")
	data = res.fetchall()
	return jsonify(data)

if __name__ == "__main__":
	app.run(debug=True, host="0.0.0.0")

