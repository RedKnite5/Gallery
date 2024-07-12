import os
import json
from pprint import pprint
from pathlib import Path
import sqlite3


conn = sqlite3.connect("database.db")

cur = conn.cursor()


filename = "IMG_0174.PNG"
parsed_time = 1672134585
cur.execute(
	"SELECT description, time FROM media WHERE filename = ? AND time = ?",
	(filename, 1672134585)
)
rows = cur.fetchall()
pprint(rows)

#with open("downloads/IMG_0117.PNG", "wb") as file:
#file.write(rows[1])






