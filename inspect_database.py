import os
import json
from pprint import pprint
from pathlib import Path
import sqlite3


conn = sqlite3.connect("secrets_and_data/database_no_blob.db")

cur = conn.cursor()


filename = "IMG_0174.PNG"
parsed_time = 1672134585
cur.execute(
	"SELECT filename, time FROM media"
)
rows = cur.fetchall()
pprint(rows)

#with open("downloads/IMG_0117.PNG", "wb") as file:
#file.write(rows[1])






