[![npm](https://img.shields.io/npm/v/konsum.svg)](https://www.npmjs.com/package/konsum)
[![Greenkeeper](https://badges.greenkeeper.io/k0nsti/konsum.svg)](https://greenkeeper.io/)
[![semantic-release](https://img.shields.io/badge/%20%20%F0%9F%93%A6%F0%9F%9A%80-semantic--release-e10079.svg)](https://github.com/k0nsti/konsum)
[![styled with prettier](https://img.shields.io/badge/styled_with-prettier-ff69b4.svg)](https://github.com/prettier/prettier)
[![Build Status](https://secure.travis-ci.org/k0nsti/konsum.png)](http://travis-ci.org/k0nsti/konsum)
[![bithound](https://www.bithound.io/github/k0nsti/konsum/badges/score.svg)](https://www.bithound.io/github/k0nsti/konsum)
[![codecov.io](http://codecov.io/github/k0nsti/konsum/coverage.svg?branch=master)](http://codecov.io/github/k0nsti/konsum?branch=master)
[![Coverage Status](https://coveralls.io/repos/k0nsti/konsum/badge.svg)](https://coveralls.io/r/k0nsti/konsum)
[![Known Vulnerabilities](https://snyk.io/test/github/k0nsti/konsum/badge.svg)](https://snyk.io/test/github/k0nsti/konsum)
[![GitHub Issues](https://img.shields.io/github/issues/k0nsti/konsum.svg?style=flat-square)](https://github.com/k0nsti/konsum/issues)
[![Stories in Ready](https://badge.waffle.io/k0nsti/konsum.svg?label=ready&title=Ready)](http://waffle.io/k0nsti/konsum)
[![Dependency Status](https://david-dm.org/k0nsti/konsum.svg)](https://david-dm.org/k0nsti/konsum)
[![devDependency Status](https://david-dm.org/k0nsti/konsum/dev-status.svg)](https://david-dm.org/k0nsti/konsum#info=devDependencies)
[![docs](http://inch-ci.org/github/k0nsti/konsum.svg?branch=master)](http://inch-ci.org/github/k0nsti/konsum)
[![XO code style](https://img.shields.io/badge/code_style-XO-5ed9c7.svg)](https://github.com/sindresorhus/xo)
[![downloads](http://img.shields.io/npm/dm/konsum.svg?style=flat-square)](https://npmjs.org/package/konsum)
[![Commitizen friendly](https://img.shields.io/badge/commitizen-friendly-brightgreen.svg)](http://commitizen.github.io/cz-cli/)

konsum
======

run
===

```shell
konsum --config=myConfig.json
```

install
=======

```shell
npm -g install konsum
```

how to configure
================

create self signed cert
=======================

```shell
openssl req -x509 -newkey rsa:4096 -keyout key.pem -out cert.pem -days 365 -nodes
```

JWT
===

token setup
===========

```shell
openssl genrsa -out demo.rsa 1024
openssl rsa -in demo.rsa -pubout > demo.rsa.pub
```

test with:

http://localhost:12345/login?user=admin&password=start123

and exec a request

```shell
curl -H 'Authorization: Baerer $token' http://localhost:12345/values
```
