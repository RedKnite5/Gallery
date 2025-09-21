#!/usr/bin/env bash

cur_file="$(realpath $0)"
location="$(dirname $cur_file)"
cd "$location"

cnf_file="$(find . -name "*.cnf" -printf '%P\n')"
filename="${cnf_file::-4}"
cp "$cnf_file" "/etc/nginx/sites-available/$filename"
ln -sf "/etc/nginx/sites-available/$filename" "/etc/nginx/sites-enabled/gallery"

service_file="$(find . -name "*.service" -printf '%P\n')"
service_filename="${service_file::-8}"

cp "$service_file" "/etc/systemd/system/gallery.service"
systemctl daemon-reload
systemctl stop gallery
systemctl start gallery
nginx -s reload

pwsh() {
    /mnt/c/Windows/System32/WindowsPowerShell/v1.0/powershell.exe "$@"
}

printf "To enable port forwarding run this in an elevated powershell prompt\n"
printf 'netsh interface portproxy add v4tov4 listenport=3000 listenaddress=0.0.0.0 connectport=3000 connectaddress=$($(wsl hostname -I).trim());'

windows_lan_ip="$(pwsh -Command "(Get-NetIPAddress -AddressFamily IPv4 -InterfaceAlias Wi-Fi).IPAddress")"
windows_lan_ip="$(echo "$windows_lan_ip" | tr -d '\r')"  # remove CR if present
printf "\n\nConnect to $windows_lan_ip:3000/gallery/ \n"

