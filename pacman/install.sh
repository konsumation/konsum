pre_install() {
	useradd -U -l -M -r -s /usr/bin/nologin -d /var/lib/{{name}} -c "{{description}}" {{name}}
}

post_install() {
	openssl genrsa -out /etc/{{name}}/{{name}}.rsa 1024
	openssl rsa -in /etc/{{name}}/{{name}}.rsa -pubout > /etc/{{name}}/{{name}}.rsa.pub
	chown {{name}}:{{name}} /etc/{{name}}/{{name}}.rsa*
	
	systemctl daemon-reload
	systemctl enable {{name}}
	systemctl enable {{name}}.socket
	systemctl reload nginx
}

pre_upgrade() {
	systemctl stop {{name}}.socket
	systemctl stop {{name}}
}

post_upgrade() {
	systemctl daemon-reload
	systemctl start {{name}}.socket
	systemctl reload nginx
}

pre_remove() {
    systemctl stop {{name}}.socket
	systemctl disable {{name}}.socket
	systemctl stop {{name}}
	systemctl disable {{name}}
}

post_remove() {
    systemctl reload nginx
	systemctl daemon-reload
	userdel {{name}}
	groupdel {{name}}
}
