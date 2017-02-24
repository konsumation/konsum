konsum
======

create self signed cert
=======================

```shell
openssl req -x509 -newkey rsa:4096 -keyout key.pem -out cert.pem -days 365 -nodes
```

token setup
===========

```shell
openssl genrsa -out demo.rsa 1024
openssl rsa -in demo.rsa -pubout > demo.rsa.pub
```
