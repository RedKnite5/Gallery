import os
import pickle
from pprint import pprint
from pathlib import Path
import shutil
import sqlite3
import json

import time
from dateutil import parser

from dotenv import load_dotenv



conn = sqlite3.connect("secrets_and_data/database.db")
cur = conn.cursor()


def insert_image(name):
	orig_file = name

	timestamp = int(os.path.getctime(Path("custom", orig_file)))
	data = Path("custom", orig_file).read_bytes()

	count = 1
	while True:
		try:
			cur.execute(
				"INSERT INTO media VALUES (?, ?, ?, ?)",
				(name, timestamp, "", data)
			)
			print(f"INSERT {name}, {timestamp}, '', {data[:20]}")

			if count != 1:
				print(f'os.rename(f"custom/{orig_file}", f"custom/{name}")')
				os.rename(f"custom/{orig_file}", f"custom/{name}")
			return
		except sqlite3.IntegrityError:

			res = cur.execute(
				"SELECT time FROM media WHERE filename = ?",
				(name,)
			)
			existing_time = res.fetchone()[0]
			if timestamp == existing_time:
				print(f"skipping {name}")
				return

			if count == 1:
				file, ext = name.rsplit(".", 1)
				name = f"{file}({count}).{ext}"
			else:
				file, end = name.rsplit("(", 1)
				num, ext = end.rsplit(")", 1)
				name = f"{file}({count}){ext}"

			count += 1
			

with os.scandir("custom") as it:
	for entry in it:
		insert_image(entry.name)

conn.commit()


