# Image Gallery

## Overview

This repository contains a simple image gallery web application built using JavaScript for the front-end, Flask (a Python web framework) for the back-end,
and Nginx as the web server to host the application locally. The gallery allows users to edit and view images. It also allows you to pull from Google Photos albums.

## Features

- **Upload Images:** Users can upload images to the gallery by pulling them from Google Photos
- **View Gallery:** Browse through the uploaded images in a gallery format and search based off of tags.
- **Responsive Design:** The gallery is responsive and works well on different screen sizes.
- **Local Hosting:** Uses Nginx to serve the application locally.

## Prerequisites

- **Python 3.x**: Make sure Python is installed on your system.
- **pip**: Python package installer.
- **Nginx**: Install Nginx to serve the application.

## Setup

### 1. Clone the Repository

```sh
git clone https://github.com/your-username/image-gallery.git
cd image-gallery
```

### 2. Set Up Python Environment

Create a virtual environment and activate it:

```sh
python -m venv venv
source venv/bin/activate   # On Windows, use `venv\Scripts\activate`
```

### 3. Install Dependencies

Install the required Python packages:

```sh
pip install -r requirements.txt
```

### 4. Configure Nginx

Create a new Nginx configuration file, e.g., `image_gallery.conf`:

```sh
sudo nano /etc/nginx/sites-available/image_gallery.conf
```

Add the following configuration:

```nginx


server {
    listen 80;
    listen [::]:80;
    location / {
        include /etc/nginx/mime.types;
        root /path-to-your-gallery/gallery/;
    }

    location ~* ^/image/(.*) {
        root /path-to-your-gallery/gallery/;
        try_files /images/$1 /downloaded/$1 =404;
    }

    location /list-media/ {
        include proxy_params;
        proxy_pass http://127.0.0.1:8000/list-media/;
    }
}
```

Enable the configuration by creating a symbolic link:

```sh
sudo ln -s /etc/nginx/sites-available/image_gallery.conf /etc/nginx/sites-enabled
```

Test the Nginx configuration and restart the service:

```sh
sudo nginx -t
sudo systemctl restart nginx
```

### 5. Run the Flask Application

Start the Flask web server:
Create the /etc/systemd/system/gallery.service file and put this inside:

```
[Unit]
Description=Gunicorn instance to serve myproject
After=network.target

[Service]
User=root
Group=www-data

WorkingDirectory=/path-to-your-gallery/gallery
Environment="PATH=/path-to-your-gallery/gallery/venv/bin"
ExecStart=/path-to-your-gallery/gallery/venv/bin/gunicorn wsgi:app

[Install]
WantedBy=multi-user.target
```

## Usage

Set up Google Photos API keys and create an album called "My Gallery S" and add the photos you want to it.

- Initialize database with `python create_database.py && python get_photos.py`
- Open your web browser and navigate to `http://localhost`.

## Project Structure


## Contributing

Contributions are welcome! Please open an issue or submit a pull request for any improvements or bug fixes.

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

---

Feel free to modify the content as per your project's requirements.
