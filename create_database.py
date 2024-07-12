import sqlite3
import os
import json
from pprint import pprint
from pathlib import Path


def mv_dup_num(s):
	start_num = s.rfind("(")
	end_num = s.rfind(")")
	first_dot = s[:start_num].rfind(".")

	num = s[start_num : end_num+1]
	name = s[:first_dot] + num
	return name + s[first_dot:start_num]

if os.path.isdir("images"):
	gen = (file.name for file in os.scandir("images") if file.is_file())
else:
	gen = ()

def image_json_map(file_gen):
	d = {}
	files = list(file_gen)

	for file in files:
		if not file.endswith(".json"):
			continue

		with open("./images/" + file, "r") as f:
			image_json = json.load(f)

		im_name = str(image_json["title"])
		if len(im_name) > 51:
			last_index = im_name.rfind(".")
			trunc_to = 51 - len(im_name[last_index:])
			im_name = im_name[:trunc_to] + im_name[last_index:]
		# TODO: what if too long and dup name? any other exceptions?
		if file.endswith(").json"):
			im_name = mv_dup_num(file)
		
		last_index = im_name.rfind(".")
		base_name = im_name[:last_index]
		edited_name = base_name + "-edited" + im_name[last_index:]
		if edited_name in files:
			d[edited_name] = (image_json["description"], image_json["photoTakenTime"]["timestamp"])
		
		d[im_name] = (image_json["description"], image_json["photoTakenTime"]["timestamp"])

	return d

d = image_json_map(gen)

#pprint(d)

data = [
	#filename time   description  data
	(key, int(val[1]), val[0], Path("images", key).read_bytes())
	for key, val in d.items()
]


con = sqlite3.connect("secrets_and_data/database.db")
cur = con.cursor()

CREATE_TABLE = """CREATE TABLE IF NOT EXISTS media (
	filename UNIQUE NOT NULL,
	time NOT NULL,
	description,
	data
)"""
cur.execute(CREATE_TABLE)


INSERT = """INSERT INTO media
	VALUES
	(?, ?, ?, ?)
"""
if data:
	cur.executemany(INSERT, data)

con.commit()
con.close()
