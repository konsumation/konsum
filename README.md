[![npm](https://img.shields.io/npm/v/konsum.svg)](https://www.npmjs.com/package/konsum)
[![License](https://img.shields.io/badge/License-BSD%203--Clause-blue.svg)](https://opensource.org/licenses/BSD-3-Clause)
[![minified size](https://badgen.net/bundlephobia/min/konsum)](https://bundlephobia.com/result?p=konsum)
[![downloads](http://img.shields.io/npm/dm/konsum.svg?style=flat-square)](https://npmjs.org/package/konsum)
[![Build Status](https://img.shields.io/endpoint.svg?url=https%3A%2F%2Factions-badge.atrox.dev%2Fkonsumation%2Fkonsum%2Fbadge&style=flat)](https://actions-badge.atrox.dev/konsumation/konsum/goto)
[![Styled with prettier](https://img.shields.io/badge/styled_with-prettier-ff69b4.svg)](https://github.com/prettier/prettier)
[![Commitizen friendly](https://img.shields.io/badge/commitizen-friendly-brightgreen.svg)](http://commitizen.github.io/cz-cli/)
[![Known Vulnerabilities](https://snyk.io/test/github/konsumation/konsum/badge.svg)](https://snyk.io/test/github/konsumation/konsum)

# konsum

# run

```shell
konsum --config=<<some dir>> start
```

```shell
konsum --config=<<some dir>> list [category]
```

```shell
konsum --config=<<some dir>> insert category value [time]
```

```shell
konsum --config=<<some dir>> backup [file]
```

```shell
konsum --config=<<some dir>> restore [file]
```

# install

```shell
npm -g install konsum
```

# how to configure

# create self signed cert

```shell
openssl req -x509 -newkey rsa:4096 -keyout key.pem -out cert.pem -days 365 -nodes
```

# JWT

# token setup

```shell
openssl genrsa -out demo.rsa 1024
openssl rsa -in demo.rsa -pubout > demo.rsa.pub
```

test with:

```shell
curl -H "Content-Type: application/json" \
     -d '{"username":"admin","password":"start123"}' \
     -X POST http://localhost:12345/authenticate
```

and exec a request

```shell
TOKEN=...
CATEGORY=...
curl -H "Authorization: Bearer $TOKEN" \
     http://localhost:12345/category/$CATEGORY/value
```

```shell
TOKEN=...
CATEGORY=...
curl -H "Authorization: Bearer $TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"value":"1234.5","time":"1995-12-17T03:24:00"}' \
     http://localhost:12345/category/$CATEGORY/value
```

Or directly calling the executable

```shell
konsum insert ev 90091.3 '2019-06-22T13:44:17'
```

# openapi

see [openapi A](https://konsumation.github.io/openapi/index.html)
see [openapi B](https://konsumation.github.io/openapi/openapi.html)

# API

<!-- Generated by documentation.js. Update this documentation by updating the source code. -->

### Table of Contents

-   [addRoute](#addroute)
-   [addRoute](#addroute-1)
-   [addRoute](#addroute-2)
-   [addRoute](#addroute-3)
-   [addRoute](#addroute-4)
-   [addRoute](#addroute-5)
-   [addRoute](#addroute-6)
-   [addRoute](#addroute-7)
-   [addRoute](#addroute-8)
-   [addRoute](#addroute-9)
-   [addRoute](#addroute-10)
-   [addRoute](#addroute-11)
-   [addRoute](#addroute-12)
-   [addRoute](#addroute-13)
-   [addRoute](#addroute-14)

## 

## addRoute

## addRoute

## addRoute

## addRoute

## addRoute

Authenticate.

## addRoute

Retrieve list of categories

## addRoute

## addRoute

## addRoute

## addRoute

## addRoute

## addRoute

## addRoute

## addRoute

## addRoute
