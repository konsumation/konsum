
post_install() {
	openssl genrsa -out {{config.dir}}{{name}}.rsa 1024
	openssl rsa -in {{config.dir}}{{name}}.rsa -pubout > {{config.dir}}{{name}}.rsa.pub
	chown {{os.user}}:{{os.group}} {{confog.dir}}{{name}}.rsa*
	
	systemctl daemon-reload
	systemctl enable {{name}}
	systemctl enable {{name}}.socket
	systemctl -q try-reload-or-restart nginx
}

pre_upgrade() {
	systemctl stop {{name}}
}

post_upgrade() {
	systemctl daemon-reload
	systemctl -q try-reload-or-restart nginx
}

pre_remove() {
	systemctl stop {{name}}.socket
	systemctl disable {{name}}.socket
	systemctl stop {{name}}
	systemctl disable {{name}}
}

post_remove() {
	systemctl -q try-reload-or-restart nginx
	systemctl daemon-reload
}
