
post_install() {
	openssl genrsa -out {{config.dir}}{{name}}.rsa 2048
	openssl rsa -in {{config.dir}}{{name}}.rsa -pubout > {{config.dir}}{{name}}.rsa.pub
	chown {{os.user}}:{{os.group}} {{config.dir}}{{name}}.rsa*
	
	systemctl daemon-reload
	systemctl enable {{name}}
	systemctl enable {{name}}.socket
}

pre_upgrade() {
	systemctl stop {{name}}
}

pre_remove() {
	systemctl stop {{name}}.socket
	systemctl disable {{name}}.socket
	systemctl stop {{name}}
	systemctl disable {{name}}
}
