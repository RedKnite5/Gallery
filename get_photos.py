import os
import pickle
from pprint import pprint
from pathlib import Path
import shutil
import sqlite3
import json

from google_auth_oauthlib.flow import InstalledAppFlow
from google.auth.transport.requests import Request
import requests
from dateutil import parser

from dotenv import load_dotenv

load_dotenv("secrets_and_data/.env")

IMPORT_ALBUM_TITLE = os.environ.get("ALBUMTITLE", "My Gallery S")

def parse_time(string: str) -> int:
	parsed_datetime = parser.parse(string)
	return int(parsed_datetime.timestamp())

def get_token():
	# Define the scope
	SCOPES = ["https://www.googleapis.com/auth/photoslibrary"]

	# Path to the token file
	token_path = "secrets_and_data/_token.pickle"

	# Check if the token file exists
	if os.path.exists(token_path):
		with open(token_path, "rb") as token:
			credentials = pickle.load(token)
	else:
		credentials = None

	# If there are no (valid) credentials available, let the user log in.
	if not credentials or not credentials.valid:
		if credentials and credentials.expired and credentials.refresh_token:
			credentials.refresh(Request())
		else:
			flow = InstalledAppFlow.from_client_secrets_file(
				"secrets_and_data/_client_secret.json", SCOPES)
			credentials = flow.run_local_server(port=0)

		# Save the credentials for the next run
		with open(token_path, "wb") as token:
			pickle.dump(credentials, token)

	token = credentials.token
	return token

access_token = get_token()

headers = {
	"Authorization": f"Bearer {access_token}",
	"Content-Type": "application/json"
}

def get_id():
	get_albums_url = "https://photoslibrary.googleapis.com/v1/albums"
	response = requests.get(get_albums_url, headers=headers, timeout=3600)

	resp = response.json()

	for album in resp["albums"]:
		if album["title"] == IMPORT_ALBUM_TITLE:
			return album["id"]


def fetch_all_photos():
	SEARCH_API_URL = "https://photoslibrary.googleapis.com/v1/mediaItems:search"
	all_photos = []
	next_page_token = None

	album_id = get_id()

	search_params = {
		"albumId": album_id
	}

	while True:
		params = search_params.copy()
		if next_page_token:
			params["pageToken"] = next_page_token

		response = requests.post(SEARCH_API_URL, headers=headers, json=params, timeout=3600)
		if response.status_code != 200:
			raise Exception(f"API request failed with status code {response.status_code}: {response.text}")

		data = response.json()
		all_photos.extend(data.get("mediaItems", []))

		next_page_token = data.get("nextPageToken")
		if not next_page_token:
			break

	return all_photos


photos = fetch_all_photos()

conn = sqlite3.connect("secrets_and_data/database.db")
cur = conn.cursor()


def download_images(items):

	for item in items:
		base_url = item["baseUrl"]
		filename = item["filename"]
		metadata = item["mediaMetadata"]
		time = metadata["creationTime"]
		parsed_time = parse_time(time)
		height = metadata.get("height", 4000)
		width = metadata.get("width", 4000)

		desc = item.get("description", "")

		if filename.endswith("C.mov"):
			print("\n.mov: ")
			pprint(item)

		url = f"{base_url}=w{width}-h{height}"

		r = requests.get(url, stream=True, timeout=3600)

		path = f"downloaded/{filename}"

		if r.status_code == 200:
			with open(path, "wb") as f:
				r.raw.decode_content = True
				shutil.copyfileobj(r.raw, f)
			image_data = Path(path).read_bytes()

			cur.execute(
				"SELECT description FROM media WHERE filename = ? AND time = ?",
				(filename, parsed_time)
			)
			cur_desc = cur.fetchone()

			if cur_desc:
				if cur_desc[0] != desc:
					print(f"updateing {filename} from '{cur_desc[0]}' to '{desc}'")
					cur.execute(
						"UPDATE media SET description = ? WHERE filename = ?",
						(desc, filename)
					)
				else:
					print(f"skipping {filename}")
			else:
				insert_image([filename, parsed_time, desc, image_data])

		else:
			print("error status: ", r.status_code)

	conn.commit()
	print()


def insert_image(row):
	orig_file = row[0]
	count = 1
	while True:
		try:
			print(f"inserting {row[0]} with '{row[2]}'")
			cur.execute(
				"INSERT INTO media VALUES (?, ?, ?, ?)",
				row
			)
			if count != 1:
				os.rename(f"downloaded/{orig_file}", f"downloaded/{row[0]}")
			return
		except sqlite3.IntegrityError:
			if count == 1:
				file, ext = row[0].rsplit(".", 1)
				row[0] = f"{file}({count}).{ext}"
			else:
				file, end = row[0].rsplit("(", 1)
				num, ext = end.rsplit(")", 1)
				row[0] = f"{file}({count}){ext}"

			count += 1


download_images(photos)
