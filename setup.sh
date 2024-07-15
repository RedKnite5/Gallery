#!/usr/bin/env bash

cur_file="$(realpath $0)"
location="$(dirname $cur_file)"
cd "$location"

cnf_file="$(find . -name *.cnf)"
filename="${cnf_file::-4}"
cp "$cnf_file" "/etc/nginx/sites-available/$filename"
ln -sf "/etc/nginx/sites-available/$filename" "/etc/nginx/sites-enabled/gallery"

service_file="$(find . -name *.service)"
service_filename="${service_file::-8}"

cp "$service_file" "/etc/systemd/system/gallery.service"
systemctl daemon-reload
systemctl stop gallery
systemctl start gallery
nginx -s reload
